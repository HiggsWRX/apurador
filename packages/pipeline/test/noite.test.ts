import type { DetalheSecao, VotoSecao } from "@apurador/tse";
import { describe, expect, it } from "vitest";
import { divergenciasDoHistorico, divergenciasDoResultado, gravarNoite, lerNoite, reconstruirNoite, reproduzir } from "../src/noite.ts";
import type { CandidatoDoTurno } from "../src/turno.ts";

const CANDIDATOS: CandidatoDoTurno[] = [
  { numero: 13, nome: "LUIZ INÁCIO LULA DA SILVA", nomeUrna: "LULA", partido: "PT" },
  { numero: 22, nome: "JAIR MESSIAS BOLSONARO", nomeUrna: "JAIR BOLSONARO", partido: "PL" },
];

const doTurno = { geracao: "15/02/2024 15:56:11", ano: 2022, turno: 2, cargo: 1 };

/** Uma seção do detalhe, totalizada na hora dada (de 30/10/2022, ou do dia seguinte com `+1`). */
function secao(uf: string, municipio: number, zona: number, numero: number, hora: string | null, d: Partial<DetalheSecao> = {}): DetalheSecao {
  const [h, dia] = hora?.split("+") ?? [];
  return {
    ...doTurno,
    dataDaEleicao: "2022-10-30",
    uf,
    municipio,
    zona,
    secao: numero,
    aptos: 0,
    votantes: 0,
    nominais: 0,
    brancos: 0,
    nulos: 0,
    primeiraTotalizacao: h === undefined ? null : `2022-10-${dia ? 31 : 30} ${h}`,
    instalada: true,
    ...d,
  };
}

/** Os votos do boletim de uma seção: Lula, Bolsonaro, brancos, nulos e outros números nominais. */
function boletim(uf: string, municipio: number, zona: number, numero: number, v: { lula?: number; bolsonaro?: number; brancos?: number; nulos?: number; outros?: Record<number, number> }): VotoSecao[] {
  const daSecao = { ...doTurno, uf, municipio, zona, secao: numero };
  return [
    { ...daSecao, tipo: "nominal" as const, numero: 13, votos: v.lula ?? 0 },
    { ...daSecao, tipo: "nominal" as const, numero: 22, votos: v.bolsonaro ?? 0 },
    { ...daSecao, tipo: "branco" as const, numero: 95, votos: v.brancos ?? 0 },
    { ...daSecao, tipo: "nulo" as const, numero: 96, votos: v.nulos ?? 0 },
    ...Object.entries(v.outros ?? {}).map(([n, votos]) => ({ ...daSecao, tipo: "nominal" as const, numero: Number(n), votos })),
  ];
}

const s = (hh: number, mm: number, ss: number) => hh * 3600 + mm * 60 + ss;

