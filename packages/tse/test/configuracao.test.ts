import { describe, expect, it } from "vitest";
import { lerConfiguracaoDeMunicipios } from "../src/index.ts";

// Trechos do `mun-e006258-cm.json` real (gerado em 15/10/2026), com o formato do TSE: espaços em volta dos
// dois-pontos e uma quebra de linha antes de cada objeto.
const CONFIGURACAO = `
{ "dg" : "15/10/2026", "hg" : "09:38:00", "idg" : "3531598", "f" : "o", "abr" : [
{ "cd" : "ac", "ds" : "ACRE", "mu" : [
{ "cd" : "01120", "cdi" : "1200013", "nm" : "ACRELÂNDIA", "c" : "n", "z" : [ "0008" ] },
{ "cd" : "01392", "cdi" : "1200401", "nm" : "RIO BRANCO", "c" : "s", "z" : [ "0009", "0001" ] } ] },
{ "cd" : "zz", "ds" : "EXTERIOR", "mu" : [
{ "cd" : "29254", "cdi" : "", "nm" : "ABIDJÃ", "c" : "n", "z" : [ "0001" ] } ] } ] }`;

describe("lerConfiguracaoDeMunicipios", () => {
  it("lê as UFs, com o Exterior, e os municípios de cada uma, com o código do IBGE, a capital e as zonas", () => {
    expect(lerConfiguracaoDeMunicipios(new TextEncoder().encode(CONFIGURACAO))).toEqual({
      geracao: "15/10/2026 09:38:00",
      ufs: [
        {
          sigla: "AC",
          nome: "ACRE",
          municipios: [
            { codigo: 1120, ibge: 1200013, nome: "ACRELÂNDIA", capital: false, zonas: [8] },
            { codigo: 1392, ibge: 1200401, nome: "RIO BRANCO", capital: true, zonas: [9, 1] },
          ],
        },
        { sigla: "ZZ", nome: "EXTERIOR", municipios: [{ codigo: 29254, ibge: null, nome: "ABIDJÃ", capital: false, zonas: [1] }] },
      ],
    });
  });

  it("falha com um arquivo de outro formato, em vez de devolver uma configuração vazia", () => {
    expect(() => lerConfiguracaoDeMunicipios(new TextEncoder().encode(`{ "dg" : "15/10/2026", "abr" : [ { "cd" : "ac" } ] }`))).toThrow(/mu/);
  });
});
