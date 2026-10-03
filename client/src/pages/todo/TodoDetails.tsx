import { useState } from "react";
import { toApiError } from "../../api/client";
import { deleteTodo, updateTodo } from "../../api/todos";
import { DueDateLabel } from "../../components/DueDateLabel";
import { ErrorBanner } from "../../components/ErrorBanner";
import { PriorityBadge } from "../../components/PriorityBadge";
import { describeDue, formatDate, formatDateTime, timeAgo } from "../../lib/dates";
import { PRIORITY_LABELS } from "../../lib/options";
import type { Todo } from "../../types";
import { EditTodoForm } from "./EditTodoForm";

interface Props {
  todo: Todo;
  backUrl: string;
  onUpdated: (todo: Todo) => void;
}

/** Everything about one todo, with complete / edit / delete actions */
export function TodoDetails({ todo, backUrl, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleCompleted() {
    setBusy(true);
    setError(null);
    try {
      onUpdated(await updateTodo(todo.id, { completed: !todo.completed }));
    } catch (err) {
      setError(toApiError(err).userMessage);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${todo.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteTodo(todo.id);
      // This page has nothing left to show: go back to the list (full page load)
      window.location.assign(backUrl);
    } catch (err) {
      setError(toApiError(err).userMessage);
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <EditTodoForm
        todo={todo}
        onSaved={(updated) => {
          onUpdated(updated);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <article className="card detail">
      <header className="detail-header">
        <div>
          <h1 className={`detail-title ${todo.completed ? "is-done" : ""}`}>{todo.title}</h1>
          <div className="detail-badges">
            <span className={`badge ${todo.completed ? "status-completed" : "status-active"}`}>
              {todo.completed ? "✓ Completed" : "Active"}
            </span>
            <PriorityBadge priority={todo.priority} />
            {todo.dueDate && <DueDateLabel dueDate={todo.dueDate} completed={todo.completed} />}
          </div>
        </div>
        <button
          type="button"
          className={`btn ${todo.completed ? "" : "btn-primary"}`}
          onClick={() => void toggleCompleted()}
          disabled={busy}
        >
          {todo.completed ? "Mark as active" : "Mark as completed"}
        </button>
      </header>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <section className="detail-section">
        <h2>Description</h2>
        {todo.description ? (
          <p className="detail-description">{todo.description}</p>
        ) : (
          <p className="muted">No description.</p>
        )}
      </section>

      <section className="detail-section">
        <h2>Details</h2>
        <dl className="meta-grid">
          <dt>ID</dt>
          <dd>#{todo.id}</dd>

          <dt>Status</dt>
          <dd>{todo.completed ? "Completed" : "Active"}</dd>

          <dt>Priority</dt>
          <dd>{PRIORITY_LABELS[todo.priority]}</dd>

          <dt>Due date</dt>
          <dd>
            {todo.dueDate
              ? `${formatDate(todo.dueDate)}${todo.completed ? "" : ` (${describeDue(todo.dueDate)})`}`
              : "No due date"}
          </dd>

          <dt>Created</dt>
          <dd>
            <time dateTime={todo.createdAt}>{formatDateTime(todo.createdAt)}</time>{" "}
            <span className="muted">({timeAgo(todo.createdAt)})</span>
          </dd>

          <dt>Last updated</dt>
          <dd>
            <time dateTime={todo.updatedAt}>{formatDateTime(todo.updatedAt)}</time>{" "}
            <span className="muted">({timeAgo(todo.updatedAt)})</span>
          </dd>
        </dl>
      </section>

      <footer className="detail-actions">
        <button type="button" className="btn btn-primary" onClick={() => setEditing(true)} disabled={busy}>
          Edit
        </button>
        <span className="spacer" />
        <button type="button" className="btn btn-danger" onClick={() => void remove()} disabled={busy}>
          Delete
        </button>
      </footer>
    </article>
  );
}
