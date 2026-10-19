import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dataHoraDoInstante, instanteDaNoite, lerNoite, reproduzir, type Noite, type Recorte } from "../src/noite.ts";

// O replay da noite do 2º turno de 2022 a partir da sequência que está no repositório, sem rede, como o
// modelo, o TSE falso e o replay do CI a usam. As referências são o histórico oficial de totalização do TSE
// (Historico_Totalizacao_Presidente_BR_2T_2022), o resultado oficial e a medição da narração de 2022
// (.scratch/apurador-2026/research/14-narracao-noite-2t-2022.md).
const ARQUIVO = new URL("../../../dados/noites/2022-2.json.gz", import.meta.url);
const noite = lerNoite(new Uint8Array(readFileSync(ARQUIVO)));
const LULA = noite.candidatos.findIndex((c) => c.nomeUrna === "LULA");
const BOLSONARO = noite.candidatos.findIndex((c) => c.nomeUrna === "JAIR BOLSONARO");

const pct = (parte: number, todo: number) => ((100 * parte) / todo).toFixed(2);
const hora = (instante: number) => dataHoraDoInstante(noite, instante).slice(11);
const lulaPct = (t: { votos: number[] }) => pct(t.votos[LULA]!, t.votos[LULA]! + t.votos[BOLSONARO]!);

/** Percorre a noite instante a instante, ao segundo, com o acumulado do recorte em cada um. */
function* instantes(n: Noite, recorte: Recorte = {}) {
  const r = reproduzir(n);
  const total = r.total(recorte);
  for (const instante of new Set(n.chegadas.map((c) => c.instante))) {
    r.avancarAte(instante);
    yield { instante, apurado: r.apurado(recorte), total };
  }
}

