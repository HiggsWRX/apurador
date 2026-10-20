import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dataHoraDoInstante, instanteDaNoite, lerNoite, reproduzir, type Noite } from "../src/noite.ts";
import type { Turno } from "../src/turno.ts";
import { marcos } from "./marcos.ts";

// O replay das noites da calibração (2º turno de 2018 e 1º turno de 2026) a partir das sequências que estão
// no repositório, sem rede. As referências são o resultado oficial do TSE e as parciais publicadas na noite,
// conferidas na linha do tempo (.scratch/apurador-2026/research/02-linha-do-tempo-apuracoes-passadas.md).
const DADOS = new URL("../../../dados/", import.meta.url);
const arquivo = (noite: string) => new URL(`noites/${noite}.json.gz`, DADOS);
const lidas = new Map<string, Noite>();
const ler = (noite: string) => {
  if (!lidas.has(noite)) lidas.set(noite, lerNoite(new Uint8Array(readFileSync(arquivo(noite)))));
  return lidas.get(noite)!;
};

const pct = (parte: number, todo: number) => ((100 * parte) / todo).toFixed(2);
const validos = (t: { votos: number[] }) => t.votos.reduce((s, v) => s + v, 0);

describe("a noite do 2º turno de 2018 reconstruída", () => {
  const noite = ler("2018-2");
  const BOLSONARO = noite.candidatos.findIndex((c) => c.nomeUrna === "JAIR BOLSONARO");
  const HADDAD = noite.candidatos.findIndex((c) => c.nomeUrna === "FERNANDO HADDAD");

  it("às 19h18, com 94,44% das seções, repete a parcial que definiu o resultado, com Bolsonaro em 55,54%", () => {
    // Agência Brasil: o resultado foi "definido às 19h18, com 94,44% das urnas apuradas".
    const r = reproduzir(noite);

    r.avancarAte(instanteDaNoite(noite, "2018-10-28 19:18:00"));
    const brasil = r.apurado();

    expect(pct(brasil.secoes, r.total().secoes)).toBe("94.44");
    expect(pct(brasil.votos[BOLSONARO]!, validos(brasil))).toBe("55.54");
  });

  it("é a noite inteira: começa antes da divulgação, que abriu às 19h com 88,5% das seções já totalizadas", () => {
    const r = reproduzir(noite);
    r.avancarAte(instanteDaNoite(noite, "2018-10-28 19:00:00"));

    expect(pct(r.apurado().secoes, r.total().secoes)).toBe("88.47");
    expect(marcos(noite, [1, 50, 90, 99])).toEqual([
      [1, "17:18"],
      [50, "18:10"],
      [90, "19:02"],
      [99, "20:07"],
    ]);
  });

  it("termina com o resultado oficial: Bolsonaro com 55,13% e Haddad com 44,87% dos votos válidos", () => {
    const r = reproduzir(noite);

    r.avancarAte(Infinity);
    const brasil = r.apurado();

    expect(brasil).toMatchObject({ aptos: 147_306_294, votantes: 115_933_451, brancos: 2_486_593, nulos: 8_608_105 });
    expect(validos(brasil)).toBe(104_838_753);
    expect([brasil.votos[BOLSONARO], brasil.votos[HADDAD]]).toEqual([57_797_847, 47_040_906]);
    expect([pct(brasil.votos[BOLSONARO]!, validos(brasil)), pct(brasil.votos[HADDAD]!, validos(brasil))]).toEqual(["55.13", "44.87"]);
    expect(r.total()).toEqual({ secoes: 454_490, aptos: 147_306_294 });
    expect(brasil.secoes).toBe(454_490);
    // As últimas 8 seções só foram totalizadas em 25/02/2019.
    expect(dataHoraDoInstante(noite, brasil.ultimaTotalizacao!).slice(0, 10)).toBe("2019-02-25");
  });
});

describe("a noite do 1º turno de 2026 reconstruída", () => {
  const noite = ler("2026-1");
  const FLAVIO = noite.candidatos.findIndex((c) => c.nomeUrna === "FLAVIO BOLSONARO");
  const LULA = noite.candidatos.findIndex((c) => c.nomeUrna === "LULA");

  it("às 18:11:38, com 17,22% das seções, repete a parcial publicada: Flávio com 51,22% e Lula com 40,66%", () => {
    // BNews: "18h11min38s", 17,22% das seções, Flávio 51,22%, Lula 40,66%.
    const r = reproduzir(noite);

    r.avancarAte(instanteDaNoite(noite, "2026-10-04 18:11:38"));
    const brasil = r.apurado();

    expect(pct(brasil.secoes, r.total().secoes)).toBe("17.22");
    expect([pct(brasil.votos[FLAVIO]!, validos(brasil)), pct(brasil.votos[LULA]!, validos(brasil))]).toEqual(["51.22", "40.66"]);
  });

  it("passa pelos marcos do % de seções na hora medida na linha do tempo", () => {
    expect(marcos(noite, [1, 50, 90, 99])).toEqual([
      [1, "17:21"],
      [50, "18:47"],
      [90, "20:16"],
      [99, "21:14"],
    ]);
  });

  it("termina com o resultado oficial: Flávio com 47,03% e Lula com 45,16% dos votos válidos, com os nulos técnicos como nulos", () => {
    const r = reproduzir(noite);

    r.avancarAte(Infinity);
    const brasil = r.apurado();

    expect(dataHoraDoInstante(noite, brasil.ultimaTotalizacao!).slice(0, 16)).toBe("2026-10-05 02:58");
    expect(brasil).toMatchObject({ secoes: 499_248, aptos: 158_745_502, votantes: 125_275_835, brancos: 2_300_798, nulos: 3_674_249 });
    expect(validos(brasil)).toBe(119_300_788);
    expect([brasil.votos[FLAVIO], brasil.votos[LULA]]).toEqual([56_104_503, 53_879_538]);
    expect([pct(brasil.votos[FLAVIO]!, validos(brasil)), pct(brasil.votos[LULA]!, validos(brasil))]).toEqual(["47.03", "45.16"]);
  });
});

