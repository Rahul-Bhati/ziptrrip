import { fileURLToPath } from "node:url";

/**
 * All settings in one place, read once from environment variables.
 *
 * Paths are resolved relative to THIS file, not the current working
 * directory, so `npm run dev` (src/config.ts) and `npm start`
 * (dist/config.js) both point at server/data/ no matter where you run them from.
 */
const fromServerRoot = (relativePath: string) =>
  fileURLToPath(new URL(`../${relativePath}`, import.meta.url));

export const config = {
  port: Number(process.env.PORT) || 3000,
  dbPath: process.env.DB_PATH ?? fromServerRoot("data/todos.db"),
  /** Built frontend (client/dist), served by Express in production */
  clientDistPath: process.env.CLIENT_DIST_PATH ?? fromServerRoot("../client/dist"),
};
