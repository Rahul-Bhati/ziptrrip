import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { createDatabase } from "../../src/db/database.js";

describe("createApp options and file database", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "ziptrrip-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("serves the built frontend pages when staticDir is given", async () => {
    writeFileSync(join(tempDir, "index.html"), "<h1>list page</h1>");
    writeFileSync(join(tempDir, "todo.html"), "<h1>todo page</h1>");
    const app = createApp(createDatabase(":memory:"), { staticDir: tempDir });

    expect((await request(app).get("/").expect(200)).text).toContain("list page");
    expect((await request(app).get("/todo.html?id=1").expect(200)).text).toContain("todo page");
    // API routes still win over static files
    await request(app).get("/api/health").expect(200);
  });

  it("logs one line per request when logRequests is on", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const app = createApp(createDatabase(":memory:"), { logRequests: true });

    await request(app).get("/api/health");

    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^GET \/api\/health 200 \d+\.\dms$/));
    log.mockRestore();
  });

  it("creates missing folders and keeps data in a file database across reopen", () => {
    const dbPath = join(tempDir, "nested", "folder", "todos.db");

    const first = createDatabase(dbPath);
    first.prepare("INSERT INTO todos (title, created_at, updated_at) VALUES ('kept', 'x', 'x')").run();
    first.close();

    const second = createDatabase(dbPath);
    const row = second.prepare("SELECT title FROM todos").get() as { title: string };
    second.close();

    expect(row.title).toBe("kept");
  });
});
