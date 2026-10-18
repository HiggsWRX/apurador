import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Confere o que o build gera (a fronteira do site): o HTML estático da página do Brasil.
const DIST = new URL("../dist/", import.meta.url);
const html = readFileSync(new URL("index.html", DIST), "utf8");
const texto = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("página do Brasil, 1º turno de 2026", () => {
  it("mostra os candidatos com os números do TSE com duas casas e os votos", () => {
    expect(texto).toContain("FLAVIO BOLSONARO");
    expect(texto).toContain("47,03%");
    expect(texto).toContain("56.104.503");
    expect(texto).toContain("LULA");
    expect(texto).toContain("45,16%");
    expect(texto).toContain("53.879.538");
  });

  it("mostra os 5 mais votados e junta o resto em \"demais\"", () => {
    expect(texto).toContain("RONALDO CAIADO");
    expect(texto).not.toContain("ZEMA");
    expect(texto).toMatch(/Demais candidatos \(7\)/);
    expect(html.match(/data-barra/g)).toHaveLength(6);
  });

  it("dá a atribuição do TSE", () => {
    expect(texto).toMatch(/Fonte: TSE.*CC-BY/);
  });

  it("não é indexada enquanto o site não é lançado", () => {
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(readFileSync(new URL("_headers", DIST), "utf8")).toMatch(/X-Robots-Tag: noindex/);
  });
});
