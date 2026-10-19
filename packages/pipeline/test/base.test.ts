import type { DetalheMunzona, DetalheSecao, VotoCandidatoMunzona } from "@apurador/tse";
import { describe, expect, it } from "vitest";
import { baseDoModelo, indicadoresDaBase } from "../src/base.ts";

const doTurno = { geracao: "17/10/2026 03:16:00", ano: 2022, turno: 1, cargo: 1, nomeMunicipio: "" };

const voto = (uf: string, municipio: number, zona: number, numero: number, nomeUrna: string, partido: string, votos: number): VotoCandidatoMunzona => ({
  ...doTurno,
  uf,
  municipio,
  zona,
  numero,
  nome: nomeUrna,
  nomeUrna,
  partido,
  votos,
});

const detalhe = (uf: string, municipio: number, zona: number, aptos: number, validos: number): DetalheMunzona => ({
  ...doTurno,
  uf,
  municipio,
  zona,
  aptos,
  votantes: validos,
  abstencoes: aptos - validos,
  validos,
  brancos: 0,
  nulos: 0,
  secoes: 0,
});

const secao = (uf: string, municipio: number, zona: number, numero: number, aptos: number, hora: string | null): DetalheSecao => ({
  geracao: "15/02/2024 15:56:11",
  ano: 2022,
  turno: 1,
  dataDaEleicao: "2022-10-02",
  cargo: 1,
  uf,
  municipio,
  zona,
  secao: numero,
  aptos,
  votantes: 0,
  nominais: 0,
  brancos: 0,
  nulos: 0,
  primeiraTotalizacao: hora && `2022-10-02 ${hora}`,
  instalada: true,
});

// Rio Branco (AC) tem duas zonas; Xapuri (AC), uma; Madri, no Exterior, um posto. Quatro seções no país,
// que chegam com 25, 50, 75 e 100% das seções. Mais um 2º turno e um outro cargo, que ficam de fora.
const candidatos = [
  voto("AC", 1392, 1, 13, "LULA", "PT", 300),
  voto("AC", 1392, 1, 22, "JAIR BOLSONARO", "PL", 350),
  voto("AC", 1392, 1, 15, "SIMONE TEBET", "MDB", 50),
  voto("AC", 1392, 9, 13, "LULA", "PT", 100),
  voto("AC", 1392, 9, 22, "JAIR BOLSONARO", "PL", 150),
  voto("AC", 1201, 1, 22, "JAIR BOLSONARO", "PL", 80),
  voto("AC", 1201, 1, 12, "CIRO GOMES", "PDT", 20),
  voto("ZZ", 30066, 1, 13, "LULA", "PT", 180),
  voto("ZZ", 30066, 1, 22, "JAIR BOLSONARO", "PL", 150),
  voto("ZZ", 30066, 1, 15, "SIMONE TEBET", "MDB", 8),
  { ...voto("AC", 1392, 1, 13, "LULA", "PT", 9999), turno: 2 },
];
const detalhes = [detalhe("AC", 1392, 1, 1000, 700), detalhe("AC", 1392, 9, 400, 250), detalhe("AC", 1201, 1, 150, 100), detalhe("ZZ", 30066, 1, 799, 338)];
const secoes = [
  secao("AC", 1392, 9, 7, 400, "17:30:00"),
  secao("AC", 1392, 1, 2, 1000, "17:10:00"),
  secao("ZZ", 30066, 1, 13, 799, "19:44:21"),
  secao("AC", 1201, 1, 5, 150, "17:20:00"),
  { ...secao("AC", 1392, 1, 2, 1000, "17:00:00"), turno: 2 },
  { ...secao("AC", 1392, 1, 2, 1000, "17:00:00"), cargo: 3 },
];

