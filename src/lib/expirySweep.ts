// Deleting notes that have reached their 11:59 PM deadline.
//
// Lives outside NotesContext because the launch sweep runs before the provider
// tree exists — App.tsx clears expired notes before mounting the app, so one
// that outlived its deadline while the app was closed is never briefly visible.
// Both callers share this so the two paths can't drift.
import { deleteNote, getExpiredNotes, getReminderIdsForNote } from '../db';
import { parseMediaUris, type Note } from '../db/types';
import { cancelReminder } from './reminders';
import { deleteAudioFile } from '../utils/audioFiles';
import { deleteImageFiles } from '../utils/mediaFiles';

/**
 * Release everything a note owns outside its own row.
 *
 * Shared by manual deletes and the expiry sweep: duplicating it would mean an
 * expiring voice note leaves its audio file behind. `detected_dates` cascade
 * via the FK, but reminders live with the OS and files live on disk, so both
 * have to go by hand — and before the row does, since the row is how they are
 * found.
 */
export async function cleanupNote(note: Note): Promise<void> {
  if (note.audio_uri) await deleteAudioFile(note.audio_uri);
  const media = parseMediaUris(note);
  if (media.length) await deleteImageFiles(media);
  for (const rid of await getReminderIdsForNote(note.id)) await cancelReminder(rid);
}

/**
 * Delete every note past its deadline. Returns how many went, so callers can
 * skip a re-render when there was nothing to do — this runs on every launch
 * and every return to the foreground, and usually finds nothing.
 */
export async function sweepExpiredNotes(now: number = Date.now()): Promise<number> {
  const due = await getExpiredNotes(now);
  for (const note of due) {
    await cleanupNote(note);
    await deleteNote(note.id);
  }
  return due.length;
}
