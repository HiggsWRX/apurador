import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { agregadoDePesquisas, curvaProjetada, diaDoAgregado, lerConstantes, prepararModelo, projetarNasDuasBases, type Apuracao, type BaseDoModelo, type Projecao } from "@apurador/modelo";
import { listaDasPesquisas, pesquisasDoAgregado, type ExtratoDoTse, type Turno } from "@apurador/pipeline";
import { describe, expect, it } from "vitest";
import { AGORA, DIST, DIST_CHAVES_DESLIGADAS, elemento, elementos, pagina, texto } from "../html";

// Confere o que o build gera (a fronteira do site): o painel de antes das 17h na página do Brasil, com os números do
// `modelo` sobre o mesmo pesquisas.csv, a base de 25/10 e as constantes congeladas, no relógio fixo em AGORA. As
// referências externas dos números ficam nos testes do modelo (a projeção antes da primeira seção, a curva de 0% a
// 100%) e do pipeline (o agregado de 18/10).
const DADOS = new URL("../../../../dados/", import.meta.url);
const ler = (arquivo: string) => readFileSync(new URL(arquivo, DADOS), "utf8");
const turno = JSON.parse(ler("turnos/2026-1.json")) as Turno;
const lista = listaDasPesquisas({
  pesquisas: ler("pesquisas.csv"),
  institutos: ler("pesquisas-institutos.csv"),
  extrato: JSON.parse(ler("pesquisas-tse.json")) as ExtratoDoTse,
  verificacoes: ler("pesquisas-verificacoes.csv"),
  turno,
});
const agregado = agregadoDePesquisas(pesquisasDoAgregado(lista, turno), diaDoAgregado(new Date(AGORA)))!;
const base = JSON.parse(ler("bases/2026-2.json")) as BaseDoModelo;
const constantes = lerConstantes(JSON.parse(readFileSync(new URL("../../../modelo/constantes.json", import.meta.url), "utf8")));
const modelo = prepararModelo(base);
const antesDaPrimeiraSecao: Apuracao = base.municipios.map((m) => ({ secoes: 0, secoesTotais: m.secoes, aptos: 0, aptosTotais: m.aptos, votos: [0, 0] }));
const duas = projetarNasDuasBases(modelo, antesDaPrimeiraSecao, constantes, agregado);
const BASES: [string, string, Projecao][] = [
  ["so-apuracao", "Só apuração", duas.soApuracao],
  ["com-pesquisas", "Apuração + pesquisas", duas.comPesquisas],
];

const comUmaCasa = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const umaCasa = (n: number) => Number(n.toFixed(1));

const BLOCO_DO_AGREGADO = /<section[^>]*data-bloco="agregado-de-pesquisas"/;
const BLOCO_DO_ESPERAR = /<section[^>]*data-bloco="o-que-esperar-da-noite"/;
const BLOCO_DA_PROJECAO = /<section[^>]*data-bloco="projecao-antes-das-17h"/;
const BLOCO_DA_LISTA = /<section[^>]*data-bloco="lista-das-pesquisas"/;
const PALAVRAS_PROIBIDAS = /aprend|\bIA\b|intelig[eê]ncia artificial|previs/i;
/** Uma frase preditiva ou o rótulo do sinal de virada, que não existem antes das 17h. */
const PREDITIVO = /deve (seguir|passar|vencer)|vai (vencer|virar)|chance de virada|sem sinal de virada|virada poss[ií]vel ·|virada projetada ·|indica .* (eleito|à frente)/i;

const porBase = (bloco: string, id: string) => elemento(bloco, new RegExp(`<div[^>]*data-base="${id}"`));

