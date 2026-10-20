import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { curvasDoTurno, lerCurvas, type CurvaDeComparacao } from "../src/curvas.ts";
import type { Chegada, Noite } from "../src/noite.ts";
import type { Turno } from "../src/turno.ts";

// As curvas de comparação: a curva real de cada turno passado em cada lugar, com a fatia do PT entre o PT e o
// partido de Bolsonaro. Primeiro, numa noite pequena feita à mão; depois, nas que estão no repositório, contra o
// resultado oficial (`dados/turnos/`, que vem do munzona, não da noite) e o histórico oficial de totalização de 2022.

const CANDIDATOS: Noite["candidatos"] = [
  { numero: 17, nome: "JAIR MESSIAS BOLSONARO", nomeUrna: "JAIR BOLSONARO", partido: "PSL" },
  { numero: 13, nome: "FERNANDO HADDAD", nomeUrna: "FERNANDO HADDAD", partido: "PT" },
  { numero: 12, nome: "CIRO FERREIRA GOMES", nomeUrna: "CIRO GOMES", partido: "PDT" },
];

/** Uma chegada de seções numa zona, com os votos de Bolsonaro, Haddad e Ciro. */
const chegada = (instante: number, zona: number, secoes: number, votos: number[], brancos = 0): Chegada => ({
  instante,
  zona,
  secoes,
  aptos: 0,
  votantes: brancos + votos.reduce((s, v) => s + v, 0),
  brancos,
  nulos: 0,
  votos,
});

const noite = (zonas: Noite["zonas"], chegadas: Chegada[], candidatos = CANDIDATOS): Noite => ({
  ano: 2018,
  turno: 1,
  cargo: "Presidente",
  dia: "2018-10-07",
  geracao: [],
  candidatos,
  zonas,
  chegadas,
});

const pontos = (c: CurvaDeComparacao | undefined) => c?.secoes.map((s, i) => [s, c.pt[i]]);

describe("curvasDoTurno", () => {
  it("dá a curva do Brasil, da UF, do Exterior e de cada município, com a fatia do PT depois de cada instante", () => {
    const curvas = curvasDoTurno(
      noite(
        [
          { uf: "SP", municipio: 71072, zona: 1, secoes: 3, aptos: 0 },
          { uf: "ZZ", municipio: 29297, zona: 1, secoes: 1, aptos: 0 },
          { uf: "ZZ", municipio: 29300, zona: 1, secoes: 1, aptos: 0 },
        ],
        [
          chegada(100, 0, 1, [10, 30, 5]),
          // Duas zonas no mesmo segundo: o Brasil ganha um ponto só, depois das duas.
          chegada(200, 0, 1, [20, 0, 0]),
          chegada(200, 1, 1, [3, 1, 0]),
          chegada(300, 0, 1, [0, 0, 9]),
          // Uma cidade do Exterior sem voto nos dois partidos não tem curva.
          chegada(300, 2, 1, [0, 0, 0], 2),
        ],
      ),
    );

    expect(curvas.partidos).toEqual(["PSL", "PT"]);
    expect(Object.keys(curvas.lugares).sort()).toEqual(["29297", "71072", "BR", "SP", "ZZ"]);
    // No Brasil: 30 de 40, depois 31 de 64 (48,4375).
    expect(pontos(curvas.lugares.BR)).toEqual([
      [20, 75],
      [60, 48.4],
      [100, 48.4],
    ]);
    expect(pontos(curvas.lugares.SP)).toEqual([
      [33.3, 75],
      [66.7, 50],
      [100, 50],
    ]);
    expect(curvas.lugares["71072"]).toEqual(curvas.lugares.SP);
    expect(pontos(curvas.lugares.ZZ)).toEqual([
      [50, 25],
      [100, 25],
    ]);
    expect(pontos(curvas.lugares["29297"])).toEqual([[100, 25]]);
  });

  it("guarda um ponto por % inteiro de seções que o lugar alcança, e sempre o último estado", () => {
    // 200 seções, uma por instante: 0,5%, 1%, 1,5%, 2% e 2,5%, e as outras nunca chegam.
    const curvas = curvasDoTurno(
      noite(
        [{ uf: "AC", municipio: 1392, zona: 1, secoes: 200, aptos: 0 }],
        [chegada(1, 0, 1, [1, 1, 0]), chegada(2, 0, 1, [0, 2, 0]), chegada(3, 0, 1, [2, 0, 0]), chegada(4, 0, 1, [0, 2, 0]), chegada(5, 0, 1, [3, 0, 0])],
      ),
    );

    // O 1,5% fica de fora; 5 de 11 é 45,45.
    expect(pontos(curvas.lugares["01392"])).toEqual([
      [0.5, 50],
      [1, 75],
      [2, 62.5],
      [2.5, 45.5],
    ]);
  });

  it("recusa um 1º turno em que o PT ou o partido de Bolsonaro não foi ao 2º turno: a fatia não seria o placar entre finalistas", () => {
    const [bolsonaro, haddad, ciro] = CANDIDATOS as [Noite["candidatos"][number], Noite["candidatos"][number], Noite["candidatos"][number]];
    const zonas = [{ uf: "AC", municipio: 1392, zona: 1, secoes: 1, aptos: 0 }];

    expect(() => curvasDoTurno(noite(zonas, [], [bolsonaro, ciro, haddad]))).toThrow(/PT/);
  });
});

