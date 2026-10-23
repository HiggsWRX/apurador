import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AMBIENTES, criarProjecaoDaNoite, lerEntradaDaProjecao } from "@apurador/coletor";
import { DIST, DIST_ENSAIO, elemento, texto } from "../html";

// O build do site do ensaio geral (Ensaio geral, decisões 3, 5 e 12; ticket 30): toda página com `noindex` e a tarja,
// sem o Web Analytics, lendo os arquivos ao vivo do ambiente do ensaio, e o painel de antes das 17h com o agregado das
// pesquisas finais de 2022. A referência do agregado é a conta à mão sobre os votos totais publicados das 12 pesquisas
// (`dados/pesquisas-historicas.csv`): Lula com 50,98% dos válidos, 51,0% na página.

const TARJA = "Ensaio: reprodução da apuração de 30/10/2022. Não é resultado de 2026.";
const paginas = readdirSync(DIST_ENSAIO, { recursive: true, encoding: "utf8" }).filter((a) => a.endsWith(".html"));
const ler = (dist: URL, caminho: string) => readFileSync(new URL(caminho, dist), "utf8");
const brasil = ler(DIST_ENSAIO, "index.html");

describe("o site do ensaio geral", () => {
  it("tem em toda página o noindex e a tarja, dentro do topo, e nenhuma conta a audiência", () => {
    expect(paginas.length).toBeGreaterThan(5_700);
    const semAlgo = paginas.filter((p) => {
      const html = ler(DIST_ENSAIO, p);
      const topo = elemento(html, /<header[^>]*class="topo"/);
      return !html.includes('<meta name="robots" content="noindex, nofollow">') || !texto(topo).includes(TARJA) || html.includes("cloudflareinsights");
    });
    expect(semAlgo).toEqual([]);
  });

  it("diz no subtítulo a eleição que reproduz, não a de 25/10", () => {
    expect(texto(elemento(brasil, /<p class="subtitulo"/))).toBe("Eleição para Presidente · 2º turno de 30 de outubro de 2022, reproduzido no ensaio");
  });

  it("não é indexado em nenhum endereço do Worker dele", () => {
    expect(ler(DIST_ENSAIO, "_headers")).toMatch(/^\/\*\n {2}X-Robots-Tag: noindex\n$/m);
  });

  it("lê os arquivos ao vivo no R2 e no plano B do ensaio, nunca nos de produção", () => {
    expect(brasil).toContain(AMBIENTES.ensaio.endereco);
    expect(brasil).toContain(AMBIENTES.ensaio.planoB.endereco);
    expect(brasil).not.toContain(AMBIENTES.producao.endereco);
    expect(brasil).not.toContain(AMBIENTES.producao.planoB.endereco);
  });

  it("a tela do simulador lê os mesmos arquivos ao vivo do ensaio, para passar ao ao vivo às 17h", () => {
    const simulador = ler(DIST_ENSAIO, "simulador/index.html");
    expect(simulador).toContain(AMBIENTES.ensaio.endereco);
    expect(simulador).toContain(AMBIENTES.ensaio.planoB.endereco);
    expect(simulador).not.toContain(AMBIENTES.producao.endereco);
    // A base do modelo do build é a do coletor com `--noite 2022-2`: com outra, a ilha não junta os dois arquivos.
    const doBuild = JSON.parse(ler(DIST_ENSAIO, "dados/simulador.json")) as { assinatura: string };
    expect(doBuild.assinatura).toBe(criarProjecaoDaNoite(lerEntradaDaProjecao("2022-2")).assinatura);
    expect(doBuild.assinatura).not.toBe(criarProjecaoDaNoite(lerEntradaDaProjecao("2026-2")).assinatura);
  });

  it("mostra antes das 17h o agregado de 2022, congelado na véspera de 30/10, com as 12 pesquisas finais", () => {
    const agregado = texto(elemento(brasil, /<section[^>]*data-bloco="agregado-de-pesquisas"/));
    expect(agregado).toContain("JAIR BOLSONARO 49,0%");
    expect(agregado).toContain("LULA 51,0%");
    expect(agregado).toContain("de 12 pesquisas");
    expect(agregado).toContain("congelado às 23h de 29/10");
    expect(agregado).toContain("Tendência desde 03/10");

    const lista = texto(elemento(brasil, /<section[^>]*data-bloco="lista-das-pesquisas"/));
    expect(lista).toContain("Pesquisas do 2º turno de 2022 (12)");
    expect(lista).toContain("Registro no TSE: BR-08297/2022");
  });

  it("projeta antes das 17h sobre a base de 2022, com a indicação das pesquisas de 2022 nas duas bases", () => {
    const projecao = texto(elemento(brasil, /<section[^>]*data-bloco="projecao-antes-das-17h"/));
    expect(projecao).toContain("com a indicação das pesquisas (JAIR BOLSONARO 49,0%, LULA 51,0%)");
    expect(texto(elemento(brasil, /<section[^>]*data-bloco="o-que-esperar-da-noite"/))).toContain("No 1º turno de 2022");
  });

  it("dá as hipóteses prontas do simulador ao mesmo candidato que em 2026, pelo número: Lula é o 1º finalista de 2022", () => {
    const viesNaIlha = (dist: URL) => Number(/viesDoPrimeiroTurno&quot;:\[0,(-?[\d.]+)\]/.exec(ler(dist, "simulador/index.html"))?.[1]);
    expect(viesNaIlha(DIST)).toBeGreaterThan(0);
    expect(viesNaIlha(DIST_ENSAIO)).toBe(-viesNaIlha(DIST));
  });

  it("mantém a metodologia de 2026, igual à do build da noite", () => {
    const principal = (dist: URL) => texto(elemento(ler(dist, "metodologia/index.html"), /<main[^>]*>/));
    expect(principal(DIST_ENSAIO)).toBe(principal(DIST));
  });

  it("não deixa nada do ensaio no build da noite", () => {
    const daNoite = ler(DIST, "index.html");
    expect(daNoite).not.toContain(TARJA);
    expect(daNoite).not.toContain(AMBIENTES.ensaio.endereco);
  });
});
