import { createApp } from "./app.js";
import { config } from "./config.js";
import { createDatabase } from "./db/database.js";

const db = createDatabase(config.dbPath);
const app = createApp(db, { logRequests: true, staticDir: config.clientDistPath });

const server = app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Database: ${config.dbPath}`);
});

/**
 * Graceful shutdown (Ctrl+C, or `docker stop` / hosting platforms send SIGTERM):
 * stop accepting new requests, let in-flight ones finish, then close the
 * database so SQLite writes everything from its WAL file to the main .db file.
 */
function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