describe("painel de antes das 17h na página do Brasil", () => {
  const html = pagina("/");
  const esperar = elemento(html, BLOCO_DO_ESPERAR);
  const projecao = elemento(html, BLOCO_DA_PROJECAO);

  it("vem na ordem: agregado, o que esperar da noite, projeção e a lista das pesquisas, recolhida", () => {
    const posicoes = [BLOCO_DO_AGREGADO, BLOCO_DO_ESPERAR, BLOCO_DA_PROJECAO, BLOCO_DA_LISTA].map((b) => html.indexOf(elemento(html, b)));
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
    expect(elemento(html, BLOCO_DA_LISTA)).toMatch(/<details(?![^>]*\bopen\b)/);
    // depois do bloco ao vivo, sem repetir a manchete nem o placar
    expect(html.indexOf("<astro-island")).toBeLessThan(posicoes[0]!);
    expect(elementos(html, /<p[^>]*data-manchete/)).toHaveLength(1);
    expect(elementos(html, /<section[^>]*data-placar-oficial/)).toHaveLength(1);
  });

  it("põe a projeção numa moldura tracejada, com o aviso", () => {
    expect(projecao).toMatch(/^<section[^>]*class="[^"]*\bprojecao\b/);
    const css = readdirSync(new URL("_astro/", DIST))
      .filter((f) => f.endsWith(".css"))
      .map((f) => readFileSync(new URL(`_astro/${f}`, DIST), "utf8"))
      .join("\n");
    expect(css).toMatch(/\.projecao\{border:2px dashed/);
    expect(texto(projecao)).toContain("Estimativa do Apurador. Não é resultado oficial nem garantia do resultado.");
  });

  it.each(BASES)("na base %s, mostra a projeção do modelo com uma casa, ± a margem de 95%, e a chance de vitória em inteiros", (id, _nome, p) => {
    const t = texto(porBase(projecao, id));
    const flavio = umaCasa(100 * p.brasil.projecao);
    const margem = comUmaCasa(100 * p.brasil.margem);
    expect(t).toContain(`FLAVIO BOLSONARO ${comUmaCasa(flavio)}% ± ${margem}`);
    expect(t).toContain(`LULA ${comUmaCasa(100 - flavio)}% ± ${margem}`);
    const chance = Math.round(100 * p.brasil.chance);
    expect(chance).toBeGreaterThan(0);
    expect(chance).toBeLessThan(100);
    expect(t).toContain(`Chance de vitória FLAVIO BOLSONARO ${chance}% LULA ${100 - chance}%`);
    expect(elementos(porBase(projecao, id), /<div[^>]*class="chance-barra"/)).toHaveLength(1);
  });

  it("compara a projeção com o 1º turno pelo placar entre finalistas, nunca pelo % sobre todos os válidos", () => {
    const t = texto(projecao);
    expect(t).toContain("FLAVIO BOLSONARO 51,0%, LULA 49,0%");
    expect(t).not.toContain("47,03");
    expect(t).not.toContain("45,16");
  });

  it("abre na base Apuração + pesquisas, em que as pesquisas pesam 100%, e deixa escolher a Só apuração", () => {
    const botoes = elementos(projecao, /<button[^>]*data-base-botao/);
    expect(botoes.map(texto)).toEqual(["Só apuração", "Apuração + pesquisas"]);
    expect(botoes.map((b) => /aria-pressed="(\w+)"/.exec(b)?.[1])).toEqual(["false", "true"]);
    expect(porBase(projecao, "com-pesquisas")).toMatch(/^<div[^>]*data-ativa/);
    expect(porBase(projecao, "so-apuracao")).not.toMatch(/^<div[^>]*data-ativa/);
    expect(duas.comPesquisas.pesoDasPesquisas).toBe(1);
    expect(texto(projecao)).toContain("As pesquisas pesam 100% na projeção agora.");
  });

  it.each(BASES)("em 'O que esperar da noite', desenha na base %s a curva projetada de 0% a 100% das seções, até a projeção", (id, nome, p) => {
    const curva = curvaProjetada(modelo, antesDaPrimeiraSecao, p, constantes).brasil;
    const figura = elemento(porBase(esperar, id), /<figure[^>]*data-curva-projetada/);
    const descricao = /aria-label="([^"]+)"/.exec(figura)?.[1];
    expect(descricao).toContain(`Curva projetada na base ${nome}:`);
    // a curva começa no primeiro passo, com ~2% das seções, e termina em 100% na projeção da base
    expect(curva.pontos[0]!.x).toBeLessThan(3);
    expect(descricao).toContain(`de ${comUmaCasa(curva.pontos[0]!.x)}% a 100,0% das seções totalizadas`);
    const fim = umaCasa(100 * curva.pontos.at(-1)!.y);
    expect(fim).toBe(umaCasa(100 * p.brasil.projecao));
    expect(texto(figura)).toContain(`${comUmaCasa(fim)}%`);
    expect(texto(figura)).toContain(`${comUmaCasa(100 - fim)}%`);
    expect(elementos(figura, /<path[^>]*class="linha-projetada"/)).toHaveLength(2);
    expect(elementos(figura, /<path[^>]*class="faixa-projetada"/)).toHaveLength(2);
    // a virada projetada, como o modelo a dá: o losango só com o ponto, a faixa só a partir de onde ela é possível
    const { virada } = curva;
    const atributo = (nome: string) => new RegExp(`data-virada-${nome}="(\\d+)"`).exec(figura)?.[1];
    expect(atributo("x")).toBe(virada?.x == null ? undefined : String(Math.round(virada.x)));
    expect(atributo("cedo")).toBe(virada?.cedo == null ? undefined : String(Math.round(virada.cedo)));
    expect(elementos(figura, /<path[^>]*class="losango-virada"/)).toHaveLength(virada?.x == null ? 0 : 1);
    expect(elementos(figura, /<rect[^>]*class="faixa-virada"/)).toHaveLength(virada?.cedo == null ? 0 : 1);
  });

  it("explica a ordem de chegada típica com a chegada de cada região no 1º turno de 2026", () => {
    const t = texto(esperar);
    expect(t).toMatch(/quando o Brasil tinha 50% das seções totalizadas, o (Centro-Oeste|Sul) já tinha \d+% das suas/);
    for (const regiao of ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]) expect(t).toContain(`o ${regiao}`);
  });

  it("não tem frase preditiva nem rótulo do sinal de virada, e não diz que o modelo aprende, que é IA ou que faz previsão", () => {
    for (const bloco of [esperar, projecao]) {
      expect(texto(bloco)).not.toMatch(PREDITIVO);
      expect(bloco).not.toMatch(PREDITIVO);
      expect(texto(bloco)).not.toMatch(PALAVRAS_PROIBIDAS);
    }
  });

  it("leva 'Cálculo do Apurador com dados do TSE' na curva e na projeção", () => {
    expect(texto(esperar)).toContain("Cálculo do Apurador com dados do TSE");
    expect(texto(projecao)).toContain("Cálculo do Apurador com dados do TSE");
  });

  it("liga 'Como calculamos →' à metodologia, a chance de vitória a #chance e o peso das pesquisas a #juntas", () => {
    expect(projecao).toMatch(/<a href="\/metodologia\/"[^>]*>Como calculamos →<\/a>/);
    expect(projecao).toMatch(/<a href="\/metodologia\/#chance"[^>]*>Chance de vitória<\/a>/);
    expect(projecao).toMatch(/<a href="\/metodologia\/#juntas"[^>]*>As pesquisas pesam 100% na projeção agora\.<\/a>/);
  });

  it("não aparece nas páginas de UF, do Exterior e de município, que mostram a indicação das pesquisas com o 1º turno e o histórico", () => {
    for (const caminho of ["/ba/", "/exterior/", "/sp/campinas/", "/exterior/lisboa/"]) {
      const html = pagina(caminho);
      expect(elementos(html, BLOCO_DA_PROJECAO), caminho).toEqual([]);
      expect(elementos(html, BLOCO_DO_ESPERAR), caminho).toEqual([]);
      expect(elementos(html, /<section[^>]*data-bloco="indicacao-das-pesquisas"/), caminho).toHaveLength(1);
      expect(elementos(html, /<div[^>]*data-turno="2026-1"/), caminho).toHaveLength(1);
      expect(elementos(html, /<section[^>]*data-historico/), caminho).toHaveLength(1);
    }
  });
});

