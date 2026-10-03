import { describe, expect, it } from "vitest";
import { listPageUrl, readTodoId, todoPageUrl } from "./urls";

describe("readTodoId", () => {
  it.each([
    ["?id=1", 1],
    ["?id=42&other=x", 42],
  ])("reads %s as %i", (query, expected) => {
    expect(readTodoId(query)).toBe(expected);
  });

  it.each(["", "?id=", "?id=abc", "?id=0", "?id=-3", "?id=1.5", "?id=01", "?todo=1"])(
    "returns null for %j",
    (query) => {
      expect(readTodoId(query)).toBeNull();
    },
  );

  it("round-trips with todoPageUrl", () => {
    expect(readTodoId(todoPageUrl(7).split("?")[1] ?? "")).toBe(7);
  });
});

describe("listPageUrl", () => {
  const origin = "http://localhost:5173";

  it("returns to the list page with the user's filters", () => {
    expect(listPageUrl(`${origin}/?status=active&sort=priority-desc`, origin)).toBe(
      "/?status=active&sort=priority-desc",
    );
  });

  it.each([
    ["no referrer", ""],
    ["another site", "https://example.com/?status=active"],
    ["another page", `${origin}/todo.html?id=2`],
  ])("falls back to / for %s", (_label, referrer) => {
    expect(listPageUrl(referrer, origin)).toBe("/");
  });
});
