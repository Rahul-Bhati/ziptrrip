import { useEffect, useState } from "react";
import { type FieldError, toApiError } from "../../api/client";
import { updateTodo } from "../../api/todos";
import { type TodoDraft, getChanges, toDraft } from "../../lib/changes";
import { PRIORITY_CHOICES, PRIORITY_LABELS } from "../../lib/options";
import type { Person, Priority, Todo } from "../../types";

interface Props {
  todo: Todo;
  people: Person[];
  peopleReady: boolean;
  peopleError: string | null;
  onSaved: (todo: Todo) => void;
  onCancel: () => void;
}

/** Edit every field of a todo; sends only what changed (PATCH) */
export function EditTodoForm({ todo, people, peopleReady, peopleError, onSaved, onCancel }: Props) {
  const [draft, setDraft] = useState<TodoDraft>(() => toDraft(todo));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);

  const changes = getChanges(todo, draft);
  const isDirty = Object.keys(changes).length > 0;

  // Leaving the page (link, reload, closing the tab) would lose unsaved edits:
  // ask the browser to show its "Leave site?" confirmation while there are changes.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const update = (fields: Partial<TodoDraft>) => setDraft((prev) => ({ ...prev, ...fields }));
  const errorFor = (field: string) => errors.find((e) => e.field === field)?.message;
  const generalErrors = errors.filter(
    (e) => !e.field || !["title", "description", "priority", "dueDate", "assigneeId"].includes(e.field),
  );

  async function save() {
    if (!isDirty) {
      onCancel(); // nothing changed: just leave edit mode
      return;
    }
    if (!draft.title.trim()) {
      setErrors([{ field: "title", message: "Title cannot be empty" }]);
      return;
    }

    setSaving(true);
    setErrors([]);
    try {
      onSaved(await updateTodo(todo.id, changes));
    } catch (err) {
      const apiError = toApiError(err);
      // Field errors from the server appear under the matching input
      setErrors(apiError.details.length > 0 ? apiError.details : [{ message: apiError.message }]);
      setSaving(false);
    }
  }

  return (
    <form
      className="card form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h1 className="detail-title">Edit todo</h1>

      <label className="field">
        Title
        <input
          className="input"
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
          maxLength={200}
          required
          autoFocus
          aria-invalid={Boolean(errorFor("title"))}
        />
        {errorFor("title") && <span className="form-error">{errorFor("title")}</span>}
      </label>

      <label className="field">
        Description
        <textarea
          className="input"
          rows={5}
          value={draft.description}
          onChange={(event) => update({ description: event.target.value })}
          maxLength={2000}
          aria-invalid={Boolean(errorFor("description"))}
        />
        <span className="field-hint">{draft.description.length} / 2000</span>
        {errorFor("description") && <span className="form-error">{errorFor("description")}</span>}
      </label>

      <div className="form-row">
        <label className="field">
          Priority
          <select
            className="input"
            value={draft.priority}
            onChange={(event) => update({ priority: event.target.value as Priority })}
          >
            {PRIORITY_CHOICES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          Due date
          <input
            className="input"
            type="date"
            value={draft.dueDate}
            onChange={(event) => update({ dueDate: event.target.value })}
            aria-invalid={Boolean(errorFor("dueDate"))}
          />
          <span className="field-hint">Clear the date to remove it</span>
          {errorFor("dueDate") && <span className="form-error">{errorFor("dueDate")}</span>}
        </label>
      </div>

      <label className="field">
        Assignee
        <select
          className="input"
          value={draft.assigneeId}
          onChange={(event) => update({ assigneeId: event.target.value === "" ? "" : Number(event.target.value) })}
          aria-invalid={Boolean(errorFor("assigneeId"))}
        >
          <option value="">Unassigned</option>
          {typeof draft.assigneeId === "number" && !people.some((person) => person.id === draft.assigneeId) && (
            <option value={draft.assigneeId}>{todo.assignee?.name ?? "Unknown"}</option>
          )}
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        <span className="field-hint">Choose Unassigned to clear it</span>
        {peopleReady && people.length === 0 && !peopleError && <span className="field-hint">No people yet</span>}
        {peopleError && <span className="form-error">{peopleError}</span>}
        {errorFor("assigneeId") && <span className="form-error">{errorFor("assigneeId")}</span>}
      </label>

      <label className="checkbox-field">
        <input
          type="checkbox"
          className="todo-check"
          checked={draft.completed}
          onChange={(event) => update({ completed: event.target.checked })}
        />
        Completed
      </label>

      {generalErrors.map((error) => (
        <p key={error.message} className="form-error" role="alert">
          {error.message}
        </p>
      ))}

      <div className="detail-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
