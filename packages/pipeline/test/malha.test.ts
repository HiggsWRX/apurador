import type { Polygon } from "geojson";
import { feature } from "topojson-client";
import { describe, expect, it } from "vitest";
import type { Lugar } from "../src/lugares.ts";
import { malhaDaWeb } from "../src/malha.ts";

// A malha do mapa (ticket 26): a Malha Municipal Digital 2024 do IBGE, simplificada para a web, com cada município pelo
// id do site (o código do TSE), casado pelo código do IBGE de `dados/lugares.json`, que vem da tabela
// `municipio_tse_ibge`. As duas áreas operacionais das lagoas do RS não são municípios e ficam de fora. A malha das UFs
// sai da mesma, dissolvida.

/** Um quadrado de 1 grau com o canto em (x, y), como um polígono do IBGE. */
const quadrado = (cdMun: string, uf: string, x: number, y: number) => ({
  type: "Feature",
  properties: { CD_MUN: cdMun, NM_MUN: cdMun, SIGLA_UF: uf },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [x, y],
        [x, y + 1],
        [x + 1, y + 1],
        [x + 1, y],
        [x, y],
      ],
    ],
  },
});

/** Dois municípios do MT lado a lado, um do MS embaixo e a Lagoa Mirim. */
const IBGE = {
  type: "FeatureCollection",
  features: [
    quadrado("5101837", "MT", -56, -13),
    quadrado("5106240", "MT", -55, -13),
    quadrado("5002704", "MS", -56, -14),
    quadrado("4300001", "RS", -53, -33),
  ],
};
const entrada = (fc: object) => ({ "malha.json": JSON.stringify(fc) });

const LUGARES: Lugar[] = [
  { id: "BR", tipo: "brasil", nome: "Brasil", aptos: 0 },
  { id: "MS", tipo: "uf", nome: "Mato Grosso do Sul", uf: "MS", artigo: "", aptos: 0 },
  { id: "MT", tipo: "uf", nome: "Mato Grosso", uf: "MT", artigo: "", aptos: 0 },
  { id: "ZZ", tipo: "exterior", nome: "Exterior", uf: "ZZ", aptos: 0 },
  { id: "73709", tipo: "municipio", nome: "Boa Esperança do Norte", uf: "MT", ibge: 5101837, aptos: 4326 },
  { id: "98493", tipo: "municipio", nome: "Nova Ubiratã", uf: "MT", ibge: 5106240, aptos: 9000 },
  { id: "90514", tipo: "municipio", nome: "Campo Grande", uf: "MS", ibge: 5002704, aptos: 600000 },
  { id: "29539", tipo: "municipio", nome: "Lisboa", uf: "ZZ", aptos: 40000 },
];

describe("malha do mapa", () => {
  it("dá cada município pelo id do site, casado pelo código do IBGE, sem as lagoas do RS", async () => {
    const { municipios } = await malhaDaWeb(entrada(IBGE), "malha.json", LUGARES);
    const ids = feature(municipios, municipios.objects.municipios!).features.map((f) => f.id);
    expect(ids.sort()).toEqual(["73709", "90514", "98493"]);
  });

  it("dissolve as UFs a partir dos municípios, com a sigla como id", async () => {
    const { ufs } = await malhaDaWeb(entrada(IBGE), "malha.json", LUGARES);
    const doMt = feature(ufs, ufs.objects.ufs!).features;
    expect(doMt.map((f) => f.id).sort()).toEqual(["MS", "MT"]);
    // Os dois quadrados do MT viram um retângulo de 2 por 1 grau.
    const mt = doMt.find((f) => f.id === "MT")!.geometry as Polygon;
    const xs = mt.coordinates[0]!.map(([x]) => x!);
    expect([Math.min(...xs), Math.max(...xs)].map((x) => Math.round(x))).toEqual([-56, -54]);
  });

  it("falha se um município do site fica sem polígono ou se um polígono não é de nenhum município do site", async () => {
    const semCampoGrande = { ...IBGE, features: IBGE.features.filter((f) => f.properties.CD_MUN !== "5002704") };
    await expect(malhaDaWeb(entrada(semCampoGrande), "malha.json", LUGARES)).rejects.toThrow(/sem polígono.*90514/);
    const comOutro = { ...IBGE, features: [...IBGE.features, quadrado("5300108", "DF", -48, -16)] };
    await expect(malhaDaWeb(entrada(comOutro), "malha.json", LUGARES)).rejects.toThrow(/5300108/);
  });
});
