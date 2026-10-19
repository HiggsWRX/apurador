import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { indicadoresDaBase, type BaseDoModelo } from "../src/base.ts";

// Conferência das bases do modelo que estão no repositório, sem rede. As referências são os resultados
// oficiais do TSE e as medições de .scratch/apurador-2026/research/02 e 03.
const ler = (noite: string) => JSON.parse(readFileSync(new URL(`../../../dados/bases/${noite}.json`, import.meta.url), "utf8")) as BaseDoModelo;
const BOA_ESPERANCA_DO_NORTE = { uf: "MT", municipio: 73709 };

function noBrasil(base: BaseDoModelo) {
  const soma = (f: (m: BaseDoModelo["municipios"][number]) => number) => base.municipios.reduce((s, m) => s + f(m), 0);
  return { aptos: soma((m) => m.aptos), secoes: soma((m) => m.secoes), validos: soma((m) => m.validos), votos: base.finalistas.map((_, i) => soma((m) => m.votos[i]!)) };
}

/** A ordem em que os grupos de UFs chegam à metade das suas seções, pelo perfil de chegada. */
function ordemDaMetade(base: BaseDoModelo, grupo: (uf: string) => string): string[] {
  const secoes = new Map<string, number>();
  const chegadas = new Map<string, number[]>();
  for (const m of base.municipios) {
    const g = grupo(m.uf);
    secoes.set(g, (secoes.get(g) ?? 0) + m.secoes);
    const perfil = chegadas.get(g) ?? Array<number>(101).fill(0);
    indicadoresDaBase(m).perfilDeChegada.forEach((f, x) => (perfil[x]! += f * m.secoes));
    chegadas.set(g, perfil);
  }
  const metade = (g: string) => chegadas.get(g)!.findIndex((c) => 2 * c >= secoes.get(g)!);
  return [...secoes.keys()].sort((a, b) => metade(a) - metade(b));
}

describe("a base da noite de 25/10: o 1º turno de 2026", () => {
  const base = ler("2026-2");

  it("tem os finalistas, Flávio e Lula, e os totais do resultado oficial do 1º turno", () => {
    expect(base.turnoDaBase).toEqual({ ano: 2026, turno: 1 });
    expect(base.finalistas.map((f) => f.nomeUrna)).toEqual(["FLAVIO BOLSONARO", "LULA"]);
    expect(noBrasil(base)).toEqual({ aptos: 158_745_502, secoes: 499_248, validos: 119_300_788, votos: [56_104_503, 53_879_538] });
    expect(base.secoes).toBe(499_248);
  });

  it("dá no Brasil o placar entre finalistas de 51,0 para Flávio e 49,0 para Lula", () => {
    const brasil = noBrasil(base);
    const { placarEntreFinalistas } = indicadoresDaBase({ uf: "BR", municipio: 0, ...brasil, degrausDeChegada: [] });

    expect(placarEntreFinalistas!.map((p) => (100 * p).toFixed(1))).toEqual(["51.0", "49.0"]);
  });

  it("tem os 5.571 municípios e os 186 postos do Exterior, com Boa Esperança do Norte (MT)", () => {
    expect(base.municipios.filter((m) => m.uf !== "ZZ")).toHaveLength(5_571);
    expect(base.municipios.filter((m) => m.uf === "ZZ")).toHaveLength(186);
    expect(base.municipios.find((m) => m.uf === BOA_ESPERANCA_DO_NORTE.uf && m.municipio === BOA_ESPERANCA_DO_NORTE.municipio)).toMatchObject({ aptos: 4_326, secoes: 13 });
  });

  it("o perfil de chegada põe as UFs na ordem da metade das seções medida no 1º turno de 2026", () => {
    const ordem = ordemDaMetade(base, (uf) => uf).filter((uf) => uf !== "ZZ");

    expect(ordem.slice(0, 4)).toEqual(["DF", "TO", "MS", "PR"]);
    expect(ordem.slice(-4)).toEqual(["RJ", "BA", "CE", "AL"]);
  });

  it("cada município tem todas as suas seções totalizadas com 100% das seções do país", () => {
    const incompletos = base.municipios.filter((m) => m.degrausDeChegada.at(-1)?.[1] !== m.secoes);

    expect(incompletos).toEqual([]);
  });
});

describe("a base da noite de 2022: o 1º turno de 2022", () => {
  const base = ler("2022-2");
  const REGIAO: Record<string, string> = Object.fromEntries(
    Object.entries({ N: "AC AM AP PA RO RR TO", NE: "AL BA CE MA PB PE PI RN SE", CO: "DF GO MS MT", SE: "ES MG RJ SP", S: "PR RS SC", Exterior: "ZZ" }).flatMap(([r, ufs]) => ufs.split(" ").map((uf) => [uf, r])),
  );

  it("tem os finalistas do 2º turno, Lula e Bolsonaro, e os totais do resultado oficial do 1º turno", () => {
    expect(base.turnoDaBase).toEqual({ ano: 2022, turno: 1 });
    expect(base.finalistas.map((f) => f.nomeUrna)).toEqual(["LULA", "JAIR BOLSONARO"]);
    expect(noBrasil(base)).toEqual({ aptos: 156_454_011, secoes: 472_075, validos: 118_229_719, votos: [57_259_504, 51_072_345] });
  });

  it("tem os 5.570 municípios de 2022 e os 181 postos do Exterior, sem Boa Esperança do Norte, que só vota a partir de 2026", () => {
    expect(base.municipios.filter((m) => m.uf !== "ZZ")).toHaveLength(5_570);
    expect(base.municipios.filter((m) => m.uf === "ZZ")).toHaveLength(181);
    expect(base.municipios.find((m) => m.municipio === BOA_ESPERANCA_DO_NORTE.municipio)).toBeUndefined();
  });

  it("o perfil de chegada põe as regiões na ordem da metade das seções medida no 1º turno de 2022", () => {
    expect(ordemDaMetade(base, (uf) => REGIAO[uf]!).filter((r) => r !== "Exterior")).toEqual(["CO", "S", "N", "SE", "NE"]);
  });
});
