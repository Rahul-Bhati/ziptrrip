import type { Priority, Todo, TodoChanges } from "../types";

/** The edit form's state. Inputs work with strings, so "no due date" is "" here. */
export interface TodoDraft {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  completed: boolean;
}

export function toDraft(todo: Todo): TodoDraft {
  return {
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    dueDate: todo.dueDate ?? "",
    completed: todo.completed,
  };
}

/**
 * Compares the form with the saved todo and returns ONLY the fields that
 * changed: exactly what a PATCH request should contain.
 *
 * Why not send everything? A smaller request, and it doesn't overwrite fields
 * the user didn't touch (e.g. if the todo was completed in another tab
 * meanwhile, editing just the title here won't undo that).
 */
export function getChanges(original: Todo, draft: TodoDraft): TodoChanges {
  const changes: TodoChanges = {};

  const title = draft.title.trim();
  if (title !== original.title) changes.title = title;

  const description = draft.description.trim();
  if (description !== original.description) changes.description = description;

  if (draft.priority !== original.priority) changes.priority = draft.priority;

  const dueDate = draft.dueDate || null; // empty date input = remove the due date
  if (dueDate !== original.dueDate) changes.dueDate = dueDate;

  if (draft.completed !== original.completed) changes.completed = draft.completed;

  return changes;
}
