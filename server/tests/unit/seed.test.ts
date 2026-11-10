import { describe, expect, it } from "vitest";
import { createDatabase } from "../../src/db/database.js";
import { runSeed } from "../../src/scripts/seed.js";
import { TodoRepository } from "../../src/repositories/todo.repository.js";
import { PersonRepository } from "../../src/repositories/person.repository.js";
import { PersonService } from "../../src/services/person.service.js";
import { TodoService } from "../../src/services/todo.service.js";

describe("runSeed", () => {
  it("adds four people and eight todos, leaving two unassigned", () => {
    const db = createDatabase(":memory:");
    const result = runSeed(db, { force: false });

    expect(result.peopleAdded).toBe(4);
    expect(result.todosAdded).toBe(8);

    const people = new PersonRepository(db).findAll().map((person) => person.name);
    expect(people).toEqual(["Alex", "Jordan", "Priya", "Sam"]);

    const todos = new TodoRepository(db).findAll();
    const byTitle = new Map(todos.map((todo) => [todo.title, todo.assignee?.name ?? null]));
    expect(byTitle.get("Design the REST API")).toBe("Priya");
    expect(byTitle.get("Write README and docs")).toBeNull();
    expect(byTitle.get("Buy groceries")).toBeNull();
    db.close();
  });

  it("adds missing people without touching todos that are already there", () => {
    const db = createDatabase(":memory:");
    const peopleRepository = new PersonRepository(db);
    const todos = new TodoService(new TodoRepository(db), peopleRepository);
    const existing = todos.create({ title: "Already here" });

    const result = runSeed(db, { force: false });

    expect(result.peopleAdded).toBe(4);
    expect(result.todosAdded).toBe(0);
    expect(new TodoRepository(db).findAll()).toHaveLength(1);
    expect(new TodoRepository(db).findById(existing.id)?.assignee).toBeNull();
    db.close();
  });

  it("does not duplicate people on a second run", () => {
    const db = createDatabase(":memory:");
    runSeed(db, { force: false });
    const second = runSeed(db, { force: false });

    expect(second.peopleAdded).toBe(0);
    expect(new PersonService(new PersonRepository(db)).list()).toHaveLength(4);
    db.close();
  });
});
