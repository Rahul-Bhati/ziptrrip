import { Router } from "express";
import type { PersonController } from "../controllers/person.controller.js";

/** URL → handler map for /api/people. */
export function createPersonRouter(controller: PersonController): Router {
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);

  return router;
}
