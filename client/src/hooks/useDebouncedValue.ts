import { useEffect, useState } from "react";

/**
 * Returns `value`, but only after it has stopped changing for `delayMs`.
 * Used for the search box: typing "milk" sends 1 request, not 4.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    // A new keystroke cancels the pending update and starts the wait again
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
