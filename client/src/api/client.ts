/**
 * Thin wrapper around fetch for our API.
 *
 * - Prefixes every path with /api (proxied to Express in dev, same server in production)
 * - Sends/receives JSON
 * - Turns every failure into ONE error type (ApiError), so components only
 *   need a single way to show errors
 */

export interface FieldError {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: FieldError[];

  constructor(message: string, status: number, code: string, details: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** The most useful text to show a user: field messages if present, else the main message */
  get userMessage(): string {
    return this.details.length > 0 ? this.details.map((d) => d.message).join(". ") : this.message;
  }
}

/** Any thrown value → ApiError, so UI code can always read `.userMessage` */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError("Something unexpected went wrong", 0, "UNKNOWN_ERROR");
}

/** True when a request was cancelled on purpose (component unmounted, newer search typed) */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    // fetch only rejects on network failure (server down, offline), never on 4xx/5xx
    throw new ApiError("Cannot reach the server. Is it running?", 0, "NETWORK_ERROR");
  }

  // 204 No Content: success with no body to parse
  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (body as { error?: { message?: string; code?: string; details?: FieldError[] } } | null)
      ?.error;
    throw new ApiError(
      error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      error?.code ?? "UNKNOWN_ERROR",
      error?.details ?? [],
    );
  }

  return body as T;
}
