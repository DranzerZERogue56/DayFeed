import { setFlyTranscript } from '../db/flyNotes';
import { enqueueTranscription, transcriptionIdle } from './transcribeQueue';
import { transcribeAudio } from './transcription';

// Auto-transcription for Fly voice memos.
//
// Fly's whole point is that a day can be handed to a language model as text, so
// a memo that sits untranscribed is a hole in the story. Everywhere else in the
// app transcription is a deliberate tap; here it has to happen by itself.
//
// The serialisation this used to own now lives in lib/transcribeQueue, shared
// with the manual ✎ Transcribe button and voice dictation — a Fly memo landing
// mid-dictation used to make one of them fail with TranscriptionBusyError.

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
  void enqueueTranscription(async () => {
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
  return transcriptionIdle();
}
