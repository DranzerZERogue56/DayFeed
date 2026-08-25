import { Buffer } from 'buffer';
import { File, Paths } from 'expo-file-system';
import { BITS, BYTES_PER_SEC, CHANNELS, SAMPLE_RATE } from './micBus';

// Assembling a real WAV file out of streamed PCM.
//
// The native mic module only ever hands back raw PCM chunks — it writes no file
// and returns no path, despite what its typings claim. Every feature that wants
// an audio file (hold-to-record, voice dictation) has to build one itself, and
// whisper.rn decodes PCM WAV only, so this is the format that matters.

const BLOCK_ALIGN = (CHANNELS * BITS) / 8;
const HEADER_BYTES = 44;

/** A 44-byte canonical RIFF/PCM header for `dataLength` bytes of samples. */
export function buildWavHeader(dataLength: number): Buffer {
  const header = Buffer.alloc(HEADER_BYTES);
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

/** Milliseconds of audio in `byteLength` bytes of this PCM format. */
export function durationMsForBytes(byteLength: number): number {
  return Math.round((byteLength / BYTES_PER_SEC) * 1000);
}

export interface WavFile {
  uri: string;
  durationMs: number;
}

/**
 * Concatenate streamed PCM chunks into a WAV file in the cache directory.
 *
 * Returns null rather than throwing: every caller is on a gesture or a voice
 * path where the useful response to a failed write is to drop the recording,
 * not to interrupt the user with a file-system error.
 */
export function writeWavToCache(chunks: Buffer[], prefix: string): WavFile | null {
  if (chunks.length === 0) return null;
  const pcm = Buffer.concat(chunks);
  const wav = Buffer.concat([buildWavHeader(pcm.byteLength), pcm]);
  try {
    const file = new File(Paths.cache, `${prefix}-${Date.now()}.wav`);
    file.create({ intermediates: true, overwrite: true });
    file.write(new Uint8Array(wav.buffer, wav.byteOffset, wav.byteLength));
    return { uri: file.uri, durationMs: durationMsForBytes(pcm.byteLength) };
  } catch {
    return null;
  }
}

/** Best-effort delete of a cache WAV that is no longer needed. */
export function deleteWav(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Cache dir; the OS reclaims it either way.
  }
}
