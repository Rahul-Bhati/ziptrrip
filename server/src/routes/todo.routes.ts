import { Router } from "express";
import type { TodoController } from "../controllers/todo.controller.js";

/**
 * URL → handler map for /api/todos. Reading this file shows the whole API.
 */
export function createTodoRouter(controller: TodoController): Router {
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);

  // Must be registered BEFORE "/:id", otherwise Express would match
  // "completed" as an id and the id validation would reject it.
  router.delete("/completed", controller.clearCompleted);

  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return router;
}
