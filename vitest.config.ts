import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Cada pacote é um projeto; `test/` guarda as conferências do próprio repositório.
    projects: ["packages/*", { test: { name: "repositorio", include: ["test/**/*.test.ts"] } }],
  },
});
