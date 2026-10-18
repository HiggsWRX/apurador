import type { DetalheMunzona, VotoCandidatoMunzona } from "@apurador/tse";
import { describe, expect, it } from "vitest";
import { resultadoDoTurno } from "../src/turno.ts";

const base = { geracao: "18/10/2026 19:31:39", ano: 2026, turno: 1, cargo: 1, nomeMunicipio: "" };

const voto = (uf: string, municipio: number, zona: number, numero: number, nomeUrna: string, partido: string, votos: number): VotoCandidatoMunzona => ({
  ...base,
  uf,
  municipio,
  zona,
  numero,
  nome: nomeUrna,
  nomeUrna,
  partido,
  votos,
});

const detalhe = (uf: string, municipio: number, zona: number, d: Partial<DetalheMunzona>): DetalheMunzona => ({
  ...base,
  uf,
  municipio,
  zona,
  aptos: 0,
  votantes: 0,
  abstencoes: 0,
  validos: 0,
  brancos: 0,
  nulos: 0,
  secoes: 0,
  ...d,
});

describe("resultadoDoTurno", () => {
  // Um município com duas zonas, um posto no Exterior e uma linha de outro turno, que fica de fora.
  const candidatos = [
    voto("AC", 1023, 1, 13, "LULA", "PT", 600),
    voto("AC", 1023, 1, 22, "FLÁVIO BOLSONARO", "PL", 300),
    voto("AC", 1023, 1, 30, "FULANO", "NOVO", 100),
    voto("AC", 1023, 2, 22, "FLÁVIO BOLSONARO", "PL", 500),
    voto("ZZ", 29539, 1, 22, "FLÁVIO BOLSONARO", "PL", 40),
    voto("ZZ", 29539, 1, 13, "LULA", "PT", 60),
    { ...voto("AC", 1023, 1, 13, "LULA", "PT", 9999), turno: 2 },
  ];
  const detalhes = [
    detalhe("AC", 1023, 1, { aptos: 1500, votantes: 1100, abstencoes: 400, validos: 1000, brancos: 40, nulos: 60, secoes: 5 }),
    detalhe("AC", 1023, 2, { aptos: 700, votantes: 520, abstencoes: 180, validos: 500, brancos: 10, nulos: 10, secoes: 2 }),
    detalhe("ZZ", 29539, 1, { aptos: 300, votantes: 105, abstencoes: 195, validos: 100, brancos: 2, nulos: 3, secoes: 1 }),
  ];

  it("soma o Brasil com o Exterior e ordena os candidatos pelos votos no Brasil", () => {
    const resultado = resultadoDoTurno({ ano: 2026, turno: 1, candidatos, detalhes });

    expect(resultado.candidatos.map((c) => [c.numero, c.nomeUrna, c.partido])).toEqual([
      [22, "FLÁVIO BOLSONARO", "PL"],
      [13, "LULA", "PT"],
      [30, "FULANO", "NOVO"],
    ]);
    expect(resultado.lugares.BR).toEqual({
      aptos: 2500,
      votantes: 1725,
      abstencoes: 775,
      validos: 1600,
      brancos: 52,
      nulos: 73,
      secoes: 8,
      votos: [840, 660, 100],
    });
    expect(resultado.geracao).toEqual(["18/10/2026 19:31:39"]);
  });

  it("recusa dados em que a soma dos candidatos não bate com os válidos do TSE", () => {
    const errado = detalhes.map((d) => (d.uf === "ZZ" ? { ...d, validos: 101 } : d));

    expect(() => resultadoDoTurno({ ano: 2026, turno: 1, candidatos, detalhes: errado })).toThrow(/válidos/);
  });
});
