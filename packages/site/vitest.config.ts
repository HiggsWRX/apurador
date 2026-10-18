import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@apurador/site",
    globalSetup: ["./test/construir.ts"],
  },
});
