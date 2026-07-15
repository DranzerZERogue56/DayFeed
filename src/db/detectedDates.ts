import { randomUUID } from 'expo-crypto';
import { getDb } from './connection';
import type { Note } from './types';

// A date parsed out of a note's text/transcript (chrono-node), pointing at the
// day the note *refers to* (date_key), distinct from the note's own day_key.
export interface DetectedDate {
  id: string;
  note_id: string;
  date_key: string;
  snippet: string;
}

/** One matched date phrase to insert for a note. */
export interface DetectedDateInput {
  date_key: string;
  snippet: string;
}

/** An agenda row: a detected date joined to a preview of its source note. */
export interface AgendaEntry extends DetectedDate {
  note: Note;
}

/** Insert detected dates for a note. No-op on an empty list. */
export async function addDetectedDates(
  noteId: string,
  entries: DetectedDateInput[],
): Promise<void> {
  if (entries.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const e of entries) {
      await db.runAsync(
        `INSERT INTO detected_dates (id, note_id, date_key, snippet) VALUES (?, ?, ?, ?)`,
        randomUUID(),
        noteId,
        e.date_key,
        e.snippet,
      );
    }
  });
}

// SELECT that hydrates the joined note columns (prefixed) alongside the
// detected_date columns so we can rebuild both objects in one query.
const AGENDA_SELECT = `
SELECT
  d.id AS d_id, d.note_id AS d_note_id, d.date_key AS d_date_key, d.snippet AS d_snippet,
  n.id, n.type, n.content, n.transcript, n.audio_uri, n.duration_ms,
  n.created_at, n.day_key, n.tags, n.media_uris
FROM detected_dates d
JOIN notes n ON n.id = d.note_id
`;

interface JoinedRow extends Note {
  d_id: string;
  d_note_id: string;
  d_date_key: string;
  d_snippet: string;
}

function toAgendaEntry(r: JoinedRow): AgendaEntry {
  return {
    id: r.d_id,
    note_id: r.d_note_id,
    date_key: r.d_date_key,
    snippet: r.d_snippet,
    note: {
      id: r.id,
      type: r.type,
      content: r.content,
      transcript: r.transcript,
      audio_uri: r.audio_uri,
      duration_ms: r.duration_ms,
      created_at: r.created_at,
      day_key: r.day_key,
      tags: r.tags,
      media_uris: r.media_uris,
    },
  };
}

/** All agenda entries, chronological by the date they refer to. */
export async function getAgendaEntries(): Promise<AgendaEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<JoinedRow>(
    `${AGENDA_SELECT} ORDER BY d.date_key ASC, n.created_at ASC`,
  );
  return rows.map(toAgendaEntry);
}

/** Agenda entries that refer to a specific day (for the Flip day-page section). */
export async function getDetectedDatesForDay(dayKey: string): Promise<AgendaEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<JoinedRow>(
    `${AGENDA_SELECT} WHERE d.date_key = ? ORDER BY n.created_at ASC`,
    dayKey,
  );
  return rows.map(toAgendaEntry);
}

/** Distinct date_keys that have at least one agenda entry (for Flip badges). */
export async function getDayKeysWithAgenda(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date_key: string }>(
    `SELECT DISTINCT date_key FROM detected_dates ORDER BY date_key ASC`,
  );
  return rows.map((r) => r.date_key);
}
