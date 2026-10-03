import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "../../src/errors.js";
import type { TodoService } from "../../src/services/todo.service.js";
import { createTestService } from "../helpers.js";

/** Runs fn, expects it to throw, and returns the error for detailed checks */
function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("Expected function to throw");
}

describe("TodoService", () => {
  let service: TodoService;

  beforeEach(() => {
    service = createTestService();
  });

  describe("create", () => {
    it("validates, applies defaults and saves", () => {
      const todo = service.create({ title: "  Buy milk  " });

      expect(todo).toMatchObject({
        title: "Buy milk",
        description: "",
        priority: "medium",
        dueDate: null,
        completed: false,
      });
      expect(service.getById(String(todo.id))).toEqual(todo);
    });

    it("reports every invalid field at once", () => {
      const error = catchError(() =>
        service.create({ title: "", priority: "urgent", dueDate: "2026-02-30", extra: 1 }),
      );

      expect(error).toBeInstanceOf(ValidationError);
      const { statusCode, details } = error as ValidationError;
      expect(statusCode).toBe(400);
      expect(details?.map((d) => d.field)).toEqual(["title", "priority", "dueDate", undefined]);
      expect(details?.[3]?.message).toContain("extra");
    });

    it.each([undefined, null, [], "text"])("rejects a body that is not an object (%j)", (body) => {
      const error = catchError(() => service.create(body)) as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.details?.[0]?.message).toBe("Request body must be a JSON object");
    });
  });

  describe("getById", () => {
    it("rejects an invalid id with a field-labelled error", () => {
      const error = catchError(() => service.getById("abc")) as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.details).toEqual([{ field: "id", message: "id must be a positive integer" }]);
    });

    it("throws NotFoundError for a missing todo", () => {
      const error = catchError(() => service.getById("99")) as NotFoundError;
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Todo with id 99 not found");
    });
  });

  describe("update", () => {
    it("updates only the sent fields", () => {
      const created = service.create({ title: "Task", priority: "high" });
      const updated = service.update(String(created.id), { completed: true });

      expect(updated).toMatchObject({ title: "Task", priority: "high", completed: true });
    });

    it("rejects an empty update", () => {
      const created = service.create({ title: "Task" });
      expect(() => service.update(String(created.id), {})).toThrow(ValidationError);
    });

    it("validates the body before checking that the todo exists", () => {
      // Bad body + missing id → 400, not 404: no DB work for an invalid request
      expect(() => service.update("99", { completed: "yes" })).toThrow(ValidationError);
    });

    it("throws NotFoundError for a missing todo", () => {
      expect(() => service.update("99", { title: "x" })).toThrow(NotFoundError);
    });
  });

  describe("delete", () => {
    it("deletes an existing todo", () => {
      const created = service.create({ title: "Task" });
      service.delete(String(created.id));
      expect(() => service.getById(String(created.id))).toThrow(NotFoundError);
    });

    it("throws NotFoundError for a missing todo", () => {
      expect(() => service.delete("99")).toThrow(NotFoundError);
    });
  });

  describe("list", () => {
    it("returns filtered todos with stats for ALL todos", () => {
      const done = service.create({ title: "done" });
      service.create({ title: "open" });
      service.update(String(done.id), { completed: true });

      const result = service.list({ status: "active" });

      expect(result.todos.map((t) => t.title)).toEqual(["open"]);
      expect(result.stats).toEqual({ total: 2, active: 1, completed: 1 });
    });

    it("rejects an unknown sort field", () => {
      expect(() => service.list({ sortBy: "password" })).toThrow(ValidationError);
    });
  });

  describe("clearCompleted", () => {
    it("returns how many todos were deleted", () => {
      const a = service.create({ title: "a" });
      service.create({ title: "b" });
      service.update(String(a.id), { completed: true });

      expect(service.clearCompleted()).toEqual({ deleted: 1 });
      expect(service.clearCompleted()).toEqual({ deleted: 0 });
    });
  });
});
