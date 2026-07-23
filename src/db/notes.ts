import { randomUUID } from 'expo-crypto';
import { getDb } from './connection';
import { dayKeyFromMs } from '../utils/date';
import type { NewNoteInput, Note } from './types';

/** Insert a note. id/created_at/day_key are derived here; day_key is stored once. */
export async function createNote(input: NewNoteInput): Promise<Note> {
  const db = await getDb();
  const created_at = input.created_at ?? Date.now();
  const note: Note = {
    id: randomUUID(),
    type: input.type,
    content: input.content ?? null,
    transcript: input.transcript ?? null,
    audio_uri: input.audio_uri ?? null,
    duration_ms: input.duration_ms ?? null,
    created_at,
    day_key: dayKeyFromMs(created_at),
    tags: JSON.stringify(input.tags ?? []),
    media_uris: input.media_uris ? JSON.stringify(input.media_uris) : null,
    ocr_text: null,
  };
  await db.runAsync(
    `INSERT INTO notes
       (id, type, content, transcript, audio_uri, duration_ms, created_at, day_key, tags, media_uris)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    note.id,
    note.type,
    note.content,
    note.transcript,
    note.audio_uri,
    note.duration_ms,
    note.created_at,
    note.day_key,
    note.tags,
    note.media_uris,
  );
  return note;
}

/** Persist a transcript for a voice note (set once, after on-device transcription). */
export async function setTranscript(id: string, transcript: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE notes SET transcript = ? WHERE id = ?`, transcript, id);
}

/** Persist OCR text for a photo note (set once, after on-device text recognition). */
export async function setOcrText(id: string, text: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE notes SET ocr_text = ? WHERE id = ?`, text, id);
}

/** All notes for a single day, oldest-first (chat/notebook reading order). */
export async function getNotesByDay(dayKey: string): Promise<Note[]> {
  const db = await getDb();
  return db.getAllAsync<Note>(
    `SELECT * FROM notes WHERE day_key = ? ORDER BY created_at ASC`,
    dayKey,
  );
}

export interface GetAllOptions {
  type?: 'text' | 'voice' | 'photo';
  /** Case-insensitive match against content and transcript. */
  search?: string;
}

/** All notes newest-first, optionally filtered by type and/or free-text search. */
export async function getAllNotes(opts: GetAllOptions = {}): Promise<Note[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (opts.type) {
    where.push('type = ?');
    params.push(opts.type);
  }
  const term = opts.search?.trim();
  if (term) {
    where.push('(content LIKE ? OR transcript LIKE ? OR ocr_text LIKE ?)');
    const like = `%${term}%`;
    params.push(like, like, like);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db.getAllAsync<Note>(
    `SELECT * FROM notes ${clause} ORDER BY created_at DESC`,
    ...params,
  );
}

/** Distinct day_keys that contain at least one note, ascending. */
export async function getDayKeysWithNotes(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day_key: string }>(
    `SELECT DISTINCT day_key FROM notes ORDER BY day_key ASC`,
  );
  return rows.map((r) => r.day_key);
}

/** Look up a single note (used to fetch a voice note's audio_uri before delete). */
export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Note>(`SELECT * FROM notes WHERE id = ?`, id);
  return row ?? null;
}

/** Delete a note by id. */
export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM notes WHERE id = ?`, id);
}

/** Count of all notes (used by the seed script). */
export async function countNotes(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM notes`);
  return row?.n ?? 0;
}
