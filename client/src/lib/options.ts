import type { ListParams } from "../api/todos";
import type { Priority, SortField, SortOrder, StatusFilter } from "../types";

/**
 * Labels and choices shown in the UI.
 *
 * `Record<Priority, string>` must have a key for EVERY priority: if the
 * server ever adds one, this file stops compiling until a label is added.
 */
export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const PRIORITY_CHOICES = Object.keys(PRIORITY_LABELS) as Priority[];

export const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

/** Sort choices: each one is a sortBy + order pair, shown as one dropdown */
export const SORT_CHOICES: { value: string; label: string; sortBy: SortField; order: SortOrder }[] = [
  { value: "createdAt-desc", label: "Newest first", sortBy: "createdAt", order: "desc" },
  { value: "createdAt-asc", label: "Oldest first", sortBy: "createdAt", order: "asc" },
  { value: "dueDate-asc", label: "Due date (soonest)", sortBy: "dueDate", order: "asc" },
  { value: "priority-desc", label: "Priority (high → low)", sortBy: "priority", order: "desc" },
  { value: "title-asc", label: "Title (A → Z)", sortBy: "title", order: "asc" },
];

export const DEFAULT_LIST_PARAMS: ListParams = {
  status: "all",
  search: "",
  sortBy: "createdAt",
  order: "desc",
};

/** The dropdown value for a sortBy + order pair, e.g. "priority-desc" */
export const sortKey = (p: Pick<ListParams, "sortBy" | "order">) => `${p.sortBy}-${p.order}`;

/**
 * Reads the list page state from its URL (e.g. "?status=active&sort=priority-desc").
 * Anything missing or invalid falls back to the default, so a broken or
 * hand-edited URL never breaks the page.
 */
export function readListParams(queryString: string): ListParams {
  const query = new URLSearchParams(queryString);
  const status = STATUS_TABS.find((tab) => tab.value === query.get("status"))?.value;
  const sort = SORT_CHOICES.find((choice) => choice.value === query.get("sort"));

  return {
    status: status ?? DEFAULT_LIST_PARAMS.status,
    search: query.get("search") ?? "",
    sortBy: sort?.sortBy ?? DEFAULT_LIST_PARAMS.sortBy,
    order: sort?.order ?? DEFAULT_LIST_PARAMS.order,
  };
}

/** The reverse: list state → query string. Default values are left out to keep URLs short. */
export function toQueryString(params: ListParams): string {
  const query = new URLSearchParams();
  if (params.status !== DEFAULT_LIST_PARAMS.status) query.set("status", params.status);
  if (params.search.trim()) query.set("search", params.search.trim());
  if (sortKey(params) !== sortKey(DEFAULT_LIST_PARAMS)) query.set("sort", sortKey(params));

  const result = query.toString();
  return result ? `?${result}` : "";
}
