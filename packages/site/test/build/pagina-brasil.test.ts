import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { DIST, DIST_CHAVES_DESLIGADAS, DIST_ENSAIO, elemento, elementos, pagina, texto as textoDe } from "../html";

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
});

describe("como a projeção se saiu, depois da noite", () => {
  const bloco = elemento(html, /<section[^>]*data-bloco="como-a-projecao-se-saiu"/);
  // O registro da noite (docs/noite/2026-10-25.md, "A projeção contra o resultado"): Flávio 48,21% no resultado; com
  // 4,80% das seções, o placar 48,78, a Só apuração 48,0 e a Apuração + pesquisas 48,1; com 25,19%, 50,51, 48,9 e 49,0;
  // e o arquivo do Brasil de 50,76%, às 20:27:24, com 49,85 e as duas bases em 48,5.
  it('diz o erro com 5% das seções nas duas bases: "com 5% das seções, a projeção errava X"', () => {
    expect(textoDe(bloco)).toContain("Na totalização final do TSE, Flávio teve 48,21% dos votos válidos, e Lula, 51,79%.");
    expect(textoDe(bloco)).toContain("Com 5% das seções, a projeção errava 0,1 ponto na base Apuração + pesquisas e 0,2 ponto na base Só apuração");
    expect(textoDe(bloco)).toContain("O placar parcial errava 0,6 ponto.");
  });

  it("traz o erro com 5%, 25% e 50% das seções, no placar parcial e nas duas bases, e de que momento ele é", () => {
    const tabela = elemento(bloco, /<table[^>]*data-bloco="erros-da-noite"/);

    expect(elementos(tabela, /<tr\b/).map(textoDe)).toEqual([
      "Com Placar parcial Só apuração Apuração + pesquisas",
      "5% das seções 0,6 0,2 0,1",
      "25% das seções 2,3 0,7 0,8",
      "50% das seções 1,6 0,3 0,3",
    ]);
    expect(textoDe(bloco)).toContain("o primeiro momento publicado mais perto do ponto: 4,80%, 25,19% e 50,76% das seções");
  });

  it("mostra a noite em cada base, com um botão para cada: o placar parcial, a projeção com a faixa de 95% e o resultado", () => {
    const botoes = elementos(bloco, /<button[^>]*data-noite-botao/);
    expect(botoes.map(textoDe)).toEqual(["Apuração + pesquisas", "Só apuração"]);
    expect(botoes[0]).toContain('aria-pressed="true"');
    for (const base of ["com-pesquisas", "so-apuracao"]) {
      const grafico = elemento(bloco, new RegExp(`<div[^>]*data-noite="${base}"`));
      for (const classe of ["placar", "linha-da-projecao", "faixa"]) expect(grafico, `${base} ${classe}`).toMatch(new RegExp(`<path[^>]*class="${classe}"`));
      expect(textoDe(grafico), base).toContain("resultado: Flávio 48,21%");
    }
  });

  it("abre os blocos abaixo do bloco ao vivo e leva a atribuição", () => {
    expect(html.indexOf('data-bloco="como-a-projecao-se-saiu"')).toBeLessThan(html.indexOf('data-bloco="o-que-esperar-da-noite"'));
    expect(textoDe(bloco)).toContain("Cálculo do Apurador com dados do TSE");
  });

  it("não aparece com a chave da projeção desligada, nem no build do ensaio, que reproduz 2022", () => {
    for (const dist of [DIST_CHAVES_DESLIGADAS, DIST_ENSAIO]) {
      expect(readFileSync(new URL("index.html", dist), "utf8"), dist.href).not.toContain('data-bloco="como-a-projecao-se-saiu"');
    }
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
