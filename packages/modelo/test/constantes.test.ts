import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lerConstantes } from "../src/index.ts";

// O arquivo de constantes do modelo, versionado no pacote e congelado pela calibração de 19/10 (docs/calibracao.md,
// "Constantes escolhidas"). As provisórias das decisões do mapa ficam no CONSTANTES_PROVISORIAS, para o porte fiel.

const arquivo = JSON.parse(readFileSync(new URL("../constantes.json", import.meta.url), "utf8")) as Record<string, unknown>;

describe("as constantes do modelo", () => {
  it("estão no arquivo de dados com os valores que a calibração escolheu", () => {
    expect(lerConstantes(arquivo)).toEqual({
      incertezaRegional: 2,
      incertezaNacional: 2,
      pesoDoMunicipio: 10000,
      minimoPorNivel: 2000,
      ordemDeChegada: "mistura",
      sinalDeVirada: { projetada: 0.5, possivel: 0.02 },
      secoesDasPesquisas: 0.25,
      incertezaLocalDasPesquisas: { uf: 0.13, municipio: 0.15 },
      zona: false,
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
    expect(() => lerConstantes({ ...arquivo, zona: "não" })).toThrow(/zona/);
  });
});
