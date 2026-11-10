import { describe, expect, it } from "vitest";
import { createPersonSchema } from "../../src/validation/person.schemas.js";

describe("createPersonSchema", () => {
  it("trims the name", () => {
    expect(createPersonSchema.parse({ name: "  Priya  " })).toEqual({ name: "Priya" });
  });

  it("accepts a name of exactly 100 characters but not 101", () => {
    expect(createPersonSchema.safeParse({ name: "a".repeat(100) }).success).toBe(true);
    expect(createPersonSchema.safeParse({ name: "a".repeat(101) }).success).toBe(false);
  });

  it.each([
    ["missing name", {}],
    ["blank name", { name: "   " }],
    ["non-string name", { name: 1 }],
    ["unknown field", { name: "Priya", extra: true }],
  ])("rejects %s", (_label, body) => {
    expect(createPersonSchema.safeParse(body).success).toBe(false);
  });
});
