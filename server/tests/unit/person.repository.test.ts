import { beforeEach, describe, expect, it } from "vitest";
import { createDatabase } from "../../src/db/database.js";
import { PersonRepository } from "../../src/repositories/person.repository.js";

describe("PersonRepository", () => {
  let repo: PersonRepository;

  beforeEach(() => {
    repo = new PersonRepository(createDatabase(":memory:"));
  });

  it("inserts a person and lists them A to Z ignoring case", () => {
    repo.create({ name: "Sam" });
    repo.create({ name: "alex" });
    repo.create({ name: "Priya" });

    expect(repo.findAll().map((person) => person.name)).toEqual(["alex", "Priya", "Sam"]);
  });

  it("finds a person by name ignoring case", () => {
    const created = repo.create({ name: "Priya" });

    expect(repo.findByName("priya")).toEqual(created);
    expect(repo.findByName("Alex")).toBeUndefined();
    expect(repo.findById(created.id)).toEqual(created);
  });
});
