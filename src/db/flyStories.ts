import { getDb } from './connection';
import type { FlyStory } from './flyTypes';

// One consolidated story per Fly day. Keyed by day_key, so writing a story is
// an upsert — regenerating a day replaces it rather than accumulating versions.

/** The story for a day, or null if it hasn't been consolidated yet. */
export async function getFlyStory(dayKey: string): Promise<FlyStory | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<FlyStory>(
    `SELECT * FROM fly_stories WHERE day_key = ?`,
    dayKey,
  );
  return row ?? null;
}

/** Write (or overwrite) a day's story. created_at survives a rewrite. */
export async function saveFlyStory(dayKey: string, content: string): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO fly_stories (day_key, content, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(day_key) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
    dayKey,
    content,
    now,
    now,
  );
}

/** Remove a day's story, leaving its entries untouched. */
export async function deleteFlyStory(dayKey: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM fly_stories WHERE day_key = ?`, dayKey);
}

/** Day keys that already have a story — used to skip them in the nudge. */
export async function getFlyStoryDayKeys(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day_key: string }>(
    `SELECT day_key FROM fly_stories ORDER BY day_key ASC`,
  );
  return rows.map((r) => r.day_key);
}
