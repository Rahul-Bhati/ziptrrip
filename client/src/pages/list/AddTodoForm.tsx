import { useRef, useState } from "react";
import { toApiError } from "../../api/client";
import { createTodo } from "../../api/todos";
import { PRIORITY_CHOICES, PRIORITY_LABELS } from "../../lib/options";
import type { Person, Priority } from "../../types";

/** Same limits as the server; the server still validates (never trust the client) */
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;

export function AddTodoForm({
  people,
  peopleReady,
  peopleError,
  onCreated,
}: {
  people: Person[];
  peopleReady: boolean;
  peopleError: string | null;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!title.trim()) {
      setError("Please enter a title");
      titleInput.current?.focus();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createTodo({
        title,
        priority,
        description,
        dueDate: dueDate || null,
        assigneeId: assigneeId === "" ? null : assigneeId,
      });
      // Reset the form for the next todo, keep focus in the title box
      setTitle("");
      setDescription("");
      setDueDate("");
      setAssigneeId("");
      setPriority("medium");
      setShowDescription(false);
      titleInput.current?.focus();
      onCreated();
    } catch (err) {
      setError(toApiError(err).userMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="card add-form"
      onSubmit={(event) => {
        event.preventDefault(); // stop the browser's default full-page form submission
        void submit();
      }}
    >
      <div className="add-row">
        <input
          ref={titleInput}
          className="input add-title"
          placeholder="What needs to be done?"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TITLE_MAX}
          aria-label="Todo title"
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Adding…" : "Add"}
        </button>
      </div>

      <div className="add-options">
        <label className="field-inline">
          Priority
          <select className="input" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {PRIORITY_CHOICES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="field-inline">
          Due date
          <input className="input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>

        <label className="field-inline">
          Assignee
          <select
            className="input"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value === "" ? "" : Number(event.target.value))}
          >
            <option value="">Unassigned</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>

        {peopleReady && people.length === 0 && !peopleError && <span className="muted">No people yet</span>}

        {!showDescription && (
          <button type="button" className="btn-link" onClick={() => setShowDescription(true)}>
            + Add description
          </button>
        )}
      </div>

      {showDescription && (
        <textarea
          className="input"
          placeholder="Description (optional)"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={DESCRIPTION_MAX}
          aria-label="Todo description"
        />
      )}

      {peopleError && (
        <p className="form-error" role="alert">
          {peopleError}
        </p>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
