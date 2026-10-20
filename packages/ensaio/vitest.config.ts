import { defineConfig } from "vitest/config";

// O TSE falso, o replay e o relógio rodam noites inteiras na velocidade máxima: com várias suítes rodando na mesma
// máquina, um teste desses passa dos 5 s padrão sem estar errado.
export default defineConfig({
  test: {
    name: "@apurador/ensaio",
    testTimeout: 30_000,
  },
});
