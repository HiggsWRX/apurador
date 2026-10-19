import { idDoTurno, type Turno } from "@apurador/pipeline";
import { describe, expect, it } from "vitest";
import { compararTurnos, ondeMaisMudou } from "../src/lib/comparacao";
import { lugar, TURNOS } from "../src/lib/lugares";

// A comparação de dois turnos (Telas da página de lugar, decisão 14), sobre os turnos de `dados/turnos/`. Os números
// esperados são os resultados oficiais do TSE de cada turno.
const turno = (id: string): Turno => TURNOS.find((t) => idDoTurno(t) === id)!;

describe("compararTurnos", () => {
  it("compara o PT e o partido de Bolsonaro, rotulados pelo partido, com os % do TSE nos 2º turnos", () => {
    // 2018 2T: Bolsonaro 55,13%, Haddad 44,87%. 2022 2T: Lula 50,90%, Bolsonaro 49,10%.
    const comparacao = compararTurnos(lugar("BR"), turno("2018-2"), turno("2022-2"));

    expect(comparacao.tipo).toBe("comparacao");
    expect(comparacao.tipo === "comparacao" && comparacao.lados).toEqual([
      { partido: "PSL/PL", cor: "flavio", candidatos: ["JAIR BOLSONARO", "JAIR BOLSONARO"], pct: [55.13, 49.1], mudanca: -6 },
      { partido: "PT", cor: "lula", candidatos: ["FERNANDO HADDAD", "LULA"], pct: [44.87, 50.9], mudanca: 6 },
    ]);
  });

  it("usa nos 1º turnos o placar entre finalistas, um cálculo do Apurador, com uma casa", () => {
    // 2026 1T: Flávio 51,0, Lula 49,0 entre os finalistas (GLOSSARY.md). 2018 1T: Bolsonaro 46,03%, Haddad 29,28% dos
    // válidos, 61,1 × 38,9 entre os dois. 2022 1T: Lula 48,43%, Bolsonaro 43,20%, 52,9 × 47,1.
    const lados = (um: string, outro: string) => {
      const comparacao = compararTurnos(lugar("BR"), turno(um), turno(outro));
      return comparacao.tipo === "comparacao" && comparacao.lados.map((l) => [l.partido, l.pct, l.mudanca]);
    };

    expect(lados("2022-2", "2026-1")).toEqual([
      ["PL", [49.1, 51], 1.9],
      ["PT", [50.9, 49], -1.9],
    ]);
    expect(lados("2018-1", "2022-1")).toEqual([
      ["PSL/PL", [61.1, 47.1], -14],
      ["PT", [38.9, 52.9], 14],
    ]);
  });

  it("vai sempre do turno mais antigo ao mais recente, em qualquer ordem de escolha", () => {
    const comparacao = compararTurnos(lugar("BR"), turno("2026-1"), turno("2018-2"));

    expect([comparacao.antes, comparacao.depois].map(idDoTurno)).toEqual(["2018-2", "2026-1"]);
    expect(comparacao.tipo === "comparacao" && comparacao.lados[1]).toMatchObject({ candidatos: ["FERNANDO HADDAD", "LULA"], pct: [44.87, 49] });
  });

  it("recusa um 1º turno em que o PT ou o partido de Bolsonaro não foi ao 2º turno: a conta não seria o placar entre finalistas", () => {
    const resultado = { aptos: 100, votantes: 90, abstencoes: 10, validos: 90, brancos: 0, nulos: 0, secoes: 1, votos: [40, 30, 20] };
    const semOPt: Turno = {
      ...turno("2022-1"),
      candidatos: [
        { numero: 45, nome: "A", nomeUrna: "A", partido: "PSDB" },
        { numero: 22, nome: "B", nomeUrna: "B", partido: "PL" },
        { numero: 13, nome: "C", nomeUrna: "C", partido: "PT" },
      ],
      lugares: { BR: resultado },
    };

    expect(() => compararTurnos(lugar("BR"), semOPt, turno("2022-2"))).toThrow(/placar entre finalistas/);
  });

  it("diz em que turno o lugar não votou, como Boa Esperança do Norte (MT) antes de 2026", () => {
    const comparacao = compararTurnos(lugar("73709"), turno("2026-1"), turno("2022-2"));

    expect(comparacao.tipo).toBe("sem-votacao");
    expect(comparacao.tipo === "sem-votacao" && idDoTurno(comparacao.turno)).toBe("2022-2");
  });

  it("diz em que turno nenhum dos dois partidos teve voto, como em Argel em 2018", () => {
    const comparacao = compararTurnos(lugar("29300"), turno("2018-2"), turno("2026-1"));

    expect(comparacao.tipo).toBe("sem-votos");
    expect(comparacao.tipo === "sem-votos" && idDoTurno(comparacao.turno)).toBe("2018-2");
  });
});

describe("ondeMaisMudou", () => {
  const lista = (id: string, um: string, outro: string) =>
    ondeMaisMudou(lugar(id), turno(um), turno(outro)).map((m) => [m.lugar.nome, m.ganhou?.partido, m.ganhou?.mudanca]);

  it("no Brasil, dá as 5 UFs, com o Exterior, que mais mudaram, e quem ganhou terreno em cada uma", () => {
    // O % do PT no 2º turno de 2018 e no de 2022, nos resultados oficiais: Exterior 28,98 e 51,28; SP 32,03 e 44,76;
    // RJ 32,05 e 43,47; DF 30,01 e 41,19; MG 41,81 e 50,20.
    expect(lista("BR", "2022-2", "2018-2")).toEqual([
      ["Exterior", "PT", 22.3],
      ["São Paulo", "PT", 12.7],
      ["Rio de Janeiro", "PT", 11.4],
      ["Distrito Federal", "PT", 11.2],
      ["Minas Gerais", "PT", 8.4],
    ]);
  });

  it("numa UF ou no Exterior, dá os municípios, só os com ao menos 3.000 votos nos dois partidos em cada turno", () => {
    // Novo Santo Antônio (MT) mudou mais que todos, mas teve 1.224 votos nos dois em 2026; Puerto Iguazú, 5.
    const mt = lista("MT", "2022-2", "2026-1");
    expect(mt).toHaveLength(5);
    expect(mt[0]!.slice(0, 2)).toEqual(["Peixoto de Azevedo", "PL"]);
    expect(mt.map(([nome]) => nome)).not.toContain("Novo Santo Antônio");

    expect(lista("ZZ", "2022-2", "2026-1")[0]!.slice(0, 2)).toEqual(["Porto", "PL"]);
  });

  it("não dá nada num município, nem no Distrito Federal, que tem um só", () => {
    expect(lista("71072", "2022-2", "2026-1")).toEqual([]);
    expect(lista("DF", "2022-2", "2026-1")).toEqual([]);
  });
});
