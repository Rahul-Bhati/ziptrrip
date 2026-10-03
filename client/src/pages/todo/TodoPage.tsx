import { useEffect, useState } from "react";
import { type ApiError, isAbortError, toApiError } from "../../api/client";
import { getTodo } from "../../api/todos";
import { ErrorBanner } from "../../components/ErrorBanner";
import { listPageUrl, readTodoId } from "../../lib/urls";
import type { Todo } from "../../types";
import { TodoDetails } from "./TodoDetails";

/**
 * Every state the page can be in, as one union type. TypeScript then forces
 * each case to be handled, and impossible combinations (e.g. "loading" AND
 * "has a todo") cannot be represented.
 */
type PageState =
  | { kind: "invalid-id" }
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "error"; error: ApiError }
  | { kind: "ready"; todo: Todo };

/**
 * Page 2: one todo (todo.html?id=<id>).
 * Reads the id from the query parameter, loads the todo, and shows it
 * with all its details, or a clear message if the id is missing, invalid
 * or unknown.
 */
export function TodoPage() {
  // The id never changes while this page is open (a different todo = a new page load)
  const [id] = useState(() => readTodoId(window.location.search));
  const [backUrl] = useState(() => listPageUrl(document.referrer, window.location.origin));
  const [state, setState] = useState<PageState>(id === null ? { kind: "invalid-id" } : { kind: "loading" });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (id === null) return;
    const controller = new AbortController();

    getTodo(id, controller.signal)
      .then((todo) => setState({ kind: "ready", todo }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        const apiError = toApiError(error);
        setState(apiError.status === 404 ? { kind: "not-found" } : { kind: "error", error: apiError });
      });

    return () => controller.abort();
  }, [id, reloadCount]);

  // Browser tab title follows the todo
  useEffect(() => {
    document.title = state.kind === "ready" ? `${state.todo.title} · Todos` : "Todo · Todos";
  }, [state]);

  return (
    <main className="container">
      {/* Plain link = full page load back to the list (MPA) */}
      <a className="back-link" href={backUrl}>
        ← All todos
      </a>

      {state.kind === "invalid-id" && (
        <div className="empty">
          <p>
            This link has no valid todo id. Expected something like <code>todo.html?id=1</code>.
          </p>
          <a className="btn" href="/">
            Go to all todos
          </a>
        </div>
      )}

      {state.kind === "loading" && <p className="muted center">Loading todo…</p>}

      {state.kind === "not-found" && (
        <div className="empty">
          <p>Todo #{id} was not found. It may have been deleted.</p>
          <a className="btn" href="/">
            Go to all todos
          </a>
        </div>
      )}

      {state.kind === "error" && (
        <ErrorBanner
          message={state.error.userMessage}
          onRetry={() => {
            setState({ kind: "loading" });
            setReloadCount((count) => count + 1);
          }}
        />
      )}

      {state.kind === "ready" && (
        <TodoDetails
          todo={state.todo}
          backUrl={backUrl}
          // The PATCH response IS the new todo: no need to fetch it again
          onUpdated={(todo) => setState({ kind: "ready", todo })}
        />
      )}
    </main>
  );
}
