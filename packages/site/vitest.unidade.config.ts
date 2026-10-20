import { configDefaults, defineConfig } from "vitest/config";

// Os testes do site que não leem o `dist/` (a lógica da ilha, a vista renderizada em HTML, os formatos): rodam em menos
// de um segundo, sem os dois builds do globalSetup. Um teste que lê o build vai em `test/build/`.
// Uso: npx vitest run --project @apurador/site-unidade
export default defineConfig({
  test: {
    name: "@apurador/site-unidade",
    include: ["test/**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "test/build/**"],
  },
});
