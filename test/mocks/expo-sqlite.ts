// Test stand-in for expo-sqlite: the same async surface the app uses
// (openDatabaseAsync, execAsync, runAsync, getFirstAsync, getAllAsync,
// withTransactionAsync) backed by an in-memory better-sqlite3 database, so the
// real SQL in src/db — including migrations, recursive CTEs, and FK cascades —
// runs unmodified under Jest.
import Database from 'better-sqlite3';

type Param = string | number | null;

function flatten(params: unknown[]): Param[] {
  if (params.length === 1 && Array.isArray(params[0])) return params[0] as Param[];
  return params as Param[];
}

export class SQLiteDatabase {
  private db: Database.Database;

  constructor() {
    this.db = new Database(':memory:');
  }

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number; lastInsertRowId: number }> {
    const info = this.db.prepare(sql).run(...flatten(params));
    return { changes: info.changes, lastInsertRowId: Number(info.lastInsertRowid) };
  }

  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const row = this.db.prepare(sql).get(...flatten(params)) as T | undefined;
    return row ?? null;
  }

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    return this.db.prepare(sql).all(...flatten(params)) as T[];
  }

  async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
    // better-sqlite3's .transaction() can't wrap async fns; tests are
    // single-connection and serial, so BEGIN/COMMIT directly is equivalent.
    this.db.exec('BEGIN');
    try {
      await fn();
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}

export async function openDatabaseAsync(_name: string): Promise<SQLiteDatabase> {
  return new SQLiteDatabase();
}