describe("as noites da calibração no repositório", () => {
  it.each(["2018-2", "2026-1"])("a noite %s é compacta como a de 2022: menos de 2 MB", (nome) => {
    expect(statSync(arquivo(nome)).size).toBeLessThan(2_000_000);
  });

  const manifesto = JSON.parse(readFileSync(new URL("manifesto.json", DADOS), "utf8")) as { derivados: { arquivo: string; fontes: string[] }[] };
  const fontes = (derivado: string) => manifesto.derivados.find((d) => d.arquivo === derivado)!.fontes.map((url) => url.split("/").pop());

  it("o manifesto diz de onde veio cada uma: a hora do detalhe por seção e os votos do boletim de urna de 2018 ou da votação por seção de 2026", () => {
    expect(fontes("noites/2018-2.json.gz")).toContain("detalhe_votacao_secao_2018.zip");
    expect(fontes("noites/2018-2.json.gz").filter((f) => /^BWEB_2t_[A-Z]{2}_301020181744\.zip$/.test(f!))).toHaveLength(28);
    expect(fontes("noites/2026-1.json.gz")).toEqual(expect.arrayContaining(["detalhe_votacao_secao_2026.zip", "votacao_secao_2026_BR.zip"]));
  });

  it("a base do 1º turno de 2026 vem do 1º turno de 2022, com os finalistas e a geografia de 2026", () => {
    expect(fontes("bases/2026-1.json").sort()).toEqual([
      "detalhe_votacao_munzona_2022.zip",
      "detalhe_votacao_munzona_2026.zip",
      "detalhe_votacao_secao_2022.zip",
      "detalhe_votacao_secao_2026.zip",
      "votacao_candidato_munzona_2022.zip",
      "votacao_candidato_munzona_2026.zip",
    ]);
  });
});

describe("as zonas nas três noites da calibração", () => {
  /** As zonas de cada município (ou posto do Exterior) da noite. */
  function zonasPorMunicipio(noite: Noite): Map<string, Noite["zonas"]> {
    const porMunicipio = new Map<string, Noite["zonas"]>();
    for (const z of noite.zonas) porMunicipio.set(`${z.uf}/${z.municipio}`, [...(porMunicipio.get(`${z.uf}/${z.municipio}`) ?? []), z]);
    return porMunicipio;
  }

  // Os municípios com mais de uma zona: 189 em 2022 (medidos no ticket 06, e os mesmos em 2018) e 190 em 2026,
  // com São Paulo em 58 e 57.
  it.each([
    { noite: "2018-2", municipios: 189, saoPaulo: 58 },
    { noite: "2022-2", municipios: 189, saoPaulo: 58 },
    { noite: "2026-1", municipios: 190, saoPaulo: 57 },
  ])("a noite $noite traz as zonas dos $municipios municípios com mais de uma", ({ noite: nome, municipios, saoPaulo }) => {
    const zonas = zonasPorMunicipio(ler(nome));

    expect([...zonas.values()].filter((z) => z.length > 1 && z[0]!.uf !== "ZZ")).toHaveLength(municipios);
    expect(zonas.get("SP/71072")).toHaveLength(saoPaulo);
  });

  it.each(["2018-2", "2022-2", "2026-1"])("na noite %s, as zonas de cada município com mais de uma somam, no fim, o resultado oficial do município", (nome) => {
    // O resultado oficial por município é o dos turnos (`dados/turnos/`), que o outro gerador tira do munzona.
    const noite = ler(nome);
    const oficial = JSON.parse(readFileSync(new URL(`turnos/${nome}.json`, DADOS), "utf8")) as Turno;
    const r = reproduzir(noite);
    r.avancarAte(Infinity);
    const difere: string[] = [];

    for (const zonas of [...zonasPorMunicipio(noite).values()].filter((z) => z.length > 1)) {
      const somar = (valor: (t: ReturnType<typeof r.apurado>) => number) => zonas.reduce((s, z) => s + valor(r.apurado(z)), 0);
      const naNoite = [somar((t) => t.votantes), somar((t) => t.brancos), somar((t) => t.nulos), ...oficial.candidatos.map((c) => somar((t) => t.votos[noite.candidatos.findIndex((n) => n.numero === c.numero)]!))];
      const o = oficial.lugares[String(zonas[0]!.municipio).padStart(5, "0")]!;
      if (naNoite.join() !== [o.votantes, o.brancos, o.nulos, ...o.votos].join()) difere.push(`${zonas[0]!.uf}/${zonas[0]!.municipio}`);
    }

    expect(difere).toEqual([]);
  });
});
