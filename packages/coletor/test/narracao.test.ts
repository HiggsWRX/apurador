import { readFileSync } from "node:fs";
import type { SinalDeVirada } from "@apurador/modelo";
import type { Lugar } from "@apurador/pipeline";
import { lerResultado, type ResultadoDoTse } from "@apurador/tse";
import { describe, expect, it } from "vitest";
import type { BaseDaProjecao, NumerosDaProjecao } from "../src/arquivos.ts";
import { criarNarracao, type RodadaDaNarracao } from "../src/narracao.ts";

// A narração factual (Narração da noite, decisões 1 a 3, 7, 8, 10 e 11), pela interface que o coletor usa: os
// resultados novos de cada rodada entram, a narração de cada lugar sai, pronta. Os números são os dos modelos de texto
// da decisão 8, com os candidatos de 2026; o replay de 2022 confere a noite inteira.

const LUGARES: Lugar[] = [
  { id: "BR", tipo: "brasil", nome: "Brasil", aptos: 0 },
  { id: "SP", tipo: "uf", nome: "São Paulo", uf: "SP", artigo: "", aptos: 0 },
  { id: "BA", tipo: "uf", nome: "Bahia", uf: "BA", artigo: "a", aptos: 0 },
  { id: "DF", tipo: "uf", nome: "Distrito Federal", uf: "DF", artigo: "o", aptos: 0 },
  { id: "ZZ", tipo: "exterior", nome: "Exterior", uf: "ZZ", aptos: 0 },
  { id: "38490", tipo: "municipio", nome: "Salvador", uf: "BA", aptos: 0 },
  { id: "29955", tipo: "municipio", nome: "Lisboa", uf: "ZZ", aptos: 0 },
];

interface Parte {
  /** `AAAA-MM-DD HH:MM:SS`, em Brasília, ou `null` num lugar ainda sem seção, como o TSE o escreve. */
  quando: string | null;
  secoes: [totalizadas: number, total: number, percentual: number];
  /** Flávio e Lula: votos e % dos válidos, como o TSE os escreve. */
  flavio?: [number, number];
  lula?: [number, number];
  final?: boolean;
  indicacao?: boolean;
}

/** Um resultado do TSE com o que a narração lê. */
function resultado(id: string, parte: Parte): ResultadoDoTse {
  const [totalizadas, total, percentual] = parte.secoes;
  const [vf, pf] = parte.flavio ?? [0, 0];
  const [vl, pl] = parte.lula ?? [0, 0];
  const tipo = id === "BR" ? "br" : id.length === 2 ? "uf" : "mu";
  return {
    eleicao: "6258",
    abrangencia: { tipo, codigo: id.toLowerCase() },
    ultimaTotalizacao: parte.quando,
    totalizacaoFinal: parte.final ?? false,
    indicacao: parte.indicacao ?? false,
    secoes: { totalizadas, total, percentual },
    eleitorado: { total: 0, totalizado: 0, comparecimento: 0 },
    votos: { validos: vf + vl, brancos: 0, nulos: 0 },
    // Na ordem do arquivo do TSE, que não é a do site.
    candidatos: [
      { numero: 13, sequencial: "280002542548", nomeUrna: "LULA", partido: "PT", votos: vl, percentual: pl },
      { numero: 22, sequencial: "280002551544", nomeUrna: "FLAVIO BOLSONARO", partido: "PL", votos: vf, percentual: pf },
    ],
  };
}

const rodada = (...novos: [string, Parte][]) => new Map(novos.map(([id, parte]) => [id, resultado(id, parte)]));
const textos = (eventos: { quando: string; texto: string }[]) => eventos.map((e) => `${e.quando.slice(11, 16)} · ${e.texto}`);

describe("o começo", () => {
  it('no Brasil, é "Começa a divulgação" com a primeira seção totalizada', () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 16:59:58", secoes: [0, 472027, 0] }]));
    expect(narracao.doLugar("BR")).toEqual([]);

    narracao.narrar(rodada(["BR", { quando: "2022-10-30 17:00:51", secoes: [94, 472027, 0.02], flavio: [21000, 51.2], lula: [20016, 48.8] }]));
    expect(textos(narracao.doLugar("BR"))).toEqual(["17:00 · Começa a divulgação: 0,02% das seções totalizadas no Brasil."]);
  });
});

describe("os marcos", () => {
  it("no Brasil, dizem o % observado, o placar em ordem alfabética e as duas regiões com a maior fatia das seções que faltam", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 18:20:00", secoes: [212412, 472027, 45.0], flavio: [50_000_000, 50.9], lula: [48_200_000, 49.1] }]));
    // Das seções que faltam, 51 em São Paulo (Sudeste), 30 na Bahia (Nordeste) e 19 no Distrito Federal (Centro-Oeste).
    narracao.narrar(
      rodada(
        ["SP", { quando: "2022-10-30 18:26:40", secoes: [949, 1000, 94.9], flavio: [100, 50], lula: [100, 50] }],
        ["BA", { quando: "2022-10-30 18:26:30", secoes: [970, 1000, 97.0], flavio: [100, 50], lula: [100, 50] }],
        ["DF", { quando: "2022-10-30 18:26:10", secoes: [981, 1000, 98.1], flavio: [100, 50], lula: [100, 50] }],
        ["BR", { quando: "2022-10-30 18:26:53", secoes: [237618, 472027, 50.34], flavio: [57_873_281, 50.43], lula: [56_885_102, 49.57] }],
      ),
    );

    expect(textos(narracao.doLugar("BR")).at(0)).toBe(
      "18:26 · Passa de 50% das seções totalizadas no Brasil: 50,34%. Flávio 50,43%, Lula 49,57%. Das seções que faltam, 51% são do Sudeste e 30% do Nordeste.",
    );
  });

  it('nas UFs, nomeiam o estado com "estado"; quando vários caem na mesma rodada, sai só o mais alto', () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(["SP", { quando: "2022-10-30 18:00:00", secoes: [8086, 101073, 8.0], flavio: [1_200_000, 56.1], lula: [939_000, 43.9] }]));
    narracao.narrar(rodada(["SP", { quando: "2022-10-30 18:38:10", secoes: [50658, 101073, 50.12], flavio: [7_000_000, 55.4], lula: [5_635_379, 44.6] }]));

    expect(textos(narracao.doLugar("SP"))).toEqual([
      "18:38 · Passa de 50% das seções totalizadas no estado de São Paulo: 50,12%. Flávio 55,40%, Lula 44,60%.",
      "18:00 · Começa a totalização: 8,00% das seções totalizadas no estado de São Paulo.",
    ]);
  });

  it('nos municípios, são só os 50%, e um município totalizado de uma vez ganha só "terminou"', () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(["38490", { quando: "2022-10-30 18:10:00", secoes: [1100, 4370, 25.17], flavio: [80_000, 28.1], lula: [204_700, 71.9] }]));
    narracao.narrar(rodada(["38490", { quando: "2022-10-30 18:40:00", secoes: [3900, 4370, 89.24], flavio: [270_000, 27.9], lula: [697_700, 72.1] }]));
    narracao.narrar(rodada(["29955", { quando: "2022-10-30 17:01:00", secoes: [52, 52, 100], flavio: [9_000, 40.07], lula: [13_461, 59.93] }]));

    expect(textos(narracao.doLugar("38490"))).toEqual([
      "18:40 · Passa de 50% das seções totalizadas em Salvador (BA): 89,24%. Flávio 27,90%, Lula 72,10%.",
      "18:10 · Começa a totalização: 25,17% das seções totalizadas em Salvador (BA).",
    ]);
    expect(textos(narracao.doLugar("29955"))).toEqual(["17:01 · Lisboa (Exterior) terminou a totalização. Flávio 40,07%, Lula 59,93%."]);
  });
});

