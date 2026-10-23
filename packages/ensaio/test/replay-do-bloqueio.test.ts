import { beforeAll, describe, expect, it } from "vitest";
import type { ConexaoDoComputador, RegistroDaRodada } from "@apurador/coletor";
import { conferirPlacar, resultadosDoTseFalso } from "../src/index.ts";
import { cadastro, instante, noite } from "./noite-2022.ts";
import { lugares, ms, replay } from "./replay.ts";

// O replay automático (`replay.ts`): o bloqueio pelo TSE (Operação na noite, decisão 12). O TSE falso responde 403 a
// todos, como no ensaio 1, em que o coletor fez de 341 a 454 pedidos 403 por rodada; o dono troca a conexão.

const NO_CABO: ConexaoDoComputador = { ip: "200.160.1.1", voltouEm: null, via: "cabo" };
const NO_CELULAR: ConexaoDoComputador = { ip: "177.79.2.2", voltouEm: null, via: "celular" };
const inicio = (x: RegistroDaRodada) => Date.parse(x.inicio);
const pediu = (x: RegistroDaRodada) => x.pedidos > 0;
const respostas403 = (rodadas: RegistroDaRodada[]) => rodadas.reduce((soma, x) => soma + (x.respostas[403] ?? 0), 0);
/** O tempo de cada rodada até a seguinte, em segundos, com a hora da noite em que ela começou. */
const intervalos = (rodadas: RegistroDaRodada[]) =>
  rodadas.slice(0, -1).map((x, i) => ({ inicio: inicio(x), segundos: (inicio(rodadas[i + 1]!) - inicio(x)) / 1000 }));

describe("o bloqueio pelo TSE", () => {
  // O TSE falso responde 403 por 3 min a partir das 17:06. O dono puxa o cabo às 17:10, e o celular dá outro IP.
  const TROCA = ms("2022-10-30 17:10:00");
  let r: Awaited<ReturnType<typeof replay>>;
  let bloqueada: RegistroDaRodada;
  let volta: RegistroDaRodada;
  beforeAll(async () => {
    r = await replay("2022-10-30 17:00:00", "2022-10-30 17:32:00", {
      bloquearOTse: { em: "2022-10-30 17:06:00", segundos: 180 },
      conexao: (quando) => (quando < TROCA ? NO_CABO : NO_CELULAR),
    });
    bloqueada = r.rodadas.find((x) => (x.respostas[403] ?? 0) > 0)!;
    volta = r.rodadas.find((x) => inicio(x) >= TROCA)!;
  }, 120_000);

  it("no primeiro 403, para de pedir ao TSE: só os pedidos que já estavam no ar levam 403, e nenhum sai até a conexão mudar", () => {
    const fimDaBloqueada = inicio(bloqueada) + bloqueada.duracao;

    expect(respostas403(r.rodadas)).toBeGreaterThan(0);
    expect(respostas403(r.rodadas)).toBeLessThanOrEqual(40);
    expect(r.pedidos.filter((p) => p.quando >= fimDaBloqueada && p.quando < inicio(volta))).toEqual([]);
    expect(r.rodadas.filter((x) => inicio(x) > inicio(bloqueada) && inicio(x) < inicio(volta)).map((x) => [x.pedidos, x.bloqueio?.status])).toEqual(
      r.rodadas.filter((x) => inicio(x) > inicio(bloqueada) && inicio(x) < inicio(volta)).map(() => [0, 403]),
    );
  });

  it("parado, segue publicando o arquivo de rodada a cada 20 s: a página não vê interrupção", () => {
    const paradas = r.rodadas.filter((x) => inicio(x) > inicio(bloqueada) && inicio(x) < inicio(volta));
    const rodadasPublicadas = r.gravacoes.filter((g) => g.caminho === "rodada.json" && g.quando >= inicio(bloqueada) && g.quando < inicio(volta));

    expect(paradas.length).toBeGreaterThanOrEqual(10);
    expect(rodadasPublicadas.length).toBe(1 + paradas.length);
    expect(intervalos([bloqueada, ...paradas]).every((x) => x.segundos === 20)).toBe(true);
  });

  it("na troca de conexão, retoma na rodada seguinte, com uma rodada a cada 40 s por 15 min, e depois a cada 20 s", () => {
    expect(inicio(volta) - TROCA).toBeLessThan(20_000);
    expect(pediu(volta)).toBe(true);
    expect(volta.bloqueio).toBeNull();
    const depois = intervalos(r.rodadas.filter((x) => inicio(x) >= inicio(volta)));
    expect(depois.filter((x) => x.inicio < inicio(volta) + 15 * 60_000).every((x) => x.segundos === 40)).toBe(true);
    expect(depois.filter((x) => x.inicio >= inicio(volta) + 15 * 60_000).map((x) => x.segundos)).toEqual(
      depois.filter((x) => x.inicio >= inicio(volta) + 15 * 60_000).map(() => 20),
    );
    expect(depois.filter((x) => x.inicio >= inicio(volta) + 15 * 60_000).length).toBeGreaterThan(10);
  });

  it("depois da volta, alcança o TSE em até 5 min, e só publica placares do TSE falso", () => {
    const tse = resultadosDoTseFalso({ noite, cadastro });
    tse.avancarAte(instante("2022-10-30 17:27:00"));
    const atrasados = lugares.filter((l) => (r.publicado(l.caminho).tse.totalizacao ?? "") < (tse.resultado(l.abrangencia)!.ultimaTotalizacao ?? ""));

    expect(atrasados).toEqual([]);
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
  });
});

