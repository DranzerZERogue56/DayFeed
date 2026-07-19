// Voice-note file management. Recordings land in the cache dir; we move them into
// the app's document directory so they survive restarts and cache eviction.
import { Directory, File, Paths } from 'expo-file-system';

const VOICE_DIRNAME = 'voice-notes';

function voiceDir(): Directory {
  const dir = new Directory(Paths.document, VOICE_DIRNAME);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/**
 * Move a freshly recorded file (usually a cache URI) into permanent storage.
 * Returns the new persistent file URI.
 */
export async function persistRecording(sourceUri: string, id: string): Promise<string> {
  const dir = voiceDir();
  const ext = extensionOf(sourceUri) || 'm4a';
  const dest = new File(dir, `${id}.${ext}`);
  const src = new File(sourceUri);
  if (dest.exists) dest.delete();
  src.move(dest);
  return dest.uri;
}

/**
 * Copy an existing voice-note file under a new id, leaving the original in
 * place. Used when promoting a Feed note to Flop: each note owns its file, so
 * deleting either note can't strand the other's audio.
 */
export async function copyAudioFile(sourceUri: string, id: string): Promise<string> {
  const dir = voiceDir();
  const ext = extensionOf(sourceUri) || 'm4a';
  const dest = new File(dir, `${id}.${ext}`);
  const src = new File(sourceUri);
  if (dest.exists) dest.delete();
  src.copy(dest);
  return dest.uri;
}

/** Delete a voice-note file. Never throws. */
export async function deleteAudioFile(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // best-effort cleanup
  }
}

function extensionOf(uri: string): string | null {
  const clean = uri.split('?')[0];
  const dot = clean.lastIndexOf('.');
  if (dot === -1 || dot < clean.lastIndexOf('/')) return null;
  return clean.slice(dot + 1).toLowerCase();
}
