import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DIST, DIST_PROJECAO_DESLIGADA } from "../html";

// A chance de vitória antes das 17h é da chave da projeção (Consulta a advogado eleitoral, decisão 2, chave c), e não
// da do agregado. Com a projeção desligada e o agregado ligado, o caso em que o advogado nega o item 1 da Confirmação
// dos textos preditivos, nenhuma página pode mostrar uma chance de vitória. Toda chance na página leva a marca
// `data-chance-de-vitoria` (a barra de `ChanceDeVitoria` e o sino da metodologia), e é ela que este teste procura.

const MARCA = /\sdata-chance-de-vitoria[\s=>]/;
const ler = (dist: URL, arquivo: string) => readFileSync(new URL(arquivo.replace(/\\/g, "/"), dist), "utf8");
const paginas = (dist: URL) => readdirSync(dist, { recursive: true, encoding: "utf8" }).filter((a) => a.endsWith(".html"));

describe("a chance de vitória antes das 17h, atrás da chave da projeção", () => {
  it("no build como vai ao ar, a página do Brasil e a metodologia mostram a chance, com a marca", () => {
    expect(ler(DIST, "index.html")).toMatch(MARCA);
    expect(ler(DIST, "metodologia/index.html")).toMatch(MARCA);
  });

  it("com a projeção desligada, nenhuma página mostra a chance de vitória", () => {
    expect(paginas(DIST_PROJECAO_DESLIGADA).filter((a) => MARCA.test(ler(DIST_PROJECAO_DESLIGADA, a)))).toEqual([]);
  });

  it("com a projeção desligada, o agregado continua na página do Brasil e na metodologia", () => {
    expect(ler(DIST_PROJECAO_DESLIGADA, "index.html")).toContain('data-bloco="agregado-de-pesquisas"');
    expect(ler(DIST_PROJECAO_DESLIGADA, "metodologia/index.html")).toContain('data-bloco="agregado-do-dia"');
  });
});
