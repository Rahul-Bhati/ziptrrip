import type { Statement } from "better-sqlite3";
import type { DB } from "../db/database.js";
import type {
  CreateTodoData,
  Priority,
  SortField,
  SortOrder,
  Todo,
  TodoFilters,
  TodoStats,
  UpdateTodoData,
} from "../types/todo.js";

/** A row exactly as SQLite stores it: snake_case names, 0/1 instead of booleans. */
interface TodoRow {
  id: number;
  title: string;
  description: string;
  completed: 0 | 1;
  priority: Priority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

/** Named params object passed to better-sqlite3 (`@name` in the SQL) */
type Params = Record<string, unknown>;

/** Explicit column list instead of `SELECT *`: we only read what TodoRow describes. */
const COLUMNS = "id, title, description, completed, priority, due_date, created_at, updated_at";

/**
 * ORDER BY columns cannot be sent as `?` parameters (parameters are values,
 * not SQL). So user input only picks a KEY of this fixed map, never raw SQL.
 * That is what keeps sorting safe from SQL injection.
 */
const SORT_COLUMNS: Record<SortField, string> = {
  createdAt: "created_at",
  dueDate: "due_date",
  // Text sorting would give high < low < medium, so map to numbers
  priority: "CASE priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END",
  title: "title COLLATE NOCASE",
};

/** Which API field updates which DB column (also acts as an allow-list). */
const UPDATABLE_COLUMNS = {
  title: "title",
  description: "description",
  completed: "completed",
  priority: "priority",
  dueDate: "due_date",
} as const satisfies Record<keyof UpdateTodoData, string>;

/** Converts a DB row into the API shape. */
function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: row.completed === 1,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * In LIKE, `%` and `_` are wildcards. Escape them so searching for "50%"
 * matches the literal text "50%" instead of "50 followed by anything".
 */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Data access for todos. This is the ONLY place in the app that knows SQL.
 * Services above it work with plain `Todo` objects, so the database could be
 * swapped (e.g. for Postgres) by rewriting just this class.
 */
export class TodoRepository {
  // Fixed queries are prepared once and reused: SQLite parses them a single time.
  private readonly findByIdStmt: Statement<[number], TodoRow>;
  private readonly insertStmt: Statement<[Params], TodoRow>;
  private readonly deleteStmt: Statement<[number]>;
  private readonly deleteCompletedStmt: Statement<[]>;
  private readonly statsStmt: Statement<[], { total: number; completed: number }>;

  constructor(private readonly db: DB) {
    this.findByIdStmt = db.prepare(`SELECT ${COLUMNS} FROM todos WHERE id = ?`);

    // RETURNING gives back the inserted row in the same query (no second SELECT)
    this.insertStmt = db.prepare(`
      INSERT INTO todos (title, description, priority, due_date, created_at, updated_at)
      VALUES (@title, @description, @priority, @dueDate, @now, @now)
      RETURNING ${COLUMNS}
    `);

    this.deleteStmt = db.prepare("DELETE FROM todos WHERE id = ?");
    this.deleteCompletedStmt = db.prepare("DELETE FROM todos WHERE completed = 1");

    // COALESCE: SUM over zero rows is NULL, we want 0
    this.statsStmt = db.prepare(
      "SELECT COUNT(*) AS total, COALESCE(SUM(completed), 0) AS completed FROM todos",
    );
  }

  /** Lists todos with optional status filter, text search and sorting. */
  findAll(filters: TodoFilters = {}): Todo[] {
    const { status = "all", search, sortBy = "createdAt", order = "desc" } = filters;
    const conditions: string[] = [];
    const params: Params = {};

    if (status === "active") conditions.push("completed = 0");
    if (status === "completed") conditions.push("completed = 1");

    if (search) {
      // SQLite's LIKE is case-insensitive for English letters
      conditions.push("(title LIKE @search ESCAPE '\\' OR description LIKE @search ESCAPE '\\')");
      params.search = `%${escapeLike(search)}%`;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const direction = order === "asc" ? "ASC" : "DESC";

    // NULLS LAST: todos without a due date go to the end in both directions.
    // `id` is a tie-breaker so equal values always come back in the same order.
    const sql = `
      SELECT ${COLUMNS} FROM todos
      ${where}
      ORDER BY ${SORT_COLUMNS[sortBy]} ${direction} NULLS LAST, id ${direction}
    `;

    // Dynamic SQL, so it is prepared per call (it changes with the filters)
    return this.db.prepare<[Params], TodoRow>(sql).all(params).map(toTodo);
  }

  /** Returns the todo, or `undefined` if no todo has this id. */
  findById(id: number): Todo | undefined {
    const row = this.findByIdStmt.get(id);
    return row ? toTodo(row) : undefined;
  }

  create(data: CreateTodoData): Todo {
    const row = this.insertStmt.get({ ...data, now: new Date().toISOString() });
    // RETURNING always yields the inserted row; this guard satisfies strict typing
    if (!row) throw new Error("Insert did not return a row");
    return toTodo(row);
  }

  /**
   * Updates only the fields present in `changes` and bumps `updated_at`.
   * Returns the updated todo, or `undefined` if the id does not exist.
   */
  update(id: number, changes: UpdateTodoData): Todo | undefined {
    const assignments: string[] = [];
    const params: Params = { id, now: new Date().toISOString() };

    for (const field of Object.keys(UPDATABLE_COLUMNS) as (keyof UpdateTodoData)[]) {
      const value = changes[field];
      if (value === undefined) continue; // not sent → keep current value

      assignments.push(`${UPDATABLE_COLUMNS[field]} = @${field}`);
      // better-sqlite3 cannot bind JS booleans, so true/false → 1/0
      params[field] = typeof value === "boolean" ? Number(value) : value;
    }

    // Nothing to change: don't touch updated_at, just return the current state
    if (assignments.length === 0) return this.findById(id);

    const sql = `
      UPDATE todos SET ${assignments.join(", ")}, updated_at = @now
      WHERE id = @id
      RETURNING ${COLUMNS}
    `;
    const row = this.db.prepare<[Params], TodoRow>(sql).get(params);
    return row ? toTodo(row) : undefined;
  }

  /** Returns true if a todo was deleted, false if the id did not exist. */
  delete(id: number): boolean {
    return this.deleteStmt.run(id).changes > 0;
  }

  /** Deletes all completed todos and returns how many were removed. */
  deleteCompleted(): number {
    return this.deleteCompletedStmt.run().changes;
  }

  stats(): TodoStats {
    const { total, completed } = this.statsStmt.get() ?? { total: 0, completed: 0 };
    return { total, completed, active: total - completed };
  }
}
