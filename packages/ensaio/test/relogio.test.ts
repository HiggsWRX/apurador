import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { criarTseFalso, momentoReal, relogioAcelerado, relogioDoReplay, relogioManual, ritmoDesde } from "../src/index.ts";
import { cadastro, instante, noite } from "./noite-2022.ts";

// O relógio do TSE falso: no ensaio geral, 3x das 16:50 às 20:30 de 2022 e 30x até a totalização final
// (decisão 6 do Ensaio geral, .scratch/apurador-2026/issues/15-ensaio-geral.md); no replay, a velocidade máxima.

const minutos = (n: number) => n * 60_000;
const hora = (i: number) => {
  const s = ((i % 86_400) + 86_400) % 86_400;
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
};

describe("o relógio do ensaio geral", () => {
  const partida = Date.UTC(2026, 9, 22, 22, 0, 0);
  const em = (real: number) => relogioAcelerado({ partida, agoraReal: () => real }).agora();

  it("parte das 16:50 de 2022 e anda a 3x até as 20:30", () => {
    expect(hora(em(partida).instante)).toBe("16:50:00");
    expect(hora(em(partida + 10_000).instante)).toBe("16:50:30");
    expect(hora(em(partida + minutos(60)).instante)).toBe("19:50:00");
    // 3 h 40 min da noite a 3x são 73 min 20 s.
    expect(hora(em(partida + minutos(73) + 20_000).instante)).toBe("20:30:00");
  });

  it("depois das 20:30, anda a 30x: a totalização final de 2022, às 00:18:04, chega em menos de 8 minutos", () => {
    const as2030 = partida + minutos(73) + 20_000;

    expect(hora(em(as2030 + 60_000).instante)).toBe("21:00:00");
    expect(em(as2030 + minutos(8)).instante).toBe(86_400 + 30 * 60);
    expect(em(as2030 + minutos(8)).instante).toBeGreaterThan(instante("2022-10-31 00:18:04"));
  });

  it("a hora real é a do relógio do computador, para o limite de pedidos e o bloqueio", () => {
    expect(em(partida + 1234).real).toBe(partida + 1234);
  });

  it("pode partir de outra hora, no ritmo do ensaio daquela hora em diante", () => {
    const ritmo = ritmoDesde(instante("2022-10-30 18:30:00"));
    const as = (real: number) => hora(relogioAcelerado({ partida, ritmo, agoraReal: () => real }).agora().instante);

    expect(as(partida)).toBe("18:30:00");
    expect(as(partida + minutos(40))).toBe("20:30:00");
    expect(as(partida + minutos(41))).toBe("21:00:00");
    expect(
      hora(relogioAcelerado({ partida, ritmo: ritmoDesde(instante("2022-10-30 22:00:00")), agoraReal: () => partida + minutos(1) }).agora().instante),
    ).toBe("22:30:00");
  });

  it("diz a hora real em que a noite chega a um instante, para o atraso medido de fora", () => {
    const real = (dataHora: string, ritmo?: Parameters<typeof momentoReal>[0]["ritmo"]) => momentoReal({ partida, ritmo }, instante(dataHora));

    expect(real("2022-10-30 16:50:00")).toBe(partida);
    // 10 min da noite a 3x são 3 min 20 s.
    expect(real("2022-10-30 17:00:00")).toBe(partida + minutos(3) + 20_000);
    expect(real("2022-10-30 20:30:00")).toBe(partida + minutos(73) + 20_000);
    // Depois das 20:30, 30 min da noite são 1 min.
    expect(real("2022-10-30 21:00:00")).toBe(partida + minutos(74) + 20_000);
    expect(real("2022-10-30 18:40:00", [{ desde: instante("2022-10-30 18:30:00"), velocidade: 1 }])).toBe(partida + minutos(10));
  });

  it("antes do começo do ritmo, a hora real é a partida: o arquivo já estava lá", () => {
    expect(momentoReal({ partida }, instante("2022-10-30 08:00:00"))).toBe(partida);
  });

  it("aceita outro ritmo, como o trecho de 30 min a 1x das 18:30 às 19:00", () => {
    const umaVez = (real: number) =>
      relogioAcelerado({ partida, ritmo: [{ desde: instante("2022-10-30 18:30:00"), velocidade: 1 }], agoraReal: () => real }).agora();

    expect(hora(umaVez(partida + minutos(10)).instante)).toBe("18:40:00");
  });
});

