import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

/** Absolute path of a file next to this config */
const page = (file: string) => resolve(import.meta.dirname, file);

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // Dev only: forward /api/* to the Express server, so the browser sees ONE
    // origin (localhost:5173) and no CORS setup is needed.
    proxy: {
      "/api": "http://localhost:3000",
    },
  },

  build: {
    rolldownOptions: {
      // MULTI-PAGE APP: every HTML file is its own entry point and becomes
      // its own page in dist/. Moving between pages is a full page load.
      input: {
        list: page("index.html"), // page 1: todo list
        todo: page("todo.html"), //  page 2: single todo (todo.html?id=<id>)
      },
    },
  },
});
