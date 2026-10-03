import type { z } from "zod";
import { ValidationError } from "../errors.js";

/**
 * Validates `input` against `schema`.
 * Returns the cleaned, typed data, or throws a ValidationError listing
 * EVERY problem at once (so the client can fix all fields in one go).
 *
 * @param fieldName used as the field label when the input is a single value
 *                  (e.g. the `id` path param) rather than an object
 */
export function parse<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
  fieldName?: string,
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  throw new ValidationError(
    result.error.issues.map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join(".") : fieldName;
      return field ? { field, message: issue.message } : { message: issue.message };
    }),
  );
}