describe("as curvas dos turnos passados no repositório", () => {
  const DADOS = new URL("../../../dados/", import.meta.url);
  const TURNOS = ["2018-1", "2018-2", "2022-1", "2022-2", "2026-1"];
  const curvas = (turno: string) => lerCurvas(readFileSync(new URL(`curvas/${turno}.json`, DADOS), "utf8"));
  const oficial = (turno: string) => JSON.parse(readFileSync(new URL(`turnos/${turno}.json`, DADOS), "utf8")) as Turno;

  it.each(TURNOS)("%s: todo lugar que votou no PT ou no partido de Bolsonaro tem curva, e ela termina no resultado oficial", (turno) => {
    const t = oficial(turno);
    const pt = t.candidatos.findIndex((c) => c.partido === "PT");
    const bolsonaro = t.candidatos.findIndex((c) => ["PSL", "PL"].includes(c.partido));
    const { lugares } = curvas(turno);
    const fimOficial = new Map(
      Object.entries(t.lugares).flatMap(([id, l]) => {
        const dois = l.votos[pt]! + l.votos[bolsonaro]!;
        return dois > 0 ? [[id, Math.round((1000 * l.votos[pt]!) / dois) / 10] as const] : [];
      }),
    );
    const diferem = [...new Set([...fimOficial.keys(), ...Object.keys(lugares)])].filter((id) => fimOficial.get(id) !== lugares[id]?.pt.at(-1));

    expect(diferem.map((id) => `${id}: ${lugares[id]?.pt.at(-1)} na curva e ${fimOficial.get(id)} no oficial`)).toEqual([]);
    expect(fimOficial.size).toBeGreaterThan(5700);
  });

  it("no Brasil, terminam com o PT em 38,9% (2018 1T), 44,9% (2018 2T), 52,9% (2022 1T), 50,9% (2022 2T) e 49,0% (2026 1T)", () => {
    // Haddad 31.342.051 × Bolsonaro 49.277.010; Haddad 44,87%; Lula 52,9 × Bolsonaro 47,1; Lula 50,90%; Lula 49,0 × Flávio 51,0.
    expect(TURNOS.map((t) => pontos(curvas(t).lugares.BR)!.at(-1))).toEqual([
      [100, 38.9],
      [100, 44.9],
      [100, 52.9],
      [100, 50.9],
      [100, 49],
    ]);
  });

  it("em São Paulo, Minas Gerais e na Bahia, terminam com Lula em 44,76%, 50,20% e 72,12% no 2º turno de 2022", () => {
    const { lugares } = curvas("2022-2");

    expect(["SP", "MG", "BA"].map((uf) => lugares[uf]!.pt.at(-1))).toEqual([44.8, 50.2, 72.1]);
  });

  it.each([
    // O 1º instante em que o histórico oficial de totalização passa de cada marco, com o % de seções e o PT entre os dois.
    { turno: "2022-1", marcos: [[1, 46.1], [50.1, 49.1], [90, 51.5], [99, 52.6]] },
    { turno: "2022-2", marcos: [[1, 43.7], [50, 49.7], [99, 50.8]] },
  ])("no Brasil, a de $turno passa pelos pontos do histórico oficial nos marcos do % de seções", ({ turno, marcos }) => {
    expect(pontos(curvas(turno).lugares.BR)).toEqual(expect.arrayContaining(marcos));
  });

  it("os partidos de cada turno são o de Bolsonaro e o PT", () => {
    expect(TURNOS.map((t) => curvas(t).partidos)).toEqual([["PSL", "PT"], ["PSL", "PT"], ["PL", "PT"], ["PL", "PT"], ["PL", "PT"]]);
  });
});
