/**
 * Database schema.
 *
 * Kept as a TS string (not a .sql file) because `tsc` only compiles .ts files:
 * a .sql file would not be copied into dist/ and the built server would fail.
 *
 * `IF NOT EXISTS` makes this safe to run on every startup.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS todos (
  -- AUTOINCREMENT: an id is never reused after a delete, so an old
  -- link like todo.html?id=5 can never show a different todo later
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT    NOT NULL DEFAULT '',
  -- SQLite has no BOOLEAN type: 0 = false, 1 = true
  completed   INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  priority    TEXT    NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('low', 'medium', 'high')),
  -- "YYYY-MM-DD" or NULL; date() returns the same string only for a valid date
  due_date    TEXT    CHECK (due_date IS NULL OR date(due_date) = due_date),
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);
`;