describe("o fim", () => {
  it('fora do Brasil, é "terminou a totalização", com o estado, o Distrito Federal, o Exterior e o município pelo nome sem ambiguidade', () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(
      rodada(
        ["SP", { quando: "2022-10-30 21:03:00", secoes: [101073, 101073, 100], flavio: [14_000_000, 55.12], lula: [11_399_000, 44.88] }],
        ["DF", { quando: "2022-10-30 19:59:37", secoes: [6748, 6748, 100], flavio: [1_041_000, 58.81], lula: [729_000, 41.19] }],
        ["ZZ", { quando: "2022-10-30 22:31:49", secoes: [1064, 1064, 100], flavio: [130_000, 48.72], lula: [136_800, 51.28] }],
        ["38490", { quando: "2022-10-30 19:27:00", secoes: [4370, 4370, 100], flavio: [300_000, 27.88], lula: [776_000, 72.12] }],
      ),
    );

    expect(textos(narracao.doLugar("SP"))).toEqual(["21:03 · O estado de São Paulo terminou a totalização. Flávio 55,12%, Lula 44,88%."]);
    expect(textos(narracao.doLugar("DF"))).toEqual(["19:59 · O Distrito Federal terminou a totalização. Flávio 58,81%, Lula 41,19%."]);
    expect(textos(narracao.doLugar("ZZ"))).toEqual(["22:31 · O Exterior terminou a totalização. Flávio 48,72%, Lula 51,28%."]);
    expect(textos(narracao.doLugar("38490"))).toEqual(["19:27 · Salvador (BA) terminou a totalização. Flávio 27,88%, Lula 72,12%."]);
  });

  it("no Brasil, é a totalização final, com o eleito e o % dos votos válidos", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 20:00:46", secoes: [467354, 472027, 99.01], flavio: [57_400_000, 49.16], lula: [59_370_000, 50.84] }]));
    narracao.narrar(
      rodada(["BR", { quando: "2026-10-26 00:18:04", secoes: [472027, 472027, 100], flavio: [58_206_354, 49.1], lula: [60_345_999, 50.9], final: true }]),
    );

    expect(textos(narracao.doLugar("BR")).at(0)).toBe("00:18 · Totalização final: Lula eleito com 50,90% dos votos válidos.");
  });
});

describe("a virada", () => {
  /** O Brasil num instante, com quem lidera pelos votos e o % de Lula (medição de 2022, seção 2). */
  const brasil = (
    quando: string,
    secoes: number,
    lider: "flavio" | "lula" | "empate",
    lula = lider === "lula" ? 50.01 : lider === "flavio" ? 49.99 : 50,
  ): [string, Parte] => {
    const total = 472027;
    const [vf, vl] = lider === "lula" ? [60_000_000, 60_001_000] : lider === "flavio" ? [60_001_000, 60_000_000] : [60_000_000, 60_000_000];
    return [
      "BR",
      {
        quando: `2022-10-30 ${quando}`,
        secoes: [Math.round((secoes * total) / 100), total, secoes],
        flavio: [vf, Number((100 - lula).toFixed(2))],
        lula: [vl, lula],
      },
    ];
  };
  const viradas = (narracao: ReturnType<typeof criarNarracao>) => textos(narracao.doLugar("BR").filter((e) => e.tipo === "virada"));

  it("só conta depois de 3% das seções do lugar, e a primeira troca publica o evento na hora", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(brasil("17:07:00", 0.2, "lula", 51.21)));
    // A troca de 0,26% de 2022: o placar ainda pula demais.
    narracao.narrar(rodada(brasil("17:08:00", 0.26, "flavio", 48.83)));
    narracao.narrar(rodada(brasil("18:43:00", 67.0, "flavio", 49.99)));
    expect(viradas(narracao)).toEqual([]);

    narracao.narrar(rodada(brasil("18:44:00", 67.74, "lula", 50.01)));
    expect(viradas(narracao)).toEqual(["18:44 · Virada no Brasil: Lula passa à frente no placar parcial, com 67,74% das seções totalizadas."]);
  });

  it("as trocas seguintes, dentro de 10 minutos, atualizam o mesmo evento, que fica na hora e no ponto da primeira", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(brasil("18:40:00", 65.0, "flavio")));
    // A série exata de 2022, ao segundo: cinco trocas entre 18:42:53 e 18:44:50.
    narracao.narrar(rodada(brasil("18:42:53", 66.78, "lula", 50.01)));
    const primeira = narracao.doLugar("BR").find((e) => e.tipo === "virada")!;
    narracao.narrar(rodada(brasil("18:42:58", 66.85, "flavio", 49.99)));
    narracao.narrar(rodada(brasil("18:43:50", 67.59, "lula", 50.01)));
    narracao.narrar(rodada(brasil("18:44:48", 68.32, "flavio", 50.0)));
    narracao.narrar(rodada(brasil("18:44:50", 68.32, "lula", 50.0)));

    expect(viradas(narracao)).toEqual([
      "18:42 · Virada no Brasil: a liderança trocou 5 vezes entre 18:42 e 18:44; Lula à frente no placar parcial, com 68,32% das seções totalizadas.",
    ]);
    const virada = narracao.doLugar("BR").find((e) => e.tipo === "virada")!;
    expect({ quando: virada.quando, numero: virada.numero, ponto: virada.ponto, trocas: virada.trocas }).toEqual({
      quando: primeira.quando,
      numero: primeira.numero,
      ponto: [66.78, 49.99, 50.01],
      trocas: 5,
    });
  });

  it("um empate não troca o líder, e uma troca depois de 10 minutos é outra virada", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(brasil("18:40:00", 65.0, "flavio")));
    narracao.narrar(rodada(brasil("18:41:00", 65.5, "empate")));
    narracao.narrar(rodada(brasil("18:42:00", 66.0, "flavio")));
    expect(viradas(narracao)).toEqual([]);

    narracao.narrar(rodada(brasil("18:44:00", 67.74, "lula")));
    narracao.narrar(rodada(brasil("18:54:00", 75.0, "flavio")));
    expect(viradas(narracao)).toEqual([
      "18:54 · Virada no Brasil: Flávio passa à frente no placar parcial, com 75,00% das seções totalizadas.",
      "18:44 · Virada no Brasil: Lula passa à frente no placar parcial, com 67,74% das seções totalizadas.",
    ]);
  });

  it("nas UFs e nos municípios, nomeia o lugar como os outros eventos", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(["SP", { quando: "2022-10-30 18:00:00", secoes: [10000, 101073, 9.89], flavio: [1000, 50.05], lula: [999, 49.95] }]));
    narracao.narrar(rodada(["SP", { quando: "2022-10-30 18:01:00", secoes: [10500, 101073, 10.39], flavio: [1000, 49.95], lula: [1002, 50.05] }]));
    narracao.narrar(rodada(["38490", { quando: "2022-10-30 18:00:00", secoes: [1000, 4370, 22.88], flavio: [1000, 50.05], lula: [999, 49.95] }]));
    narracao.narrar(rodada(["38490", { quando: "2022-10-30 18:01:00", secoes: [1100, 4370, 25.17], flavio: [1000, 49.95], lula: [1002, 50.05] }]));

    expect(textos(narracao.doLugar("SP").filter((e) => e.tipo === "virada"))).toEqual([
      "18:01 · Virada no estado de São Paulo: Lula passa à frente no placar parcial, com 10,39% das seções totalizadas.",
    ]);
    expect(textos(narracao.doLugar("38490").filter((e) => e.tipo === "virada"))).toEqual([
      "18:01 · Virada em Salvador (BA): Lula passa à frente no placar parcial, com 25,17% das seções totalizadas.",
    ]);
  });
});

