import { requestRecordingPermissionsAsync } from 'expo-audio';
import AudioRecord from '@fugood/react-native-audio-pcm-stream';
import { Buffer } from 'buffer';
import { useCallback, useRef, useState } from 'react';
import { File } from 'expo-file-system';

// Voice recording for DayFeed. Records 16 kHz mono 16-bit PCM WAV via a native
// PCM stream — the format whisper.rn requires — because the Expo audio modules
// cannot produce WAV on Android. The module writes the WAV itself; stop()
// returns its path. Only the mic permission comes from expo-audio.
export interface RecorderResult {
  uri: string;
  durationMs: number;
}

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BITS = 16;
const BYTES_PER_SEC = (SAMPLE_RATE * CHANNELS * BITS) / 8; // 32000

function withScheme(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const activeRef = useRef(false);
  const bytesRef = useRef(0);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { granted } = await requestRecordingPermissionsAsync();
    return granted;
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (activeRef.current) return false;
    const granted = await requestPermission();
    if (!granted) return false;

    bytesRef.current = 0;
    setElapsedMs(0);

    AudioRecord.init({
      sampleRate: SAMPLE_RATE,
      channels: CHANNELS,
      bitsPerSample: BITS,
      audioSource: 6, // Android VOICE_RECOGNITION
      wavFile: `dayfeed-rec-${Date.now()}.wav`,
      bufferSize: 8192,
    });

    // Track duration from the PCM byte count (accurate, decoder-agnostic).
    AudioRecord.on('data', (chunk) => {
      bytesRef.current += Buffer.from(chunk, 'base64').byteLength;
      setElapsedMs(Math.round((bytesRef.current / BYTES_PER_SEC) * 1000));
    });

    AudioRecord.start();
    activeRef.current = true;
    setIsRecording(true);
    return true;
  }, [requestPermission]);

  const finish = useCallback(async (): Promise<string | null> => {
    if (!activeRef.current) return null;
    activeRef.current = false;
    setIsRecording(false);
    try {
      const path = await AudioRecord.stop();
      return path ? withScheme(path) : null;
    } catch {
      return null;
    }
  }, []);

  /** Stop and return the recorded WAV file + duration. */
  const stop = useCallback(async (): Promise<RecorderResult | null> => {
    const uri = await finish();
    const durationMs = Math.round((bytesRef.current / BYTES_PER_SEC) * 1000);
    setElapsedMs(0);
    if (!uri) return null;
    return { uri, durationMs };
  }, [finish]);

  /** Stop and discard the file (slide-to-cancel). */
  const cancel = useCallback(async (): Promise<void> => {
    const uri = await finish();
    setElapsedMs(0);
    if (!uri) return;
    try {
      const f = new File(uri);
      if (f.exists) f.delete();
    } catch {
      // best effort
    }
  }, [finish]);

  return { isRecording, elapsedMs, start, stop, cancel, requestPermission };
}
