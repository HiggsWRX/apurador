import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import type { GeometryCollection, Topology } from "topojson-specification";
import { describe, expect, it } from "vitest";
import type { Lugar } from "../src/lugares.ts";

// A malha do mapa no repositório (`dados/malha/`, ticket 26), sem rede: é o que o build do site lê.
const DADOS = new URL("../../../dados/", import.meta.url);
const ler = (arquivo: string) => readFileSync(new URL(arquivo, DADOS));
const lugares = JSON.parse(ler("lugares.json").toString("utf8")) as Lugar[];
const municipios = JSON.parse(ler("malha/municipios.json").toString("utf8")) as Topology<{ municipios: GeometryCollection }>;
const ufs = JSON.parse(ler("malha/ufs.json").toString("utf8")) as Topology<{ ufs: GeometryCollection }>;

describe("malha do mapa no repositório", () => {
  it("tem um polígono para cada município do Brasil no site, pelo id dele, com Boa Esperança do Norte", () => {
    const ids = municipios.objects.municipios.geometries.map((g) => g.id);
    const doBrasil = lugares.filter((l) => l.tipo === "municipio" && l.uf !== "ZZ").map((l) => l.id);
    expect(doBrasil).toHaveLength(5571);
    expect(ids.sort()).toEqual(doBrasil.sort());
    // Boa Esperança do Norte (MT): código 73709 no TSE e 5101837 no IBGE.
    expect(lugares.find((l) => l.id === "73709")).toMatchObject({ nome: "Boa Esperança do Norte", uf: "MT", ibge: 5101837 });
  });

  it("tem as 27 UFs pela sigla", () => {
    expect(ufs.objects.ufs.geometries.map((g) => g.id).sort()).toEqual(
      lugares
        .filter((l) => l.tipo === "uf")
        .map((l) => l.id)
        .sort(),
    );
  });

  it("fica entre 0,4 e 1 MB com gzip", () => {
    const comGzip = gzipSync(ler("malha/municipios.json"), { level: 9 }).length;
    expect(comGzip).toBeGreaterThan(400_000);
    expect(comGzip).toBeLessThan(1_000_000);
  });
});
