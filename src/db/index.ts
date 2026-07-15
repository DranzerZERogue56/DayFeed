import * as SQLite from 'expo-sqlite';

const DB_NAME = 'dayfeed.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// v1 base schema. `type` is free TEXT so 'photo' notes need no schema change.
// day_key is derived once at creation and never recomputed on read.
const BASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  content TEXT,
  transcript TEXT,
  audio_uri TEXT,
  duration_ms INTEGER,
  created_at INTEGER NOT NULL,
  day_key TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_notes_day_key ON notes (day_key);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes (type);
`;

// v1 -> v2 (DayFeed v1.1): photo notes + detected-dates agenda.
// Preserves all existing rows: notes only gains a nullable column.
const MIGRATION_V2 = `
ALTER TABLE notes ADD COLUMN media_uris TEXT;
CREATE TABLE IF NOT EXISTS detected_dates (
  id TEXT PRIMARY KEY NOT NULL,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  snippet TEXT
);
CREATE INDEX IF NOT EXISTS idx_detected_note ON detected_dates (note_id);
CREATE INDEX IF NOT EXISTS idx_detected_date_key ON detected_dates (date_key);
`;

// v2 -> v3: Flop — long-form notes with nested, typed children. Its own table
// because Flop notes carry no day semantics and need tree structure; parent_id
// self-references so deleting a note cascades to its whole subtree.
const MIGRATION_V3 = `
CREATE TABLE IF NOT EXISTS flop_notes (
  id TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT REFERENCES flop_notes(id) ON DELETE CASCADE,
  relation TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT,
  audio_uri TEXT,
  duration_ms INTEGER,
  transcript TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_flop_parent ON flop_notes (parent_id);
CREATE INDEX IF NOT EXISTS idx_flop_updated_at ON flop_notes (updated_at);
`;

const LATEST_VERSION = 3;

/**
 * Run schema migrations based on PRAGMA user_version. Each step is idempotent at
 * the version boundary, so a v1 database (user_version 0) upgrades cleanly without
 * touching existing note rows, and a fresh install lands at the latest version.
 */
async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(BASE_SCHEMA);
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current < 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATION_V2);
    });
  }

  if (current < 3) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATION_V3);
    });
  }

  if (current !== LATEST_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${LATEST_VERSION}`);
  }
}

/** Open (once) and initialize/migrate the database. Safe to call repeatedly. */
export async function initDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      // WAL for concurrency; foreign_keys ON so detected_dates cascade-deletes.
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Get the initialized db handle. */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  return initDb();
}

export * from './notes';
export * from './detectedDates';
export * from './types';
export * from './flopNotes';
export * from './flopTypes';
