import { initWhisper, type WhisperContext } from 'whisper.rn';

// On-device transcription via whisper.rn (whisper.cpp). The base model is bundled
// as an app asset and the context is initialized lazily on first use. Only one
// transcription job runs at a time.
//
// Audio format: whisper.rn decodes **PCM WAV only**. Voice notes are recorded as
// 16 kHz mono WAV by useRecorder (via a native PCM stream, since the Expo audio
// modules can't produce WAV on Android), so they feed the model directly.

// The bundled model. Drop `ggml-base.bin` into assets/models/ (see README). Metro
// is configured to treat .bin as an asset (metro.config.js -> assetExts).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BASE_MODEL = require('../../assets/models/ggml-base.bin');

let contextPromise: Promise<WhisperContext> | null = null;
let jobActive = false;

/** Lazily initialize (once) the whisper context from the bundled base model. */
export async function getWhisperContext(): Promise<WhisperContext> {
  if (!contextPromise) {
    contextPromise = initWhisper({ filePath: BASE_MODEL }).catch((err: unknown) => {
      // Allow a later retry if init failed (e.g., model asset missing).
      contextPromise = null;
      throw err;
    });
  }
  return contextPromise;
}

export function isTranscriptionBusy(): boolean {
  return jobActive;
}

export class TranscriptionBusyError extends Error {
  constructor() {
    super('A transcription job is already running.');
    this.name = 'TranscriptionBusyError';
  }
}

/** strip the file:// scheme; whisper.rn reads a plain filesystem path. */
function toPath(uri: string): string {
  return uri.startsWith('file://') ? decodeURIComponent(uri.replace('file://', '')) : uri;
}

/**
 * Transcribe a voice note's audio file to text on-device. Enforces a single
 * concurrent job. Runs off the JS thread inside the native module; the returned
 * promise resolves when the (native, async) job completes.
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  if (jobActive) throw new TranscriptionBusyError();
  jobActive = true;
  try {
    const ctx = await getWhisperContext();
    const { promise } = ctx.transcribe(toPath(audioUri), {
      language: 'en',
    });
    const result = await promise;
    return (result.result ?? '').trim();
  } finally {
    jobActive = false;
  }
}
