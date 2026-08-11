import { setFlyTranscript } from '../db/flyNotes';
import { transcribeAudio } from './transcription';

// Serialised auto-transcription for Fly voice memos.
//
// Fly's whole point is that a day can be handed to a language model as text, so
// a memo that sits untranscribed is a hole in the story. Everywhere else in the
// app transcription is a deliberate tap; here it has to happen by itself.
//
// A queue rather than a retry loop: lib/transcription.ts allows exactly one
// native job at a time and throws TranscriptionBusyError on a second. Recording
// three memos in a row would lose two of them to that error. Chaining onto a
// module-level promise means each job simply waits for the one before it.
//
// Module-level, not per-screen: the chain has to outlive a screen unmount, or
// navigating away mid-job would strand the queue.
let chain: Promise<void> = Promise.resolve();

/**
 * Queue a Fly memo for transcription, writing the result when it lands.
 *
 * `onDone` fires after the row is written so the screen can re-read. Failures
 * are swallowed — the manual ✎ Transcribe button on the entry stays as the
 * fallback, and an alert for a job the user never asked for would be noise.
 */
export function enqueueFlyTranscription(
  id: string,
  audioUri: string,
  onDone?: () => void,
): void {
  chain = chain.then(async () => {
    try {
      const text = await transcribeAudio(audioUri);
      if (text) {
        await setFlyTranscript(id, text);
        onDone?.();
      }
    } catch {
      // Best-effort: the entry keeps its ✎ Transcribe button.
    }
  });
}

/** Test/debug hook: resolves once the queue has drained. */
export function flyTranscriptionIdle(): Promise<void> {
  return chain;
}
