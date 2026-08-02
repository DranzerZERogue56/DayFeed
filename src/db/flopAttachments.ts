// Documents imported onto a Flop note. The row records the file's original
// name plus whatever text we could pull out of it; the file itself lives in
// the document directory (utils/attachmentFiles).
import { randomUUID } from 'expo-crypto';
import { getDb } from './connection';

export interface FlopAttachment {
  id: string;
  flop_id: string;
  /** The filename as the user picked it, not the on-disk name. */
  name: string;
  uri: string;
  mime: string | null;
  size: number | null;
  /** Text pulled from the document, or null (a PDF, or a file we couldn't read). */
  extracted_text: string | null;
  created_at: number;
}

export interface NewFlopAttachment {
  name: string;
  uri: string;
  mime?: string | null;
  size?: number | null;
  extractedText?: string | null;
}

export async function addFlopAttachment(
  flopId: string,
  input: NewFlopAttachment,
): Promise<FlopAttachment> {
  const db = await getDb();
  const row: FlopAttachment = {
    id: randomUUID(),
    flop_id: flopId,
    name: input.name,
    uri: input.uri,
    mime: input.mime ?? null,
    size: input.size ?? null,
    extracted_text: input.extractedText ?? null,
    created_at: Date.now(),
  };

  await db.runAsync(
    `INSERT INTO flop_attachments (id, flop_id, name, uri, mime, size, extracted_text, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.flop_id,
    row.name,
    row.uri,
    row.mime,
    row.size,
    row.extracted_text,
    row.created_at,
  );
  return row;
}

/** Attach the text after the fact, so a slow extraction never blocks the import. */
export async function setFlopAttachmentText(id: string, text: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE flop_attachments SET extracted_text = ? WHERE id = ?`, text, id);
}

export async function getFlopAttachments(flopId: string): Promise<FlopAttachment[]> {
  const db = await getDb();
  return db.getAllAsync<FlopAttachment>(
    `SELECT * FROM flop_attachments WHERE flop_id = ? ORDER BY created_at ASC`,
    flopId,
  );
}

/** Just the filenames, for listing a note's attachments in an export. */
export async function getFlopAttachmentNames(flopId: string): Promise<string[]> {
  const rows = await getFlopAttachments(flopId);
  return rows.map((r) => r.name);
}

export async function getFlopAttachment(id: string): Promise<FlopAttachment | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<FlopAttachment>(
    `SELECT * FROM flop_attachments WHERE id = ?`,
    id,
  );
  return row ?? null;
}

export async function deleteFlopAttachment(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM flop_attachments WHERE id = ?`, id);
}

/**
 * Every attachment file in a note's subtree (including its own), for cleanup on
 * delete. The twin of getFlopSubtreeAudioUris — the row cascade takes care of
 * the database, but the files on disk have to be removed by hand.
 */
export async function getFlopSubtreeAttachmentUris(id: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ uri: string }>(
    `WITH RECURSIVE sub(id) AS (
       SELECT id FROM flop_notes WHERE id = ?
       UNION ALL
       SELECT f.id FROM flop_notes f JOIN sub ON f.parent_id = sub.id
     )
     SELECT uri FROM flop_attachments WHERE flop_id IN (SELECT id FROM sub)`,
    id,
  );
  return rows.map((r) => r.uri);
}