describe("baseDoModelo", () => {
  const base = baseDoModelo({ noite: { ano: 2022, turno: 2 }, turnoDaBase: { ano: 2022, turno: 1 }, finalistas: [22, 13], candidatos, detalhes, secoes });

  it("dá o 1º turno de cada município com os votos dos finalistas, os válidos, os aptos e as seções", () => {
    expect(base.finalistas.map((f) => [f.numero, f.nomeUrna])).toEqual([
      [22, "JAIR BOLSONARO"],
      [13, "LULA"],
    ]);
    expect(base.municipios.map(({ degrausDeChegada: _, ...m }) => m)).toEqual([
      { uf: "AC", municipio: 1201, aptos: 150, secoes: 1, validos: 100, votos: [80, 0] },
      { uf: "AC", municipio: 1392, aptos: 1400, secoes: 2, validos: 950, votos: [500, 400] },
      { uf: "ZZ", municipio: 30066, aptos: 799, secoes: 1, validos: 338, votos: [150, 180] },
    ]);
    expect(base).toMatchObject({ noite: { ano: 2022, turno: 2 }, turnoDaBase: { ano: 2022, turno: 1 }, secoes: 4 });
  });

  it("dá o perfil de chegada: a partir de que % das seções do país o município tinha cada número de seções totalizadas", () => {
    const chegada = Object.fromEntries(base.municipios.map((m) => [m.municipio, m.degrausDeChegada]));

    expect(chegada[1392]).toEqual([
      [25, 1],
      [75, 2],
    ]);
    expect(chegada[1201]).toEqual([[50, 1]]);
    expect(chegada[30066]).toEqual([[100, 1]]);
  });

  it("com os municípios da noite, traz zerado o que não votou no turno da base e deixa de fora o que a noite não tem", () => {
    // como a noite do 1º turno de 2026 com base em 2022: Boa Esperança do Norte (MT) é novo, e o posto de Madri não está na noite
    const daNoite = [
      { uf: "MT", municipio: 73709 },
      { uf: "AC", municipio: 1392 },
      { uf: "AC", municipio: 1201 },
    ];

    const paraOutraNoite = baseDoModelo({ noite: { ano: 2026, turno: 1 }, turnoDaBase: { ano: 2022, turno: 1 }, finalistas: [22, 13], candidatos, detalhes, secoes, municipios: daNoite });

    expect(paraOutraNoite.municipios.map((m) => [m.uf, m.municipio, m.secoes, m.votos])).toEqual([
      ["AC", 1201, 1, [80, 0]],
      ["AC", 1392, 2, [500, 400]],
      ["MT", 73709, 0, [0, 0]],
    ]);
    expect(paraOutraNoite.municipios.at(-1)).toEqual({ uf: "MT", municipio: 73709, aptos: 0, secoes: 0, validos: 0, votos: [0, 0], degrausDeChegada: [] });
  });

  it("recusa um finalista da noite que não disputou o turno da base", () => {
    expect(() => baseDoModelo({ noite: { ano: 2026, turno: 1 }, turnoDaBase: { ano: 2022, turno: 1 }, finalistas: [22, 14], candidatos, detalhes, secoes })).toThrow(/14/);
  });
});

describe("indicadoresDaBase", () => {
  it("dá o placar entre finalistas, a fatia dos eliminados, os válidos por apto e o perfil de chegada em frações", () => {
    const indicadores = indicadoresDaBase({
      uf: "AC",
      municipio: 1392,
      aptos: 1000,
      secoes: 4,
      validos: 800,
      votos: [300, 400],
      degrausDeChegada: [
        [10, 1],
        [60, 4],
      ],
    });

    expect(indicadores.placarEntreFinalistas).toEqual([3 / 7, 4 / 7]);
    expect(indicadores.fatiaDosEliminados).toBe(0.125);
    expect(indicadores.validosPorApto).toBe(0.8);
    expect(indicadores.perfilDeChegada).toEqual([...Array(10).fill(0), ...Array(50).fill(0.25), ...Array(41).fill(1)]);
  });

  it("não inventa frações num lugar sem votos válidos, como um posto do Exterior sem seção instalada", () => {
    const indicadores = indicadoresDaBase({ uf: "ZZ", municipio: 39128, aptos: 2, secoes: 1, validos: 0, votos: [0, 0], degrausDeChegada: [[100, 1]] });

    expect(indicadores).toMatchObject({ placarEntreFinalistas: null, fatiaDosEliminados: null, validosPorApto: 0 });
  });
});
