/**
 * Shared Todo types.
 *
 * The `as const` arrays are the single source of truth for allowed values:
 * TypeScript derives the union types from them here, and in step 3 Zod
 * builds its runtime validators from the very same arrays.
 */

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number]; // "low" | "medium" | "high"

export const STATUS_FILTERS = ["all", "active", "completed"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const SORT_FIELDS = ["createdAt", "dueDate", "priority", "title"] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/** A todo as the API returns it (camelCase, real booleans). */
export interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  /** Calendar date "YYYY-MM-DD", or null when there is no due date */
  dueDate: string | null;
  /** ISO 8601 timestamps, e.g. "2026-10-03T08:15:30.123Z" */
  createdAt: string;
  updatedAt: string;
}

/**
 * Data needed to insert a todo. Every field is required here on purpose:
 * defaults (priority "medium", empty description...) are decided by the
 * validation layer, so the repository never makes business decisions.
 */
export interface CreateTodoData {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
}

/**
 * Partial update. A field that is `undefined` (not sent) is left unchanged.
 * For dueDate, `null` is different from `undefined`: it means "remove the due date".
 */
export type UpdateTodoData = Partial<CreateTodoData & { completed: boolean }>;

/** Options for listing todos */
export interface TodoFilters {
  status?: StatusFilter;
  /** Case-insensitive text match on title or description */
  search?: string;
  sortBy?: SortField;
  order?: SortOrder;
}

/** Counts shown in the list page header */
export interface TodoStats {
  total: number;
  active: number;
  completed: number;
}
