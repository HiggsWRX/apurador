import { defineConfig } from "vitest/config";

// Os testes que conferem o resultado do build (`test/build/`): o build roda antes deles, no globalSetup. Os que não leem
// o `dist/` ficam no projeto `@apurador/site-unidade` (vitest.unidade.config.ts), que roda sem build.
export default defineConfig({
  test: {
    name: "@apurador/site",
    include: ["test/build/**/*.test.{ts,tsx}"],
    globalSetup: ["./test/construir.ts"],
    // Alguns testes leem as ~5.800 páginas do build: com várias suítes rodando na mesma máquina, eles passam dos 5 s
    // padrão sem estar errados.
    testTimeout: 30_000,
  },
});
