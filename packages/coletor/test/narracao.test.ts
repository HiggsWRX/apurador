import { readFileSync } from "node:fs";
import type { Lugar } from "@apurador/pipeline";
import { lerResultado, type ResultadoDoTse } from "@apurador/tse";
import { describe, expect, it } from "vitest";
import { criarNarracao } from "../src/narracao.ts";

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
  /** `AAAA-MM-DD HH:MM:SS`, em Brasília. */
  quando: string;
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
  it("no Brasil, é \"Começa a divulgação\" com a primeira seção totalizada", () => {
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

  it("nas UFs, nomeiam o estado com \"estado\"; quando vários caem na mesma rodada, sai só o mais alto", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(["SP", { quando: "2022-10-30 18:00:00", secoes: [8086, 101073, 8.0], flavio: [1_200_000, 56.1], lula: [939_000, 43.9] }]));
    narracao.narrar(rodada(["SP", { quando: "2022-10-30 18:38:10", secoes: [50658, 101073, 50.12], flavio: [7_000_000, 55.4], lula: [5_635_379, 44.6] }]));

    expect(textos(narracao.doLugar("SP"))).toEqual([
      "18:38 · Passa de 50% das seções totalizadas no estado de São Paulo: 50,12%. Flávio 55,40%, Lula 44,60%.",
      "18:00 · Começa a totalização: 8,00% das seções totalizadas no estado de São Paulo.",
    ]);
  });

  it("nos municípios, são só os 50%, e um município totalizado de uma vez ganha só \"terminou\"", () => {
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
  it("fora do Brasil, é \"terminou a totalização\", com o estado, o Distrito Federal, o Exterior e o município pelo nome sem ambiguidade", () => {
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
    narracao.narrar(rodada(["BR", { quando: "2026-10-26 00:18:04", secoes: [472027, 472027, 100], flavio: [58_206_354, 49.1], lula: [60_345_999, 50.9], final: true }]));

    expect(textos(narracao.doLugar("BR")).at(0)).toBe("00:18 · Totalização final: Lula eleito com 50,90% dos votos válidos.");
  });
});

describe("a virada", () => {
  /** O Brasil num instante, com quem lidera pelos votos e o % de Lula (medição de 2022, seção 2). */
  const brasil = (quando: string, secoes: number, lider: "flavio" | "lula" | "empate", lula = lider === "lula" ? 50.01 : lider === "flavio" ? 49.99 : 50): [string, Parte] => {
    const total = 472027;
    const [vf, vl] = lider === "lula" ? [60_000_000, 60_001_000] : lider === "flavio" ? [60_001_000, 60_000_000] : [60_000_000, 60_000_000];
    return ["BR", { quando: `2022-10-30 ${quando}`, secoes: [Math.round((secoes * total) / 100), total, secoes], flavio: [vf, Number((100 - lula).toFixed(2))], lula: [vl, lula] }];
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

    expect(viradas(narracao)).toEqual(["18:42 · Virada no Brasil: a liderança trocou 5 vezes entre 18:42 e 18:44; Lula à frente no placar parcial, com 68,32% das seções totalizadas."]);
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
    narracao.narrar(rodada(["BR", { quando: "2026-10-26 00:18:04", secoes: [472027, 472027, 100], flavio: [58_206_354, 49.1], lula: [60_345_999, 50.9], final: true }]));
    const mudaram = narracao.narrar(rodada(["SP", { quando: "2026-10-26 00:20:00", secoes: [101073, 101073, 100], flavio: [14_000_000, 55.24], lula: [11_320_000, 44.76] }]));

    expect(mudaram).toEqual(new Set());
    expect(narracao.doLugar("SP")).toEqual([]);
  });
});

describe("um arquivo mais velho que o último visto", () => {
  it("não narra nada: uma cópia velha da CDN não volta o líder nem os marcos", () => {
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(rodada(["SP", { quando: "2022-10-30 18:00:00", secoes: [10000, 101073, 9.89], flavio: [1000, 50.05], lula: [999, 49.95] }]));
    narracao.narrar(rodada(["SP", { quando: "2022-10-30 18:01:00", secoes: [10500, 101073, 10.39], flavio: [1000, 49.95], lula: [1002, 50.05] }]));
    const mudaram = narracao.narrar(rodada(["SP", { quando: "2022-10-30 18:00:00", secoes: [10000, 101073, 9.89], flavio: [1000, 50.05], lula: [999, 49.95] }]));
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
  const placarDe = (lula: number): Pick<Parte, "flavio" | "lula"> => ({ flavio: [Math.round(100 * (100 - lula)), Number((100 - lula).toFixed(2))], lula: [Math.round(100 * lula), lula] });

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

    expect(narracao.doLugar("BR").slice(0, 3).map((e) => [e.tipo, e.numero])).toEqual([
      ["virada", 4],
      ["indicacao", 3],
      ["marco", 2],
    ]);
  });
});

describe("a indicação do TSE", () => {
  it("entra uma vez, quando o arquivo do Brasil traz `md = \"e\"`, com o eleito e o % das seções", () => {
    const narracao = criarNarracao(LUGARES);
    const indicado: Parte = { quando: "2022-10-30 19:56:23", secoes: [466257, 472027, 98.81], flavio: [57_000_000, 49.17], lula: [58_920_000, 50.83], indicacao: true };
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
    const andamento = zerado.replace(`"dt" : "", "ht" : ""`, `"dt" : "25/10/2026", "ht" : "19:56:23"`).replace(`"st" : "0"`, `"st" : "493316"`).replace(`"pst" : "0,00"`, `"pst" : "98,81"`);
    // Os votos de cada candidato não importam aqui: ficam os de um Brasil com Lula à frente.
    const { candidatos } = resultado("BR", { quando: "", secoes: [0, 0, 0], flavio: [57_000_000, 49.17], lula: [58_920_000, 50.83] });
    const comMd = (md: string) => ({ ...lerResultado(new TextEncoder().encode(andamento.replace(`"and" : "n", `, `"and" : "p", "md" : "${md}", `))), candidatos });
    const narracao = criarNarracao(LUGARES);
    narracao.narrar(new Map([["BR", comMd("n")]]));
    expect(narracao.doLugar("BR").filter((e) => e.tipo === "indicacao")).toEqual([]);

    narracao.narrar(new Map([["BR", comMd("e")]]));
    expect(narracao.doLugar("BR").filter((e) => e.tipo === "indicacao")).toHaveLength(1);
  });
});
