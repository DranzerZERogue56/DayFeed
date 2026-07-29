import TextRecognition from '@react-native-ml-kit/text-recognition';
import { stripOcrNoise } from './ocrNoise';
import { normalizeOcrMarkers } from './ocrMarkdown';

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
    const perImage: string[] = [];
    for (const uri of imageUris) {
      const result = await TextRecognition.recognize(uri);
      // ML Kit groups recognized lines into blocks (paragraphs/columns) —
      // joining those with blank lines keeps a photo's real layout (e.g. a
      // receipt's line items) instead of flattening the whole image into one
      // run-on paragraph via the SDK's own flattened result.text.
      const layout = result.blocks
        .map((b) => b.text.trim())
        .filter(Boolean)
        .join('\n\n');
      const cleaned = stripOcrNoise(layout);
      const text = normalizeOcrMarkers(cleaned);
      if (text) perImage.push(text);
    }
    return perImage.join('\n\n');
  } finally {
    jobActive = false;
  }
}
