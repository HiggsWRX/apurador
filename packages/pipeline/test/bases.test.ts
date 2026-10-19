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

const REGIAO: Record<string, string> = Object.fromEntries(
  Object.entries({ N: "AC AM AP PA RO RR TO", NE: "AL BA CE MA PB PE PI RN SE", CO: "DF GO MS MT", SE: "ES MG RJ SP", S: "PR RS SC", Exterior: "ZZ" }).flatMap(([r, ufs]) => ufs.split(" ").map((uf) => [uf, r])),
);

describe("a base da noite de 2022: o 1º turno de 2022", () => {
  const base = ler("2022-2");

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

describe("a base da noite do 2º turno de 2018, da calibração: o 1º turno de 2018", () => {
  const base = ler("2018-2");

  it("tem os finalistas do 2º turno, Bolsonaro e Haddad, e os totais do resultado oficial do 1º turno", () => {
    expect(base.noite).toEqual({ ano: 2018, turno: 2 });
    expect(base.turnoDaBase).toEqual({ ano: 2018, turno: 1 });
    expect(base.finalistas.map((f) => f.nomeUrna)).toEqual(["JAIR BOLSONARO", "FERNANDO HADDAD"]);
    expect(noBrasil(base)).toMatchObject({ aptos: 147_306_295, validos: 107_050_749, votos: [49_277_010, 31_342_051] });
  });

  it("o perfil de chegada põe as regiões na ordem da metade das seções medida no 1º turno de 2018: Sul primeiro, Nordeste por último", () => {
    const ordem = ordemDaMetade(base, (uf) => REGIAO[uf]!).filter((r) => r !== "Exterior");

    expect(ordem.slice(0, 2)).toEqual(["S", "CO"]);
    expect(ordem.at(-1)).toBe("NE");
  });

  it("cada município tem todas as suas seções totalizadas com 100% das seções do país", () => {
    expect(base.municipios.filter((m) => m.degrausDeChegada.at(-1)?.[1] !== m.secoes)).toEqual([]);
  });
});

describe("a base da noite do 1º turno de 2026, da calibração: o 1º turno de 2022", () => {
  const base = ler("2026-1");

  it("tem os finalistas de 2026 pelos números, 22 e 13, que em 2022 são Bolsonaro e Lula", () => {
    expect(base.noite).toEqual({ ano: 2026, turno: 1 });
    expect(base.turnoDaBase).toEqual({ ano: 2022, turno: 1 });
    expect(base.finalistas.map((f) => [f.numero, f.nomeUrna])).toEqual([
      [22, "JAIR BOLSONARO"],
      [13, "LULA"],
    ]);
  });

  it("dá no Brasil o placar entre finalistas do 1º turno de 2022: 47,1 para Bolsonaro e 52,9 para Lula", () => {
    const brasil = noBrasil(base);
    const { placarEntreFinalistas } = indicadoresDaBase({ uf: "BR", municipio: 0, ...brasil, degrausDeChegada: [] });

    expect(placarEntreFinalistas!.map((p) => (100 * p).toFixed(1))).toEqual(["47.1", "52.9"]);
  });

  it("tem a geografia da noite de 2026, com Boa Esperança do Norte (MT) zerada, porque ela não votou em 2022", () => {
    expect(base.municipios.filter((m) => m.uf !== "ZZ")).toHaveLength(5_571);
    expect(base.municipios.filter((m) => m.uf === "ZZ")).toHaveLength(186);
    expect(base.municipios.find((m) => m.uf === BOA_ESPERANCA_DO_NORTE.uf && m.municipio === BOA_ESPERANCA_DO_NORTE.municipio)).toMatchObject({ aptos: 0, secoes: 0, validos: 0, degrausDeChegada: [] });
  });
});

describe("as bases por zona das noites da calibração", () => {
  // O teste da zona (Ensaio geral, decisão 16): os municípios com mais de uma zona (189 em 2018 e em 2022, 190 em
  // 2026, ticket 27) entram divididos nas zonas da noite, salvo os que mudaram de zonas desde o turno da base.
  const divididos = (base: BaseDoModelo) => new Set(base.municipios.filter((m) => m.zona !== undefined).map((m) => `${m.uf}/${m.municipio}`));

  it("dividem os 189 municípios com mais de uma zona em 2022 e em 2018, e 185 dos 190 em 2026, com base em 2022", () => {
    expect([ler("2022-2-zonas"), ler("2018-2-zonas"), ler("2026-1-zonas")].map((b) => divididos(b).size)).toEqual([189, 189, 185]);
  });

  it("deixam São Paulo inteiro em 2026, porque ele tinha 58 zonas em 2022 e tem 57", () => {
    expect(ler("2022-2-zonas").municipios.filter((m) => m.uf === "SP" && m.municipio === 71072)).toHaveLength(58);
    expect(ler("2026-1-zonas").municipios.filter((m) => m.uf === "SP" && m.municipio === 71072).map((m) => m.zona)).toEqual([undefined]);
  });

  it("somam, em cada noite, o mesmo 1º turno da base por município", () => {
    for (const noite of ["2022-2", "2018-2", "2026-1"]) expect(noBrasil(ler(`${noite}-zonas`))).toEqual(noBrasil(ler(noite)));
  });
});
