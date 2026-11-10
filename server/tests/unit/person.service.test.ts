import { describe, expect, it } from "vitest";
import { ValidationError } from "../../src/errors.js";
import { createTestBundle } from "../helpers.js";

describe("PersonService", () => {
  it("rejects a name that already exists, ignoring case", () => {
    const { people } = createTestBundle();
    people.create({ name: "Priya" });

    expect(() => people.create({ name: " priya " })).toThrow(ValidationError);
    try {
      people.create({ name: "PRIYA" });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toEqual([
        { field: "name", message: "a person with this name already exists" },
      ]);
    }
  });
});
