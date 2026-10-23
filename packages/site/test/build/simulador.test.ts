import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { REGIOES, type BaseDoModelo } from "@apurador/modelo";
import { assinaturaDosLugares, idDoMunicipio } from "@apurador/pipeline";
import { describe, expect, it } from "vitest";
import { descompactarBase, type ArquivoDoSimulador } from "../../src/lib/arquivo-do-simulador";
import { prepararSimulador } from "../../src/lib/simulador";
import { AGREGADO, ler } from "../dados-do-build";
import { DIST, DIST_CHAVES_DESLIGADAS, elemento, elementos, pagina, texto } from "../html";

// Confere o que o build gera (a fronteira do site) para o simulador "e se" antes das 17h (ticket 24): a tela própria, o
// link na caixa da projeção, o arquivo que ele baixa ao abrir e o peso da tela. As referências de fora são a página do
// Brasil (o simulador abre com a mesma projeção ao lado), o arquivo da base do modelo no repositório e o arquivo
// oficial do 1º turno de 2026 (o placar entre finalistas e o comparecimento de cada região).

const BLOCO_DA_PROJECAO = /<section[^>]*data-bloco="projecao-antes-das-17h"/;
const ARQUIVO = "dados/simulador.json";
const arquivo = JSON.parse(readFileSync(new URL(ARQUIVO, DIST), "utf8")) as ArquivoDoSimulador;
const html = pagina("/simulador/");

/** Os arquivos `_astro/*.js` que um módulo importa, ele incluído, seguindo os `import` estáticos do build. */
function modulos(raiz: string, vistos = new Set<string>()): Set<string> {
  if (vistos.has(raiz)) return vistos;
  vistos.add(raiz);
  const codigo = readFileSync(new URL(`.${raiz}`, DIST), "utf8");
  for (const m of codigo.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)) modulos(`/_astro/${m[1]}`, vistos);
  return vistos;
}
/**
 * Todo JavaScript do build que uma página carrega: os módulos dos `<script>` e os das ilhas, com o renderizador. O script
 * do Web Analytics vem de fora, com `defer`, e fica de fora (~10 KB com gzip, dentro da folga dos orçamentos).
 */
function javascriptDa(paginaHtml: string): Set<string> {
  const raizes = [
    ...[...paginaHtml.matchAll(/<script[^>]*\bsrc="(\/[^"]+)"/g)].map((m) => m[1]!),
    ...[...paginaHtml.matchAll(/(?:component|renderer)-url="([^"]+)"/g)].map((m) => m[1]!),
  ];
  const todos = new Set<string>();
  for (const r of raizes) for (const m of modulos(r)) todos.add(m);
  return todos;
}

describe("a tela do simulador", () => {
  it("existe em /simulador/, com o título, a ilha e o arquivo do simulador vindo junto com o HTML", () => {
    expect(texto(elemento(html, /<title/))).toBe('Simulador "e se" · Apurador');
    expect(texto(elemento(html, /<h1/))).toBe('Simulador "e se"');
    expect(html).toMatch(/<astro-island[^>]*component-url="\/_astro\/Simulador\.[^"]+\.js"/);
    expect(html).toMatch(/<link rel="preload" href="\/dados\/simulador\.json" as="fetch" crossorigin="anonymous"/);
    // no build, a ilha sai carregando: a simulação é do navegador
    expect(texto(elemento(elemento(html, /<astro-island[^>]*Simulador/), /<p[^>]*aria-busy/))).toBe("Carregando o simulador…");
    expect(texto(elemento(html, /<p class="sim-intro"/))).toContain("Mude quanto o voto que falta pende para cada candidato");
    expect(texto(elemento(html, /<noscript/))).toContain("precisa de JavaScript");
  });

  it("tem a prévia do link do site: o mesmo cabeçalho de toda página, sem imagem por simulação", () => {
    const cabecalho = (h: string) => [...h.matchAll(/<meta [^>]+>/g)].map((m) => m[0]);
    expect(cabecalho(html)).toEqual(cabecalho(pagina("/")));
    expect(html).not.toMatch(/og:image|twitter:image/);
  });

  it("abre da caixa da projeção da página do Brasil, por 'Simular \"e se\" →', antes de 'Como calculamos →', com a base que a página abre", () => {
    const projecao = elemento(pagina("/"), BLOCO_DA_PROJECAO);
    const links = elementos(elemento(projecao, /<p[^>]*class="links"/), /<a\b/);
    expect(links.map(texto)).toEqual(['Simular "e se" →', "Como calculamos →"]);
    expect(links[0]).toMatch(/href="\/simulador\/\?base=com-pesquisas"/);
  });

  it("dá às hipóteses prontas o viés do 1º turno que a metodologia escreve: Flávio subestimado em 2,1 pontos", () => {
    // decisão do dono em 20/10 (ticket 24): o número da metodologia, e não os 1,4 da decisão 9
    const naMetodologia = /As pesquisas subestimaram Flávio em (\d+,\d) pontos? entre os dois finalistas/.exec(texto(pagina("/metodologia/")))?.[1];
    const naIlha = /viesDoPrimeiroTurno&quot;:\[0,([\d.]+)\]/.exec(html)?.[1];
    expect(naMetodologia).toBe("2,1");
    expect(naIlha).toBe("2.1");
  });

  it("abre na metodologia, pela seção 5", () => {
    expect(elemento(pagina("/metodologia/"), /<p[^>]*data-bloco="simulador"/)).toMatch(/<a href="\/simulador\/"/);
  });
});

