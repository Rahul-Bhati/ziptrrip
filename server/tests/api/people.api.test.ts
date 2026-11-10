import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers.js";

describe("People API", () => {
  let app: Express;

  beforeEach(() => {
    ({ app } = createTestApp());
  });

  it("lists no one on an empty database", async () => {
    const res = await request(app).get("/api/people").expect(200);
    expect(res.body).toEqual({ data: [] });
  });

  it("creates a person and then lists people A to Z ignoring case", async () => {
    const created = await request(app).post("/api/people").send({ name: "  Sam " }).expect(201);

    expect(created.headers.location).toBe(`/api/people/${created.body.data.id}`);
    expect(created.body.data).toEqual({ id: created.body.data.id, name: "Sam" });

    await request(app).post("/api/people").send({ name: "alex" }).expect(201);
    const list = await request(app).get("/api/people").expect(200);

    expect(list.body.data.map((person: { name: string }) => person.name)).toEqual(["alex", "Sam"]);
  });

  it("returns 400 when the name is already used, ignoring case", async () => {
    await request(app).post("/api/people").send({ name: "Priya" }).expect(201);
    const res = await request(app).post("/api/people").send({ name: "priya" }).expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual([
      { field: "name", message: "a person with this name already exists" },
    ]);
  });

  it("returns 400 for an empty name or an unknown field", async () => {
    const empty = await request(app).post("/api/people").send({ name: "  " }).expect(400);
    expect(empty.body.error.details[0].field).toBe("name");

    const extra = await request(app).post("/api/people").send({ name: "Alex", extra: 1 }).expect(400);
    expect(extra.body.error.code).toBe("VALIDATION_ERROR");
  });
});
