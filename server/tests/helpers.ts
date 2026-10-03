import { createApp } from "../src/app.js";
import { createDatabase } from "../src/db/database.js";
import { TodoRepository } from "../src/repositories/todo.repository.js";
import { TodoService } from "../src/services/todo.service.js";

/*
 * Every helper creates a brand-new in-memory database, so each test starts
 * empty and tests can never affect each other (no shared state, any order).
 */

export function createTestRepository() {
  return new TodoRepository(createDatabase(":memory:"));
}

export function createTestService() {
  return new TodoService(createTestRepository());
}

export function createTestApp() {
  const db = createDatabase(":memory:");
  return { app: createApp(db), db };
}
