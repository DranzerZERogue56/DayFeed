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
  /** Scheduled notification id, or null when no reminder is set (v1.3). */
  reminder_id: string | null;
  /** The chosen fire time (v1.5.4) — null alongside a null reminder_id. */
  reminder_hour: number | null;
  reminder_minute: number | null;
  /** When this entry was ticked off (epoch ms), or null while outstanding. */
  completed_at: number | null;
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
  d.reminder_id AS d_reminder_id, d.reminder_hour AS d_reminder_hour, d.reminder_minute AS d_reminder_minute,
  d.completed_at AS d_completed_at,
  n.id, n.type, n.content, n.transcript, n.audio_uri, n.duration_ms,
  n.created_at, n.day_key, n.tags, n.media_uris, n.expires_at
FROM detected_dates d
JOIN notes n ON n.id = d.note_id
`;

interface JoinedRow extends Note {
  d_id: string;
  d_note_id: string;
  d_date_key: string;
  d_snippet: string;
  d_reminder_id: string | null;
  d_reminder_hour: number | null;
  d_reminder_minute: number | null;
  d_completed_at: number | null;
}

function toAgendaEntry(r: JoinedRow): AgendaEntry {
  return {
    id: r.d_id,
    note_id: r.d_note_id,
    date_key: r.d_date_key,
    snippet: r.d_snippet,
    reminder_id: r.d_reminder_id,
    reminder_hour: r.d_reminder_hour,
    reminder_minute: r.d_reminder_minute,
    completed_at: r.d_completed_at,
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
      ocr_text: r.ocr_text,
      expires_at: r.expires_at,
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

/**
 * Delete all detected dates for a note (e.g. before re-detecting on a fresh
 * transcript, so an edit replaces its dates instead of piling up duplicates).
 * Callers should cancel any reminders via getReminderIdsForNote first.
 */
export async function deleteDetectedDatesForNote(noteId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM detected_dates WHERE note_id = ?`, noteId);
}

/**
 * Set or clear the scheduled-notification id (and its chosen fire time) for
 * one detected date. Omit `time` (or pass null) to clear both alongside a
 * null reminderId.
 */
/** Tick an agenda entry off, or pass null to reopen it. */
export async function setDetectedDateCompleted(
  id: string,
  completedAt: number | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE detected_dates SET completed_at = ? WHERE id = ?`, completedAt, id);
}

export async function setDetectedDateReminder(
  id: string,
  reminderId: string | null,
  time: { hour: number; minute: number } | null = null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE detected_dates SET reminder_id = ?, reminder_hour = ?, reminder_minute = ? WHERE id = ?`,
    reminderId,
    time?.hour ?? null,
    time?.minute ?? null,
    id,
  );
}

/**
 * Reminder ids attached to a note's detected dates. Fetched before the note is
 * deleted (the FK cascade takes the rows) so the OS notifications get cancelled.
 */
export async function getReminderIdsForNote(noteId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ reminder_id: string }>(
    `SELECT reminder_id FROM detected_dates WHERE note_id = ? AND reminder_id IS NOT NULL`,
    noteId,
  );
  return rows.map((r) => r.reminder_id);
}

/** Distinct date_keys that have at least one agenda entry (for Flip badges). */
export async function getDayKeysWithAgenda(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date_key: string }>(
    `SELECT DISTINCT date_key FROM detected_dates ORDER BY date_key ASC`,
  );
  return rows.map((r) => r.date_key);
}
