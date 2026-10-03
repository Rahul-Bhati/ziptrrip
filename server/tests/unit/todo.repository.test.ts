import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TodoRepository } from "../../src/repositories/todo.repository.js";
import type { CreateTodoData } from "../../src/types/todo.js";
import { createTestRepository } from "../helpers.js";

/** Complete insert data with sensible values; tests override what they care about */
const todo = (overrides: Partial<CreateTodoData> = {}): CreateTodoData => ({
  title: "Test todo",
  description: "",
  priority: "medium",
  dueDate: null,
  ...overrides,
});

describe("TodoRepository", () => {
  let repo: TodoRepository;

  beforeEach(() => {
    repo = createTestRepository();
  });

  describe("create", () => {
    it("inserts a todo and returns it in API shape", () => {
      const created = repo.create(todo({ title: "Buy milk", priority: "high", dueDate: "2026-10-10" }));

      expect(created).toMatchObject({
        id: 1,
        title: "Buy milk",
        description: "",
        completed: false, // boolean, not 0
        priority: "high",
        dueDate: "2026-10-10",
      });
      expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(created.updatedAt).toBe(created.createdAt);
    });

    it("never reuses the id of a deleted todo (AUTOINCREMENT)", () => {
      repo.create(todo());
      const second = repo.create(todo());
      repo.delete(second.id);

      expect(repo.create(todo()).id).toBe(3);
    });

    it("is protected by DB constraints even if validation is bypassed", () => {
      expect(() => repo.create(todo({ title: "   " }))).toThrow();
      expect(() => repo.create(todo({ dueDate: "2026-02-30" }))).toThrow();
    });
  });

  describe("findById", () => {
    it("returns the todo when it exists", () => {
      const created = repo.create(todo({ title: "Find me" }));
      expect(repo.findById(created.id)).toEqual(created);
    });

    it("returns undefined when it does not exist", () => {
      expect(repo.findById(999)).toBeUndefined();
    });
  });

  describe("findAll", () => {
    it("returns newest first by default, using id as tie-breaker", () => {
      // Created within the same millisecond: only the id tie-breaker decides
      repo.create(todo({ title: "a" }));
      repo.create(todo({ title: "b" }));
      repo.create(todo({ title: "c" }));

      expect(repo.findAll().map((t) => t.title)).toEqual(["c", "b", "a"]);
    });

    it("filters by status", () => {
      const done = repo.create(todo({ title: "done" }));
      repo.create(todo({ title: "open" }));
      repo.update(done.id, { completed: true });

      expect(repo.findAll({ status: "active" }).map((t) => t.title)).toEqual(["open"]);
      expect(repo.findAll({ status: "completed" }).map((t) => t.title)).toEqual(["done"]);
      expect(repo.findAll({ status: "all" })).toHaveLength(2);
    });

    it("searches title and description, case-insensitively", () => {
      repo.create(todo({ title: "Buy MILK" }));
      repo.create(todo({ title: "Shopping", description: "milk and bread" }));
      repo.create(todo({ title: "Walk dog" }));

      expect(repo.findAll({ search: "milk" })).toHaveLength(2);
    });

    it("treats % and _ in search as literal characters", () => {
      repo.create(todo({ title: "Save 50% more" }));
      repo.create(todo({ title: "Save 500 more" }));
      repo.create(todo({ title: "snake_case" }));
      repo.create(todo({ title: "snakeXcase" }));

      expect(repo.findAll({ search: "50%" }).map((t) => t.title)).toEqual(["Save 50% more"]);
      expect(repo.findAll({ search: "e_c" }).map((t) => t.title)).toEqual(["snake_case"]);
    });

    it("sorts by priority by importance, not alphabetically", () => {
      repo.create(todo({ priority: "medium" }));
      repo.create(todo({ priority: "high" }));
      repo.create(todo({ priority: "low" }));

      const asc = repo.findAll({ sortBy: "priority", order: "asc" }).map((t) => t.priority);
      const desc = repo.findAll({ sortBy: "priority", order: "desc" }).map((t) => t.priority);

      expect(asc).toEqual(["low", "medium", "high"]);
      expect(desc).toEqual(["high", "medium", "low"]);
    });

    it("sorts by due date with 'no due date' last in both directions", () => {
      repo.create(todo({ title: "none", dueDate: null }));
      repo.create(todo({ title: "later", dueDate: "2026-12-01" }));
      repo.create(todo({ title: "sooner", dueDate: "2026-11-01" }));

      const asc = repo.findAll({ sortBy: "dueDate", order: "asc" }).map((t) => t.title);
      const desc = repo.findAll({ sortBy: "dueDate", order: "desc" }).map((t) => t.title);

      expect(asc).toEqual(["sooner", "later", "none"]);
      expect(desc).toEqual(["later", "sooner", "none"]);
    });

    it("sorts by title ignoring case", () => {
      repo.create(todo({ title: "banana" }));
      repo.create(todo({ title: "Apple" }));
      repo.create(todo({ title: "cherry" }));

      expect(repo.findAll({ sortBy: "title", order: "asc" }).map((t) => t.title)).toEqual([
        "Apple",
        "banana",
        "cherry",
      ]);
    });
  });

  describe("update", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("changes only the given fields and refreshes updatedAt", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
      const created = repo.create(todo({ title: "Original", priority: "low" }));

      vi.setSystemTime(new Date("2026-01-02T10:00:00.000Z"));
      const updated = repo.update(created.id, { completed: true });

      expect(updated).toMatchObject({ title: "Original", priority: "low", completed: true });
      expect(updated?.createdAt).toBe("2026-01-01T10:00:00.000Z");
      expect(updated?.updatedAt).toBe("2026-01-02T10:00:00.000Z");
    });

    it("removes the due date when dueDate is null", () => {
      const created = repo.create(todo({ dueDate: "2026-10-10" }));
      expect(repo.update(created.id, { dueDate: null })?.dueDate).toBeNull();
    });

    it("returns the todo unchanged (same updatedAt) when there is nothing to update", () => {
      const created = repo.create(todo());
      expect(repo.update(created.id, {})).toEqual(created);
    });

    it("returns undefined when the todo does not exist", () => {
      expect(repo.update(999, { title: "x" })).toBeUndefined();
    });
  });

  describe("delete / deleteCompleted / stats", () => {
    it("delete returns true once, then false", () => {
      const created = repo.create(todo());
      expect(repo.delete(created.id)).toBe(true);
      expect(repo.delete(created.id)).toBe(false);
      expect(repo.findById(created.id)).toBeUndefined();
    });

    it("deleteCompleted removes only completed todos and returns the count", () => {
      const a = repo.create(todo());
      const b = repo.create(todo());
      repo.create(todo());
      repo.update(a.id, { completed: true });
      repo.update(b.id, { completed: true });

      expect(repo.deleteCompleted()).toBe(2);
      expect(repo.findAll()).toHaveLength(1);
    });

    it("stats counts total, active and completed", () => {
      expect(repo.stats()).toEqual({ total: 0, active: 0, completed: 0 });

      const a = repo.create(todo());
      repo.create(todo());
      repo.update(a.id, { completed: true });

      expect(repo.stats()).toEqual({ total: 2, active: 1, completed: 1 });
    });
  });
});