describe("depois da totalização final", () => {
  it("a narração fica como registro: nada do que chegar com hora depois dela entra", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(
      rodada(["BR", { quando: "2026-10-26 00:18:04", secoes: [472027, 472027, 100], flavio: [58_206_354, 49.1], lula: [60_345_999, 50.9], final: true }]),
    );
    const mudaram = narracao.narrar(
      rodada(["SP", { quando: "2026-10-26 00:20:00", secoes: [101073, 101073, 100], flavio: [14_000_000, 55.24], lula: [11_320_000, 44.76] }]),
    );

    expect(mudaram).toEqual(new Set());
    expect(narracao.doLugar("SP")).toEqual([]);
  });
});

describe("um arquivo mais velho que o último visto", () => {
  it("não narra nada: uma cópia velha da CDN não volta o líder nem os marcos", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(["SP", { quando: "2022-10-30 18:00:00", secoes: [10000, 101073, 9.89], flavio: [1000, 50.05], lula: [999, 49.95] }]));
    narracao.narrar(rodada(["SP", { quando: "2022-10-30 18:01:00", secoes: [10500, 101073, 10.39], flavio: [1000, 49.95], lula: [1002, 50.05] }]));
    const mudaram = narracao.narrar(
      rodada(["SP", { quando: "2022-10-30 18:00:00", secoes: [10000, 101073, 9.89], flavio: [1000, 50.05], lula: [999, 49.95] }]),
    );
    narracao.narrar(rodada(["SP", { quando: "2022-10-30 18:02:00", secoes: [10600, 101073, 10.49], flavio: [1000, 49.95], lula: [1003, 50.05] }]));

    expect(mudaram).toEqual(new Set());
    expect(narracao.doLugar("SP").filter((e) => e.tipo === "virada")).toHaveLength(1);
  });

  it("de uma UF, não entra na conta de onde faltam seções", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(
      rodada(
        ["SP", { quando: "2022-10-30 18:26:40", secoes: [949, 1000, 94.9], flavio: [100, 50], lula: [100, 50] }],
        ["BA", { quando: "2022-10-30 18:26:30", secoes: [970, 1000, 97.0], flavio: [100, 50], lula: [100, 50] }],
        ["DF", { quando: "2022-10-30 18:26:10", secoes: [981, 1000, 98.1], flavio: [100, 50], lula: [100, 50] }],
      ),
    );
    // Uma cópia velha de São Paulo, com 400 seções faltando em vez de 51, chega com o marco do Brasil.
    narracao.narrar(
      rodada(
        ["SP", { quando: "2022-10-30 18:20:00", secoes: [600, 1000, 60.0], flavio: [100, 50], lula: [100, 50] }],
        ["BR", { quando: "2022-10-30 18:26:53", secoes: [237618, 472027, 50.34], flavio: [57_873_281, 50.43], lula: [56_885_102, 49.57] }],
      ),
    );

    expect(narracao.doLugar("BR")[0]!.texto).toMatch(/Das seções que faltam, 51% são do Sudeste e 30% do Nordeste\.$/);
  });
});

describe("a narração do Brasil e as das outras páginas", () => {
  const LUGARES_COM_MG: Lugar[] = [...LUGARES, { id: "MG", tipo: "uf", nome: "Minas Gerais", uf: "MG", artigo: "", aptos: 0 }];
  const placarDe = (lula: number): Pick<Parte, "flavio" | "lula"> => ({
    flavio: [Math.round(100 * (100 - lula)), Number((100 - lula).toFixed(2))],
    lula: [Math.round(100 * lula), lula],
  });

  it("no Brasil, entram as viradas em UF, cada UF que termina e os 50% dos 8 maiores eleitorados, sem número na curva e sem município", () => {
    const narracao = criarNarracao(LUGARES_COM_MG);
    narracao.narrar(
      rodada(
        ["MG", { quando: "2022-10-30 17:50:00", secoes: [5000, 49981, 10.0], ...placarDe(50.2) }],
        ["SP", { quando: "2022-10-30 18:16:07", secoes: [25300, 101073, 25.03], ...placarDe(44.0) }],
        ["DF", { quando: "2022-10-30 17:19:37", secoes: [3400, 6748, 50.39], ...placarDe(41.0) }],
        ["38490", { quando: "2022-10-30 18:29:00", secoes: [2200, 4370, 50.34], ...placarDe(72.0) }],
      ),
    );
    const mudaram = narracao.narrar(
      rodada(
        ["MG", { quando: "2022-10-30 17:58:40", secoes: [7900, 49981, 15.81], ...placarDe(49.94) }],
        ["SP", { quando: "2022-10-30 18:38:10", secoes: [50658, 101073, 50.12], ...placarDe(44.6) }],
        ["DF", { quando: "2022-10-30 19:59:37", secoes: [6748, 6748, 100], ...placarDe(41.19) }],
      ),
    );

    expect(textos(narracao.doLugar("BR"))).toEqual([
      "19:59 · O Distrito Federal terminou a totalização. Flávio 58,81%, Lula 41,19%.",
      "18:38 · Passa de 50% das seções totalizadas no estado de São Paulo: 50,12%. Flávio 55,40%, Lula 44,60%.",
      "17:58 · Virada no estado de Minas Gerais: Flávio passa à frente no placar parcial, com 15,81% das seções totalizadas.",
    ]);
    expect(narracao.doLugar("BR").filter((e) => e.numero !== undefined || e.ponto !== undefined)).toEqual([]);
    expect(narracao.doLugar("MG").find((e) => e.tipo === "virada")).toMatchObject({ numero: 2, ponto: [15.81, 50.06, 49.94] });
    expect(mudaram).toEqual(new Set(["MG", "SP", "DF", "BR"]));
  });

  it("nas outras páginas, entram a virada, a indicação do TSE e a totalização final do Brasil, sem número na curva", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 18:40:00", secoes: [306817, 472027, 65.0], ...placarDe(49.9) }]));
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 18:44:00", secoes: [319750, 472027, 67.74], ...placarDe(50.01) }]));
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 19:56:23", secoes: [466257, 472027, 98.81], ...placarDe(50.83), indicacao: true }]));
    narracao.narrar(rodada(["BR", { quando: "2026-10-26 00:18:04", secoes: [472027, 472027, 100], ...placarDe(50.9), final: true }]));

    expect(textos(narracao.doBrasil())).toEqual([
      "00:18 · Totalização final: Lula eleito com 50,90% dos votos válidos.",
      "19:56 · O TSE indica Lula eleito: eleição matematicamente definida, com 98,81% das seções totalizadas.",
      "18:44 · Virada no Brasil: Lula passa à frente no placar parcial, com 67,74% das seções totalizadas.",
    ]);
    expect(narracao.doBrasil().filter((e) => e.numero !== undefined || e.ponto !== undefined)).toEqual([]);
  });

  it("na mesma rodada, a virada vem antes da indicação ou da totalização final, que vêm antes do marco, e todo evento entra", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 18:40:00", secoes: [306817, 472027, 65.0], ...placarDe(49.9) }]));
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 18:52:00", secoes: [354500, 472027, 75.1], ...placarDe(50.17), indicacao: true }]));

    expect(
      narracao
        .doLugar("BR")
        .slice(0, 3)
        .map((e) => [e.tipo, e.numero]),
    ).toEqual([
      ["virada", 4],
      ["indicacao", 3],
      ["marco", 2],
    ]);
  });
});

