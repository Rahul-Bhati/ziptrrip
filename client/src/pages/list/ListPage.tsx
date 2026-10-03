import { useEffect, useState } from "react";
import { toApiError } from "../../api/client";
import { type ListParams, clearCompleted } from "../../api/todos";
import { ErrorBanner } from "../../components/ErrorBanner";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { DEFAULT_LIST_PARAMS, readListParams, toQueryString } from "../../lib/options";
import { AddTodoForm } from "./AddTodoForm";
import { TodoItem } from "./TodoItem";
import { Toolbar } from "./Toolbar";
import { useTodoList } from "./useTodoList";

/**
 * Page 1: the todo list (index.html).
 *
 * After every change (add / toggle / edit / delete) the list is re-fetched
 * from the server instead of being patched locally. One extra small request,
 * but the list, its sort order, the active filter and the counts can never
 * drift out of sync with the database.
 */
export function ListPage() {
  // Initial filters come from the URL, so reload / back button / shared links keep them
  const [params, setParams] = useState<ListParams>(() => readListParams(window.location.search));
  const search = useDebouncedValue(params.search, 300);
  const { status, sortBy, order } = params;

  const { data, error, loading, reload } = useTodoList({ status, search, sortBy, order });
  const [actionError, setActionError] = useState<string | null>(null);

  // Mirror the filters into the URL (replaceState: no new history entry per keystroke)
  useEffect(() => {
    const query = toQueryString({ status, search, sortBy, order });
    window.history.replaceState(null, "", `${window.location.pathname}${query}`);
  }, [status, search, sortBy, order]);

  const updateParams = (changes: Partial<ListParams>) => setParams((prev) => ({ ...prev, ...changes }));

  async function handleClearCompleted() {
    if (!data) return;
    const count = data.stats.completed;
    if (!window.confirm(`Delete ${count} completed todo${count === 1 ? "" : "s"}? This cannot be undone.`)) return;
    try {
      await clearCompleted();
      reload();
    } catch (err) {
      setActionError(toApiError(err).userMessage);
    }
  }

  const stats = data?.stats;
  const isFiltered = status !== "all" || search.trim() !== "";

  return (
    <main className="container">
      <header className="page-header">
        <h1>Todos</h1>
        {stats && (
          <p className="muted">
            {stats.active} active · {stats.completed} completed
          </p>
        )}
      </header>

      <AddTodoForm onCreated={reload} />

      <Toolbar params={params} stats={stats} onChange={updateParams} />

      {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}
      {error && <ErrorBanner message={error.userMessage} onRetry={reload} />}

      {!data && loading && <p className="muted center">Loading todos…</p>}

      {data && data.todos.length === 0 && (
        <div className="empty">
          {isFiltered ? (
            <>
              <p>No todos match your filters.</p>
              <button type="button" className="btn" onClick={() => setParams(DEFAULT_LIST_PARAMS)}>
                Clear filters
              </button>
            </>
          ) : (
            <p>Nothing to do yet. Add your first todo above! 🎉</p>
          )}
        </div>
      )}

      {data && data.todos.length > 0 && (
        <ul className={`todo-list ${loading ? "is-refreshing" : ""}`} aria-busy={loading}>
          {data.todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onChanged={reload} onError={setActionError} />
          ))}
        </ul>
      )}

      {stats && stats.completed > 0 && (
        <footer className="list-footer">
          <button type="button" className="btn-link danger" onClick={() => void handleClearCompleted()}>
            Clear completed ({stats.completed})
          </button>
        </footer>
      )}
    </main>
  );
}
