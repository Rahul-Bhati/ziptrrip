import { afterEach, describe, expect, it } from "vitest";
import { type DB, createDatabase, migrate } from "../../src/db/database.js";

/**
 * The todos table as it existed before assignees. Frozen here on purpose:
 * the upgrade test must not use today's SCHEMA_SQL to build the old table.
 */
const OLD_TODOS_SQL = `
CREATE TABLE todos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT    NOT NULL DEFAULT '',
  completed   INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  priority    TEXT    NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('low', 'medium', 'high')),
  due_date    TEXT    CHECK (due_date IS NULL OR date(due_date) = due_date),
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);
`;

function columnNames(db: DB, table: string): string[] {
  const columns = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
  return columns.map((column) => column.name);
}

function hasTable(db: DB, name: string): boolean {
  const row = db
    .prepare("SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name) as { found: number } | undefined;
  return row !== undefined;
}

describe("migrate", () => {
  const opened: DB[] = [];

  afterEach(() => {
    for (const db of opened) db.close();
    opened.length = 0;
  });

  function track(db: DB): DB {
    opened.push(db);
    return db;
  }

  it("creates people, assignee_id, and enables foreign keys on a fresh database", () => {
    const db = track(createDatabase(":memory:"));

    expect(hasTable(db, "people")).toBe(true);
    expect(columnNames(db, "todos")).toContain("assignee_id");
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
  });

  it("adds assignee_id to an existing todos table and leaves old rows unassigned", () => {
    // createDatabase migrates immediately. Drop the new tables and put the
    // pre-assignee todos table back, so migrate() is tested as an upgrade.
    const db = track(createDatabase(":memory:"));
    db.exec("DROP TABLE todos; DROP TABLE people;");
    db.exec(OLD_TODOS_SQL);
    db.prepare(
      `INSERT INTO todos (title, description, completed, priority, created_at, updated_at)
       VALUES ('Buy milk', '', 0, 'medium', '2026-10-03T08:23:28.207Z', '2026-10-03T08:23:28.207Z')`,
    ).run();

    migrate(db);

    expect(hasTable(db, "people")).toBe(true);
    expect(columnNames(db, "todos")).toContain("assignee_id");
    const row = db.prepare("SELECT assignee_id FROM todos WHERE title = 'Buy milk'").get() as {
      assignee_id: number | null;
    };
    expect(row.assignee_id).toBeNull();
  });

  it("rejects an assignee_id that is not in people", () => {
    const db = track(createDatabase(":memory:"));

    const insert = db.prepare(
      `INSERT INTO todos (title, description, completed, priority, assignee_id, created_at, updated_at)
       VALUES ('Buy milk', '', 0, 'medium', 999, '2026-10-03T08:23:28.207Z', '2026-10-03T08:23:28.207Z')`,
    );

    expect(() => insert.run()).toThrow(/FOREIGN KEY/i);
  });
});