describe("chave da projeção e da curva antes das 17h", () => {
  const desligada = (caminho: string) => readFileSync(new URL(`.${caminho}index.html`, DIST_CHAVES_DESLIGADAS), "utf8");

  it("está ligada no arquivo de chaves", () => {
    expect(JSON.parse(ler("chaves.json"))).toMatchObject({ antesDas17h: { projecao: true } });
  });

  it("desligada, nenhuma base mostra projeção, e 'O que esperar da noite' fica só com o texto da ordem de chegada típica", () => {
    const html = desligada("/");
    expect(elementos(html, BLOCO_DA_PROJECAO)).toEqual([]);
    expect(html).not.toContain("Chance de vitória");
    expect(html).not.toContain("Base da projeção");
    const esperar = elemento(html, BLOCO_DO_ESPERAR);
    expect(texto(esperar)).toMatch(/quando o Brasil tinha 50% das seções totalizadas/);
    expect(elementos(esperar, /<figure[^>]*data-curva-projetada/)).toEqual([]);
    expect(elementos(esperar, /<svg/)).toEqual([]);
    expect(texto(esperar)).not.toMatch(/\d,\d%|±/);
  });
});

describe("peso da página do Brasil", () => {
  // Spec, história 103, e Ensaio geral: placar e painel visíveis em até 3 s num Android barato no 4G. O placar e o
  // painel estão no HTML, e os scripts são módulos, que não travam a pintura; as fontes trocam (font-display: swap).
  // O caminho crítico é o HTML e o CSS. No "Slow 4G" do Lighthouse (1,6 Mbit/s, ~200 KB/s, 150 ms de ida e volta),
  // ~0,6 s vão nas idas e voltas da conexão e ~0,4 s no aparelho: sobram 2 s, ou ~400 KB. O orçamento fica na metade.
  const ORCAMENTO_EM_BYTES = 200 * 1024;
  const html = readFileSync(new URL("index.html", DIST));
  const css = [...readFileSync(new URL("index.html", DIST), "utf8").matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => readFileSync(new URL(`.${m[1]}`, DIST)));

  it("tem HTML e CSS leves o bastante para o caminho crítico", () => {
    expect(css.length).toBeGreaterThan(0);
    const gzip = gzipSync(html).length + css.reduce((s, c) => s + gzipSync(c).length, 0);
    expect(gzip).toBeLessThan(ORCAMENTO_EM_BYTES);
  });

  it("não carrega script que trave a pintura", () => {
    const scripts = [...readFileSync(new URL("index.html", DIST), "utf8").matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
    for (const s of scripts) expect(s, s).toMatch(/type="module"|\bdefer\b|\basync\b|<script>/);
  });
});
