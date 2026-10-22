import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { DIST, elemento, pagina, texto as textoDe } from "../html";

// Confere o que o build gera (a fronteira do site): o HTML estático da página do Brasil.
const html = pagina("/");
const turno2026 = elemento(html, /<div[^>]*data-turno="2026-1"/);
const texto = textoDe(turno2026);

describe("página do Brasil, 1º turno de 2026", () => {
  it("mostra os candidatos com os números do TSE com duas casas e os votos", () => {
    expect(texto).toContain("FLAVIO BOLSONARO");
    expect(texto).toContain("47,03%");
    expect(texto).toContain("56.104.503");
    expect(texto).toContain("LULA");
    expect(texto).toContain("45,16%");
    expect(texto).toContain("53.879.538");
  });

  it('mostra os 5 mais votados e junta o resto em "demais"', () => {
    expect(texto).toContain("RONALDO CAIADO");
    expect(texto).not.toContain("ZEMA");
    expect(texto).toMatch(/Demais candidatos \(7\)/);
    expect(turno2026.match(/data-barra/g)).toHaveLength(6);
  });

  it("dá a atribuição do TSE", () => {
    expect(textoDe(html)).toMatch(/Fonte: TSE.*CC-BY/);
  });

  it("é indexada em apurador.org, e o *.workers.dev do site não", () => {
    expect(html).not.toMatch(/<meta name="robots"/);
    expect(readFileSync(new URL("_headers", DIST), "utf8")).toBe("https://apurador.hicampos93.workers.dev/*\n  X-Robots-Tag: noindex\n");
  });

  it("conta a audiência só pelo Cloudflare Web Analytics", () => {
    const scripts = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((s) => s[1] ?? "");
    expect(scripts.filter((src) => /^https?:/.test(src))).toEqual(["https://static.cloudflareinsights.com/beacon.min.js"]);
    const beacon = html.match(/data-cf-beacon="([^"]+)"/)?.[1]?.replace(/&quot;|&#34;/g, '"');
    expect(JSON.parse(beacon ?? "null")).toEqual({ token: "cc7b32506206448bb43d8ec6514d5f18" });
    expect(html).not.toMatch(/googletagmanager|google-analytics|gtag\(|fbq\(|document\.cookie/);
  });
});

describe("peso da página do Brasil", () => {
  // Spec, história 103, e ticket 09: placar e painel visíveis em até 3 s num Android barato no 4G. O placar e o painel
  // estão no HTML, os scripts são módulos, que não travam a pintura, e as fontes trocam (font-display: swap): o caminho
  // crítico é o HTML e o CSS. No "Slow 4G" do Lighthouse (1,6 Mbit/s, ~200 KB/s, 150 ms de ida e volta), ~0,6 s vão
  // nas idas e voltas da conexão e ~0,4 s no aparelho: sobram 2 s, ou ~400 KB. O orçamento fica na metade. É uma
  // conta, não uma medição num aparelho: essa fica para o ensaio geral.
  const ORCAMENTO_EM_BYTES = 200 * 1024;
  const bruto = readFileSync(new URL("index.html", DIST));
  const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => readFileSync(new URL(`.${m[1]}`, DIST)));

  it("tem HTML e CSS leves o bastante para o caminho crítico", () => {
    expect(css.length).toBeGreaterThan(0);
    const gzip = gzipSync(bruto).length + css.reduce((s, c) => s + gzipSync(c).length, 0);
    expect(gzip).toBeLessThan(ORCAMENTO_EM_BYTES);
  });

  it("não carrega script que trave a pintura", () => {
    for (const s of html.matchAll(/<script\b[^>]*>/g)) expect(s[0], s[0]).toMatch(/type="module"|\bdefer\b|\basync\b|^<script>$/);
  });
});
