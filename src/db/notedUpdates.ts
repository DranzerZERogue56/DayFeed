// Noted-updates: the scratch list of notes written to be pasted into a Claude
// prompt. Separate from `notes` on purpose — see MIGRATION_V9.
import { randomUUID } from 'expo-crypto';
import { getDb } from './connection';

export interface NotedUpdate {
  id: string;
  content: string;
  created_at: number;
}

/** Append an update. Oldest-first ordering elsewhere makes this a push. */
export async function addNotedUpdate(content: string): Promise<NotedUpdate> {
  const db = await getDb();
  const row: NotedUpdate = {
    id: randomUUID(),
    content,
    created_at: Date.now(),
  };
  await db.runAsync(
    `INSERT INTO noted_updates (id, content, created_at) VALUES (?, ?, ?)`,
    row.id,
    row.content,
    row.created_at,
  );
  return row;
}

/** Oldest-first: the list reads in the order the thoughts arrived. */
export async function getNotedUpdates(): Promise<NotedUpdate[]> {
  const db = await getDb();
  return db.getAllAsync<NotedUpdate>(
    `SELECT * FROM noted_updates ORDER BY created_at ASC`,
  );
}

export async function updateNotedUpdate(id: string, content: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE noted_updates SET content = ? WHERE id = ?`, content, id);
}

export async function deleteNotedUpdate(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM noted_updates WHERE id = ?`, id);
}

/** Empty the list — for after the updates have been copied out and used. */
export async function clearNotedUpdates(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM noted_updates`);
}
