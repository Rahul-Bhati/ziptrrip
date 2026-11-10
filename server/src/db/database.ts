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

  migrate(db);
  return db;
}

/**
 * Creates missing tables and adds columns introduced after a database file
 * already existed. Safe to run on every startup.
 *
 * `CREATE TABLE IF NOT EXISTS` leaves an existing todos table unchanged, so
 * a file created before assignees needs an ALTER to gain assignee_id.
 */
export function migrate(db: DB): void {
  db.exec(SCHEMA_SQL);

  const columns = db.pragma("table_info(todos)") as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "assignee_id")) {
    db.exec("ALTER TABLE todos ADD COLUMN assignee_id INTEGER REFERENCES people(id)");
  }

  // Off by default, and per connection. Without this the assignee foreign key is ignored.
  db.pragma("foreign_keys = ON");
}
