import { ValidationError } from "../errors.js";
import type { PersonRepository } from "../repositories/person.repository.js";
import type { Person } from "../types/person.js";
import { parse } from "../validation/parse.js";
import { createPersonSchema } from "../validation/person.schemas.js";

/**
 * Business logic for people. Validates input, then talks to the repository.
 * Knows nothing about Express.
 */
export class PersonService {
  constructor(private readonly repository: PersonRepository) {}

  list(): Person[] {
    return this.repository.findAll();
  }

  create(rawBody: unknown): Person {
    const data = parse(createPersonSchema, rawBody);
    // Checked here so the client gets a field error. The unique index is the backup.
    if (this.repository.findByName(data.name)) {
      throw new ValidationError([{ field: "name", message: "a person with this name already exists" }]);
    }
    return this.repository.create(data);
  }
}
