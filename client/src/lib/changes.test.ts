import { describe, expect, it } from "vitest";
import type { Todo } from "../types";
import { getChanges, toDraft } from "./changes";

const todo: Todo = {
  id: 1,
  title: "Buy milk",
  description: "2 litres",
  completed: false,
  priority: "medium",
  dueDate: "2026-10-10",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  assignee: null,
};

describe("getChanges", () => {
  it("returns nothing when the form is unchanged", () => {
    expect(getChanges(todo, toDraft(todo))).toEqual({});
  });

  it("returns only the changed fields", () => {
    const draft = { ...toDraft(todo), priority: "high" as const, completed: true };
    expect(getChanges(todo, draft)).toEqual({ priority: "high", completed: true });
  });

  it("ignores whitespace-only differences", () => {
    expect(getChanges(todo, { ...toDraft(todo), title: "  Buy milk  " })).toEqual({});
  });

  it("sends dueDate: null when the date input is cleared", () => {
    expect(getChanges(todo, { ...toDraft(todo), dueDate: "" })).toEqual({ dueDate: null });
  });

  it("maps a missing due date to an empty input and back without a change", () => {
    const noDate = { ...todo, dueDate: null };
    expect(toDraft(noDate).dueDate).toBe("");
    expect(getChanges(noDate, toDraft(noDate))).toEqual({});
  });

  it("leaves assigneeId out of the patch when the dropdown is untouched", () => {
    const assigned = { ...todo, assignee: { id: 2, name: "Priya" } };
    expect(getChanges(assigned, toDraft(assigned))).toEqual({});
    expect(getChanges(todo, toDraft(todo))).toEqual({});
  });

  it("sends the person id when an unassigned todo is assigned", () => {
    expect(getChanges(todo, { ...toDraft(todo), assigneeId: 2 })).toEqual({ assigneeId: 2 });
  });

  it("sends null when the assignee is cleared", () => {
    const assigned = { ...todo, assignee: { id: 2, name: "Priya" } };
    expect(getChanges(assigned, { ...toDraft(assigned), assigneeId: "" })).toEqual({ assigneeId: null });
  });
});
