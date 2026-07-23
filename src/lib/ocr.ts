import TextRecognition from '@react-native-ml-kit/text-recognition';

// On-device OCR via Google ML Kit's text recognizer (Apple Vision on iOS).
// Fully local — nothing is uploaded — though on Android the recognizer model
// itself is delivered by Google Play Services on first use, not bundled in
// the APK the way whisper's ggml model is.

let jobActive = false;

export function isOcrBusy(): boolean {
  return jobActive;
}

export class OcrBusyError extends Error {
  constructor() {
    super('A text extraction job is already running.');
    this.name = 'OcrBusyError';
  }
}

/**
 * Run on-device text recognition over one or more photo URIs and join the
 * non-empty results into a single combined block. Enforces a single
 * concurrent job (independent of the whisper transcription busy-flag).
 */
export async function recognizeText(imageUris: string[]): Promise<string> {
  if (jobActive) throw new OcrBusyError();
  jobActive = true;
  try {
    const blocks: string[] = [];
    for (const uri of imageUris) {
      const result = await TextRecognition.recognize(uri);
      const text = result.text.trim();
      if (text) blocks.push(text);
    }
    return blocks.join('\n\n');
  } finally {
    jobActive = false;
  }
}
