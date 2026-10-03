import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // index.ts only boots the real server (port, file DB, signals); covered by manual run
      exclude: ["src/index.ts"],
      reporter: ["text", "html"],
    },
  },
});