describe("a indicação do TSE", () => {
  it('entra uma vez, quando o arquivo do Brasil traz `md = "e"`, com o eleito e o % das seções', () => {
    const narracao = criarNarracao(LUGARES);
    const indicado: Parte = {
      quando: "2022-10-30 19:56:23",
      secoes: [466257, 472027, 98.81],
      flavio: [57_000_000, 49.17],
      lula: [58_920_000, 50.83],
      indicacao: true,
    };
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 19:55:40", secoes: [466000, 472027, 98.72], flavio: [57_000_000, 49.17], lula: [58_900_000, 50.83] }]));
    narracao.narrar(rodada(["BR", indicado]));
    narracao.narrar(rodada(["BR", { ...indicado, quando: "2022-10-30 19:57:00", secoes: [466300, 472027, 98.82] }]));

    expect(textos(narracao.doLugar("BR").filter((e) => e.tipo === "indicacao"))).toEqual([
      "19:56 · O TSE indica Lula eleito: eleição matematicamente definida, com 98,81% das seções totalizadas.",
    ]);
  });

  it('não entra com `md = "n"`, que o TSE de verdade manda antes dela', () => {
    // O TSE falso só escreve `md = "e"`: o "n" vem da amostra real do Brasil zerado, com o campo acrescentado.
    const zerado = readFileSync(new URL("../../ensaio/test/amostras/tse/6258/br-c0001-e006258-u.json", import.meta.url), "utf8");
    const andamento = zerado
      .replace(`"dt" : "", "ht" : ""`, `"dt" : "25/10/2026", "ht" : "19:56:23"`)
      .replace(`"st" : "0"`, `"st" : "493316"`)
      .replace(`"pst" : "0,00"`, `"pst" : "98,81"`);
    // Os votos de cada candidato não importam aqui: ficam os de um Brasil com Lula à frente.
    const { candidatos } = resultado("BR", { quando: "", secoes: [0, 0, 0], flavio: [57_000_000, 49.17], lula: [58_920_000, 50.83] });
    const comMd = (md: string) => ({
      ...lerResultado(new TextEncoder().encode(andamento.replace(`"and" : "n", `, `"and" : "p", "md" : "${md}", `))),
      candidatos,
    });
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(new Map([["BR", comMd("n")]]));
    expect(narracao.doLugar("BR").filter((e) => e.tipo === "indicacao")).toEqual([]);

    narracao.narrar(new Map([["BR", comMd("e")]]));
    expect(narracao.doLugar("BR").filter((e) => e.tipo === "indicacao")).toHaveLength(1);
  });
});

describe('"as pesquisas deixaram de pesar"', () => {
  // O modelo de texto é o da decisão 8, com a hora e o % do último arquivo do Brasil que a narração viu.
  const BRASIL_AS_17_26: [string, Parte] = [
    "BR",
    { quando: "2022-10-30 17:26:00", secoes: [24168, 472027, 5.12], flavio: [2_900_000, 51.03], lula: [2_783_000, 48.97] },
  ];
  const doBrasil = (narracao: ReturnType<typeof criarNarracao>) => narracao.doLugar("BR").filter((e) => e.tipo === "pesquisas");

  it("entra uma vez, na primeira rodada em que as duas bases coincidem no Brasil, com número e ponto na curva do Brasil", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 17:20:00", secoes: [9441, 472027, 2.0], flavio: [1_100_000, 51.4], lula: [1_040_000, 48.6] }]), {
      coincidemNoBrasil: false,
    });
    expect(doBrasil(narracao)).toEqual([]);

    const mudaram = narracao.narrar(rodada(BRASIL_AS_17_26), { coincidemNoBrasil: true });
    // Elas podem deixar de coincidir e voltar: o evento não se repete.
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 17:27:00", secoes: [25000, 472027, 5.3], flavio: [3_000_000, 51.0], lula: [2_880_000, 49.0] }]), {
      coincidemNoBrasil: false,
    });
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 17:28:00", secoes: [26000, 472027, 5.51], flavio: [3_100_000, 51.0], lula: [2_980_000, 49.0] }]), {
      coincidemNoBrasil: true,
    });

    expect(textos(doBrasil(narracao))).toEqual([
      "17:26 · As pesquisas deixaram de pesar na projeção: com 5,12% das seções totalizadas no Brasil, as duas bases coincidem.",
    ]);
    expect(doBrasil(narracao)[0]).toMatchObject({ lugar: "BR", numero: 2, ponto: [5.12, 51.03, 48.97] });
    expect(mudaram.has("BR")).toBe(true);
  });

  it("entra também numa rodada sem arquivo novo do Brasil, na hora e no ponto do último que a narração viu", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(BRASIL_AS_17_26), { coincidemNoBrasil: false });
    const mudaram = narracao.narrar(
      rodada(["SP", { quando: "2022-10-30 17:26:30", secoes: [6000, 101073, 5.94], flavio: [900_000, 56.0], lula: [707_000, 44.0] }]),
      {
        coincidemNoBrasil: true,
      },
    );

    expect(doBrasil(narracao)).toMatchObject([{ quando: "2022-10-30 17:26:00", numero: 2, ponto: [5.12, 51.03, 48.97] }]);
    expect(mudaram.has("BR")).toBe(true);
  });

  it("no mesmo arquivo de um marco, entra antes dele, com o número menor, e vem depois dele na lista", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 17:20:00", secoes: [9441, 472027, 2.0], flavio: [1_100_000, 51.4], lula: [1_040_000, 48.6] }]));
    narracao.narrar(rodada(["BR", { quando: "2022-10-30 17:40:00", secoes: [48000, 472027, 10.17], flavio: [5_700_000, 51.2], lula: [5_430_000, 48.8] }]), {
      coincidemNoBrasil: true,
    });

    expect(
      narracao
        .doLugar("BR")
        .slice(0, 2)
        .map((e) => [e.tipo, e.numero]),
    ).toEqual([
      ["marco", 3],
      ["pesquisas", 2],
    ]);
  });

  it("vai também para as outras páginas, sem número na curva, e não entra antes do primeiro arquivo do Brasil nem depois da totalização final", () => {
    const antes = criarNarracao(LUGARES);
    antes.narrar(new Map(), { coincidemNoBrasil: true });
    expect(antes.doLugar("BR")).toEqual([]);

    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(BRASIL_AS_17_26), { coincidemNoBrasil: true });
    expect(textos(narracao.doBrasil())).toEqual([
      "17:26 · As pesquisas deixaram de pesar na projeção: com 5,12% das seções totalizadas no Brasil, as duas bases coincidem.",
    ]);
    expect(narracao.doBrasil().filter((e) => e.numero !== undefined || e.ponto !== undefined)).toEqual([]);

    const depois = criarNarracao(LUGARES);
    depois.narrar(
      rodada(["BR", { quando: "2026-10-26 00:18:04", secoes: [472027, 472027, 100], flavio: [58_206_354, 49.1], lula: [60_345_999, 50.9], final: true }]),
    );
    depois.narrar(new Map(), { coincidemNoBrasil: true });
    expect(doBrasil(depois)).toEqual([]);
  });
});

