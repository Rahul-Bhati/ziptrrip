import { NotFoundError } from "../errors.js";
import type { TodoRepository } from "../repositories/todo.repository.js";
import type { Todo, TodoStats } from "../types/todo.js";
import { parse } from "../validation/parse.js";
import {
  createTodoSchema,
  idSchema,
  listQuerySchema,
  updateTodoSchema,
} from "../validation/todo.schemas.js";

export interface TodoListResult {
  todos: Todo[];
  /** Counts for ALL todos (not just the filtered ones), for the page header */
  stats: TodoStats;
}

/**
 * Business logic for todos.
 *
 * Every public method accepts RAW input (`unknown`) and validates it first.
 * That makes the service the single entry point into the domain: whether a
 * request comes from HTTP, a script or a test, it cannot skip validation.
 *
 * It knows nothing about Express (no req/res, no status codes). It returns
 * data or throws an AppError; the HTTP layer translates that into a response.
 */
export class TodoService {
  constructor(private readonly repository: TodoRepository) {}

  list(rawQuery: unknown): TodoListResult {
    const filters = parse(listQuerySchema, rawQuery);
    return {
      todos: this.repository.findAll(filters),
      stats: this.repository.stats(),
    };
  }

  getById(rawId: unknown): Todo {
    const id = parse(idSchema, rawId, "id");
    const todo = this.repository.findById(id);
    if (!todo) throw this.notFound(id);
    return todo;
  }

  create(rawBody: unknown): Todo {
    const data = parse(createTodoSchema, rawBody);
    return this.repository.create(data);
  }

  update(rawId: unknown, rawBody: unknown): Todo {
    // Validate everything before touching the database
    const id = parse(idSchema, rawId, "id");
    const changes = parse(updateTodoSchema, rawBody);

    const todo = this.repository.update(id, changes);
    if (!todo) throw this.notFound(id);
    return todo;
  }

  delete(rawId: unknown): void {
    const id = parse(idSchema, rawId, "id");
    if (!this.repository.delete(id)) throw this.notFound(id);
  }

  /** Removes every completed todo; returns how many were deleted. */
  clearCompleted(): { deleted: number } {
    return { deleted: this.repository.deleteCompleted() };
  }

  private notFound(id: number): NotFoundError {
    return new NotFoundError(`Todo with id ${id} not found`);
  }
}
