import { defineConfig } from "vitest/config";

// O porte fiel e as noites passam noites inteiras pelo modelo: com os replays do ensaio rodando em paralelo na mesma
// máquina, um teste desses passa dos 5 s padrão sem estar errado.
export default defineConfig({
  test: {
    name: "@apurador/modelo",
    testTimeout: 30_000,
  },
});
