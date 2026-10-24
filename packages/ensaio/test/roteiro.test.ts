import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { idDoTitulo, roteiroEmHtml } from "../src/roteiro.ts";

// O roteiro da noite em HTML (Operação na noite, decisão 22): os links internos do Markdown valem na página, e cada
// cartão de falha fica numa seção que a impressão não parte.
const markdown = readFileSync(new URL("../../../docs/roteiro-da-noite.md", import.meta.url), "utf8");
const html = roteiroEmHtml(markdown, "Gerado em 24/10/2026, 09:00, do commit abc1234.");

describe("o roteiro em HTML", () => {
  it("dá aos títulos os ids do GitHub", () => {
    expect(idDoTitulo("D. Coletor caído, computador travado ou falta de luz")).toBe("d-coletor-caído-computador-travado-ou-falta-de-luz");
    expect(idDoTitulo("Domingo, 25/10")).toBe("domingo-2510");
  });

  it("acha o título de cada link interno", () => {
    const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map(([, id]) => id));
    const links = [...html.matchAll(/href="#([^"]+)"/g)].map(([, id]) => decodeURIComponent(id!));

    expect(links.length).toBeGreaterThan(5);
    expect(links.filter((id) => !ids.has(id))).toEqual([]);
  });

  it("põe cada cartão de falha numa seção que a impressão não parte", () => {
    const cartoes = [...markdown.matchAll(/^### ([A-I])\. (.+)$/gm)].map(([, letra, nome]) => `${letra}. ${nome}`);

    expect(cartoes).toHaveLength(9);
    for (const cartao of cartoes) expect(html).toContain(`<section class="bloco">\n<h3 id="${idDoTitulo(cartao)}">`);
  });

  it("mostra a versão logo abaixo do título", () => {
    expect(html).toContain('</h1>\n<p class="versao">Gerado em 24/10/2026, 09:00, do commit abc1234.</p>');
    expect(html).toContain("<title>Roteiro da noite: 25/10/2026</title>");
  });
});
