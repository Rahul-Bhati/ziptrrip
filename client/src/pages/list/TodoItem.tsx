import { useState } from "react";
import { toApiError } from "../../api/client";
import { deleteTodo, updateTodo } from "../../api/todos";
import { DueDateLabel } from "../../components/DueDateLabel";
import { PriorityBadge } from "../../components/PriorityBadge";
import { todoPageUrl } from "../../lib/urls";
import type { Todo } from "../../types";

interface Props {
  todo: Todo;
  /** Called after a successful change, so the page reloads the list */
  onChanged: () => void;
  onError: (message: string) => void;
}

/** One row: checkbox, title (link to the detail page), badges, edit and delete */
export function TodoItem({ todo, onChanged, onError }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [busy, setBusy] = useState(false);

  /** Runs an API action with a busy flag; reloads on success, reports errors */
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      onChanged();
    } catch (error) {
      onError(toApiError(error).userMessage);
    } finally {
      setBusy(false);
    }
  }

  function startEditing() {
    setDraft(todo.title);
    setEditing(true);
  }

  function saveTitle() {
    const title = draft.trim();
    if (!title || title === todo.title) {
      setEditing(false); // nothing to save
      return;
    }
    void run(async () => {
      await updateTodo(todo.id, { title });
      setEditing(false);
    });
  }

  function remove() {
    // Native confirm: simple and accessible; a custom modal would be nicer but more code
    if (window.confirm(`Delete "${todo.title}"? This cannot be undone.`)) {
      void run(() => deleteTodo(todo.id));
    }
  }

  return (
    <li className={`todo-item ${todo.completed ? "is-done" : ""}`}>
      <input
        type="checkbox"
        className="todo-check"
        checked={todo.completed}
        disabled={busy}
        onChange={() => void run(() => updateTodo(todo.id, { completed: !todo.completed }))}
        aria-label={todo.completed ? `Mark "${todo.title}" as active` : `Mark "${todo.title}" as completed`}
      />

      <div className="todo-body">
        {editing ? (
          <form
            className="inline-edit"
            onSubmit={(event) => {
              event.preventDefault();
              saveTitle();
            }}
          >
            <input
              className="input"
              value={draft}
              maxLength={200}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setEditing(false)}
              aria-label="Edit title"
            />
            <button type="submit" className="btn btn-small btn-primary" disabled={busy}>
              Save
            </button>
            <button type="button" className="btn btn-small" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </form>
        ) : (
          // A real link: opening a todo is a full page load of todo.html (MPA)
          <a className="todo-title" href={todoPageUrl(todo.id)}>
            {todo.title}
          </a>
        )}

        {todo.description && !editing && <p className="todo-description">{todo.description}</p>}

        <div className="todo-meta">
          <PriorityBadge priority={todo.priority} />
          {todo.dueDate && <DueDateLabel dueDate={todo.dueDate} completed={todo.completed} />}
        </div>
      </div>

      {!editing && (
        <div className="todo-actions">
          <button type="button" className="btn-icon" onClick={startEditing} disabled={busy} aria-label={`Edit "${todo.title}"`} title="Edit title">
            ✎
          </button>
          <button type="button" className="btn-icon danger" onClick={remove} disabled={busy} aria-label={`Delete "${todo.title}"`} title="Delete">
            🗑
          </button>
        </div>
      )}
    </li>
  );
}
