import type { RequestHandler } from "express";

/**
 * Logs one line per request when the response is finished, e.g.
 *   GET /api/todos?status=active 200 3.1ms
 * Enough for local development, without adding a logging library.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const start = performance.now();
  res.on("finish", () => {
    const ms = (performance.now() - start).toFixed(1);
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
};
