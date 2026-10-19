import { describe, expect, it } from "vitest";
import { lerMunicipioTseIbge } from "../src/index.ts";

// Cabeçalho e linhas copiados do `municipio_tse_ibge.csv` real (gerado em 18/10/2026), em Latin-1.
const latin1 = (texto: string) => new Uint8Array(Buffer.from(texto, "latin1"));

const CABECALHO =
  '"DT_GERACAO";"HH_GERACAO";"CD_UF_TSE";"CD_UF_IBGE";"SG_UF";"NM_UF";"CD_MUNICIPIO_TSE";"NM_MUNICIPIO_TSE";"CD_MUNICIPIO_IBGE";"NM_MUNICIPIO_IBGE"';
const LINHAS = [
  '"18/10/2026";"09:00:10";24;12;"AC";"Acre";"01015";"Capixaba";1200179;"Capixaba"',
  '"18/10/2026";"09:00:10";5;29;"BA";"Bahia";"30660";"Iuiu";2917334;"Iuiú"',
];

describe("lerMunicipioTseIbge", () => {
  it("lê a correspondência entre o código do TSE e o do IBGE, com os dois nomes", () => {
    const linhas = lerMunicipioTseIbge(latin1(`${CABECALHO}\r\n${LINHAS.join("\r\n")}\r\n`));

    expect(linhas).toEqual([
      { geracao: "18/10/2026 09:00:10", uf: "AC", nomeUf: "Acre", municipio: 1015, nomeTse: "Capixaba", ibge: 1200179, nomeIbge: "Capixaba" },
      { geracao: "18/10/2026 09:00:10", uf: "BA", nomeUf: "Bahia", municipio: 30660, nomeTse: "Iuiu", ibge: 2917334, nomeIbge: "Iuiú" },
    ]);
  });
});
