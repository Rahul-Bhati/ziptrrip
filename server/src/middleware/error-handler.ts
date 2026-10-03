import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../errors.js";

/**
 * Every error response in the API has this one shape, so clients
 * need only one piece of error-handling code:
 *   { "error": { "code": "...", "message": "...", "details": [...] } }
 */
interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/**
 * Errors created by Express's body parser (express.json) carry an HTTP
 * `status` and a `type`, e.g. invalid JSON → status 400, type "entity.parse.failed".
 */
function isBodyParserError(err: unknown): err is { status: number; type: string; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof err.status === "number" &&
    "type" in err &&
    typeof err.type === "string"
  );
}

/** Friendly code + message for the body-parser errors a client can trigger */
const BODY_PARSER_ERRORS: Record<string, { code: string; message: string }> = {
  "entity.parse.failed": { code: "INVALID_JSON", message: "Request body is not valid JSON" },
  "entity.too.large": { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large (max 100kb)" },
};

/** 404 for any /api URL that no route matched */
export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorBody = {
    error: { code: "ROUTE_NOT_FOUND", message: `Cannot ${req.method} ${req.originalUrl}` },
  };
  res.status(404).json(body);
};

/**
 * Central error handler. Express recognises it as an error handler because it
 * has FOUR parameters, so `_next` must stay even though it is unused.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Our own errors: status, code and details are already decided by the service
  if (err instanceof AppError) {
    const body: ErrorBody = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    res.status(err.statusCode).json(body);
    return;
  }

  // Client sent broken JSON, or a body that is too large
  if (isBodyParserError(err) && err.status >= 400 && err.status < 500) {
    const known = BODY_PARSER_ERRORS[err.type];
    const error = known ?? { code: "BAD_REQUEST", message: err.message };
    res.status(err.status).json({ error } satisfies ErrorBody);
    return;
  }

  // Anything else is a bug. Log the details for us, but never send internals
  // (stack traces, SQL) to the client.
  console.error(err);
  res
    .status(500)
    .json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ErrorBody);
};
