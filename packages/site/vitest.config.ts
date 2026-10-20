import { defineConfig } from "vitest/config";

// Os testes que conferem o resultado do build (`test/build/`): o build roda antes deles, no globalSetup. Os que não leem
// o `dist/` ficam no projeto `@apurador/site-unidade` (vitest.unidade.config.ts), que roda sem build.
export default defineConfig({
  test: {
    name: "@apurador/site",
    include: ["test/build/**/*.test.{ts,tsx}"],
    globalSetup: ["./test/construir.ts"],
  },
});