describe("o arquivo do simulador", () => {
  const dados = prepararSimulador(arquivo);
  const projecao = elemento(pagina("/"), BLOCO_DA_PROJECAO);
  const comUmaCasa = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  it("leva a base do modelo de 25/10, como está no repositório, com a assinatura que o coletor publica no arquivo da noite", () => {
    const base = JSON.parse(ler("bases/2026-2.json")) as BaseDoModelo;
    expect(descompactarBase(arquivo.base).municipios).toEqual(base.municipios);
    // A mesma conta do coletor (o replay confere a do arquivo da noite): os municípios da base, na ordem dela.
    expect(arquivo.assinatura).toBe(assinaturaDosLugares(base.municipios.map((m) => idDoMunicipio(m.municipio))));
  });

  it("leva o agregado do instante do build, inteiro, e as constantes congeladas", () => {
    expect(arquivo.agregado).toEqual({ valor: AGREGADO.valor, incerteza: AGREGADO.incerteza });
    const { nota: _, ...congeladas } = JSON.parse(readFileSync(new URL("../../../modelo/constantes.json", import.meta.url), "utf8")) as Record<string, unknown>;
    expect(arquivo.constantes).toEqual(congeladas);
  });

  it("leva o placar entre finalistas e o comparecimento do 1º turno de cada região, do arquivo oficial", () => {
    // dados/turnos/2026-1.json, somando as UFs de cada região: Flávio entre os dois e votantes ÷ aptos
    const esperado = [
      [52.4, 80.57],
      [32.61, 81.61],
      [63.4, 78.3],
      [56.41, 77.3],
      [65.76, 79.54],
    ];
    expect(arquivo.regioes).toHaveLength(REGIOES.length);
    arquivo.regioes.forEach((r, i) => {
      expect(r.placarEntreFinalistas, REGIOES[i]).toBeCloseTo(esperado[i]![0]!, 2);
      expect(100 * r.comparecimento, REGIOES[i]).toBeCloseTo(esperado[i]![1]!, 2);
    });
    expect(arquivo.placarEntreFinalistasDoBrasil).toBeCloseTo(51.0, 1);
  });

  it("dá no navegador a mesma projeção da página do Brasil, nas duas bases, para o simulador mostrar ao lado", () => {
    expect(dados.bases.map((b) => b.id)).toEqual(["so-apuracao", "com-pesquisas"]);
    for (const b of dados.bases) {
      const { brasil } = b.partida.projecao;
      const t = texto(elemento(projecao, new RegExp(`<div[^>]*data-base="${b.id}"`)));
      const flavio = Number((100 * brasil.projecao).toFixed(1));
      expect(t).toContain(`FLAVIO BOLSONARO ${comUmaCasa(flavio)}% ± ${comUmaCasa(100 * brasil.margem)}`);
      const chance = Math.round(100 * brasil.chance);
      expect(t).toContain(`Chance de vitória FLAVIO BOLSONARO ${chance}% LULA ${100 - chance}%`);
    }
  });

  it("só é pedido pela tela do simulador: nenhuma página de lugar o carrega", () => {
    for (const caminho of ["/", "/ba/", "/exterior/", "/sp/campinas/", "/exterior/lisboa/"]) {
      const h = pagina(caminho);
      expect(h, caminho).not.toContain("simulador.json");
      for (const js of javascriptDa(h)) expect(readFileSync(new URL(`.${js}`, DIST), "utf8"), `${caminho} ${js}`).not.toContain("simulador.json");
    }
  });
});