describe("a velocidade máxima, para o replay", () => {
  // O pico de 2022: ~630 pedidos numa rodada (os 29 índices e ~600 municípios), como no ticket 12.
  const pedidosDaRodada = [
    "br/br-e006258-ab.json",
    ...cadastro.ufs.map((uf) => `${uf.sigla.toLowerCase()}/${uf.sigla.toLowerCase()}-e006258-ab.json`),
    ...cadastro.ufs.flatMap((uf) =>
      uf.municipios.slice(0, 22).map((m) => `${uf.sigla.toLowerCase()}/${uf.sigla.toLowerCase()}${String(m.codigo).padStart(5, "0")}-c0001-e006258-u.json`),
    ),
  ].map((caminho) => `/oficial/ele2026/6258/dados/${caminho}`);

  it("no relógio do replay, o limite conta pelo relógio do coletor: espaçados a 50 por segundo, 630 pedidos numa rodada não violam", () => {
    let coletor = 0; // o relógio simulado do coletor, em ms: as esperas dele não esperam de verdade
    const tse = criarTseFalso({ noite, cadastro, relogio: relogioDoReplay(instante("2022-10-30 18:40:00"), () => coletor) });

    // Três rodadas de 20 s, cada uma com os pedidos a cada 20 ms (12,6 s).
    for (let rodada = 0; rodada < 3; rodada++) {
      for (const url of pedidosDaRodada) {
        expect(tse.responder({ url }).status).toBe(200);
        coletor += 20;
      }
      coletor = (rodada + 1) * 20_000;
    }

    expect(tse.registro().violacoes).toEqual([]);
    // A noite anda com o relógio do coletor, a 1x.
    expect(tse.estado().dataHora).toBe("2022-10-30 18:41:00");
  });

  it("os mesmos pedidos de uma vez, sem espaçar, violam o limite", () => {
    const coletor = 0;
    const tse = criarTseFalso({ noite, cadastro, relogio: relogioDoReplay(instante("2022-10-30 18:40:00"), () => coletor) });

    for (const url of pedidosDaRodada) tse.responder({ url });

    expect(tse.registro().violacoes).toHaveLength(1);
  });

  it("roda a noite inteira em rodadas de 20 s, sem esperar, do zerado até a totalização final", () => {
    const relogio = relogioManual(instante("2022-10-30 16:59:00"));
    const tse = criarTseFalso({ noite, cadastro, relogio });
    const ler = (url: string) => JSON.parse(new TextDecoder().decode(gunzipSync(tse.responder({ url, cabecalhos: { "accept-encoding": "gzip" } }).corpo)));
    const BRASIL = "/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json";
    const INDICE = "/oficial/ele2026/6258/dados/br/br-e006258-ab.json";

    const secoes: number[] = [];
    let ultimo = ler(BRASIL);
    while (ultimo.tf !== "s") {
      relogio.avancar(20);
      ultimo = ler(BRASIL);
      ler(INDICE);
      secoes.push(Number(ultimo.s.st));
    }

    expect(secoes.every((s, i) => i === 0 || s >= secoes[i - 1]!)).toBe(true);
    expect(secoes.at(-1)).toBe(472_075);
    // De 16:59 até a final, às 00:18:04, são cerca de 1.320 rodadas.
    expect(secoes.length).toBeGreaterThan(1300);
    expect(secoes.length).toBeLessThan(1330);
  }, 30_000);
});
