import * as SQLite from "expo-sqlite";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initializationPromise: Promise<void> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("tripare.db").catch(
      (error: unknown) => {
        // Allow a later call to retry if opening the database fails.
        databasePromise = null;
        throw error;
      },
    );
  }

  return databasePromise;
}

export function initializeDatabase(): Promise<void> {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = initialize().catch((error: unknown) => {
    // Allow a later call to retry if schema initialization fails.
    initializationPromise = null;
    throw error;
  });

  return initializationPromise;
}

async function initialize(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS breeds (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      group_id TEXT,
      attributes_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_breeds_name
      ON breeds(name);

    CREATE INDEX IF NOT EXISTS idx_breeds_group_id
      ON breeds(group_id);

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      attributes_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_groups_name
      ON groups(name);

    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  console.log("DATABASE READY");
}