describe("reconstruirNoite", () => {
  it("põe as seções no placar parcial pela primeira totalização, e não pela ordem do arquivo", () => {
    const noite = reconstruirNoite({
      ano: 2022,
      turno: 2,
      candidatos: CANDIDATOS,
      // a seção 2 vem antes no arquivo, mas é totalizada depois
      secoes: [secao("SP", 71072, 1, 2, "18:44:50", { aptos: 300, votantes: 200, nominais: 190, brancos: 4, nulos: 6 }), secao("SP", 71072, 1, 1, "17:00:51", { aptos: 250, votantes: 100, nominais: 100 })],
      votos: [...boletim("SP", 71072, 1, 2, { lula: 120, bolsonaro: 70, brancos: 4, nulos: 6 }), ...boletim("SP", 71072, 1, 1, { lula: 40, bolsonaro: 60 })],
    });
    const r = reproduzir(noite);

    r.avancarAte(s(18, 44, 49));
    expect(r.apurado()).toEqual({ secoes: 1, aptos: 250, votantes: 100, brancos: 0, nulos: 0, votos: [40, 60], ultimaTotalizacao: s(17, 0, 51) });

    r.avancarAte(s(18, 44, 50));
    expect(r.apurado()).toEqual({ secoes: 2, aptos: 550, votantes: 300, brancos: 4, nulos: 6, votos: [160, 130], ultimaTotalizacao: s(18, 44, 50) });
  });

  it("conta no total de seções as não instaladas, que entram no placar sem votos, e as nunca totalizadas", () => {
    const noite = reconstruirNoite({
      ano: 2022,
      turno: 2,
      candidatos: CANDIDATOS,
      secoes: [
        secao("ZZ", 30066, 1, 13, "17:00:54", { aptos: 799, votantes: 360, nominais: 338, brancos: 7, nulos: 15 }),
        secao("ZZ", 30988, 1, 1354, "18:02:59", { aptos: 1, instalada: false }),
        secao("ZZ", 30988, 1, 1355, null, { aptos: 2, instalada: false }),
      ],
      votos: boletim("ZZ", 30066, 1, 13, { lula: 180, bolsonaro: 158, brancos: 7, nulos: 15 }),
    });
    const r = reproduzir(noite);

    r.avancarAte(s(23, 59, 59));

    expect(r.total({ uf: "ZZ" })).toEqual({ secoes: 3, aptos: 802 });
    expect(r.apurado({ uf: "ZZ" })).toMatchObject({ secoes: 2, aptos: 800, votantes: 360, votos: [180, 158], ultimaTotalizacao: s(18, 2, 59) });
  });

  it("dá o estado de cada zona e soma as zonas no município, na UF e no Brasil", () => {
    const noite = reconstruirNoite({
      ano: 2022,
      turno: 2,
      candidatos: CANDIDATOS,
      secoes: [
        secao("RJ", 60011, 14, 428, "18:36:47", { aptos: 338, votantes: 236, nominais: 221, brancos: 6, nulos: 9 }),
        secao("RJ", 60011, 14, 429, "18:36:47", { aptos: 300, votantes: 10, nominais: 10 }),
        secao("RJ", 60011, 10, 274, "18:42:20", { aptos: 417, votantes: 334, nominais: 319, brancos: 4, nulos: 11 }),
        secao("RJ", 58190, 30, 1, "00:01:02+1", { aptos: 100, votantes: 50, nominais: 50 }),
      ],
      votos: [
        ...boletim("RJ", 60011, 14, 428, { lula: 100, bolsonaro: 121, brancos: 6, nulos: 9 }),
        ...boletim("RJ", 60011, 14, 429, { lula: 4, bolsonaro: 6 }),
        ...boletim("RJ", 60011, 10, 274, { lula: 200, bolsonaro: 119, brancos: 4, nulos: 11 }),
        ...boletim("RJ", 58190, 30, 1, { lula: 30, bolsonaro: 20 }),
      ],
    });
    const r = reproduzir(noite);

    // as duas seções da zona 14 chegam no mesmo segundo: uma chegada só
    expect(noite.chegadas.map((c) => [c.instante, noite.zonas[c.zona]!.zona, c.secoes])).toEqual([
      [s(18, 36, 47), 14, 2],
      [s(18, 42, 20), 10, 1],
      [s(24, 1, 2), 30, 1],
    ]);

    r.avancarAte(s(18, 40, 0));
    expect(r.apurado({ uf: "RJ", municipio: 60011, zona: 14 })).toMatchObject({ secoes: 2, votos: [104, 127] });
    expect(r.apurado({ uf: "RJ", municipio: 60011, zona: 10 })).toMatchObject({ secoes: 0, votos: [0, 0], ultimaTotalizacao: null });

    r.avancarAte(s(24, 1, 2));
    expect(r.apurado({ uf: "RJ", municipio: 60011 })).toMatchObject({ secoes: 3, aptos: 1055, votos: [304, 246], ultimaTotalizacao: s(18, 42, 20) });
    expect(r.apurado({ uf: "RJ" })).toMatchObject({ secoes: 4, votos: [334, 266], ultimaTotalizacao: s(24, 1, 2) });
    expect(r.total({ uf: "RJ", municipio: 60011 })).toEqual({ secoes: 3, aptos: 1055 });
    expect(r.apurado()).toEqual(r.apurado({ uf: "RJ" }));
  });

  it("recusa um recorte que não existe na noite, como uma UF sem seções ou uma zona sem o município", () => {
    const noite = reconstruirNoite({
      ano: 2022,
      turno: 2,
      candidatos: CANDIDATOS,
      secoes: [secao("RJ", 14, 14, 1, "18:36:47", { aptos: 10, votantes: 1, nominais: 1 })],
      votos: boletim("RJ", 14, 14, 1, { lula: 1 }),
    });
    const r = reproduzir(noite);

    expect(r.total({ uf: "RJ", municipio: 14 })).toEqual({ secoes: 1, aptos: 10 });
    expect(() => r.apurado({ uf: "RJ", zona: 14 })).toThrow(/RJ\/\/14/);
    expect(() => r.total({ uf: "SP" })).toThrow(/SP/);
  });

  it("conta como nulos os votos nominais em quem não é candidato válido do turno (os nulos técnicos)", () => {
    const noite = reconstruirNoite({
      ano: 2022,
      turno: 2,
      candidatos: CANDIDATOS,
      secoes: [secao("AC", 1392, 1, 3, "17:34:43", { aptos: 185, votantes: 147, nominais: 140, brancos: 3, nulos: 4 })],
      votos: boletim("AC", 1392, 1, 3, { lula: 48, bolsonaro: 90, brancos: 3, nulos: 4, outros: { 28: 2 } }),
    });
    const r = reproduzir(noite);

    r.avancarAte(s(18, 0, 0));

    expect(r.apurado()).toMatchObject({ votantes: 147, brancos: 3, nulos: 6, votos: [48, 90] });
  });

  it("recusa um boletim cujos votos não somam os votantes da seção no detalhe", () => {
    const entrada = {
      ano: 2022,
      turno: 2,
      candidatos: CANDIDATOS,
      secoes: [secao("AC", 1392, 1, 3, "17:34:43", { aptos: 185, votantes: 147 })],
      votos: boletim("AC", 1392, 1, 3, { lula: 48, bolsonaro: 90, brancos: 3, nulos: 4 }),
    };

    expect(() => reconstruirNoite(entrada)).toThrow(/AC\/1392\/1\/3.*145.*147/);
  });

  it("recusa votos de uma seção que não está no detalhe, e uma seção com votantes sem boletim", () => {
    const base = { ano: 2022, turno: 2, candidatos: CANDIDATOS };
    const comVotantes = secao("AC", 1392, 1, 3, "17:34:43", { aptos: 185, votantes: 10 });

    expect(() => reconstruirNoite({ ...base, secoes: [comVotantes], votos: [...boletim("AC", 1392, 1, 3, { lula: 10 }), ...boletim("AC", 1392, 1, 4, { lula: 1 })] })).toThrow(/AC\/1392\/1\/4/);
    expect(() => reconstruirNoite({ ...base, secoes: [comVotantes], votos: [] })).toThrow(/AC\/1392\/1\/3/);
  });
});

