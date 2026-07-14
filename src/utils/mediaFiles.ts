// Photo-note file management. Images (camera captures or gallery picks) are copied
// into the app's document directory so notes never depend on volatile cache or
// external gallery URIs.
import { Directory, File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';

const PHOTO_DIRNAME = 'photos';

function photoDir(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIRNAME);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function extensionOf(uri: string): string {
  const clean = uri.split('?')[0];
  const dot = clean.lastIndexOf('.');
  if (dot === -1 || dot < clean.lastIndexOf('/')) return 'jpg';
  return clean.slice(dot + 1).toLowerCase().slice(0, 5) || 'jpg';
}

/** Copy one source image into permanent storage; returns the new file URI. */
export async function persistImage(sourceUri: string): Promise<string> {
  const dir = photoDir();
  const dest = new File(dir, `${randomUUID()}.${extensionOf(sourceUri)}`);
  const src = new File(sourceUri);
  src.copy(dest);
  return dest.uri;
}

/** Copy a batch of images (one capture session) into storage, in order. */
export async function persistImages(sourceUris: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const uri of sourceUris) {
    try {
      out.push(await persistImage(uri));
    } catch {
      // skip an image we couldn't copy rather than fail the whole note
    }
  }
  return out;
}

/** Delete a set of photo files. Best-effort; never throws. */
export async function deleteImageFiles(uris: string[]): Promise<void> {
  for (const uri of uris) {
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // ignore
    }
  }
}
