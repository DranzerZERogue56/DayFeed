// Imported-document file management. Picked files are copied into the app's
// document directory so a Flop note never depends on a cache URI or a
// content:// grant that expires when the picker closes.
//
// On-disk names are UUIDs; the original filename lives in the flop_attachments
// row, which sidesteps collisions and characters the filesystem dislikes.
import { Directory, File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';

const ATTACHMENT_DIRNAME = 'attachments';

function attachmentDir(): Directory {
  const dir = new Directory(Paths.document, ATTACHMENT_DIRNAME);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function extensionOf(name: string): string {
  const clean = name.split('?')[0];
  const dot = clean.lastIndexOf('.');
  if (dot === -1 || dot < clean.lastIndexOf('/')) return '';
  return clean.slice(dot + 1).toLowerCase().slice(0, 8);
}

/** Copy a picked document into permanent storage; returns the new file URI. */
export async function persistDocument(sourceUri: string, name: string): Promise<string> {
  const dir = attachmentDir();
  const ext = extensionOf(name) || extensionOf(sourceUri);
  const dest = new File(dir, ext ? `${randomUUID()}.${ext}` : randomUUID());
  new File(sourceUri).copy(dest);
  return dest.uri;
}

/** Delete a set of attachment files. Best-effort; never throws. */
export async function deleteDocumentFiles(uris: string[]): Promise<void> {
  for (const uri of uris) {
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // ignore — a missing file is already in the state we want
    }
  }
}
