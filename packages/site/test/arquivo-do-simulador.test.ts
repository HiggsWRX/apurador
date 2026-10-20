import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import type { BaseDoModelo } from "@apurador/modelo";
import { describe, expect, it } from "vitest";
import { compactarBase, descompactarBase } from "../src/lib/arquivo-do-simulador";

// O arquivo que o simulador baixa ao abrir leva a base do modelo de 25/10 num formato compacto. A referência é o
// arquivo da base no repositório (`dados/bases/2026-2.json`), que o pipeline gera.
const base = JSON.parse(readFileSync(new URL("../../../dados/bases/2026-2.json", import.meta.url), "utf8")) as BaseDoModelo & { noite: unknown };

describe("a base do modelo no arquivo do simulador", () => {
  it("volta igual, município por município, com os finalistas", () => {
    const volta = descompactarBase(JSON.parse(JSON.stringify(compactarBase(base))));
    expect(volta.finalistas).toEqual(base.finalistas.map((f) => ({ numero: f.numero })));
    expect(volta.municipios).toEqual(base.municipios);
  });

  it("fica com pouco mais da metade do tamanho com gzip: ~139 KB, contra ~262 KB", () => {
    const gzip = (o: unknown) => gzipSync(JSON.stringify(o)).length;
    expect(gzip(compactarBase(base))).toBeLessThan(0.55 * gzip({ finalistas: base.finalistas, municipios: base.municipios }));
  });

  it("recusa uma base com zonas, que o simulador não usa", () => {
    const comZona = { ...base, municipios: [{ ...base.municipios[0]!, zona: 1 }] };
    expect(() => compactarBase(comZona)).toThrow(/zona/);
  });
});