describe("a noite do 2º turno de 2022 reconstruída", () => {
  it("às 18:44:04, com 67,76% das seções, Lula está à frente, como no histórico oficial", () => {
    const r = reproduzir(noite);

    r.avancarAte(instanteDaNoite(noite, "2022-10-30 18:44:04"));
    const brasil = r.apurado();

    expect(brasil.secoes).toBe(319_895);
    expect(pct(brasil.secoes, r.total().secoes)).toBe("67.76");
    expect(brasil.votos[LULA]).toBe(40_083_190);
    expect(brasil.votos[BOLSONARO]).toBe(40_074_362);
    expect(lulaPct(brasil)).toBe("50.01");
  });

  it("a liderança troca nos mesmos segundos do histórico oficial, e Lula não sai mais da frente depois das 18:44:50", () => {
    const trocas: [string, string, string][] = [];
    let lider: number | undefined;
    for (const { instante, apurado, total } of instantes(noite)) {
      const agora = apurado.votos[LULA]! > apurado.votos[BOLSONARO]! ? LULA : apurado.votos[BOLSONARO]! > apurado.votos[LULA]! ? BOLSONARO : lider;
      if (lider !== undefined && agora !== lider) trocas.push([hora(instante), pct(apurado.secoes, total.secoes), noite.candidatos[agora!]!.nomeUrna]);
      lider = agora;
    }

    expect(trocas).toEqual([
      ["17:07:59", "0.25", "JAIR BOLSONARO"],
      ["18:42:53", "66.78", "LULA"],
      ["18:42:58", "66.85", "JAIR BOLSONARO"],
      ["18:43:50", "67.59", "LULA"],
      ["18:44:48", "68.32", "JAIR BOLSONARO"],
      ["18:44:50", "68.32", "LULA"],
    ]);
  });

  it("passa pelos marcos do Brasil na hora e com o placar da medição de 2022", () => {
    const marcos = [1, 5, 10, 25, 50, 75, 90, 95, 99];
    const vistos: [number, string, string][] = [];
    for (const { instante, apurado, total } of instantes(noite)) {
      while (marcos.length > 0 && 100 * apurado.secoes >= marcos[0]! * total.secoes) vistos.push([marcos.shift()!, hora(instante), lulaPct(apurado)]);
    }

    expect(vistos).toEqual([
      [1, "17:14:17", "43.68"],
      [5, "17:25:47", "46.71"],
      [10, "17:33:41", "47.99"],
      [25, "17:55:43", "48.74"],
      [50, "18:26:53", "49.69"],
      [75, "18:51:36", "50.17"],
      [90, "19:09:26", "50.53"],
      [95, "19:23:45", "50.66"],
      [99, "20:00:46", "50.84"],
    ]);
  });

  it("termina às 00:18:04 de 31/10 com o resultado oficial: Lula com 50,90% dos votos válidos", () => {
    const r = reproduzir(noite);

    r.avancarAte(Infinity);
    const brasil = r.apurado();

    expect(dataHoraDoInstante(noite, brasil.ultimaTotalizacao!)).toBe("2022-10-31 00:18:04");
    expect(brasil).toMatchObject({ secoes: 472_075, aptos: 156_454_011, votantes: 124_252_796, brancos: 1_769_678, nulos: 3_930_765 });
    expect(r.total()).toEqual({ secoes: 472_075, aptos: 156_454_011 });
    expect(brasil.votos[LULA]).toBe(60_345_999);
    expect(brasil.votos[BOLSONARO]).toBe(58_206_354);
    expect(lulaPct(brasil)).toBe("50.90");
  });

  it("cada UF e o Exterior chegam à metade e ao fim na hora e com o placar da medição de 2022", () => {
    // UF: [Lula no fim, hora de 50% das seções da UF, hora de 100%]
    const medicao: Record<string, [string, string, string]> = {
      AC: ["29.70", "17:47:06", "22:29:40"],
      AL: ["58.68", "18:43:56", "20:08:20"],
      AM: ["51.10", "17:52:44", "00:18:04"],
      AP: ["48.64", "18:08:21", "22:55:00"],
      BA: ["72.12", "18:29:23", "21:48:48"],
      CE: ["69.97", "18:32:21", "20:50:55"],
      DF: ["41.19", "17:19:37", "19:59:37"],
      ES: ["41.96", "17:51:49", "19:09:24"],
      GO: ["41.29", "18:12:57", "21:37:51"],
      MA: ["71.14", "18:40:09", "22:13:48"],
      MG: ["50.20", "18:42:24", "21:44:29"],
      MS: ["40.51", "17:43:15", "19:12:48"],
      MT: ["34.92", "17:54:39", "20:42:08"],
      PA: ["54.75", "18:02:21", "22:57:09"],
      PB: ["66.62", "17:57:09", "19:45:25"],
      PE: ["66.93", "18:40:41", "21:02:57"],
      PI: ["76.86", "18:13:00", "22:21:14"],
      PR: ["37.60", "17:52:33", "21:49:54"],
      RJ: ["43.47", "18:37:54", "20:44:21"],
      RN: ["65.10", "18:03:09", "20:05:07"],
      RO: ["29.34", "18:16:26", "19:59:38"],
      RR: ["23.92", "18:19:15", "20:58:34"],
      RS: ["43.65", "18:13:18", "20:33:28"],
      SC: ["30.73", "18:43:59", "21:16:06"],
      SE: ["67.21", "18:24:06", "19:53:06"],
      SP: ["44.76", "18:38:10", "21:37:55"],
      TO: ["51.36", "17:27:15", "19:37:46"],
      ZZ: ["51.28", "17:00:55", "22:31:49"],
    };

    const reconstruida: Record<string, [string, string, string]> = {};
    for (const uf of Object.keys(medicao)) {
      let metade = "";
      let fim = { votos: [0, 0] };
      for (const { instante, apurado, total } of instantes(noite, { uf })) {
        if (!metade && 2 * apurado.secoes >= total.secoes) metade = hora(instante);
        fim = apurado;
      }
      const r = reproduzir(noite);
      r.avancarAte(Infinity);
      reconstruida[uf] = [lulaPct(fim), metade, hora(r.apurado({ uf }).ultimaTotalizacao!)];
    }

    expect(reconstruida).toEqual(medicao);
  });

  it("tem as zonas dos municípios com mais de uma, como as 58 de São Paulo", () => {
    const zonasDeSaoPaulo = noite.zonas.filter((z) => z.uf === "SP" && z.municipio === 71072);
    const r = reproduzir(noite);
    r.avancarAte(Infinity);

    expect(zonasDeSaoPaulo).toHaveLength(58);
    expect(zonasDeSaoPaulo.reduce((s, z) => s + r.apurado(z).votos[LULA]!, 0)).toBe(r.apurado({ uf: "SP", municipio: 71072 }).votos[LULA]);
  });

  it("é compacta o bastante para o repositório: menos de 2 MB", () => {
    expect(statSync(ARQUIVO).size).toBeLessThan(2_000_000);
  });
});
