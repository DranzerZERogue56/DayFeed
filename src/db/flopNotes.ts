import { randomUUID } from 'expo-crypto';
import { getDb } from './index';
import {
  emptyCounts,
  flopTitle,
  type FlopChildRelation,
  type FlopCrumb,
  type FlopNote,
  type FlopRoot,
  type NewFlopNoteInput,
  type RelationCounts,
} from './flopTypes';

/** Insert a Flop note at the end of its sibling group. */
export async function createFlopNote(input: NewFlopNoteInput): Promise<FlopNote> {
  const db = await getDb();
  const now = Date.now();
  const parent_id = input.parent_id ?? null;
  const relation = parent_id === null ? 'root' : input.relation;

  const row = await db.getFirstAsync<{ next: number | null }>(
    `SELECT MAX(sort_order) + 1 AS next FROM flop_notes
      WHERE parent_id IS ? AND relation = ?`,
    parent_id,
    relation,
  );

  const note: FlopNote = {
    id: randomUUID(),
    parent_id,
    relation,
    type: input.type,
    content: input.content ?? null,
    audio_uri: input.audio_uri ?? null,
    duration_ms: input.duration_ms ?? null,
    transcript: null,
    created_at: now,
    updated_at: now,
    sort_order: row?.next ?? 0,
  };

  await db.runAsync(
    `INSERT INTO flop_notes
       (id, parent_id, relation, type, content, audio_uri, duration_ms, transcript,
        created_at, updated_at, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    note.id,
    note.parent_id,
    note.relation,
    note.type,
    note.content,
    note.audio_uri,
    note.duration_ms,
    note.transcript,
    note.created_at,
    note.updated_at,
    note.sort_order,
  );
  return note;
}

/** Edit a Flop note's body. Bumps updated_at (which orders the root list). */
export async function updateFlopNote(id: string, content: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE flop_notes SET content = ?, updated_at = ? WHERE id = ?`,
    content,
    Date.now(),
    id,
  );
}

/** Persist an on-device transcript for a voice Flop note. */
export async function setFlopTranscript(id: string, transcript: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE flop_notes SET transcript = ?, updated_at = ? WHERE id = ?`,
    transcript,
    Date.now(),
    id,
  );
}

/** Change a child's relation, moving it to the end of its new sibling group. */
export async function setFlopRelation(id: string, relation: FlopChildRelation): Promise<void> {
  const db = await getDb();
  const note = await getFlopNote(id);
  if (!note || note.parent_id === null || note.relation === relation) return;

  const row = await db.getFirstAsync<{ next: number | null }>(
    `SELECT MAX(sort_order) + 1 AS next FROM flop_notes WHERE parent_id IS ? AND relation = ?`,
    note.parent_id,
    relation,
  );
  await db.runAsync(
    `UPDATE flop_notes SET relation = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
    relation,
    row?.next ?? 0,
    Date.now(),
    id,
  );
}

/**
 * Move a child one position up or down among the siblings it shares a parent and
 * relation with, by swapping sort_order with its neighbour.
 */
export async function moveFlopNote(id: string, direction: 'up' | 'down'): Promise<void> {
  const db = await getDb();
  const note = await getFlopNote(id);
  if (!note) return;

  const siblings = await db.getAllAsync<FlopNote>(
    `SELECT * FROM flop_notes WHERE parent_id IS ? AND relation = ?
      ORDER BY sort_order ASC, created_at ASC`,
    note.parent_id,
    note.relation,
  );
  const i = siblings.findIndex((s) => s.id === id);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= siblings.length) return;

  const other = siblings[j];
  // Siblings can share a sort_order (legacy/equal values), so renumber the whole
  // group from the swapped order rather than trading two values that may match.
  const reordered = [...siblings];
  reordered[i] = other;
  reordered[j] = note;
  await db.withTransactionAsync(async () => {
    for (let k = 0; k < reordered.length; k++) {
      await db.runAsync(`UPDATE flop_notes SET sort_order = ? WHERE id = ?`, k, reordered[k].id);
    }
  });
}

