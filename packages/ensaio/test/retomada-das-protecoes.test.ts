import { beforeAll, describe, expect, it } from "vitest";
import { lerEstadoGuardado, type RegistroDaRodada } from "@apurador/coletor";
import { chegaram, noColetor, noiteComQuedas, type Noite } from "./noite-com-quedas.ts";

// A noite com quedas (`noite-com-quedas.ts`) com as proteções do coletor (Operação na noite, decisão 12; Volume de
// gravações na noite, decisão 8): o estado delas sobrevive à queda, e o objeto da noite fica no disco pelo celular.

describe("uma queda parada no bloqueio", () => {
  // O TSE falso responde 403 por 2 min a partir das 17:05, e o coletor para de pedir. Ele cai às 17:07 e volta do disco,
  // ainda no cabo, com o bloqueio já acabado: não pede de novo, porque não tem como saber. O dono puxa o cabo às 17:10,
  // e o coletor retoma com a rodada de 40 s; cai de novo às 17:14 e volta do disco, ainda com ela.
  const DE = "2022-10-30 17:00:00";
  const TROCA = "2022-10-30 17:10:00";
  let r: Noite;
  beforeAll(async () => {
    r = await noiteComQuedas(
      DE,
      "2022-10-30 17:20:00",
      [
        { em: "2022-10-30 17:07:00", de: "disco" },
        { em: "2022-10-30 17:14:00", de: "disco" },
      ],
      undefined,
      {
        bloquearOTse: { em: "2022-10-30 17:05:00", segundos: 120 },
        conexao: (quando) =>
          quando < noColetor(DE, TROCA) ? { ip: "200.160.1.1", voltouEm: null, via: "cabo" } : { ip: "177.79.2.2", voltouEm: null, via: "celular" },
      },
    );
  }, 300_000);

  it("volta parado: não pede nada ao TSE até a conexão mudar, e daí segue com a rodada de 40 s, também depois de outra queda", () => {
    const inicio = (x: RegistroDaRodada) => Date.parse(x.inicio);
    const primeiraVolta = r.rodadas[r.voltas[0]!.rodada]!;
    const troca = r.rodadas.find((x) => inicio(x) >= noColetor(DE, TROCA))!;
    const paradas = r.rodadas.filter((x) => inicio(x) >= inicio(primeiraVolta) && inicio(x) < inicio(troca));
    const depois = r.rodadas.filter((x) => inicio(x) >= inicio(troca));

    expect(paradas.length).toBeGreaterThan(5);
    expect(paradas.map((x) => [x.pedidos, x.bloqueio?.status])).toEqual(paradas.map(() => [0, 403]));
    expect(troca.pedidos).toBeGreaterThan(0);
    expect(r.voltas[1]!.rodada).toBeGreaterThan(r.rodadas.indexOf(troca));
    expect(depois.slice(1).map((x, i) => inicio(x) - inicio(depois[i]!))).toEqual(depois.slice(1).map(() => 40_000));
  });
});

describe("o objeto da noite pelo celular", () => {
  // O dono passa ao celular às 17:05 e volta ao cabo às 17:12 (Volume de gravações na noite, decisão 8): o objeto da
  // noite fica no disco, e o primeiro no cabo leva os arquivos do TSE que chegaram nesse tempo. O coletor cai às 17:08,
  // pelo celular, e volta do disco, com os arquivos que esperavam.
  const DE = "2022-10-30 17:00:00";
  let r: Noite;
  beforeAll(async () => {
    r = await noiteComQuedas(DE, "2022-10-30 17:16:00", [{ em: "2022-10-30 17:08:00", de: "disco" }], undefined, {
      conexao: (quando) => ({
        ip: "200.160.1.1",
        voltouEm: null,
        via: quando >= noColetor(DE, "2022-10-30 17:05:00") && quando < noColetor(DE, "2022-10-30 17:12:00") ? "celular" : "cabo",
      }),
    });
  }, 300_000);

  it("não grava objeto da noite pelo celular, e o primeiro no cabo leva todos os arquivos do TSE que chegaram desde o último", () => {
    const inicio = (x: RegistroDaRodada) => Date.parse(x.inicio);
    const noCelular = r.rodadas.filter((x) => inicio(x) >= noColetor(DE, "2022-10-30 17:05:00") && inicio(x) < noColetor(DE, "2022-10-30 17:12:00"));
    const deVolta = r.rodadas[r.rodadas.indexOf(noCelular.at(-1)!) + 1]!;
    const objeto = lerEstadoGuardado(r.objetos.find((o) => o.numero === deVolta.numero)!.json);
    const esperavam = chegaram([...noCelular, deVolta]);

    expect(noCelular.length).toBeGreaterThan(15);
    expect(noCelular.map((x) => x.objetoDaNoite)).toEqual(noCelular.map(() => "no disco"));
    expect(r.objetos.filter((o) => noCelular.some((x) => x.numero === o.numero))).toEqual([]);
    expect(deVolta.objetoDaNoite).toBe("gravado");
    expect(esperavam).toBeGreaterThan(500);
    expect(objeto.arquivos.length).toBe(esperavam);
  });
});
