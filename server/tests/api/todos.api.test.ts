import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DB } from "../../src/db/database.js";
import { createTestApp } from "../helpers.js";

/*
 * API (integration) tests: real HTTP requests through the whole stack
 * (routing, JSON parsing, controller, service, repository, SQLite),
 * using Supertest, which calls the app directly without opening a port.
 */

describe("Todos API", () => {
  let app: Express;
  let db: DB;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  /** Creates a todo through the API and returns it */
  async function createTodo(body: Record<string, unknown> = { title: "Test todo" }) {
    const res = await request(app).post("/api/todos").send(body).expect(201);
    return res.body.data;
  }

  describe("GET /api/health", () => {
    it("returns ok and hides the X-Powered-By header", async () => {
      const res = await request(app).get("/api/health").expect(200);
      expect(res.body).toEqual({ status: "ok" });
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });
  });

  describe("POST /api/todos", () => {
    it("creates a todo: 201, Location header, todo in data", async () => {
      const res = await request(app)
        .post("/api/todos")
        .send({ title: "Buy milk", priority: "high", dueDate: "2026-10-10" })
        .expect("Content-Type", /json/)
        .expect(201);

      expect(res.headers.location).toBe(`/api/todos/${res.body.data.id}`);
      expect(res.body.data).toMatchObject({
        title: "Buy milk",
        priority: "high",
        dueDate: "2026-10-10",
        completed: false,
        description: "",
      });
    });

    it("returns 400 with per-field details for invalid input", async () => {
      const res = await request(app).post("/api/todos").send({ title: "", priority: "urgent" }).expect(400);

      expect(res.body).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: [
            { field: "title", message: "title cannot be empty" },
            { field: "priority", message: "priority must be one of: low, medium, high" },
          ],
        },
      });
    });

    it("returns 400 INVALID_JSON for malformed JSON", async () => {
      const res = await request(app)
        .post("/api/todos")
        .set("Content-Type", "application/json")
        .send("{ bad json")
        .expect(400);

      expect(res.body.error.code).toBe("INVALID_JSON");
    });

    it("returns 400 when the body is missing", async () => {
      const res = await request(app).post("/api/todos").expect(400);
      expect(res.body.error.details[0].message).toBe("Request body must be a JSON object");
    });

    it("returns 413 PAYLOAD_TOO_LARGE for a body over 100kb", async () => {
      const res = await request(app)
        .post("/api/todos")
        .send({ title: "x", description: "a".repeat(150_000) })
        .expect(413);

      expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    });
  });

  describe("GET /api/todos", () => {
    it("returns todos and stats", async () => {
      await createTodo({ title: "First" });
      await createTodo({ title: "Second" });

      const res = await request(app).get("/api/todos").expect(200);

      expect(res.body.data.map((t: { title: string }) => t.title)).toEqual(["Second", "First"]);
      expect(res.body.stats).toEqual({ total: 2, active: 2, completed: 0 });
    });

    it("supports status, search and sort query params together", async () => {
      await createTodo({ title: "Buy milk", priority: "low" });
      await createTodo({ title: "Buy bread", priority: "high" });
      const done = await createTodo({ title: "Buy eggs", priority: "medium" });
      await request(app).patch(`/api/todos/${done.id}`).send({ completed: true }).expect(200);

      const res = await request(app)
        .get("/api/todos")
        .query({ status: "active", search: "buy", sortBy: "priority", order: "desc" })
        .expect(200);

      expect(res.body.data.map((t: { title: string }) => t.title)).toEqual(["Buy bread", "Buy milk"]);
      expect(res.body.stats).toEqual({ total: 3, active: 2, completed: 1 });
    });

    it("returns 400 for invalid query params", async () => {
      const res = await request(app).get("/api/todos?sortBy=nope&status=x").expect(400);
      expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual(["status", "sortBy"]);
    });
  });

  describe("GET /api/todos/:id", () => {
    it("returns the todo", async () => {
      const created = await createTodo({ title: "Find me" });
      const res = await request(app).get(`/api/todos/${created.id}`).expect(200);
      expect(res.body.data).toEqual(created);
    });

    it("returns 400 for a non-numeric id", async () => {
      const res = await request(app).get("/api/todos/abc").expect(400);
      expect(res.body.error.details).toEqual([{ field: "id", message: "id must be a positive integer" }]);
    });

    it("returns 404 for an unknown id", async () => {
      const res = await request(app).get("/api/todos/999").expect(404);
      expect(res.body.error).toEqual({ code: "NOT_FOUND", message: "Todo with id 999 not found" });
    });
  });

  describe("PATCH /api/todos/:id", () => {
    it("updates only the sent fields", async () => {
      const created = await createTodo({ title: "Original", priority: "high", dueDate: "2026-10-10" });

      const res = await request(app)
        .patch(`/api/todos/${created.id}`)
        .send({ completed: true, dueDate: null })
        .expect(200);

      expect(res.body.data).toMatchObject({
        title: "Original",
        priority: "high",
        completed: true,
        dueDate: null,
      });
    });

    it("returns 400 for an empty body", async () => {
      const created = await createTodo();
      const res = await request(app).patch(`/api/todos/${created.id}`).send({}).expect(400);
      expect(res.body.error.details[0].message).toBe("Provide at least one field to update");
    });

    it("returns 404 for an unknown id", async () => {
      await request(app).patch("/api/todos/999").send({ title: "x" }).expect(404);
    });
  });

  describe("DELETE /api/todos/:id", () => {
    it("returns 204 with an empty body, then 404 on a second delete", async () => {
      const created = await createTodo();

      const res = await request(app).delete(`/api/todos/${created.id}`).expect(204);
      expect(res.text).toBe("");

      await request(app).delete(`/api/todos/${created.id}`).expect(404);
      await request(app).get(`/api/todos/${created.id}`).expect(404);
    });
  });

  describe("DELETE /api/todos/completed", () => {
    it("deletes only completed todos (and is not treated as an id)", async () => {
      const a = await createTodo({ title: "a" });
      await createTodo({ title: "b" });
      await request(app).patch(`/api/todos/${a.id}`).send({ completed: true });

      const res = await request(app).delete("/api/todos/completed").expect(200);

      expect(res.body).toEqual({ data: { deleted: 1 } });
      const list = await request(app).get("/api/todos");
      expect(list.body.stats).toEqual({ total: 1, active: 1, completed: 0 });
    });
  });

  describe("unknown routes and unexpected errors", () => {
    it("returns a JSON 404 for an unknown /api route or method", async () => {
      const res = await request(app).get("/api/nope").expect(404);
      expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");

      await request(app).put("/api/todos/1").send({ title: "x" }).expect(404);
    });

    it("returns a generic 500 without leaking internal details", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      db.close(); // simulate the database becoming unavailable

      const res = await request(app).get("/api/todos").expect(500);

      expect(res.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
      expect(consoleError).toHaveBeenCalled(); // the real error is logged on the server
      consoleError.mockRestore();
    });
  });
});
