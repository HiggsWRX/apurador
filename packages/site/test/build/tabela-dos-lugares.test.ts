import { readFileSync } from "node:fs";
import { assinaturaDosLugares } from "@apurador/pipeline";
import { describe, expect, it } from "vitest";
import type { ArquivoDaTabelaDeLugares } from "../../src/lib/tabela-dos-lugares";
import { TURNO } from "../dados-do-build";
import { DIST, elemento, existe, pagina, texto } from "../html";

// O cartão do mapa com a tabela de lugares (ticket 18): o build gera a tabela do Brasil, de cada UF e do Exterior, que o
// cartão baixa quando entra na tela, e cada página de lugar traz o cartão antes do histórico. A ordem dos lugares é a do
// mapa.json, a de `dados/lugares.json` sem o Brasil, e a assinatura dela é a que o coletor escreve no mapa.json.

const lugares = JSON.parse(readFileSync(new URL("../../../../dados/lugares.json", import.meta.url), "utf8")) as { id: string; tipo: string; uf?: string }[];
const doMapa = lugares.filter((l) => l.tipo !== "brasil");
const tabela = (id: string) => JSON.parse(readFileSync(new URL(`tabela-de-lugares/${id}.json`, DIST), "utf8")) as ArquivoDaTabelaDeLugares;

/** O placar entre finalistas do PL no 1º turno de 2026, com uma casa, pelos votos do TSE. */
function doPl(id: string): number | null {
  const votos = TURNO.lugares[id]?.votos;
  const [pl, pt] = ["PL", "PT"].map((p) => votos?.[TURNO.candidatos.findIndex((c) => c.partido === p)] ?? 0) as [number, number];
  return pl + pt > 0 ? Math.round((1000 * pl) / (pl + pt)) / 10 : null;
}

describe("tabela de lugares no build", () => {
  it("existe para o Brasil, cada UF e o Exterior, e não para os municípios", () => {
    const comTabela = lugares.filter((l) => l.tipo !== "municipio");
    expect(comTabela).toHaveLength(29);
    for (const l of comTabela) expect(existe(`/tabela-de-lugares/${l.id}.json`), l.id).toBe(true);
    expect(existe("/tabela-de-lugares/71072.json")).toBe(false);
  });

  it("traz os lugares logo abaixo, com o caminho, a posição no mapa.json e a assinatura que o coletor escreve nele", () => {
    const doBrasil = tabela("BR");
    expect(doBrasil.lugar).toBe("BR");
    expect(doBrasil.assinatura).toBe(assinaturaDosLugares(doMapa.map((l) => l.id)));
    expect(doBrasil.linhas.map((l) => l.id).sort()).toEqual(
      lugares
        .filter((l) => l.tipo === "uf" || l.tipo === "exterior")
        .map((l) => l.id)
        .sort(),
    );
    expect(doBrasil.candidatos).toEqual([
      { nome: "FLAVIO BOLSONARO", partido: "PL" },
      { nome: "LULA", partido: "PT" },
    ]);
    const deSaoPaulo = tabela("SP");
    expect(deSaoPaulo.linhas).toHaveLength(lugares.filter((l) => l.tipo === "municipio" && l.uf === "SP").length);
    expect(deSaoPaulo.linhas.find((l) => l.id === "71072")).toMatchObject({ nome: "São Paulo", caminho: "/sp/sao-paulo/" });
    for (const { linhas } of [doBrasil, deSaoPaulo, tabela("ZZ")]) {
      expect(linhas.filter((l) => doMapa[l.indice]?.id !== l.id)).toEqual([]);
    }
  });

  it("traz o placar entre finalistas do 1º turno de 2026 de cada lugar, com uma casa, ou nada onde não houve voto", () => {
    // No Brasil, 51,0 × 49,0 (spec, "Problema").
    expect(doPl("BR")).toBe(51.0);
    for (const id of ["BR", "SP", "ZZ"]) {
      const longe = tabela(id).linhas.filter((l) => l.primeiroTurno !== doPl(l.id));
      expect(longe).toEqual([]);
    }
    expect(tabela("ZZ").linhas.some((l) => l.primeiroTurno === null)).toBe(true);
  });
});

describe("cartão do mapa nas páginas de lugar", () => {
  const cartao = (caminho: string) => elemento(pagina(caminho), /<section[^>]*data-cartao-do-mapa/);

  it("vem embaixo, antes do histórico, com o título dos lugares que traz e a tabela ainda por baixar", () => {
    const html = pagina("/sp/campinas/");
    const abaixo = elemento(html, /<div class="abaixo"/);
    expect(abaixo.indexOf("data-cartao-do-mapa")).toBeLessThan(abaixo.indexOf("data-historico"));
    expect(texto(elemento(cartao("/"), /<h2/))).toBe("Estados e Exterior");
    expect(texto(elemento(cartao("/sp/"), /<h2/))).toBe("Municípios");
    expect(texto(elemento(cartao("/sp/campinas/"), /<h2/))).toBe("Municípios de São Paulo");
    expect(texto(elemento(cartao("/ba/salvador/"), /<h2/))).toBe("Municípios da Bahia");
    expect(texto(elemento(cartao("/exterior/"), /<h2/))).toBe("Cidades do exterior");
    expect(texto(elemento(cartao("/exterior/lisboa/"), /<h2/))).toBe("Cidades do exterior");
    // Nenhum número no HTML: a tabela vem do build quando o cartão chega à tela.
    expect(cartao("/sp/")).not.toContain("<table");
  });

  it("é uma ilha que só acorda quando chega à tela, com a tabela da UF numa página de município", () => {
    const ilha = (caminho: string) => elemento(pagina(caminho), /<astro-island[^>]*CartaoDoMapa/);
    expect(ilha("/sp/campinas/")).toMatch(/client="visible"/);
    expect(ilha("/sp/campinas/")).toMatch(/&quot;lugarDaTabela&quot;:\[0,&quot;SP&quot;\]/);
    expect(ilha("/")).toMatch(/&quot;lugarDaTabela&quot;:\[0,&quot;BR&quot;\]/);
  });
});