/** Root-level Flop notes, newest-touched first, each with its direct-child counts. */
export async function getRootFlopNotes(): Promise<FlopRoot[]> {
  const db = await getDb();
  const roots = await db.getAllAsync<FlopNote>(
    `SELECT * FROM flop_notes WHERE parent_id IS NULL ORDER BY updated_at DESC`,
  );
  const counts = await db.getAllAsync<{
    parent_id: string;
    relation: FlopChildRelation;
    n: number;
  }>(
    `SELECT parent_id, relation, COUNT(*) AS n FROM flop_notes
      WHERE parent_id IS NOT NULL GROUP BY parent_id, relation`,
  );

  const byParent = new Map<string, RelationCounts>();
  for (const c of counts) {
    const entry = byParent.get(c.parent_id) ?? emptyCounts();
    entry[c.relation] = c.n;
    byParent.set(c.parent_id, entry);
  }
  return roots.map((r) => ({ ...r, counts: byParent.get(r.id) ?? emptyCounts() }));
}

/** A single Flop note. */
export async function getFlopNote(id: string): Promise<FlopNote | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<FlopNote>(`SELECT * FROM flop_notes WHERE id = ?`, id);
  return row ?? null;
}

/** Direct children of a note, ordered by sort_order within each relation group. */
export async function getFlopChildren(parentId: string): Promise<FlopNote[]> {
  const db = await getDb();
  return db.getAllAsync<FlopNote>(
    `SELECT * FROM flop_notes WHERE parent_id = ?
      ORDER BY sort_order ASC, created_at ASC`,
    parentId,
  );
}

/** Direct-child counts by relation for one note (drives child cards' badges). */
export async function getFlopChildCounts(parentId: string): Promise<RelationCounts> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ relation: FlopChildRelation; n: number }>(
    `SELECT relation, COUNT(*) AS n FROM flop_notes WHERE parent_id = ? GROUP BY relation`,
    parentId,
  );
  const counts = emptyCounts();
  for (const r of rows) counts[r.relation] = r.n;
  return counts;
}

/** Ancestors of a note, root-first, excluding the note itself. Feeds the breadcrumb. */
export async function getFlopAncestors(id: string): Promise<FlopCrumb[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    content: string | null;
    type: 'text' | 'voice';
    transcript: string | null;
    depth: number;
  }>(
    `WITH RECURSIVE chain(id, parent_id, content, type, transcript, depth) AS (
       SELECT id, parent_id, content, type, transcript, 0 FROM flop_notes WHERE id = ?
       UNION ALL
       SELECT f.id, f.parent_id, f.content, f.type, f.transcript, chain.depth + 1
         FROM flop_notes f JOIN chain ON f.id = chain.parent_id
     )
     SELECT id, content, type, transcript, depth FROM chain WHERE depth > 0
      ORDER BY depth DESC`,
    id,
  );
  return rows.map((r) => ({ id: r.id, title: flopTitle(r) }));
}

/** How many notes a delete would take with it (the whole subtree, excluding the note). */
export async function countFlopDescendants(id: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `WITH RECURSIVE sub(id) AS (
       SELECT id FROM flop_notes WHERE parent_id = ?
       UNION ALL
       SELECT f.id FROM flop_notes f JOIN sub ON f.parent_id = sub.id
     )
     SELECT COUNT(*) AS n FROM sub`,
    id,
  );
  return row?.n ?? 0;
}

/** Every audio file in a note's subtree (including its own), for cleanup on delete. */
export async function getFlopSubtreeAudioUris(id: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ audio_uri: string }>(
    `WITH RECURSIVE sub(id) AS (
       SELECT id FROM flop_notes WHERE id = ?
       UNION ALL
       SELECT f.id FROM flop_notes f JOIN sub ON f.parent_id = sub.id
     )
     SELECT audio_uri FROM flop_notes
      WHERE id IN (SELECT id FROM sub) AND audio_uri IS NOT NULL`,
    id,
  );
  return rows.map((r) => r.audio_uri);
}

/** Delete a note; the self-referencing FK cascades to the entire subtree. */
export async function deleteFlopNote(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM flop_notes WHERE id = ?`, id);
}

/** Count of all Flop notes (used by the seed script). */
export async function countFlopNotes(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM flop_notes`);
  return row?.n ?? 0;
}
