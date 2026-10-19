import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lerConstantes } from "../src/index.ts";

// O arquivo de constantes do modelo, versionado no pacote. Os valores provisórios são os das decisões do mapa:
// Método de projeção só com a apuração (09, decisões 1, 3 e 4), Combinação de pesquisas e apuração (11,
// decisões 2 e 3) e Sinal de virada (23, decisão 2).

const arquivo = JSON.parse(readFileSync(new URL("../constantes.json", import.meta.url), "utf8")) as Record<string, unknown>;

describe("as constantes do modelo", () => {
  it("estão no arquivo de dados com os valores provisórios das decisões", () => {
    expect(lerConstantes(arquivo)).toEqual({
      incertezaRegional: 1,
      incertezaNacional: 1,
      pesoDoMunicipio: 3000,
      minimoPorNivel: 2000,
      ordemDeChegada: "mistura",
      sinalDeVirada: { projetada: 0.5, possivel: 0.05 },
      secoesDasPesquisas: 0.5,
      incertezaLocalDasPesquisas: { uf: 0.13, municipio: 0.15 },
    });
  });

  it("aceitam as três ordens de chegada da calibração", () => {
    for (const ordemDeChegada of ["mistura", "primeiro-turno", "ritmo-da-noite"]) expect(lerConstantes({ ...arquivo, ordemDeChegada }).ordemDeChegada).toBe(ordemDeChegada);
  });

  it("recusam um arquivo com um valor fora do lugar, antes de ele chegar à noite", () => {
    expect(() => lerConstantes({ ...arquivo, ordemDeChegada: "proporcional" })).toThrow(/ordemDeChegada/);
    expect(() => lerConstantes({ ...arquivo, incertezaNacional: -1 })).toThrow(/incertezaNacional/);
    expect(() => lerConstantes({ ...arquivo, pesoDoMunicipio: "3000" })).toThrow(/pesoDoMunicipio/);
    expect(() => lerConstantes({ ...arquivo, sinalDeVirada: { projetada: 0.5 } })).toThrow(/sinalDeVirada.possivel/);
    expect(() => lerConstantes({ ...arquivo, sinalDeVirada: { projetada: 0.05, possivel: 0.5 } })).toThrow(/virada possível/);
    // com K = 0, o peso das pesquisas antes da primeira seção seria 0 ÷ 0
    expect(() => lerConstantes({ ...arquivo, secoesDasPesquisas: 0 })).toThrow(/secoesDasPesquisas/);
    expect(() => lerConstantes({ ...arquivo, incertezaLocalDasPesquisas: { uf: 0.13 } })).toThrow(/incertezaLocalDasPesquisas.municipio/);
  });
});
