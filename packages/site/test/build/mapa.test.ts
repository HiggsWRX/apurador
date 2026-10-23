import { readFileSync } from "node:fs";
import { feature } from "topojson-client";
import { describe, expect, it } from "vitest";
import type { MalhaDosMunicipios } from "../../src/lib/malha";
import { botoes, DIST, DIST_CHAVES_DESLIGADAS, elemento, existe, pagina } from "../html";

// O mapa do cartão no build (ticket 26): a malha do repositório servida em `/malha/`, a das UFs e a dos municípios do
// Brasil como o pipeline as grava e, para cada UF, só os municípios dela, e o cartão com o controle Mapa | Tabela, que
// some no Exterior e com a chave do mapa desligada. A malha não vai no HTML: o cartão a baixa quando entra na tela.

const DADOS = new URL("../../../../dados/", import.meta.url);
const lugares = JSON.parse(readFileSync(new URL("lugares.json", DADOS), "utf8")) as { id: string; tipo: string; uf?: string }[];
const doDist = (caminho: string) => readFileSync(new URL(`.${caminho}`, DIST), "utf8");
const cartao = (html: string) => elemento(html, /<section[^>]*data-cartao-do-mapa/);

describe("malha do mapa no build", () => {
  it("serve a malha das UFs e a dos municípios do Brasil como estão no repositório", () => {
    expect(doDist("/malha/ufs.json")).toBe(readFileSync(new URL("malha/ufs.json", DADOS), "utf8"));
    expect(doDist("/malha/municipios.json")).toBe(readFileSync(new URL("malha/municipios.json", DADOS), "utf8"));
  });

  it("serve a de cada UF, com só os municípios dela, nas mesmas formas da do Brasil", () => {
    for (const uf of lugares.filter((l) => l.tipo === "uf")) expect(existe(`/malha/${uf.id}.json`), uf.id).toBe(true);
    const brasil = JSON.parse(doDist("/malha/municipios.json")) as MalhaDosMunicipios;
    const sp = JSON.parse(doDist("/malha/SP.json")) as MalhaDosMunicipios;
    const deSp = lugares.filter((l) => l.tipo === "municipio" && l.uf === "SP").map((l) => l.id);
    expect(sp.objects.municipios.geometries.map((g) => g.id).sort()).toEqual(deSp.sort());
    expect(sp.arcs.length).toBeLessThan(brasil.arcs.length / 5);
    const campinas = (m: MalhaDosMunicipios) => feature(m, m.objects.municipios).features.find((f) => f.id === "62910")!.geometry;
    expect(campinas(sp)).toEqual(campinas(brasil));
  });
});

describe("cartão do mapa nas páginas", () => {
  it("abre no mapa, com a troca para a tabela, no Brasil, nas UFs e nos municípios", () => {
    for (const caminho of ["/", "/sp/", "/sp/campinas/"]) {
      expect(botoes(cartao(pagina(caminho))), caminho).toEqual([
        ["Mapa", "true"],
        ["Tabela", "false"],
      ]);
    }
  });

  it("não tem mapa no Exterior nem com a chave do mapa desligada", () => {
    expect(botoes(cartao(pagina("/exterior/")))).toEqual([]);
    expect(botoes(cartao(pagina("/exterior/lisboa/")))).toEqual([]);
    const desligada = readFileSync(new URL("./sp/index.html", DIST_CHAVES_DESLIGADAS), "utf8");
    expect(botoes(cartao(desligada))).toEqual([]);
  });

  it("não traz a malha no HTML", () => {
    expect(pagina("/")).not.toMatch(/"arcs"|malha\/municipios\.json/);
  });
});
