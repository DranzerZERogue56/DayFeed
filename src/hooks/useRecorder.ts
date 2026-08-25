import { Buffer } from 'buffer';
import { useCallback, useRef, useState } from 'react';
import { acquire, ensureMicPermission, release } from '../lib/micBus';
import { deleteWav, durationMsForBytes, writeWavToCache } from '../lib/wavFile';

// Voice recording for DayFeed. Records 16 kHz mono 16-bit PCM — the format
// whisper.rn requires — because the Expo audio modules cannot produce raw
// PCM/WAV on Android.
//
// IMPORTANT: the underlying native module only *streams* PCM chunks; its stop()
// does NOT write a file or hand back a path, despite earlier code here assuming
// it did. That meant every recording was silently discarded (a real, saved WAV
// file never existed). We assemble the WAV file ourselves in JS from the
// streamed chunks, which is the only way this module can produce a real file.
//
// The mic itself is reached through lib/micBus rather than directly, because
// the native module allows exactly one 'data' listener process-wide and
// re-registering steals it from whoever had it. micBus arbitrates; this hook
// is just one of its owners, and the highest-priority one, so starting a
// recording preempts the wake-word listener and releasing hands it back.
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
   * loop even though access was already granted. 'unavailable' means the
   * native recorder refused to initialise, which in practice means another
   * app is holding the microphone; permission is fine and Settings won't help.
   */
  reason?: 'permission' | 'busy' | 'unavailable';
}

// The native recording thread keeps reading for a moment after stop() sets
// its flag, so a few more 'data' events land after we ask it to stop. Give
// them a beat to arrive before assembling the file, or the tail of every
// note gets clipped.
const DRAIN_MS = 250;

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const activeRef = useRef(false);
  const bytesRef = useRef(0);
  const chunksRef = useRef<Buffer[]>([]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    return ensureMicPermission();
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

    // The only real audio the native module ever hands back — collect it so
    // finish() can write an actual WAV file. Also drives the live elapsed
    // counter (accurate, decoder-agnostic).
    const ok = await acquire('recorder', (buf) => {
      chunksRef.current.push(buf);
      bytesRef.current += buf.byteLength;
      setElapsedMs(durationMsForBytes(bytesRef.current));
    });
    if (!ok) return { ok: false, reason: 'unavailable' };

    activeRef.current = true;
    setIsRecording(true);
    return { ok: true };
  }, [requestPermission]);

  const finish = useCallback(async (): Promise<RecorderResult | null> => {
    if (!activeRef.current) return null;
    activeRef.current = false;
    setIsRecording(false);
    // Keep collecting for one more beat, THEN release. The audio between the
    // last delivered chunk and the finger lift is still sitting in the native
    // buffer; letting it arrive is the difference between a clean tail and a
    // clipped one. Releasing first would either stop the stream outright or
    // hand it to the wake listener, and that audio would be lost either way.
    await new Promise((resolve) => setTimeout(resolve, DRAIN_MS));
    release('recorder');

    const chunks = chunksRef.current;
    chunksRef.current = [];
    return writeWavToCache(chunks, 'dayfeed-rec');
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
    deleteWav(result.uri);
  }, [finish]);

  return { isRecording, elapsedMs, start, stop, cancel, requestPermission };
}
