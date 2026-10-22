import type { VotoCandidatoMunzona } from "@apurador/tse";
import { describe, expect, it } from "vitest";
import { conferirResultadosHistoricos, resultadoHistorico } from "../src/resultados-historicos.ts";

// Um 2006 em miniatura: dois municípios, o Exterior e três candidatos, nos dois turnos.
const voto = (turno: number, uf: string, numero: number, votos: number, geracao = "13/05/2022 19:53:47"): VotoCandidatoMunzona => ({
  geracao,
  ano: 2006,
  turno,
  cargo: 1,
  uf,
  municipio: uf === "ZZ" ? 29998 : 1120,
  nomeMunicipio: uf === "ZZ" ? "LISBOA" : "ACRELÂNDIA",
  zona: 8,
  numero,
  nome: { 13: "LUIZ INÁCIO LULA DA SILVA", 45: "GERALDO JOSÉ RODRIGUES ALCKMIN FILHO", 50: "HELOÍSA HELENA" }[numero]!,
  nomeUrna: { 13: "LULA", 45: "GERALDO ALCKMIN", 50: "HELOÍSA HELENA" }[numero]!,
  partido: { 13: "PT", 45: "PSDB", 50: "PSOL" }[numero]!,
  votos,
  dia: turno === 1 ? "2006-10-01" : "2006-10-29",
});
const CANDIDATOS = [
  voto(1, "AC", 45, 600),
  voto(1, "AC", 13, 500),
  voto(1, "AC", 50, 90),
  voto(1, "ZZ", 13, 200),
  voto(1, "ZZ", 45, 50),
  voto(2, "AC", 13, 610, "14/05/2022 08:00:00"),
  voto(2, "AC", 45, 560, "14/05/2022 08:00:00"),
  voto(2, "ZZ", 13, 230, "14/05/2022 08:00:00"),
  voto(2, "ZZ", 45, 40, "14/05/2022 08:00:00"),
];

describe("resultadoHistorico", () => {
  it("soma o 2º turno no Brasil, com o Exterior, e põe primeiro quem foi mais votado no 1º turno", () => {
    expect(resultadoHistorico(CANDIDATOS, { ano: 2006, turno: 2 })).toEqual({
      ano: 2006,
      turno: 2,
      dia: "2006-10-29",
      geracao: ["14/05/2022 08:00:00"],
      finalistas: [
        { numero: 13, nome: "LUIZ INÁCIO LULA DA SILVA", nomeUrna: "LULA", partido: "PT", votos: 840 },
        { numero: 45, nome: "GERALDO JOSÉ RODRIGUES ALCKMIN FILHO", nomeUrna: "GERALDO ALCKMIN", partido: "PSDB", votos: 600 },
      ],
      validos: 1440,
    });
  });

  it("num 1º turno, dá os dois mais votados e os válidos de todos os candidatos", () => {
    const resultado = resultadoHistorico(CANDIDATOS, { ano: 2006, turno: 1 });
    expect(resultado.finalistas.map((f) => [f.numero, f.votos])).toEqual([
      [13, 700],
      [45, 650],
    ]);
    expect(resultado.validos).toBe(1440);
    expect(resultado.dia).toBe("2006-10-01");
  });

  it("quebra se o turno não está no arquivo", () => {
    expect(() => resultadoHistorico(CANDIDATOS, { ano: 2010, turno: 2 })).toThrow(/2010/);
  });
});

describe("conferirResultadosHistoricos", () => {
  const repositorio = [resultadoHistorico(CANDIDATOS, { ano: 2006, turno: 2 })];

  it("não acha divergência quando o arquivo do TSE dá os mesmos votos, mesmo regerado em outro dia", () => {
    const regerado = CANDIDATOS.map((v) => ({ ...v, geracao: "19/10/2026 03:00:00" }));
    expect(conferirResultadosHistoricos(repositorio, new Map([[2006, regerado]]))).toEqual([]);
  });

  it("aponta os votos que mudaram e a eleição que o TSE não tem", () => {
    const outro = CANDIDATOS.map((v) => (v.turno === 2 && v.numero === 45 && v.uf === "ZZ" ? { ...v, votos: 41 } : v));
    expect(conferirResultadosHistoricos(repositorio, new Map([[2006, outro]]))).toEqual([
      "2006, 2º turno: GERALDO ALCKMIN (45) tem 600 votos no repositório e 601 no TSE",
      "2006, 2º turno: os válidos são 1440 no repositório e 1441 no TSE",
    ]);
    expect(conferirResultadosHistoricos(repositorio, new Map())).toEqual(["2006, 2º turno: o arquivo do TSE de 2006 não foi lido"]);
  });

  it("aponta o partido ou o nome trocado no repositório", () => {
    const [lula, alckmin] = repositorio[0]!.finalistas;
    const trocado = [{ ...repositorio[0]!, finalistas: [{ ...lula, partido: "PSDB" }, alckmin] as (typeof repositorio)[0]["finalistas"] }];
    expect(conferirResultadosHistoricos(trocado, new Map([[2006, CANDIDATOS]]))).toEqual([
      "2006, 2º turno: o 1º finalista (13) é LULA (PSDB) no repositório e LULA (PT) no TSE",
    ]);
  });
});