describe("os eventos preditivos", () => {
  // Narração da noite, decisões 5, 6 e 8: o coletor os calcula sempre, a cada rodada, pela projeção dela, e só os guarda
  // nas bases cujos textos preditivos estão no ar. Os números são os de um lugar com Flávio à frente no placar parcial;
  // a chance é a de vitória do 1º candidato do arquivo de rodada, Flávio.
  const numeros = (sinalDeVirada: SinalDeVirada | null, chanceDeVirada: number | null, chance = 100 - (chanceDeVirada ?? 0)): NumerosDaProjecao => ({
    projecao: 50.9,
    margem: 0.6,
    chance,
    chanceDeVirada,
    sinalDeVirada,
  });
  const SO_APURACAO = ["soApuracao"] as const;
  type Chaves = Pick<RodadaDaNarracao, "textosPreditivos" | "basesNoAr">;
  const DESLIGADOS: Chaves = { textosPreditivos: false };
  /**
   * A rodada da narração com a projeção de cada lugar na "Só apuração": por padrão, com a chave dos textos preditivos
   * ligada e só a "Só apuração" no ar.
   */
  const comProjecao = (porLugar: Record<string, NumerosDaProjecao>, chaves: Chaves = {}): RodadaDaNarracao => ({
    coincidemNoBrasil: false,
    numeros: (id, base) => (base === "soApuracao" ? porLugar[id] : undefined),
    textosPreditivos: true,
    basesNoAr: SO_APURACAO,
    ...chaves,
  });
  const BRASIL_COM_FLAVIO_A_FRENTE: [string, Parte] = [
    "BR",
    { quando: "2022-10-30 18:10:00", secoes: [189000, 472027, 40.04], flavio: [47_000_000, 51.2], lula: [44_800_000, 48.8] },
  ];
  const preditivos = (narracao: ReturnType<typeof criarNarracao>, id = "BR") => narracao.doLugar(id).filter((e) => e.texto.startsWith("Projeção do Apurador"));

  it("a mudança do sinal de virada entra depois de durar 3 rodadas, numa rodada sem arquivo do lugar na hora do TSE mais nova, sem número na curva", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(BRASIL_COM_FLAVIO_A_FRENTE), comProjecao({ BR: numeros("sem sinal de virada", 3) }));
    narracao.narrar(new Map(), comProjecao({ BR: numeros("virada possível", 22) }));
    narracao.narrar(
      rodada(["SP", { quando: "2022-10-30 18:20:10", secoes: [40000, 101073, 39.58], flavio: [1, 50], lula: [1, 50] }]),
      comProjecao({ BR: numeros("virada possível", 24) }),
    );
    expect(preditivos(narracao)).toEqual([]);

    const mudaram = narracao.narrar(new Map(), comProjecao({ BR: numeros("virada possível", 25) }));
    expect(textos(preditivos(narracao))).toEqual([
      "18:20 · Projeção do Apurador: virada possível. Flávio à frente no placar parcial; chance de virada de Lula 25%.",
    ]);
    expect(preditivos(narracao)[0]).toEqual({
      lugar: "BR",
      tipo: "sinal-de-virada",
      base: "soApuracao",
      quando: "2022-10-30 18:20:10",
      texto: "Projeção do Apurador: virada possível. Flávio à frente no placar parcial; chance de virada de Lula 25%.",
    });
    expect(mudaram).toEqual(new Set(["BR"]));
  });

  it("a chance de vitória passando de 90% e de 99% entra uma vez, e só de novo depois de cair abaixo de 80% e de 95%", () => {
    const narracao = criarNarracao(LUGARES);
    // Flávio segue à frente no placar parcial, e o sinal fica o mesmo: só a chance de Lula se move.
    const lula = (chance: number) => comProjecao({ BR: numeros("virada possível", chance) });
    narracao.narrar(rodada(BRASIL_COM_FLAVIO_A_FRENTE), lula(60));
    for (const chance of [91, 85, 92, 79, 90, 91, 100, 96, 100, 94, 100]) narracao.narrar(new Map(), lula(chance));

    expect(textos(preditivos(narracao)).reverse()).toEqual([
      "18:10 · Projeção do Apurador: chance de vitória de Lula passa de 90%.",
      "18:10 · Projeção do Apurador: chance de vitória de Lula passa de 90%.",
      "18:10 · Projeção do Apurador: chance de vitória de Lula passa de 99%.",
      "18:10 · Projeção do Apurador: chance de vitória de Lula passa de 99%.",
    ]);
    expect(preditivos(narracao).every((e) => e.tipo === "chance" && e.base === "soApuracao" && e.numero === undefined)).toBe(true);
  });

  it("a chance de quem está à frente também conta; os dois limiares cruzados na mesma rodada dão só o mais alto, e o primeiro valor só arma a trava", () => {
    const narracao = criarNarracao(LUGARES);
    const flavio = (chance: number) => comProjecao({ BR: numeros("sem sinal de virada", 100 - chance, chance) });
    narracao.narrar(rodada(BRASIL_COM_FLAVIO_A_FRENTE), flavio(70));
    narracao.narrar(new Map(), flavio(100));
    expect(textos(preditivos(narracao))).toEqual(["18:10 · Projeção do Apurador: chance de vitória de Flávio passa de 99%."]);

    const jaAcima = criarNarracao(LUGARES);
    jaAcima.narrar(rodada(BRASIL_COM_FLAVIO_A_FRENTE), flavio(100));
    jaAcima.narrar(new Map(), flavio(97));
    expect(preditivos(jaAcima)).toEqual([]);
  });

  it("com os preditivos no ar, cada marco leva a linha da projeção do lugar em cada base; sem eles, o marco continua factual", () => {
    const SP_A_50: [string, Parte] = [
      "SP",
      { quando: "2022-10-30 18:38:10", secoes: [50658, 101073, 50.12], flavio: [5_540_000, 55.4], lula: [4_460_000, 44.6] },
    ];
    const BR_A_50: [string, Parte] = [
      "BR",
      { quando: "2022-10-30 18:26:53", secoes: [237618, 472027, 50.34], flavio: [57_873_281, 50.43], lula: [56_885_102, 49.57] },
    ];
    const nasDuasBases = (chaves: Chaves = {}): RodadaDaNarracao => ({
      numeros: (_id, base) => ({
        ...numeros("virada projetada", 62),
        ...(base === "soApuracao" ? { projecao: 49.1, margem: 0.6 } : { projecao: 48.7, margem: 0.8 }),
      }),
      textosPreditivos: true,
      basesNoAr: ["soApuracao", "comPesquisas"],
      ...chaves,
    });
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(
      rodada(
        ["BR", { ...BR_A_50[1], quando: "2022-10-30 18:20:00", secoes: [212412, 472027, 45.0] }],
        ["SP", { ...SP_A_50[1], quando: "2022-10-30 18:20:00", secoes: [40000, 101073, 39.58] }],
      ),
    );
    narracao.narrar(rodada(BR_A_50, SP_A_50), nasDuasBases());

    expect(narracao.doLugar("BR").find((e) => e.lugar === "BR" && e.tipo === "marco")!.linhaDaProjecao).toEqual({
      soApuracao: "Projeção do Apurador: Flávio 49,1% ± 0,6, Lula 50,9% ± 0,6.",
      comPesquisas: "Projeção do Apurador: Flávio 48,7% ± 0,8, Lula 51,3% ± 0,8.",
    });
    expect(narracao.doLugar("SP").find((e) => e.tipo === "marco")!.linhaDaProjecao!.soApuracao).toBe(
      "Projeção do Apurador: Flávio 49,1% ± 0,6, Lula 50,9% ± 0,6.",
    );
    // Na narração do Brasil, o marco de São Paulo entra sem a linha: a projeção do estado fica na página dele.
    expect(narracao.doLugar("BR").filter((e) => e.lugar === "SP" && "linhaDaProjecao" in e)).toEqual([]);

    const semPreditivos = criarNarracao(LUGARES);
    semPreditivos.narrar(rodada(["BR", { ...BR_A_50[1], quando: "2022-10-30 18:20:00", secoes: [212412, 472027, 45.0] }]));
    semPreditivos.narrar(rodada(BR_A_50), nasDuasBases(DESLIGADOS));
    expect(semPreditivos.doLugar("BR").find((e) => e.tipo === "marco")).not.toHaveProperty("linhaDaProjecao");
  });

  it("ligados no meio da noite, entram só dali em diante: as travas andaram com eles desligados, e nada do que mudou antes sai", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(BRASIL_COM_FLAVIO_A_FRENTE), comProjecao({ BR: numeros("sem sinal de virada", 3) }, DESLIGADOS));
    // Desligados, o sinal muda e a chance de Lula passa de 90%.
    for (const chance of [25, 26, 27, 91]) narracao.narrar(new Map(), comProjecao({ BR: numeros("virada possível", chance) }, DESLIGADOS));
    expect(preditivos(narracao)).toEqual([]);

    // Ligados, o mesmo sinal e a mesma chance não são novidade; a virada projetada, que dura 3 rodadas, é.
    for (const sinal of ["virada possível", "virada projetada", "virada projetada", "virada projetada"] as const) {
      narracao.narrar(new Map(), comProjecao({ BR: numeros(sinal, 92) }));
    }
    expect(textos(preditivos(narracao))).toEqual([
      "18:10 · Projeção do Apurador: virada projetada. Flávio à frente no placar parcial; chance de virada de Lula 92%.",
    ]);
  });

  it("desligados de novo, somem todos, inclusive os passados e a linha dos marcos, e religados não voltam", () => {
    const BR_A_50: [string, Parte] = [
      "BR",
      { quando: "2022-10-30 18:26:53", secoes: [237618, 472027, 50.34], flavio: [57_873_281, 50.43], lula: [56_885_102, 49.57] },
    ];
    const narracao = criarNarracao(LUGARES);
    const lula = (chance: number, chaves?: Chaves) => comProjecao({ BR: numeros("virada possível", chance) }, chaves);
    narracao.narrar(rodada(BRASIL_COM_FLAVIO_A_FRENTE), lula(60));
    narracao.narrar(rodada(BR_A_50), lula(91));
    expect(preditivos(narracao)).toHaveLength(1);
    // Os marcos de 25% e de 50%.
    expect(narracao.doLugar("BR").filter((e) => e.linhaDaProjecao)).toHaveLength(2);

    const mudaram = narracao.narrar(new Map(), lula(91, DESLIGADOS));
    expect(mudaram).toEqual(new Set(["BR"]));
    expect(preditivos(narracao)).toEqual([]);
    expect(narracao.doLugar("BR").filter((e) => "linhaDaProjecao" in e)).toEqual([]);

    narracao.narrar(new Map(), lula(79));
    narracao.narrar(new Map(), lula(93));
    expect(textos(preditivos(narracao))).toEqual(["18:26 · Projeção do Apurador: chance de vitória de Lula passa de 90%."]);
  });

  it("uma base fora do ar esconde os preditivos dela, que voltam com ela; os que surgem com ela fora do ar não entram", () => {
    const narracao = criarNarracao(LUGARES);
    const nasDuas = (chance: number, basesNoAr: readonly BaseDaProjecao[]): RodadaDaNarracao => ({
      numeros: () => numeros("virada possível", chance),
      textosPreditivos: true,
      basesNoAr,
    });
    const bases = () =>
      preditivos(narracao)
        .map((e) => e.base)
        .sort();
    narracao.narrar(rodada(BRASIL_COM_FLAVIO_A_FRENTE), nasDuas(60, ["soApuracao", "comPesquisas"]));
    narracao.narrar(new Map(), nasDuas(91, ["soApuracao", "comPesquisas"]));
    expect(bases()).toEqual(["comPesquisas", "soApuracao"]);

    // Sem a base com pesquisas, os preditivos dela saem dos arquivos, e a chance que passa de 90% de novo só entra na outra.
    const mudaram = narracao.narrar(new Map(), nasDuas(91, ["soApuracao"]));
    expect(mudaram).toEqual(new Set(["BR"]));
    expect(bases()).toEqual(["soApuracao"]);
    narracao.narrar(new Map(), nasDuas(79, ["soApuracao"]));
    narracao.narrar(new Map(), nasDuas(93, ["soApuracao"]));
    expect(bases()).toEqual(["soApuracao", "soApuracao"]);

    // De volta, ela traz os dela de antes. Sem a projeção no ar, nenhum sai; com ela de volta, voltam todos.
    narracao.narrar(new Map(), nasDuas(93, ["soApuracao", "comPesquisas"]));
    expect(bases()).toEqual(["comPesquisas", "soApuracao", "soApuracao"]);
    narracao.narrar(new Map(), nasDuas(93, []));
    expect(preditivos(narracao)).toEqual([]);
    narracao.narrar(new Map(), nasDuas(93, ["soApuracao", "comPesquisas"]));
    expect(bases()).toEqual(["comPesquisas", "soApuracao", "soApuracao"]);
  });

  it("os municípios também têm os seus, e param quando o lugar termina", () => {
    const SALVADOR: [string, Parte] = ["38490", { quando: "2022-10-30 18:05:00", secoes: [1000, 4370, 22.88], flavio: [60_000, 30.1], lula: [139_000, 69.9] }];
    const narracao = criarNarracao(LUGARES);
    const rodadaCom = (chanceDeFlavio: number) =>
      comProjecao({ BR: numeros("virada possível", 30), "38490": numeros("sem sinal de virada", chanceDeFlavio, chanceDeFlavio) });
    narracao.narrar(rodada(BRASIL_COM_FLAVIO_A_FRENTE, SALVADOR), rodadaCom(15));
    narracao.narrar(new Map(), rodadaCom(1));
    expect(textos(preditivos(narracao, "38490"))).toEqual(["18:10 · Projeção do Apurador: chance de vitória de Lula passa de 90%."]);

    // Terminado, a chance de Lula vai a 100%: nada entra depois do "terminou".
    narracao.narrar(rodada(["38490", { ...SALVADOR[1], quando: "2022-10-30 19:27:00", secoes: [4370, 4370, 100] }]), rodadaCom(0));
    expect(narracao.doLugar("38490").map((e) => e.tipo)).toEqual(["fim", "chance", "comeco"]);
  });

  it("na rodada de um arquivo novo do lugar, o preditivo leva a hora dele e vem depois da virada, que fica no topo (decisão 10)", () => {
    const narracao = criarNarracao(LUGARES);
    // São Paulo com Flávio à frente; na rodada seguinte, Lula passa à frente, e a chance dele passa de 90%. O arquivo do
    // Brasil da mesma rodada é mais novo que o de São Paulo.
    narracao.narrar(
      rodada(["SP", { quando: "2022-10-30 18:00:00", secoes: [20000, 101073, 19.79], flavio: [1_000_000, 50.5], lula: [980_000, 49.5] }]),
      comProjecao({ SP: numeros("virada possível", 30) }),
    );
    narracao.narrar(
      rodada(
        ["SP", { quando: "2022-10-30 18:05:00", secoes: [30000, 101073, 29.68], flavio: [1_400_000, 49.6], lula: [1_420_000, 50.4] }],
        ["BR", { ...BRASIL_COM_FLAVIO_A_FRENTE[1], quando: "2022-10-30 18:05:40" }],
      ),
      comProjecao({ SP: numeros("virada possível", 9, 9) }),
    );

    expect(
      narracao
        .doLugar("SP")
        .slice(0, 3)
        .map((e) => [e.tipo, e.quando.slice(11)]),
    ).toEqual([
      ["virada", "18:05:00"],
      ["chance", "18:05:00"],
      ["marco", "18:05:00"],
    ]);
  });

  it("as travas andam antes do começo do lugar: a chance que passa de 90% com a primeira seção entra, e a que passou antes dela, não", () => {
    const ainda: [string, Parte] = ["38490", { quando: null, secoes: [0, 4370, 0] }];
    const comeca: [string, Parte] = ["38490", { quando: "2022-10-30 18:12:00", secoes: [400, 4370, 9.15], flavio: [20_000, 25.0], lula: [60_000, 75.0] }];
    const lula = (chance: number) => comProjecao({ "38490": numeros(null, null, 100 - chance) });

    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(BRASIL_COM_FLAVIO_A_FRENTE, ainda), lula(85));
    narracao.narrar(new Map(), lula(88));
    narracao.narrar(rodada(comeca), lula(93));
    expect(textos(preditivos(narracao, "38490"))).toEqual(["18:12 · Projeção do Apurador: chance de vitória de Lula passa de 90%."]);

    const jaPassou = criarNarracao(LUGARES);
    jaPassou.narrar(rodada(BRASIL_COM_FLAVIO_A_FRENTE, ainda), lula(85));
    jaPassou.narrar(new Map(), lula(93));
    jaPassou.narrar(rodada(comeca), lula(95));
    expect(preditivos(jaPassou, "38490")).toEqual([]);
  });

  it("com a indicação do TSE, param o sinal de virada em todo lugar e a chance no Brasil; a das UFs e dos municípios segue", () => {
    const narracao = criarNarracao(LUGARES);
    const SP: [string, Parte] = ["SP", { quando: "2022-10-30 19:50:00", secoes: [90000, 101073, 89.05], flavio: [12_000_000, 55.0], lula: [9_800_000, 45.0] }];
    const rodadaCom = (sinalNoBrasil: SinalDeVirada, chanceDeFlavio: { BR: number; SP: number }) =>
      comProjecao({
        BR: numeros(sinalNoBrasil, 100 - chanceDeFlavio.BR, chanceDeFlavio.BR),
        SP: numeros("sem sinal de virada", 100 - chanceDeFlavio.SP, chanceDeFlavio.SP),
      });
    narracao.narrar(rodada(BRASIL_COM_FLAVIO_A_FRENTE, SP), rodadaCom("sem sinal de virada", { BR: 60, SP: 80 }));
    narracao.narrar(
      rodada(["BR", { ...BRASIL_COM_FLAVIO_A_FRENTE[1], quando: "2022-10-30 19:56:23", indicacao: true }]),
      rodadaCom("virada projetada", { BR: 100, SP: 95 }),
    );
    for (let i = 0; i < 3; i++) narracao.narrar(new Map(), rodadaCom("virada projetada", { BR: 100, SP: 95 }));

    expect(preditivos(narracao)).toEqual([]);
    expect(textos(preditivos(narracao, "SP"))).toEqual(["19:56 · Projeção do Apurador: chance de vitória de Flávio passa de 90%."]);
  });
});

