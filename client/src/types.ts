/**
 * Types shared with the server.
 *
 * `export type` re-exports ONLY types from the server's source, so the
 * frontend and backend can never disagree about what a Todo looks like:
 * if a field changes on the server, the frontend stops compiling.
 * Types are erased at build time, so no server code ends up in the browser bundle.
 */
export type {
  Person,
} from "../../server/src/types/person";
export type {
  Priority,
  SortField,
  SortOrder,
  StatusFilter,
  Todo,
  TodoStats,
} from "../../server/src/types/todo";

import type { Priority, Todo } from "../../server/src/types/todo";

/** Body for POST /api/todos (server fills in defaults for missing fields) */
export interface NewTodo {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  /** null, or omitted, means Unassigned */
  assigneeId?: number | null;
}

/**
 * Body for PATCH /api/todos/:id: any subset of the editable fields.
 * assigneeId is not on Todo (the response uses `assignee`), so it is added here.
 */
export type TodoChanges = Partial<Pick<Todo, "title" | "description" | "priority" | "dueDate" | "completed">> & {
  assigneeId?: number | null;
};
