import type { DetalheMunzona, VotoCandidatoMunzona } from "@apurador/tse";
import { describe, expect, it } from "vitest";
import { conferirTotais, type Turno } from "../src/index.ts";

const base = { geracao: "18/10/2026 19:31:39", ano: 2022, turno: 2, cargo: 1, nomeMunicipio: "", nome: "" };

const voto = (uf: string, municipio: number, numero: number, partido: string, votos: number): VotoCandidatoMunzona => ({
  ...base,
  uf,
  municipio,
  zona: 1,
  numero,
  nomeUrna: "",
  partido,
  votos,
});

const detalhe = (uf: string, municipio: number, validos: number, aptos: number): DetalheMunzona => ({
  ...base,
  uf,
  municipio,
  zona: 1,
  aptos,
  votantes: validos + 10,
  abstencoes: aptos - validos - 10,
  validos,
  brancos: 4,
  nulos: 6,
  secoes: 2,
});

// Os arquivos do TSE: dois municípios no Acre, um em Alagoas e um posto no Exterior.
const oficial = {
  candidatos: [
    voto("AC", 1023, 13, "PT", 300),
    voto("AC", 1023, 22, "PL", 700),
    voto("AC", 1120, 22, "PL", 50),
    voto("AL", 27014, 13, "PT", 900),
    voto("AL", 27014, 22, "PL", 100),
    voto("ZZ", 29539, 13, "PT", 60),
    voto("ZZ", 29539, 22, "PL", 40),
    { ...voto("AC", 1023, 13, "PT", 5), turno: 1 },
  ],
  detalhes: [detalhe("AC", 1023, 1000, 1500), detalhe("AC", 1120, 50, 80), detalhe("AL", 27014, 1000, 1400), detalhe("ZZ", 29539, 100, 300)],
};

// O que o repositório guarda do mesmo turno, escrito à mão.
const repositorio = (): Turno => ({
  ano: 2022,
  turno: 2,
  cargo: "Presidente",
  geracao: ["18/10/2026 19:31:39"],
  candidatos: [
    { numero: 13, nome: "", nomeUrna: "LULA", partido: "PT" },
    { numero: 22, nome: "", nomeUrna: "JAIR BOLSONARO", partido: "PL" },
  ],
  lugares: {
    BR: { aptos: 3280, votantes: 2190, abstencoes: 1090, validos: 2150, brancos: 16, nulos: 24, secoes: 8, votos: [1260, 890] },
    AC: { aptos: 1580, votantes: 1070, abstencoes: 510, validos: 1050, brancos: 8, nulos: 12, secoes: 4, votos: [300, 750] },
    AL: { aptos: 1400, votantes: 1010, abstencoes: 390, validos: 1000, brancos: 4, nulos: 6, secoes: 2, votos: [900, 100] },
    ZZ: { aptos: 300, votantes: 110, abstencoes: 190, validos: 100, brancos: 4, nulos: 6, secoes: 2, votos: [60, 40] },
    "01023": { aptos: 1500, votantes: 1010, abstencoes: 490, validos: 1000, brancos: 4, nulos: 6, secoes: 2, votos: [300, 700] },
  },
});

describe("conferirTotais", () => {
  it("não aponta nada quando o Brasil e cada UF batem com os arquivos do TSE", () => {
    expect(conferirTotais(repositorio(), oficial)).toEqual([]);
  });

  it("aponta o lugar, o total e os dois valores quando um total não bate", () => {
    const turno = repositorio();
    turno.lugares.AC!.nulos = 13;
    turno.lugares.BR!.aptos = 3281;

    expect(conferirTotais(turno, oficial)).toEqual([
      { lugar: "BR", total: "aptos", repositorio: 3281, tse: 3280 },
      { lugar: "AC", total: "nulos", repositorio: 13, tse: 12 },
    ]);
  });

  it("aponta os votos de um candidato que não batem", () => {
    const turno = repositorio();
    turno.lugares.AL!.votos = [899, 100];

    expect(conferirTotais(turno, oficial)).toEqual([{ lugar: "AL", total: "votos do 13 (PT)", repositorio: 899, tse: 900 }]);
  });

  it("aponta os totais do repositório que os arquivos do TSE não têm", () => {
    const divergencias = conferirTotais(repositorio(), { candidatos: [], detalhes: [] });

    expect(divergencias).toContainEqual({ lugar: "BR", total: "aptos", repositorio: 3280, tse: undefined });
    expect(divergencias).toContainEqual({ lugar: "ZZ", total: "validos", repositorio: 100, tse: undefined });
  });

  it("aponta a UF que falta no repositório", () => {
    const turno = repositorio();
    delete turno.lugares.AL;

    expect(conferirTotais(turno, oficial)).toContainEqual({ lugar: "AL", total: "aptos", repositorio: undefined, tse: 1400 });
  });
});
