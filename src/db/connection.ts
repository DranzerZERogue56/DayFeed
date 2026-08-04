import * as SQLite from 'expo-sqlite';

// The database connection + migrations live here, in a leaf module, so that
// notes.ts / detectedDates.ts / flopNotes.ts can import getDb without pulling in
// the barrel (index.ts) that re-exports them — which was a require cycle.

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

// v3 -> v4 (DayFeed v1.3): per-entry agenda reminders. reminder_id stores the
// OS-scheduled notification id; null means no reminder set.
const MIGRATION_V4 = `
ALTER TABLE detected_dates ADD COLUMN reminder_id TEXT;
`;

// v4 -> v5 (DayFeed v1.4): tiny key-value store for app preferences (theme mode).
const MIGRATION_V5 = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

// v5 -> v6 (DayFeed v1.4.8): on-device OCR text for photo notes.
const MIGRATION_V6 = `
ALTER TABLE notes ADD COLUMN ocr_text TEXT;
`;

// v6 -> v7 (DayFeed v1.5.4): user-chosen reminder time per detected date,
// replacing the old fixed 9:00 AM. Nullable — old rows (and reminder-less
// entries) just have no chosen time.
const MIGRATION_V7 = `
ALTER TABLE detected_dates ADD COLUMN reminder_hour INTEGER;
ALTER TABLE detected_dates ADD COLUMN reminder_minute INTEGER;
`;

// v7 -> v8 (DayFeed v1.6): documents imported onto a Flop note. The file itself
// lives in the document directory (see utils/attachmentFiles); this row holds
// its original name and, where the format allowed it, the text pulled out of it.
// Cascades with its note, mirroring flop_notes' own self-cascade — though the
// files on disk still need deleting explicitly.
const MIGRATION_V8 = `
CREATE TABLE IF NOT EXISTS flop_attachments (
  id TEXT PRIMARY KEY NOT NULL,
  flop_id TEXT NOT NULL REFERENCES flop_notes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  uri TEXT NOT NULL,
  mime TEXT,
  size INTEGER,
  extracted_text TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_flop_attach_note ON flop_attachments (flop_id);
`;

// v1.7: Noted-updates — a scratch list for notes destined for a Claude prompt.
// Deliberately its own table rather than a flag on `notes`: these are written
// to be copied out and then cleared, and they should not appear in the Feed,
// the Agenda, or search along with everything else.
const MIGRATION_V9 = `
CREATE TABLE IF NOT EXISTS noted_updates (
  id TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_noted_updates_created ON noted_updates (created_at);
`;

const LATEST_VERSION = 9;

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

  if (current < 4) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATION_V4);
    });
  }

  if (current < 5) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATION_V5);
    });
  }

  if (current < 6) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATION_V6);
    });
  }

  if (current < 7) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATION_V7);
    });
  }

  if (current < 8) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATION_V8);
    });
  }

  if (current < 9) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATION_V9);
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
