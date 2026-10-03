import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Entry points that only boot things (real server / seed script); checked by running them
      exclude: ["src/index.ts", "src/scripts/**"],
      reporter: ["text", "html"],
    },
  },
});