describe("bloqueado de novo no celular", () => {
  // O TSE falso responde 403 por 10 min a partir das 17:06. O dono puxa o cabo às 17:08, e o celular também leva 403.
  // Modo avião das 17:12:00 às 17:12:10: a internet cai e volta, com o mesmo IP, e o TSE ainda bloqueia. Às 17:18, outro
  // modo avião dá outro IP, e o bloqueio já acabou.
  const AVIAO = ms("2022-10-30 17:12:00");
  const VOLTOU = ms("2022-10-30 17:12:10");
  const OUTRO_IP = ms("2022-10-30 17:18:00");
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    r = await replay("2022-10-30 17:00:00", "2022-10-30 17:22:00", {
      bloquearOTse: { em: "2022-10-30 17:06:00", segundos: 600 },
      conexao: (quando) => {
        if (quando < ms("2022-10-30 17:08:00")) return NO_CABO;
        if (quando < AVIAO) return NO_CELULAR;
        if (quando < VOLTOU) return { ...NO_CELULAR, ip: null };
        if (quando < OUTRO_IP) return { ...NO_CELULAR, voltouEm: VOLTOU };
        return { ...NO_CELULAR, ip: "177.79.3.3", voltouEm: VOLTOU };
      },
    });
  }, 120_000);

  it("a cada troca ou queda da conexão, tenta uma rodada e para de novo no primeiro 403, até o bloqueio acabar", () => {
    const bloqueada = r.rodadas.find((x) => (x.respostas[403] ?? 0) > 0)!;
    const tentativas = r.rodadas.filter((x) => inicio(x) > inicio(bloqueada) && pediu(x));
    const primeiraDepois = (quando: number) => r.rodadas.find((x) => inicio(x) >= quando)!;

    expect(tentativas.slice(0, 3)).toEqual([primeiraDepois(ms("2022-10-30 17:08:00")), primeiraDepois(VOLTOU), primeiraDepois(OUTRO_IP)]);
    expect(tentativas.slice(0, 2).map((x) => x.bloqueio?.status)).toEqual([403, 403]);
    expect(tentativas.slice(2).every((x) => x.bloqueio === null && (x.respostas[403] ?? 0) === 0)).toBe(true);
    expect(r.rodadas.filter((x) => inicio(x) >= inicio(primeiraDepois(OUTRO_IP))).every(pediu)).toBe(true);
    expect(respostas403(r.rodadas)).toBeLessThanOrEqual(3 * 40);
  });

  it("sem internet, não retoma: espera a conexão voltar", () => {
    expect(r.rodadas.filter((x) => inicio(x) >= AVIAO && inicio(x) < VOLTOU).some(pediu)).toBe(false);
  });
});

describe("o bloqueio com pico acima de 50 pedidos por segundo", () => {
  // O coletor pede a 60 por segundo, e o painel mostra o pico acima de 50: depois da troca de conexão, a rodada fica em
  // 40 s até o fim da noite.
  const TROCA = ms("2022-10-30 17:08:00");
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    r = await replay("2022-10-30 17:00:00", "2022-10-30 17:30:00", {
      pedidosPorSegundo: 60,
      bloquearOTse: { em: "2022-10-30 17:05:00", segundos: 120 },
      conexao: (quando) => (quando < TROCA ? NO_CABO : NO_CELULAR),
    });
  }, 120_000);

  it("retoma com uma rodada a cada 40 s até o fim, também depois de 15 min", () => {
    const volta = r.rodadas.find((x) => inicio(x) >= TROCA)!;
    const depois = intervalos(r.rodadas.filter((x) => inicio(x) >= inicio(volta)));

    expect(Math.max(...r.rodadas.map((x) => x.picoDePedidos))).toBeGreaterThan(50);
    expect(depois.length).toBeGreaterThan(25);
    expect(depois.every((x) => x.segundos === 40)).toBe(true);
  });
});
