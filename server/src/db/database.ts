import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA_SQL } from "./schema.js";

export type DB = Database.Database;

/**
 * Opens (or creates) the SQLite database and makes sure the tables exist.
 *
 * @param filename path to the .db file, or ":memory:" for a throwaway
 *                 in-RAM database (used by tests: fast and always empty)
 */
export function createDatabase(filename: string): DB {
  if (filename !== ":memory:") {
    // SQLite creates the file, but not missing folders
    mkdirSync(dirname(filename), { recursive: true });
  }

  const db = new Database(filename);

  // WAL (write-ahead log): readers don't block while a write is in progress.
  // The recommended mode for SQLite behind a server. No effect on :memory:.
  db.pragma("journal_mode = WAL");

  db.exec(SCHEMA_SQL);
  return db;
}