describe("a retomada", () => {
  // Operação na noite, decisão 4, e Narração da noite, decisão 11: o coletor guarda o estado da narração a cada rodada e,
  // depois de uma queda, cria a narração de novo a partir dele, em JSON, do disco ou do objeto da noite. A noite abaixo
  // passa por tudo o que a narração guarda: o nível e o líder de cada lugar, a virada aberta reescrita depois da parada,
  // os eventos das UFs na narração do Brasil, a linha da projeção dos marcos, as travas no meio de um sinal que dura,
  // os preditivos de uma base fora do ar, "as pesquisas deixaram de pesar", a indicação e a totalização final.
  const numeros = (sinalDeVirada: SinalDeVirada | null, chanceDeVirada: number | null, chance = 100 - (chanceDeVirada ?? 0)): NumerosDaProjecao => ({
    projecao: 50.9,
    margem: 0.6,
    chance,
    chanceDeVirada,
    sinalDeVirada,
  });
  const comProjecao = (porLugar: Record<string, NumerosDaProjecao>, chaves: Partial<RodadaDaNarracao> = {}): RodadaDaNarracao => ({
    coincidemNoBrasil: false,
    numeros: (id) => porLugar[id],
    textosPreditivos: true,
    basesNoAr: ["soApuracao", "comPesquisas"],
    ...chaves,
  });
  const TOTAL = 472027;
  /** O Brasil num instante, com quem lidera pelos votos (Flávio ou Lula) e o % de Lula. */
  const brasil = (quando: string, secoes: number, lider: "flavio" | "lula", lula: number, parte: Partial<Parte> = {}): [string, Parte] => [
    "BR",
    {
      quando: `2022-10-30 ${quando}`,
      secoes: [Math.round((secoes * TOTAL) / 100), TOTAL, secoes],
      flavio: [lider === "flavio" ? 60_001_000 : 60_000_000, Number((100 - lula).toFixed(2))],
      lula: [lider === "lula" ? 60_001_000 : 60_000_000, lula],
      ...parte,
    },
  ];
  const NOITE: [ReturnType<typeof rodada>, RodadaDaNarracao?][] = [
    [rodada(brasil("17:00:51", 0.02, "flavio", 48.8), ["SP", { quando: "2022-10-30 17:00:40", secoes: [100, 101073, 0.1], flavio: [60, 60], lula: [40, 40] }])],
    [
      rodada(
        brasil("18:10:00", 40.04, "flavio", 48.8),
        ["SP", { quando: "2022-10-30 18:09:00", secoes: [40000, 101073, 39.58], flavio: [5_540_000, 55.4], lula: [4_460_000, 44.6] }],
        ["BA", { quando: "2022-10-30 18:09:30", secoes: [600, 1000, 60], flavio: [300, 30], lula: [700, 70] }],
        ["38490", { quando: "2022-10-30 18:05:00", secoes: [1000, 4370, 22.88], flavio: [60_000, 30.1], lula: [139_000, 69.9] }],
      ),
      comProjecao({ BR: numeros("sem sinal de virada", 3), SP: numeros("sem sinal de virada", 10), "38490": numeros("virada possível", 15, 15) }),
    ],
    [new Map(), comProjecao({ BR: numeros("virada possível", 22), SP: numeros("sem sinal de virada", 10) })],
    [
      rodada(["SP", { quando: "2022-10-30 18:20:10", secoes: [45000, 101073, 44.52], flavio: [6_000_000, 55.1], lula: [4_900_000, 44.9] }]),
      comProjecao({ BR: numeros("virada possível", 24), SP: numeros("sem sinal de virada", 8) }),
    ],
    [rodada(brasil("18:26:53", 50.34, "flavio", 49.57)), comProjecao({ BR: numeros("virada possível", 25), SP: numeros("sem sinal de virada", 5) })],
    [
      rodada(
        brasil("18:42:53", 66.78, "lula", 50.01),
        ["BA", { quando: "2022-10-30 18:42:00", secoes: [700, 1000, 70], flavio: [800, 53], lula: [710, 47] }],
        ["38490", { quando: "2022-10-30 18:40:00", secoes: [2200, 4370, 50.34], flavio: [130_000, 30.2], lula: [300_000, 69.8] }],
      ),
      comProjecao({ BR: numeros("virada possível", 40), SP: numeros("sem sinal de virada", 5) }),
    ],
    [rodada(brasil("18:42:58", 66.85, "flavio", 49.99)), comProjecao({ BR: numeros("virada possível", 41) }, { coincidemNoBrasil: true })],
    [new Map(), comProjecao({ BR: numeros("virada projetada", 60, 9) }, { basesNoAr: ["soApuracao"] })],
    [rodada(brasil("18:44:50", 68.32, "lula", 50.0)), comProjecao({ BR: numeros("virada projetada", 61, 9) }, { basesNoAr: ["soApuracao"] })],
    [new Map(), comProjecao({ BR: numeros("virada projetada", 62, 9) })],
    [
      rodada(brasil("19:56:23", 98.2, "lula", 50.8, { indicacao: true }), [
        "ZZ",
        { quando: "2022-10-30 19:56:00", secoes: [500, 500, 100], flavio: [400, 40], lula: [600, 60] },
      ]),
      comProjecao({ BR: numeros("virada projetada", 99, 1), SP: numeros("sem sinal de virada", 1) }),
    ],
    [new Map(), comProjecao({ BR: numeros("virada projetada", 99, 1) }, { textosPreditivos: false })],
    [rodada(brasil("00:18:04", 100, "lula", 50.9, { quando: "2022-10-31 00:18:04", final: true }))],
    [rodada(brasil("00:20:00", 100, "flavio", 49.0, { quando: "2022-10-31 00:20:00", final: true }))],
  ];
  /** O que sai da narração: a de cada lugar e os eventos do Brasil nas outras páginas. */
  const retrato = (narracao: ReturnType<typeof criarNarracao>) => ({
    lugares: Object.fromEntries(LUGARES.map((l) => [l.id, narracao.doLugar(l.id)])),
    doBrasil: narracao.doBrasil(),
  });

  it("parada em qualquer rodada e retomada do estado em JSON, narra o resto da noite como a que não parou", () => {
    const semParar = criarNarracao(LUGARES);
    // Uma cópia a cada rodada: a virada aberta é reescrita depois, no mesmo evento.
    const esperado = NOITE.map(([novos, daRodada]) => structuredClone({ mudaram: semParar.narrar(novos, daRodada), ...retrato(semParar) }));
    // A noite tem de tudo: a virada do Brasil com 3 trocas, a da Bahia, os preditivos nas duas bases e a linha dos marcos.
    const brasilNoMeio = esperado[9]!.lugares.BR!;
    expect(brasilNoMeio.filter((e) => e.tipo === "virada").map((e) => [e.lugar, e.trocas])).toEqual([
      ["BR", 3],
      ["BA", 1],
    ]);
    expect(brasilNoMeio.filter((e) => e.base).map((e) => [e.tipo, e.base])).toContainEqual(["sinal-de-virada", "comPesquisas"]);
    // Os marcos de 25% e de 50% do Brasil.
    expect(brasilNoMeio.filter((e) => e.linhaDaProjecao)).toHaveLength(2);

    for (let parada = 1; parada < NOITE.length; parada++) {
      const antes = criarNarracao(LUGARES);
      for (const [novos, daRodada] of NOITE.slice(0, parada)) antes.narrar(novos, daRodada);
      const retomada = criarNarracao(LUGARES, JSON.parse(JSON.stringify(antes.estado())));

      expect(retrato(retomada), `retomada depois da rodada ${parada}`).toEqual(retrato(antes));
      NOITE.slice(parada).forEach(([novos, daRodada], i) => {
        expect({ mudaram: retomada.narrar(novos, daRodada), ...retrato(retomada) }, `rodada ${parada + i}, retomada depois da ${parada}`).toEqual(
          esperado[parada + i],
        );
      });
    }
  });

  it("guarda de cada lugar só os candidatos do último arquivo, e cada evento uma vez", () => {
    const narracao = criarNarracao(LUGARES);
    for (const [novos, daRodada] of NOITE.slice(0, 7)) narracao.narrar(novos, daRodada);
    const estado = narracao.estado();
    const texto = JSON.stringify(estado);

    expect(JSON.stringify(estado.lugares)).not.toContain('"eleitorado"');
    // A virada do Brasil está na lista do Brasil e na narração dele, mas o texto dela vai uma vez.
    const virada = narracao.doLugar("BR").find((e) => e.tipo === "virada" && e.lugar === "BR")!;
    expect(texto.split(JSON.stringify(virada.texto))).toHaveLength(2);
  });
});
