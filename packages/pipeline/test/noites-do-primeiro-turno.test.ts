import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dataHoraDoInstante, instanteDaNoite, lerNoite, reproduzir, type Noite } from "../src/noite.ts";
import { marcos } from "./marcos.ts";

// O replay das noites do 1º turno de 2018 e de 2022, que a curva de comparação usa, a partir das sequências que estão
// no repositório, sem rede. As referências são o resultado oficial do TSE, o histórico oficial de totalização do 1º
// turno de 2022 (Historico_Totalizacao_Presidente_BR_1T_2022) e a tabela da linha do tempo
// (.scratch/apurador-2026/research/02-linha-do-tempo-apuracoes-passadas.md), medida no detalhe por seção.
const DADOS = new URL("../../../dados/", import.meta.url);
const arquivo = (noite: string) => new URL(`noites/${noite}.json.gz`, DADOS);
const ler = (noite: string): Noite => lerNoite(new Uint8Array(readFileSync(arquivo(noite))));

const pct = (parte: number, todo: number) => ((100 * parte) / todo).toFixed(2);
const validos = (t: { votos: number[] }) => t.votos.reduce((s, v) => s + v, 0);
const posicao = (n: Noite, nomeUrna: string) => n.candidatos.findIndex((c) => c.nomeUrna === nomeUrna);

describe("a noite do 1º turno de 2022 reconstruída", () => {
  const noite = ler("2022-1");
  const LULA = posicao(noite, "LULA");
  const BOLSONARO = posicao(noite, "JAIR BOLSONARO");

  // Os instantes em que o histórico oficial passa de 1%, 50%, 90% e 99% das seções, com o acumulado de cada um.
  it.each([
    { marco: 1, hora: "17:38:34", secoes: 4_721, pct: "1.00", lula: 482_757, bolsonaro: 565_010 },
    { marco: 50, hora: "19:35:33", secoes: 236_706, pct: "50.14", lula: 25_694_174, bolsonaro: 26_678_774 },
    { marco: 90, hora: "20:30:16", secoes: 424_918, pct: "90.01", lula: 50_046_515, bolsonaro: 47_055_047 },
    { marco: 99, hora: "22:15:58", secoes: 467_363, pct: "99.00", lula: 56_449_469, bolsonaro: 50_827_649 },
  ])("passa de $marco% às $hora, com $pct% das seções, como o histórico oficial", ({ marco, hora, secoes, pct: esperado, lula, bolsonaro }) => {
    const r = reproduzir(noite);

    r.avancarAte(instanteDaNoite(noite, `2022-10-02 ${hora}`) - 1);
    const umSegundoAntes = r.apurado().secoes;
    r.avancarAte(instanteDaNoite(noite, `2022-10-02 ${hora}`));
    const brasil = r.apurado();

    expect(100 * umSegundoAntes).toBeLessThan(marco * r.total().secoes);
    expect(brasil.secoes).toBe(secoes);
    expect(pct(brasil.secoes, r.total().secoes)).toBe(esperado);
    expect([brasil.votos[LULA], brasil.votos[BOLSONARO]]).toEqual([lula, bolsonaro]);
  });

  it("termina às 10:27 de 04/10 com o resultado oficial: Lula com 48,43% e Bolsonaro com 43,20% dos votos válidos", () => {
    const r = reproduzir(noite);

    r.avancarAte(Infinity);
    const brasil = r.apurado();

    expect(dataHoraDoInstante(noite, brasil.ultimaTotalizacao!).slice(0, 16)).toBe("2022-10-04 10:27");
    expect(brasil).toMatchObject({ secoes: 472_075, aptos: 156_454_011, votantes: 123_682_372, brancos: 1_964_779, nulos: 3_487_874 });
    expect(validos(brasil)).toBe(118_229_719);
    expect([brasil.votos[LULA], brasil.votos[BOLSONARO]]).toEqual([57_259_504, 51_072_345]);
    expect([pct(brasil.votos[LULA]!, validos(brasil)), pct(brasil.votos[BOLSONARO]!, validos(brasil))]).toEqual(["48.43", "43.20"]);
  });
});

describe("a noite do 1º turno de 2018 reconstruída", () => {
  const noite = ler("2018-1");
  const BOLSONARO = posicao(noite, "JAIR BOLSONARO");
  const HADDAD = posicao(noite, "FERNANDO HADDAD");

  it("é a noite inteira: a divulgação abriu às 19h com 57,17% das seções já totalizadas", () => {
    const r = reproduzir(noite);
    r.avancarAte(instanteDaNoite(noite, "2018-10-07 19:00:00"));

    expect(pct(r.apurado().secoes, r.total().secoes)).toBe("57.17");
  });

  it("passa pelos marcos do % de seções na hora medida na linha do tempo", () => {
    expect(marcos(noite, [1, 50, 90, 99])).toEqual([
      [1, "17:26"],
      [50, "18:49"],
      [90, "20:11"],
      [99, "21:59"],
    ]);
  });

  it("termina em 23/10 com o resultado oficial: Bolsonaro com 46,03% e Haddad com 29,28% dos votos válidos", () => {
    const r = reproduzir(noite);

    r.avancarAte(Infinity);
    const brasil = r.apurado();

    expect(dataHoraDoInstante(noite, brasil.ultimaTotalizacao!).slice(0, 10)).toBe("2018-10-23");
    expect(brasil).toMatchObject({ secoes: 454_490, votantes: 117_364_654, brancos: 3_106_937 });
    expect(validos(brasil)).toBe(107_050_749);
    expect([brasil.votos[BOLSONARO], brasil.votos[HADDAD]]).toEqual([49_277_010, 31_342_051]);
    expect([pct(brasil.votos[BOLSONARO]!, validos(brasil)), pct(brasil.votos[HADDAD]!, validos(brasil))]).toEqual(["46.03", "29.28"]);
  });
});

describe("as noites do 1º turno no repositório", () => {
  it.each(["2018-1", "2022-1"])("a noite %s é compacta como as outras: menos de 2 MB", (nome) => {
    expect(statSync(arquivo(nome)).size).toBeLessThan(2_000_000);
  });

  const manifesto = JSON.parse(readFileSync(new URL("manifesto.json", DADOS), "utf8")) as { derivados: { arquivo: string; fontes: string[] }[] };
  const fontes = (derivado: string) => manifesto.derivados.find((d) => d.arquivo === derivado)!.fontes.map((url) => url.split("/").pop());

  it.each([2018, 2022])("o manifesto diz de onde veio a de %i: a hora do detalhe por seção e os votos da votação por seção", (ano) => {
    expect(fontes(`noites/${ano}-1.json.gz`)).toEqual(expect.arrayContaining([`detalhe_votacao_secao_${ano}.zip`, `votacao_secao_${ano}_BR.zip`]));
  });
});
