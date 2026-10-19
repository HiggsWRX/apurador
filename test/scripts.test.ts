import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Um script da raiz que só chama o de um pacote (`npm run x -w @apurador/y`) termina em `--`. Sem ele, o npm
// toma as opções seguintes como dele: `npm run dados -- --atualizar` rodaria sem o `--atualizar`, calado.
const { scripts } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { scripts: Record<string, string> };

describe("os scripts da raiz", () => {
  it("repassam as opções aos scripts dos pacotes", () => {
    const delegados = Object.entries(scripts).filter(([, script]) => /^npm run \S+ -w \S+/.test(script));

    expect(delegados.length).toBeGreaterThan(5);
    expect(delegados.filter(([, script]) => !/^npm run \S+ -w \S+ --$/.test(script)).map(([nome]) => nome)).toEqual([]);
  });
});
