import { defineConfig } from "vitest/config";

// A noite de 2022 reconstruída é percorrida inteira, uma vez por UF: com os replays do ensaio rodando em paralelo na
// mesma máquina, um teste desses passa dos 5 s padrão sem estar errado.
export default defineConfig({
  test: {
    name: "@apurador/pipeline",
    testTimeout: 30_000,
  },
});
