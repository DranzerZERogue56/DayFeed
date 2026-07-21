import { requestRecordingPermissionsAsync } from 'expo-audio';
import AudioRecord from '@fugood/react-native-audio-pcm-stream';
import { Buffer } from 'buffer';
import { useCallback, useRef, useState } from 'react';
import { File, Paths } from 'expo-file-system';

// Voice recording for DayFeed. Records 16 kHz mono 16-bit PCM via a native
// live-audio-stream module — the format whisper.rn requires — because the
// Expo audio modules cannot produce raw PCM/WAV on Android.
//
// IMPORTANT: the native module (@fugood/react-native-audio-pcm-stream, an
// unmodified fork of react-native-live-audio-stream) only *streams* PCM
// chunks via its 'data' event; its own README says as much. Its native
// stop() takes no Promise and returns nothing — it does NOT write a file or
// hand back a path, despite earlier code here assuming it did. That meant
// every recording was silently discarded (a real, saved WAV file never
// existed). We now assemble the WAV file ourselves in JS from the streamed
// chunks, which is the only way this module can produce a real file.
export interface RecorderResult {
  uri: string;
  durationMs: number;
}

export interface StartResult {
  ok: boolean;
  /**
   * Why start() didn't begin recording. 'permission' means the OS denied mic
   * access — callers should tell the user to enable it in Settings. 'busy'
   * means a recording session was already active (a UI/gesture bug, not a
   * permission problem) — callers should NOT show the permission alert for
   * this, or a stuck recording will surface as a false "grant permission"
   * loop even though access was already granted.
   */
  reason?: 'permission' | 'busy';
}

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BITS = 16;
const BYTES_PER_SEC = (SAMPLE_RATE * CHANNELS * BITS) / 8; // 32000
const BLOCK_ALIGN = (CHANNELS * BITS) / 8;
// The native recording thread keeps reading for a moment after stop() sets
// its flag, so a few more 'data' events land after we ask it to stop. Give
// them a beat to arrive before assembling the file, or the tail of every
// note gets clipped.
const DRAIN_MS = 250;

function buildWavHeader(dataLength: number): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 4, 'ascii');
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8, 4, 'ascii');
  header.write('fmt ', 12, 4, 'ascii');
  header.writeUInt32LE(16, 16); // fmt chunk size (PCM)
  header.writeUInt16LE(1, 20); // audio format: PCM
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(BYTES_PER_SEC, 28); // byte rate
  header.writeUInt16LE(BLOCK_ALIGN, 32);
  header.writeUInt16LE(BITS, 34);
  header.write('data', 36, 4, 'ascii');
  header.writeUInt32LE(dataLength, 40);
  return header;
}

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const activeRef = useRef(false);
  const bytesRef = useRef(0);
  const chunksRef = useRef<Buffer[]>([]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { granted } = await requestRecordingPermissionsAsync();
    return granted;
  }, []);

  const start = useCallback(async (): Promise<StartResult> => {
    // Should be prevented by the UI (the mic gesture/press-target stays
    // mounted across the idle<->recording swap so it can't be re-triggered
    // mid-recording), but never silently no-op — a caller that treats "busy"
    // as "permission denied" produces a false repeat-permission-prompt loop.
    if (activeRef.current) return { ok: false, reason: 'busy' };
    const granted = await requestPermission();
    if (!granted) return { ok: false, reason: 'permission' };

    bytesRef.current = 0;
    chunksRef.current = [];
    setElapsedMs(0);

    AudioRecord.init({
      sampleRate: SAMPLE_RATE,
      channels: CHANNELS,
      bitsPerSample: BITS,
      audioSource: 6, // Android VOICE_RECOGNITION
      bufferSize: 8192,
      // The package's typings claim this makes the native side write a WAV
      // file (and that stop() hands back its path), but the actual Android
      // implementation never reads this option — it only streams PCM via
      // the 'data' event. Kept only to satisfy the (inaccurate) required
      // type; the real file is assembled in finish() below.
      wavFile: 'unused.wav',
    });

    // The only real audio the native module ever hands back — collect it so
    // finish() can write an actual WAV file. Also drives the live elapsed
    // counter (accurate, decoder-agnostic).
    AudioRecord.on('data', (chunk) => {
      const buf = Buffer.from(chunk, 'base64');
      chunksRef.current.push(buf);
      bytesRef.current += buf.byteLength;
      setElapsedMs(Math.round((bytesRef.current / BYTES_PER_SEC) * 1000));
    });

    AudioRecord.start();
    activeRef.current = true;
    setIsRecording(true);
    return { ok: true };
  }, [requestPermission]);

  const finish = useCallback(async (): Promise<RecorderResult | null> => {
    if (!activeRef.current) return null;
    activeRef.current = false;
    setIsRecording(false);
    // Fire-and-forget: the native stop() has no Promise/return value, it
    // only flips a flag the recording thread notices on its next loop.
    AudioRecord.stop();
    await new Promise((resolve) => setTimeout(resolve, DRAIN_MS));

    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (chunks.length === 0) return null;

    const pcm = Buffer.concat(chunks);
    const wav = Buffer.concat([buildWavHeader(pcm.byteLength), pcm]);

    try {
      const file = new File(Paths.cache, `dayfeed-rec-${Date.now()}.wav`);
      file.create({ intermediates: true, overwrite: true });
      file.write(new Uint8Array(wav.buffer, wav.byteOffset, wav.byteLength));
      return { uri: file.uri, durationMs: Math.round((pcm.byteLength / BYTES_PER_SEC) * 1000) };
    } catch {
      return null;
    }
  }, []);

  /** Stop and return the recorded WAV file + duration. */
  const stop = useCallback(async (): Promise<RecorderResult | null> => {
    const result = await finish();
    setElapsedMs(0);
    return result;
  }, [finish]);

  /** Stop and discard the file (slide-to-cancel). */
  const cancel = useCallback(async (): Promise<void> => {
    const result = await finish();
    setElapsedMs(0);
    if (!result) return;
    try {
      const f = new File(result.uri);
      if (f.exists) f.delete();
    } catch {
      // best effort
    }
  }, [finish]);

  return { isRecording, elapsedMs, start, stop, cancel, requestPermission };
}
