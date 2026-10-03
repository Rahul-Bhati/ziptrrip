import { z } from "zod";
import { PRIORITIES, SORT_FIELDS, SORT_ORDERS, STATUS_FILTERS } from "../types/todo.js";

/**
 * Zod schemas for everything that enters the app from outside.
 *
 * A schema both CHECKS the input and CLEANS it (trims strings, fills defaults,
 * converts "5" to 5), so code after validation can trust the data completely.
 */

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const SEARCH_MAX_LENGTH = 200;

/** "must be one of: low, medium, high", built from the same array the type uses */
const oneOf = (name: string, values: readonly string[]) =>
  `${name} must be one of: ${values.join(", ")}`;

/* ---------- reusable field schemas ---------- */

const titleField = z
  .string({
    error: (issue) => (issue.input === undefined ? "title is required" : "title must be a string"),
  })
  .trim()
  .min(1, "title cannot be empty")
  .max(TITLE_MAX_LENGTH, `title must be at most ${TITLE_MAX_LENGTH} characters`);

const descriptionField = z
  .string({ error: "description must be a string" })
  .trim()
  .max(DESCRIPTION_MAX_LENGTH, `description must be at most ${DESCRIPTION_MAX_LENGTH} characters`);

const priorityField = z.enum(PRIORITIES, { error: oneOf("priority", PRIORITIES) });

// z.iso.date() checks the format AND the calendar (rejects 2026-02-30, knows leap years)
const dueDateField = z.iso
  .date({ error: "dueDate must be a valid date in YYYY-MM-DD format, or null" })
  .nullable();

const completedField = z.boolean({ error: "completed must be true or false" });

/** Message for a body that is missing or not a JSON object (e.g. an array) */
const bodyError = (issue: { code: string }) =>
  issue.code === "invalid_type" ? "Request body must be a JSON object" : undefined;

/* ---------- request schemas ---------- */

/**
 * Path param `:id`. Arrives as a string, so it is checked with a regex
 * (only digits, no leading zero) and then converted to a number.
 * Rejects "abc", "0", "-1", "1.5", "1e3".
 */
export const idSchema = z
  .string({ error: "id must be a positive integer" })
  .regex(/^[1-9]\d*$/, "id must be a positive integer")
  .transform(Number);

/**
 * POST /api/todos body.
 * strictObject: unknown fields (e.g. a typo like "titel", or "id") are rejected
 * instead of being silently ignored.
 * The defaults are where business decisions live: a new todo is "medium"
 * priority, not completed, with no description and no due date.
 */
export const createTodoSchema = z.strictObject(
  {
    title: titleField,
    description: descriptionField.default(""),
    priority: priorityField.default("medium"),
    dueDate: dueDateField.default(null),
  },
  { error: bodyError },
);

/**
 * PATCH /api/todos/:id body. Every field optional (no defaults! a default
 * here would overwrite existing values), but at least one must be present.
 */
export const updateTodoSchema = z
  .strictObject(
    {
      title: titleField,
      description: descriptionField,
      priority: priorityField,
      dueDate: dueDateField,
      completed: completedField,
    },
    { error: bodyError },
  )
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, "Provide at least one field to update");

/**
 * GET /api/todos query string. Plain z.object (not strict): unknown query
 * params are ignored, because browsers and tools sometimes add their own
 * (e.g. cache-busters).
 */
export const listQuerySchema = z.object({
  status: z.enum(STATUS_FILTERS, { error: oneOf("status", STATUS_FILTERS) }).default("all"),
  search: z
    .string({ error: "search must be a single text value" })
    .trim()
    .max(SEARCH_MAX_LENGTH, `search must be at most ${SEARCH_MAX_LENGTH} characters`)
    // "?search=" (empty) means "no search", not "match empty text"
    .transform((text) => text || undefined)
    .optional(),
  sortBy: z.enum(SORT_FIELDS, { error: oneOf("sortBy", SORT_FIELDS) }).default("createdAt"),
  order: z.enum(SORT_ORDERS, { error: oneOf("order", SORT_ORDERS) }).default("desc"),
});

/** What a client may send when creating (defaults make most fields optional) */
export type CreateTodoInput = z.input<typeof createTodoSchema>;
/** What a client may send when updating */
export type UpdateTodoInput = z.input<typeof updateTodoSchema>;
