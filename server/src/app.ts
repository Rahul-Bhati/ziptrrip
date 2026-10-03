import express from "express";
import { existsSync } from "node:fs";
import { createTodoController } from "./controllers/todo.controller.js";
import type { DB } from "./db/database.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { TodoRepository } from "./repositories/todo.repository.js";
import { createTodoRouter } from "./routes/todo.routes.js";
import { TodoService } from "./services/todo.service.js";

export interface AppOptions {
  /** Print one log line per request (off in tests to keep output clean) */
  logRequests?: boolean;
  /** Folder with the built frontend to serve as static files (production) */
  staticDir?: string;
}

/**
 * Builds the Express app without starting it.
 *
 * This is the "composition root": the one place where the layers are
 * created and connected (db → repository → service → controller → router).
 * The database is passed in, so tests can use an in-memory DB while the
 * real server uses a file. Keeping "build" separate from "listen" lets
 * Supertest call the app directly, without opening a network port.
 */
export function createApp(db: DB, options: AppOptions = {}) {
  const app = express();

  // Don't advertise "X-Powered-By: Express" (free info for attackers)
  app.disable("x-powered-by");

  if (options.logRequests) app.use(requestLogger);

  // Parse JSON request bodies into req.body (default size limit: 100kb)
  app.use(express.json());

  // Wire the layers together
  const service = new TodoService(new TodoRepository(db));
  const controller = createTodoController(service);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/todos", createTodoRouter(controller));

  // Any other /api URL → JSON 404 (instead of Express's default HTML page)
  app.use("/api", notFoundHandler);

  // Production: serve the built MPA pages (index.html, todo.html, assets)
  if (options.staticDir && existsSync(options.staticDir)) {
    app.use(express.static(options.staticDir));
  }

  // Error handler must be registered LAST, after all routes
  app.use(errorHandler);

  return app;
}
