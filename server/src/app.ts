import express from "express";

/**
 * Builds the Express app without starting it.
 * Keeping "build the app" separate from "listen on a port" lets tests
 * (Supertest) call the app directly, without opening a real network port.
 */
export function createApp() {
  const app = express();

  // Parse JSON request bodies into req.body
  app.use(express.json());

  // Simple liveness check: confirms the server is up
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