describe("conferências da noite contra o TSE", () => {
  const noite = reconstruirNoite({
    ano: 2022,
    turno: 2,
    candidatos: CANDIDATOS,
    secoes: [
      secao("AC", 1392, 1, 3, "17:00:51", { aptos: 185, votantes: 147, nominais: 140, brancos: 3, nulos: 4 }),
      secao("AC", 1392, 2, 9, "17:00:51", { aptos: 100, votantes: 10, nominais: 10 }),
      secao("AC", 1392, 2, 10, "00:18:04+1", { aptos: 50, votantes: 20, nominais: 20 }),
    ],
    votos: [
      ...boletim("AC", 1392, 1, 3, { lula: 48, bolsonaro: 92, brancos: 3, nulos: 4 }),
      ...boletim("AC", 1392, 2, 9, { lula: 6, bolsonaro: 4 }),
      ...boletim("AC", 1392, 2, 10, { lula: 15, bolsonaro: 5 }),
    ],
  });
  const linha = (totalizacao: string, secoes: number, aptos: number, lula: number, bolsonaro: number, brancos: number, nulos: number) => ({
    totalizacao,
    secoes,
    totalDeSecoes: 3,
    aptos,
    votos: lula + bolsonaro + brancos + nulos,
    validos: lula + bolsonaro,
    brancos,
    nulos,
    candidatos: { LULA: lula, "JAIR BOLSONARO": bolsonaro },
  });
  const historico = [linha("2022-10-30 17:00:51", 2, 285, 54, 96, 3, 4), linha("2022-10-31 00:18:04", 3, 335, 69, 101, 3, 4)];

  it("a noite repete o histórico oficial de totalização, instante a instante", () => {
    expect(divergenciasDoHistorico(noite, historico)).toEqual([]);
  });

  it("aponta o instante e o número que diferem do histórico oficial, e os instantes que faltam", () => {
    const outro = [linha("2022-10-30 17:00:51", 2, 285, 54, 95, 3, 4), linha("2022-10-30 17:00:52", 2, 285, 54, 96, 3, 4)];

    expect(divergenciasDoHistorico(noite, outro)).toEqual([
      "2022-10-30 17:00:51: votos tem 157 na noite e 156 no histórico",
      "2022-10-30 17:00:51: válidos tem 150 na noite e 149 no histórico",
      "2022-10-30 17:00:51: JAIR BOLSONARO tem 96 na noite e 95 no histórico",
      "a noite tem uma chegada às 2022-10-31 00:18:04, que não está no histórico",
      "o histórico tem uma totalização às 2022-10-30 17:00:52, sem chegada na noite",
    ]);
  });

  it("o fim da noite bate com o resultado oficial de cada zona, e aponta a zona que não bate", () => {
    const doTurno = { geracao: "", ano: 2022, turno: 2, cargo: 1, uf: "AC", municipio: 1392, nomeMunicipio: "RIO BRANCO" };
    const votos = (zona: number, lula: number, bolsonaro: number) => [
      { ...doTurno, zona, numero: 13, nome: "", nomeUrna: "LULA", partido: "PT", votos: lula },
      { ...doTurno, zona, numero: 22, nome: "", nomeUrna: "JAIR BOLSONARO", partido: "PL", votos: bolsonaro },
    ];
    const detalhe = (zona: number, aptos: number, votantes: number, validos: number, brancos: number, nulos: number) => ({ ...doTurno, zona, aptos, votantes, abstencoes: aptos - votantes, validos, brancos, nulos, secoes: 0 });
    const oficial = { candidatos: [...votos(1, 48, 92), ...votos(2, 21, 9)], detalhes: [detalhe(1, 185, 147, 140, 3, 4), detalhe(2, 150, 30, 30, 0, 0)] };

    expect(divergenciasDoResultado(noite, oficial)).toEqual([]);
    expect(divergenciasDoResultado(noite, { ...oficial, detalhes: [detalhe(1, 185, 147, 140, 3, 4), detalhe(2, 150, 31, 30, 0, 1), detalhe(3, 10, 0, 0, 0, 0)] })).toEqual([
      "AC/1392/2: votantes 30 na noite e 31 no resultado oficial",
      "AC/1392/2: nulos 0 na noite e 1 no resultado oficial",
      "AC/1392/3: está no resultado oficial e não na noite",
    ]);
  });
});

