import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { escreverCsv, lerCsv } from "../src/csv.ts";
import { lerInstitutos, lerPesquisas, listaDasPesquisas, type ExtratoDoTse } from "../src/pesquisas.ts";
import type { Turno } from "../src/turno.ts";

// A conferência do `pesquisas.csv` que está no repositório, sem rede, contra o extrato do TSE guardado na última
// conferência diária (`npm run pesquisas`). Qualquer linha que não bata quebra o CI, e o site não se constrói.
const DADOS = new URL("../../../dados/", import.meta.url);
const ler = (arquivo: string) => readFileSync(new URL(arquivo, DADOS), "utf8");
const entrada = {
  pesquisas: ler("pesquisas.csv"),
  institutos: ler("pesquisas-institutos.csv"),
  extrato: JSON.parse(ler("pesquisas-tse.json")) as ExtratoDoTse,
  turno: JSON.parse(ler("turnos/2026-1.json")) as Turno,
};

describe("pesquisas.csv", () => {
  it("bate, linha a linha, com o extrato do TSE da última conferência", () => {
    expect(listaDasPesquisas(entrada).length).toBeGreaterThan(0);
  });

  it("quebra com uma linha que não bate, dizendo qual", () => {
    const [cabecalho, primeira, ...resto] = lerCsv(entrada.pesquisas);
    const entrevistas = cabecalho!.indexOf("entrevistas");
    const errada = primeira!.map((v, i) => (i === entrevistas ? String(2 * Number(v)) : v));
    expect(() => listaDasPesquisas({ ...entrada, pesquisas: escreverCsv([cabecalho!, errada, ...resto]) })).toThrow(
      new RegExp(`${lerPesquisas(entrada.pesquisas)[0]!.registro}.*entrevistas divulgadas`),
    );
  });
});

describe("lista fechada de institutos", () => {
  it("tem os 14 institutos da decisão, cada CNPJ uma vez", () => {
    // Agregado de pesquisas e erro histórico (wayfinder, ticket 10), decisão 2.
    const institutos = lerInstitutos(entrada.institutos);
    expect(new Set(institutos.map((i) => i.institutoDaLista))).toEqual(
      new Set(["Datafolha", "Ipec/Ibope", "Quaest", "AtlasIntel", "MDA", "Paraná Pesquisas", "Futura", "Gerp", "PoderData", "Ipespe", "Veritá", "Brasmarket", "Real Time Big Data", "FSB"]),
    );
    expect(new Set(institutos.map((i) => i.cnpj)).size).toBe(institutos.length);
  });
});

describe("extrato do TSE e registro das conferências", () => {
  it("diz de que arquivo do TSE, de que data de geração e com que hash veio o extrato", () => {
    const { fonte } = entrada.extrato;
    expect(fonte.url).toBe("https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_2026.zip");
    expect(fonte.membro).toBe("pesquisa_eleitoral_2026_BRASIL.csv");
    expect(fonte.geracao.length).toBeGreaterThan(0);
    expect(fonte.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("registra a conferência que gerou o extrato, com cada pesquisa da lista", () => {
    const [cabecalho, ...linhas] = lerCsv(ler("pesquisas-verificacoes.csv"));
    const coluna = (nome: string) => cabecalho!.indexOf(nome);
    const daUltima = linhas.filter((l) => l[coluna("conferido_em")] === entrada.extrato.fonte.conferidoEm);
    for (const p of lerPesquisas(entrada.pesquisas)) {
      const linha = daUltima.find((l) => l[coluna("registro")] === p.registro);
      expect(linha, p.registro).toBeDefined();
      expect(linha![coluna("tse_sha256")]).toBe(entrada.extrato.fonte.sha256);
      expect(linha![coluna("resultado")]).toBe("ok");
    }
  });
});
