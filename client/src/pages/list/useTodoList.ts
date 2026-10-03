import { useCallback, useEffect, useState } from "react";
import { type ApiError, isAbortError, toApiError } from "../../api/client";
import { type ListParams, type TodoList, listTodos } from "../../api/todos";

interface State {
  data: TodoList | null;
  error: ApiError | null;
  loading: boolean;
}

/**
 * Loads the todo list for the given filters, and reloads whenever they change.
 *
 * - The previous list stays on screen while a new one loads (no flicker).
 * - Each request gets an AbortController; when the filters change again (or the
 *   page unmounts) the old request is cancelled. This prevents a classic race:
 *   a slow response for "mi" arriving AFTER the response for "milk" and
 *   overwriting the newer results.
 * - `reload()` refetches with the same filters (after create/update/delete).
 */
export function useTodoList({ status, search, sortBy, order }: ListParams) {
  const [state, setState] = useState<State>({ data: null, error: null, loading: true });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true }));

    listTodos({ status, search, sortBy, order }, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return; // cancelled on purpose: ignore
        setState((prev) => ({ ...prev, error: toApiError(error), loading: false }));
      });

    return () => controller.abort();
  }, [status, search, sortBy, order, reloadCount]);

  // useCallback: a stable function, safe to pass to child components
  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { ...state, reload };
}
