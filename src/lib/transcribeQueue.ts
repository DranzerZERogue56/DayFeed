// One queue for every transcription in the app.
//
// lib/transcription.ts allows exactly one native whisper job at a time and
// throws TranscriptionBusyError on a second. Three features now want to
// transcribe — the manual ✎ Transcribe button, Fly's auto-transcription, and
// voice dictation — and any two of them overlapping used to surface as a
// "Please wait" alert for something the user often never asked for.
//
// A queue rather than a retry loop: chaining onto a module-level promise means
// each job simply waits for the one before it, in the order they were asked
// for, and nobody has to handle busy-ness at all.
//
// Module-level, not per-screen: the chain has to outlive a screen unmount, or
// navigating away mid-job would strand the queue.
let chain: Promise<unknown> = Promise.resolve();

/**
 * Run `job` once every previously queued job has finished.
 *
 * The returned promise settles with the job's own result — so callers that
 * care (dictation, the manual button) can await it and surface a failure,
 * while fire-and-forget callers (Fly) can ignore it. A rejected job does not
 * poison the queue for the jobs behind it.
 */
export function enqueueTranscription<T>(job: () => Promise<T>): Promise<T> {
  const result = chain.then(job, job);
  chain = result.catch(() => undefined);
  return result;
}

/** Test/debug hook: resolves once the queue has drained. */
export function transcriptionIdle(): Promise<void> {
  return chain.then(
    () => undefined,
    () => undefined,
  );
}
