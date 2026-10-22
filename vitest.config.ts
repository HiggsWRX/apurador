import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Cada pacote é um projeto, e o site tem dois: com e sem o build. `test/` guarda as conferências do próprio repositório.
    projects: ["packages/*", "packages/site/vitest.unidade.config.ts", { test: { name: "repositorio", include: ["test/**/*.test.ts"] } }],
    globalSetup: ["test/pasta-do-coletor.ts"],
  },
});
