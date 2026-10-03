import type { NewTodo, SortField, SortOrder, StatusFilter, Todo, TodoChanges, TodoStats } from "../types";
import { request } from "./client";

/**
 * One function per API endpoint. Components call these and never build
 * URLs or call fetch themselves, so the API contract lives in one file.
 */

export interface ListParams {
  status: StatusFilter;
  search: string;
  sortBy: SortField;
  order: SortOrder;
}

export interface TodoList {
  todos: Todo[];
  stats: TodoStats;
}

export async function listTodos(params: ListParams, signal?: AbortSignal): Promise<TodoList> {
  const query = new URLSearchParams({ status: params.status, sortBy: params.sortBy, order: params.order });
  if (params.search.trim()) query.set("search", params.search.trim());

  const body = await request<{ data: Todo[]; stats: TodoStats }>(`/todos?${query}`, { signal });
  return { todos: body.data, stats: body.stats };
}

export async function getTodo(id: number, signal?: AbortSignal): Promise<Todo> {
  return (await request<{ data: Todo }>(`/todos/${id}`, { signal })).data;
}

export async function createTodo(input: NewTodo): Promise<Todo> {
  return (await request<{ data: Todo }>("/todos", { method: "POST", body: JSON.stringify(input) })).data;
}

export async function updateTodo(id: number, changes: TodoChanges): Promise<Todo> {
  return (await request<{ data: Todo }>(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(changes) })).data;
}

export async function deleteTodo(id: number): Promise<void> {
  await request<void>(`/todos/${id}`, { method: "DELETE" });
}

/** Deletes all completed todos; returns how many were removed */
export async function clearCompleted(): Promise<number> {
  return (await request<{ data: { deleted: number } }>("/todos/completed", { method: "DELETE" })).data.deleted;
}
