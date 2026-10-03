import { describe, expect, it } from "vitest";
import {
  createTodoSchema,
  idSchema,
  listQuerySchema,
  updateTodoSchema,
} from "../../src/validation/todo.schemas.js";

/*
 * Table-driven tests (it.each): one test body, many inputs.
 * Makes it cheap to list every edge case explicitly.
 */

describe("idSchema", () => {
  it.each(["1", "42", "1000000"])("accepts %j and converts it to a number", (input) => {
    expect(idSchema.parse(input)).toBe(Number(input));
  });

  it.each(["0", "-1", "abc", "1.5", "1e3", "01", "", " 1", "1 "])("rejects %j", (input) => {
    expect(idSchema.safeParse(input).success).toBe(false);
  });
});

describe("createTodoSchema", () => {
  it("fills defaults and trims text", () => {
    expect(createTodoSchema.parse({ title: "  Buy milk  " })).toEqual({
      title: "Buy milk",
      description: "",
      priority: "medium",
      dueDate: null,
    });
  });

  it("accepts a title of exactly 200 characters but not 201", () => {
    expect(createTodoSchema.safeParse({ title: "a".repeat(200) }).success).toBe(true);
    expect(createTodoSchema.safeParse({ title: "a".repeat(201) }).success).toBe(false);
  });

  it.each(["2026-10-03", "2028-02-29"])("accepts the valid date %j", (dueDate) => {
    expect(createTodoSchema.safeParse({ title: "x", dueDate }).success).toBe(true);
  });

  it.each(["2026-02-29", "2026-02-30", "2026-13-01", "2026-1-5", "03/10/2026", "tomorrow"])(
    "rejects the invalid date %j",
    (dueDate) => {
      expect(createTodoSchema.safeParse({ title: "x", dueDate }).success).toBe(false);
    },
  );

  it.each([
    ["missing title", {}],
    ["whitespace-only title", { title: "   " }],
    ["non-string title", { title: 123 }],
    ["unknown priority", { title: "x", priority: "urgent" }],
    ["client-controlled field", { title: "x", completed: true }],
    ["unknown field", { title: "x", titel: "typo" }],
  ])("rejects %s", (_label, body) => {
    expect(createTodoSchema.safeParse(body).success).toBe(false);
  });
});

describe("updateTodoSchema", () => {
  it("does not add defaults (a PATCH must not overwrite unsent fields)", () => {
    expect(updateTodoSchema.parse({ completed: true })).toEqual({ completed: true });
  });

  it("allows null dueDate to clear the date", () => {
    expect(updateTodoSchema.parse({ dueDate: null })).toEqual({ dueDate: null });
  });

  it("rejects an empty object", () => {
    expect(updateTodoSchema.safeParse({}).success).toBe(false);
  });

  it.each([{ completed: "true" }, { completed: 1 }, { id: 5 }])("rejects %j", (body) => {
    expect(updateTodoSchema.safeParse(body).success).toBe(false);
  });
});

describe("listQuerySchema", () => {
  it("applies defaults for an empty query", () => {
    expect(listQuerySchema.parse({})).toEqual({ status: "all", sortBy: "createdAt", order: "desc" });
  });

  it("treats an empty or blank search as no search", () => {
    expect(listQuerySchema.parse({ search: "   " }).search).toBeUndefined();
  });

  it("ignores unknown query params", () => {
    expect(listQuerySchema.safeParse({ _: "123" }).success).toBe(true);
  });

  it.each([{ status: "done" }, { sortBy: "id; DROP TABLE todos" }, { order: "up" }, { status: ["all", "active"] }])(
    "rejects %j",
    (query) => {
      expect(listQuerySchema.safeParse(query).success).toBe(false);
    },
  );
});
