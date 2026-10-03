/**
 * Page URLs of the MPA. Pages link to each other with plain URLs
 * (full page loads), so these helpers are the whole "routing" of the app.
 */

/** Link to the detail page of one todo, e.g. "/todo.html?id=3" */
export function todoPageUrl(id: number): string {
  return `/todo.html?id=${id}`;
}

/**
 * Reads the todo id from the detail page's query string ("?id=3").
 * Returns null unless it is a positive integer: the same rule the server
 * applies, so obviously bad ids never even cause a request.
 */
export function readTodoId(queryString: string): number | null {
  const raw = new URLSearchParams(queryString).get("id");
  return raw !== null && /^[1-9]\d*$/.test(raw) ? Number(raw) : null;
}

/**
 * Where "← All todos" should go. If the user came from the list page,
 * go back to exactly that URL (keeps their filters, search and sort);
 * otherwise (opened from a bookmark or shared link) go to the plain list.
 */
export function listPageUrl(referrer: string, currentOrigin: string): string {
  try {
    const from = new URL(referrer);
    const isListPage = from.pathname === "/" || from.pathname === "/index.html";
    if (from.origin === currentOrigin && isListPage) return `${from.pathname}${from.search}`;
  } catch {
    // empty or invalid referrer: fall through
  }
  return "/";
}
