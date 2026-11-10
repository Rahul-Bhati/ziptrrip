import { z } from "zod";

/**
 * Zod schema for creating a person.
 * strictObject rejects unknown fields instead of ignoring a typo.
 */

export const PERSON_NAME_MAX_LENGTH = 100;

const bodyError = (issue: { code: string }) =>
  issue.code === "invalid_type" ? "Request body must be a JSON object" : undefined;

const nameField = z
  .string({
    error: (issue) => (issue.input === undefined ? "name is required" : "name must be a string"),
  })
  .trim()
  .min(1, "name cannot be empty")
  .max(PERSON_NAME_MAX_LENGTH, `name must be at most ${PERSON_NAME_MAX_LENGTH} characters`);

export const createPersonSchema = z.strictObject({ name: nameField }, { error: bodyError });

export type CreatePersonInput = z.input<typeof createPersonSchema>;