describe("gravarNoite e lerNoite", () => {
  it("a sequência gravada reproduz a mesma noite", () => {
    const noite = reconstruirNoite({
      ano: 2022,
      turno: 2,
      candidatos: CANDIDATOS,
      secoes: [
        secao("SP", 71072, 1, 1, "17:00:51", { aptos: 250, votantes: 100, nominais: 100 }),
        secao("SP", 71072, 2, 1, "17:00:51", { aptos: 120, votantes: 90, nominais: 88, nulos: 2 }),
        secao("ZZ", 30066, 1, 13, "00:18:04+1", { aptos: 799, votantes: 360, nominais: 338, brancos: 7, nulos: 15 }),
        secao("ZZ", 30988, 1, 1354, null, { aptos: 1, instalada: false }),
      ],
      votos: [
        ...boletim("SP", 71072, 1, 1, { lula: 40, bolsonaro: 60 }),
        ...boletim("SP", 71072, 2, 1, { lula: 80, bolsonaro: 8, nulos: 2 }),
        ...boletim("ZZ", 30066, 1, 13, { lula: 180, bolsonaro: 158, brancos: 7, nulos: 15 }),
      ],
    });

    const lida = lerNoite(gravarNoite(noite));

    expect(lida).toEqual(noite);
  });
});
