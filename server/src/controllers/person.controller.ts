import type { RequestHandler } from "express";
import type { PersonService } from "../services/person.service.js";

/**
 * HTTP handlers for people. Same job as the todo controller:
 * read the request, call the service, set the status code.
 */
export function createPersonController(service: PersonService) {
  const list: RequestHandler = (_req, res) => {
    res.json({ data: service.list() });
  };

  const create: RequestHandler = (req, res) => {
    const person = service.create(req.body);
    res.status(201).location(`/api/people/${person.id}`).json({ data: person });
  };

  return { list, create };
}

export type PersonController = ReturnType<typeof createPersonController>;
