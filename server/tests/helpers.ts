import { createApp } from "../src/app.js";
import { createDatabase } from "../src/db/database.js";
import { PersonRepository } from "../src/repositories/person.repository.js";
import { TodoRepository } from "../src/repositories/todo.repository.js";
import { PersonService } from "../src/services/person.service.js";
import { TodoService } from "../src/services/todo.service.js";

/*
 * Every helper creates a brand-new in-memory database, so each test starts
 * empty and tests can never affect each other (no shared state, any order).
 */

export function createTestRepository() {
  return new TodoRepository(createDatabase(":memory:"));
}

/** Todo service plus the people service, sharing one in-memory database. */
export function createTestBundle() {
  const db = createDatabase(":memory:");
  const peopleRepository = new PersonRepository(db);
  return {
    db,
    people: new PersonService(peopleRepository),
    todos: new TodoService(new TodoRepository(db), peopleRepository),
  };
}

export function createTestService() {
  return createTestBundle().todos;
}

export function createTestApp() {
  const db = createDatabase(":memory:");
  return { app: createApp(db), db };
}
