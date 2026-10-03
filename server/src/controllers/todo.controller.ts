import type { RequestHandler } from "express";
import type { TodoService } from "../services/todo.service.js";

/**
 * HTTP handlers for todos.
 *
 * A controller is a thin translator: it takes what it needs from the request
 * (params / query / body), calls the service, and picks the status code.
 * No validation, no SQL, no business rules here.
 *
 * If the service throws (validation / not found), Express forwards the error
 * to the error-handling middleware automatically, so there is no try/catch here.
 *
 * Built by a factory function (not class methods) so handlers can be passed
 * straight to the router without losing `this`.
 */
export function createTodoController(service: TodoService) {
  const list: RequestHandler = (req, res) => {
    const { todos, stats } = service.list(req.query);
    res.json({ data: todos, stats });
  };

  const getById: RequestHandler = (req, res) => {
    res.json({ data: service.getById(req.params.id) });
  };

  const create: RequestHandler = (req, res) => {
    const todo = service.create(req.body);
    // 201 Created + Location header pointing at the new resource
    res.status(201).location(`/api/todos/${todo.id}`).json({ data: todo });
  };

  const update: RequestHandler = (req, res) => {
    res.json({ data: service.update(req.params.id, req.body) });
  };

  const remove: RequestHandler = (req, res) => {
    service.delete(req.params.id);
    // 204 No Content: success, and there is nothing to send back
    res.status(204).end();
  };

  const clearCompleted: RequestHandler = (_req, res) => {
    res.json({ data: service.clearCompleted() });
  };

  return { list, getById, create, update, remove, clearCompleted };
}

export type TodoController = ReturnType<typeof createTodoController>;
