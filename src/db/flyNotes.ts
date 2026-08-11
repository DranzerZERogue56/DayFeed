import { randomUUID } from 'expo-crypto';
import { getDb } from './connection';
import { dayKeyFromMs } from '../utils/date';
import type { FlyNote, NewFlyNoteInput } from './flyTypes';

// Fly entries live in their own table rather than in `notes`, for the same
// reason `noted_updates` does (see MIGRATION_V9): they must not surface in the
// Feed, the Agenda, search, or the expiry sweep. A Fly day is a journal, not a
// stream — the two are kept apart on purpose.

/** Insert a Fly entry. id/created_at/day_key are derived here. */
export async function createFlyNote(input: NewFlyNoteInput): Promise<FlyNote> {
  const db = await getDb();
  const created_at = input.created_at ?? Date.now();
  const note: FlyNote = {
    id: randomUUID(),
    type: input.type,
    content: input.content ?? null,
    audio_uri: input.audio_uri ?? null,
    duration_ms: input.duration_ms ?? null,
    transcript: null,
    created_at,
    day_key: dayKeyFromMs(created_at),
  };
  await db.runAsync(
    `INSERT INTO fly_notes
       (id, type, content, audio_uri, duration_ms, transcript, created_at, day_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    note.id,
    note.type,
    note.content,
    note.audio_uri,
    note.duration_ms,
    note.transcript,
    note.created_at,
    note.day_key,
  );
  return note;
}

/** One day's entries, oldest-first — the order the day happened in. */
export async function getFlyNotesByDay(dayKey: string): Promise<FlyNote[]> {
  const db = await getDb();
  return db.getAllAsync<FlyNote>(
    `SELECT * FROM fly_notes WHERE day_key = ? ORDER BY created_at ASC`,
    dayKey,
  );
}

/** Persist an on-device transcript for a Fly voice memo. */
export async function setFlyTranscript(id: string, transcript: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE fly_notes SET transcript = ? WHERE id = ?`, transcript, id);
}

/** Overwrite a text entry's body. */
export async function updateFlyNoteContent(id: string, content: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE fly_notes SET content = ? WHERE id = ?`, content, id);
}

/** A single entry — used to find its audio file before deleting the row. */
export async function getFlyNote(id: string): Promise<FlyNote | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<FlyNote>(`SELECT * FROM fly_notes WHERE id = ?`, id);
  return row ?? null;
}

/** Delete an entry by id. The caller deletes its audio file. */
export async function deleteFlyNote(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM fly_notes WHERE id = ?`, id);
}

/** Distinct day_keys that have entries, ascending. Dots the date picker. */
export async function getFlyDayKeys(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day_key: string }>(
    `SELECT DISTINCT day_key FROM fly_notes ORDER BY day_key ASC`,
  );
  return rows.map((r) => r.day_key);
}

/** How many entries a day holds. Drives the "yesterday isn't done" nudge. */
export async function countFlyNotesForDay(dayKey: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM fly_notes WHERE day_key = ?`,
    dayKey,
  );
  return row?.n ?? 0;
}
