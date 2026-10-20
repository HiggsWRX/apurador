import { readdirSync, readFileSync, statSync } from "node:fs";
import type { Lugar, Turno } from "@apurador/pipeline";
import { describe, expect, it } from "vitest";
import type { CurvasDoLugar } from "../../src/lib/curva-de-comparacao";
import { ler } from "../dados-do-build";
import { DIST, DIST_CHAVES_DESLIGADAS, DIST_PROJECAO_DESLIGADA, elemento, elementos, texto } from "../html";

// A curva de comparação no build (a fronteira do site): um arquivo de curvas por lugar, `/curvas/<id>.json`, que a
// página só baixa quando o visitante liga uma curva, e as curvas reais de noites passadas em "O que esperar da noite"
// com a projeção de antes das 17h desligada. As referências são o resultado oficial (`dados/turnos/`) e as decisões.

const TURNOS = ["2018-1", "2018-2", "2022-1", "2022-2", "2026-1"];
const curvas = (id: string) => JSON.parse(readFileSync(new URL(`curvas/${id}.json`, DIST), "utf8")) as CurvasDoLugar;
const BLOCO_DO_ESPERAR = /<section[^>]*data-bloco="o-que-esperar-da-noite"/;
const botoes = (html: string) => [...html.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*>([^<]+)</g)].map((m) => [m[2], m[1]]);

describe("as curvas de comparação de cada lugar", () => {
  const lugares = JSON.parse(ler("lugares.json")) as Lugar[];
  const oficiais = TURNOS.map((t) => JSON.parse(ler(`turnos/${t}.json`)) as Turno);
  /** Os lugares com voto no PT ou no partido de Bolsonaro em algum turno passado, pelo resultado oficial. */
  const comVoto = lugares.filter((l) =>
    oficiais.some((t) => {
      const votos = t.lugares[l.id]?.votos;
      return votos && t.candidatos.some((c, i) => ["PT", "PSL", "PL"].includes(c.partido) && votos[i]! > 0);
    }),
  );

  it("há um arquivo por lugar com voto no PT ou no partido de Bolsonaro: o Brasil, as UFs, o Exterior e os municípios", () => {
    const arquivos = readdirSync(new URL("curvas/", DIST)).sort();

    expect(arquivos).toEqual(comVoto.map((l) => `${l.id}.json`).sort());
    // Só 40 cidades do Exterior, como Abuja e Bagdá, nunca tiveram esses votos.
    expect(lugares.length - arquivos.length).toBe(40);
    expect(arquivos).toEqual(expect.arrayContaining(["BR.json", "SP.json", "ZZ.json", "62910.json", "29955.json"]));
  });

  it("o do Brasil tem os cinco turnos passados, e cada curva termina no resultado oficial, com o PT entre os dois", () => {
    const doBrasil = curvas("BR");

    expect(Object.keys(doBrasil)).toEqual(TURNOS);
    expect(TURNOS.map((t) => doBrasil[t]!.pt.at(-1))).toEqual([38.9, 44.9, 52.9, 50.9, 49]);
  });

  it("Boa Esperança do Norte (MT), que só existe a partir de 2026, só tem o 1º turno de 2026", () => {
    expect(Object.keys(curvas("73709"))).toEqual(["2026-1"]);
  });

  it("cada arquivo é leve: o maior tem menos de 6 KB, antes do gzip", () => {
    const maior = Math.max(...readdirSync(new URL("curvas/", DIST)).map((a) => statSync(new URL(`curvas/${a}`, DIST)).size));

    expect(maior).toBeLessThan(6_000);
  });

  it("nenhuma página leva as curvas: elas só vêm quando o visitante liga uma", () => {
    for (const caminho of ["index.html", "sp/index.html", "sp/campinas/index.html", "exterior/lisboa/index.html"]) {
      expect(readFileSync(new URL(caminho, DIST), "utf8"), caminho).not.toMatch(/secoes(&quot;|")/);
    }
  });
});

describe("'O que esperar da noite' com as curvas reais de noites passadas", () => {
  const esperar = (dist: URL) => elemento(readFileSync(new URL("index.html", dist), "utf8"), BLOCO_DO_ESPERAR);

  it.each([
    ["só com a projeção de antes das 17h desligada", DIST_PROJECAO_DESLIGADA],
    ["com todas as chaves desligadas", DIST_CHAVES_DESLIGADAS],
  ])("%s, tem um botão por turno passado, nenhum ligado, sem número de projeção nem chance de vitória", (_, dist) => {
    const html = esperar(dist);

    expect(botoes(elemento(html, /<div[^>]*data-noites-passadas/))).toEqual([
      ["2018 1T", "false"],
      ["2018 2T", "false"],
      ["2022 1T", "false"],
      ["2022 2T", "false"],
      ["2026 1T", "false"],
    ]);
    expect(html).not.toMatch(/data-chance-de-vitoria|data-curva-projetada/);
    expect(texto(html)).not.toMatch(/\d,\d%|±/);
  });

  it("com a projeção ligada, fica com a curva projetada, sem as noites passadas", () => {
    expect(elementos(esperar(DIST), /<div[^>]*data-noites-passadas/)).toEqual([]);
  });
});