describe("a simulação nunca aparece na manchete, na narração nem na página de lugar", () => {
  it("nenhuma página de lugar tem a simulação, nem o código dela, só o link", () => {
    for (const caminho of ["/", "/ba/", "/exterior/", "/sp/campinas/", "/exterior/lisboa/"]) {
      const h = pagina(caminho);
      expect(texto(h), caminho).not.toMatch(/Simulação|com as suas hipóteses|O que seria preciso|Hipóteses prontas/);
      expect(h, caminho).not.toMatch(/component-url="[^"]*Simulador|\sdata-simulador[\s>]|\sdata-barra-da-simulacao[\s>]/);
      // o código da simulação (a ilha, a vista e as frases dela) não vai em nenhum script da página, nem no bloco ao vivo
      for (const js of javascriptDa(h)) {
        const codigo = readFileSync(new URL(`.${js}`, DIST), "utf8");
        expect(codigo, `${caminho} ${js}`).not.toMatch(/Simulação de outra pessoa|O que seria preciso|com as suas hipóteses/);
      }
    }
  });

  it("a manchete e a narração da página do Brasil ficam como estavam", () => {
    const h = pagina("/");
    expect(texto(elemento(h, /<p[^>]*data-manchete/))).toBe("A apuração do 2º turno começa às 17h");
    // Com o selo do ticket 15, que a narração leva em todo lugar.
    expect(texto(elemento(h, /<aside[^>]*id="narracao"/))).toBe(
      "Narração da noite A narração começa às 17h, com as primeiras seções totalizadas. Narração do Apurador com dados do TSE",
    );
  });
});

describe("peso da tela do simulador", () => {
  // Ticket 24: o simulador abre em até 5 s num Android barato no 4G. No "Slow 4G" do Lighthouse (1,6 Mbit/s, ~200 KB/s,
  // 150 ms de ida e volta), ~0,9 s vão nas idas e voltas (a conexão, o HTML e, em paralelo, o CSS, os scripts e o
  // arquivo, que começa a vir com o HTML), e ~1 s no aparelho (no computador, ler o arquivo, preparar o modelo e projetar
  // as duas bases leva ~70 ms; num Android barato, ~6 vezes isso, mais os scripts). Sobram ~3 s, ou ~600 KB. O orçamento
  // fica na metade. É uma conta, não uma medição num aparelho: essa fica para a revisão do dono no celular e o ensaio.
  const ORCAMENTO_EM_BYTES = 300 * 1024;
  const gzip = (caminho: string) => gzipSync(readFileSync(new URL(`.${caminho}`, DIST))).length;

  it("carrega HTML, CSS, scripts e o arquivo do simulador dentro do orçamento", () => {
    const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]!);
    const js = [...javascriptDa(html)];
    expect(js.some((j) => j.includes("Simulador"))).toBe(true);
    const total = gzip("/simulador/index.html") + [...css, ...js].reduce((s, c) => s + gzip(c), 0) + gzip(`/${ARQUIVO}`);
    expect(total).toBeLessThan(ORCAMENTO_EM_BYTES);
  });

  it("não carrega script que trave a pintura", () => {
    for (const s of html.matchAll(/<script\b[^>]*>/g)) expect(s[0], s[0]).toMatch(/type="module"|\bdefer\b|\basync\b|^<script>$/);
  });
});

describe("chave do simulador antes das 17h", () => {
  const desligada = (caminho: string) => readFileSync(new URL(`.${caminho}index.html`, DIST_CHAVES_DESLIGADAS), "utf8");

  it("está ligada no arquivo de chaves", () => {
    expect(JSON.parse(ler("chaves.json"))).toMatchObject({ antesDas17h: { simulador: true } });
  });

  it("desligada, a tela diz que o simulador abre às 17h, com a ilha, que passa sozinha ao ao vivo às 17h sobre o arquivo do build", () => {
    const h = desligada("/simulador/");
    expect(texto(elemento(h, /<section[^>]*data-simulador-fechado/))).toBe("O simulador abre às 17h, com a apuração. Voltar à página do Brasil");
    expect(h).not.toContain("sim-intro");
    expect(h).toMatch(/<astro-island[^>]*component-url="\/_astro\/Simulador\.[^"]+\.js"/);
    // Na noite, a base do modelo vem do arquivo do build, com a chave de antes das 17h ligada ou não.
    expect(existsSync(new URL(ARQUIVO, DIST_CHAVES_DESLIGADAS))).toBe(true);
    expect(desligada("/")).not.toContain("/simulador/");
  });
});
