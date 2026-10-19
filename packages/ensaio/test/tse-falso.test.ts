import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { criarTseFalso, relogioManual, type Resposta } from "../src/index.ts";
import { cadastro, instante, noite } from "./noite-2022.ts";

// O TSE falso servindo a noite do 2º turno de 2022 no formato da divulgação de 2026, com o relógio na mão do
// teste (a velocidade máxima do replay). As referências são o histórico oficial de totalização de 2022, o
// resultado oficial (dados/turnos/2022-2.json) e a medição da narração de 2022
// (.scratch/apurador-2026/research/14-narracao-noite-2t-2022.md).

const BASE = "/oficial/ele2026/6258";
const BRASIL = `${BASE}/dados/br/br-c0001-e006258-u.json`;
const u = (uf: string, lugar = "") => `${BASE}/dados/${uf}/${uf}${lugar}-c0001-e006258-u.json`;
const ab = (uf: string) => `${BASE}/dados/${uf}/${uf}-e006258-ab.json`;

/** O resultado oficial do 2º turno de 2022 por lugar, com os votos de Lula e de Bolsonaro, nessa ordem. */
const oficial = (
  JSON.parse(readFileSync(new URL("../../../dados/turnos/2022-2.json", import.meta.url), "utf8")) as {
    lugares: Record<string, { aptos: number; votantes: number; brancos: number; nulos: number; validos: number; votos: [number, number] }>;
  }
).lugares;

function tseFalsoAs(dataHora: string) {
  const relogio = relogioManual(instante(dataHora));
  return { relogio, tse: criarTseFalso({ noite, cadastro, relogio }) };
}

/** Um arquivo do TSE, lido campo a campo: nos testes, `any` deixa ler o JSON como os campos do TSE são. */
type Arquivo = Record<string, any>;

const corpo = (r: Resposta): Arquivo => JSON.parse(new TextDecoder().decode(r.cabecalhos["content-encoding"] === "gzip" ? gunzipSync(r.corpo) : r.corpo));

/** O arquivo servido num caminho, no instante em que o relógio está. */
function arquivo(tse: { responder: (p: { url: string }) => Resposta }, caminho: string): Arquivo {
  const r = tse.responder({ url: caminho });
  expect(r.status, caminho).toBe(200);
  return corpo(r);
}

/** Os candidatos de um arquivo de resultado, pelo nome de urna. */
function candidatos(a: Arquivo): Record<string, Record<string, string>> {
  const lista: Arquivo[] = a.carg.flatMap((c: Arquivo) => c.agr.flatMap((g: Arquivo) => g.par.flatMap((p: Arquivo) => p.cand)));
  return Object.fromEntries(lista.map((c) => [c.nmu, c]));
}

/** O item de um lugar num índice `-ab.json`. */
const item = (indice: Arquivo, cdabr: string): Arquivo => indice.abr.find((i: Arquivo) => i.cdabr === cdabr);

describe("o arquivo do Brasil", () => {
  it("às 18:44:04 traz o placar do histórico oficial: 67,76% das seções e Lula à frente", () => {
    const { tse } = tseFalsoAs("2022-10-30 18:44:04");

    const brasil = arquivo(tse, BRASIL);

    expect(brasil).toMatchObject({ ele: "6258", t: "2", tpabr: "br", cdabr: "br", dt: "30/10/2022", ht: "18:44:04", tf: "n", and: "p" });
    expect(brasil.s).toMatchObject({ ts: "472075", st: "319895", pst: "67,76" });
    expect(candidatos(brasil)["LULA"]).toMatchObject({ n: "13", vap: "40083190", pvap: "50,01" });
    expect(candidatos(brasil)["JAIR BOLSONARO"]).toMatchObject({ n: "22", vap: "40074362", pvap: "49,99" });
  });

  it("vem com o cabeçalho Date do relógio do TSE falso, em 2022", () => {
    const { tse } = tseFalsoAs("2022-10-30 18:44:04");

    expect(tse.responder({ url: BRASIL }).cabecalhos["date"]).toBe("Sun, 30 Oct 2022 21:44:04 GMT");
  });

  it("antes das 17h vem zerado, sem hora de totalização e com o andamento não iniciado", () => {
    const { tse } = tseFalsoAs("2022-10-30 16:59:59");

    const brasil = arquivo(tse, BRASIL);

    expect(brasil).toMatchObject({ dt: "", ht: "", tf: "n", and: "n" });
    expect(brasil.s).toMatchObject({ ts: "472075", st: "0", pst: "0,00" });
    expect(brasil.e).toMatchObject({ te: "156454011", est: "0", c: "0" });
    expect(brasil.v).toMatchObject({ tv: "0", vv: "0", vb: "0", tvn: "0" });
    expect(Object.values(candidatos(brasil)).map((c) => c["vap"])).toEqual(["0", "0"]);
  });

  it("depois da totalização final, às 00:18:04 de 31/10, traz o resultado oficial", () => {
    const { tse } = tseFalsoAs("2022-10-31 01:00:00");

    const brasil = arquivo(tse, BRASIL);
    const br = oficial["BR"]!;

    expect(brasil).toMatchObject({ dt: "31/10/2022", ht: "00:18:04", tf: "s", and: "f" });
    expect(brasil.s).toMatchObject({ ts: "472075", st: "472075", pst: "100,00" });
    expect(brasil.e).toMatchObject({ te: String(br.aptos), est: String(br.aptos), c: String(br.votantes) });
    expect(brasil.v).toMatchObject({ tv: String(br.votantes), vv: String(br.validos), vb: String(br.brancos), tvn: String(br.nulos) });
    expect(candidatos(brasil)["LULA"]).toMatchObject({ vap: String(br.votos[0]), pvap: "50,90" });
    expect(candidatos(brasil)["JAIR BOLSONARO"]).toMatchObject({ vap: String(br.votos[1]), pvap: "49,10" });
  });
});

describe("os arquivos de UF, município e zona", () => {
  it("o Distrito Federal termina às 19:59:37, como na medição de 2022, e o índice do Brasil diz o mesmo", () => {
    const antes = tseFalsoAs("2022-10-30 19:59:36").tse;
    const depois = tseFalsoAs("2022-10-30 19:59:37").tse;

    expect(arquivo(antes, u("df"))).toMatchObject({ and: "p" });
    expect(arquivo(depois, u("df"))).toMatchObject({ tpabr: "uf", cdabr: "df", dt: "30/10/2022", ht: "19:59:37", and: "f", tf: "n" });
    expect(arquivo(depois, u("df")).s.st).toBe(arquivo(depois, u("df")).s.ts);
    expect(item(arquivo(depois, ab("br")), "df")).toMatchObject({ and: "f", ht: "19:59:37" });
    expect(item(arquivo(antes, ab("br")), "df")).toMatchObject({ and: "p" });
  });

  it("São Paulo chega à metade das seções às 18:38:10, como na medição de 2022", () => {
    const pct = (a: Arquivo) => Number(a.s.st) / Number(a.s.ts);

    expect(pct(arquivo(tseFalsoAs("2022-10-30 18:38:09").tse, u("sp")))).toBeLessThan(0.5);
    expect(pct(arquivo(tseFalsoAs("2022-10-30 18:38:10").tse, u("sp")))).toBeGreaterThanOrEqual(0.5);
  });

  it("no fim, a UF e o município de São Paulo trazem o resultado oficial", () => {
    const { tse } = tseFalsoAs("2022-10-31 01:00:00");

    for (const [caminho, lugar] of [
      [u("sp"), "SP"],
      [u("sp", "71072"), "71072"],
    ] as const) {
      const a = arquivo(tse, caminho);
      const o = oficial[lugar]!;
      expect(a.e, lugar).toMatchObject({ te: String(o.aptos), c: String(o.votantes) });
      expect(a.v, lugar).toMatchObject({ vv: String(o.validos), vb: String(o.brancos), tvn: String(o.nulos) });
      expect([candidatos(a)["LULA"]!["vap"], candidatos(a)["JAIR BOLSONARO"]!["vap"]], lugar).toEqual(o.votos.map(String));
    }
  });

  it("no meio da noite, o arquivo de cada município bate com o índice da UF, e as zonas somam o município", () => {
    const { tse } = tseFalsoAs("2022-10-30 19:00:00");

    const indice = arquivo(tse, ab("sp"));
    const capital = arquivo(tse, u("sp", "71072"));
    const zonas = noite.zonas.filter((z) => z.uf === "SP" && z.municipio === 71072).map((z) => arquivo(tse, u("sp", `71072-z${String(z.zona).padStart(4, "0")}`)));

    expect(item(indice, "71072")).toMatchObject({ tpabr: "mun", and: "p", dt: capital.dt, ht: capital.ht, s: capital.s, e: capital.e });
    expect(capital.ht <= "19:00:00").toBe(true);
    const soma = (campo: (a: Arquivo) => string) => zonas.reduce((s, z) => s + Number(campo(z)), 0);
    expect(soma((z) => z.s.st)).toBe(Number(capital.s.st));
    expect(soma((z) => candidatos(z)["LULA"]!["vap"]!)).toBe(Number(candidatos(capital)["LULA"]!["vap"]));
    expect(zonas.map((z) => z.ht).sort().at(-1)).toBe(capital.ht);
  });
});

describe("a indicação do TSE e a totalização final", () => {
  it("às 19:56:23, quando o TSE indicou Lula eleito em 2022, com 98,81% das seções, o Brasil já traz md = e", () => {
    // A regra (a vantagem de quem lidera passa dos eleitores das seções que faltam) marca a chegada das 19:56:20;
    // o TSE a anunciou com a das 19:56:23. Às 19:56:00 a eleição ainda não está definida.
    expect(arquivo(tseFalsoAs("2022-10-30 19:56:00").tse, BRASIL).md).toBeUndefined();

    const brasil = arquivo(tseFalsoAs("2022-10-30 19:56:23").tse, BRASIL);

    expect(brasil).toMatchObject({ md: "e", tf: "n", and: "p", ht: "19:56:23" });
    expect(brasil.s.pst).toBe("98,81");
    // Os candidatos ainda não aparecem como eleitos: isso vem com a totalização final.
    expect(candidatos(brasil)["LULA"]).toMatchObject({ e: "n", st: "" });
  });

  it("a indicação só existe no Brasil", () => {
    const { tse } = tseFalsoAs("2022-10-30 20:00:00");

    for (const caminho of [u("sp"), u("zz"), u("sp", "71072"), u("sp", "71072-z0001")]) expect(arquivo(tse, caminho).md, caminho).toBeUndefined();
  });

  it("a totalização final marca tf = s em todos os arquivos, com a hora da final, e o eleito; a indicação sai", () => {
    const { tse } = tseFalsoAs("2022-10-31 00:18:04");

    for (const caminho of [BRASIL, u("ac"), u("zz"), u("ac", "01120"), u("sp", "71072-z0001")]) {
      const a = arquivo(tse, caminho);
      expect(a, caminho).toMatchObject({ tf: "s", and: "f", dt: "31/10/2022", ht: "00:18:04", esae: "n", mnae: [] });
      expect(a.md, caminho).toBeUndefined();
      expect(candidatos(a)["LULA"], caminho).toMatchObject({ seq: "1", e: "s", st: "Eleito" });
      expect(candidatos(a)["JAIR BOLSONARO"], caminho).toMatchObject({ seq: "2", e: "n", st: "Não eleito" });
    }
    // O índice guarda a hora da última totalização de cada lugar: o Acre terminou às 22:29:40.
    expect(item(arquivo(tse, ab("br")), "ac")).toMatchObject({ and: "f", ht: "22:29:40" });
    expect(arquivo(tseFalsoAs("2022-10-31 00:18:03").tse, BRASIL)).toMatchObject({ tf: "n", and: "p", md: "e" });
  });

  it("a ordem dos candidatos (seq) é a do Brasil, mesmo onde o outro lidera", () => {
    // Às 17:30, Bolsonaro lidera no Brasil; na Bahia, Lula.
    const { tse } = tseFalsoAs("2022-10-30 17:30:00");
    const bahia = candidatos(arquivo(tse, u("ba")));

    expect(Number(bahia["LULA"]!["vap"])).toBeGreaterThan(Number(bahia["JAIR BOLSONARO"]!["vap"]));
    expect(bahia["JAIR BOLSONARO"]).toMatchObject({ seq: "1" });
    expect(candidatos(arquivo(tse, BRASIL))["JAIR BOLSONARO"]).toMatchObject({ seq: "1" });
  });
});

describe("os candidatos e a geografia vêm só dos arquivos", () => {
  it("os candidatos são Lula e Bolsonaro, com os números sequenciais e os vices de 2022", () => {
    const brasil = arquivo(tseFalsoAs("2022-10-30 19:00:00").tse, BRASIL);

    expect(candidatos(brasil)["LULA"]).toMatchObject({ n: "13", sqcand: "280001607829", nm: "LUIZ INÁCIO LULA DA SILVA" });
    expect(candidatos(brasil)["LULA"]!["vs"]).toEqual([{ tp: "v", sqcand: "280001607830", nm: "GERALDO JOSÉ RODRIGUES ALCKMIN FILHO", nmu: "GERALDO ALCKMIN", sgp: "PSB" }]);
    expect(candidatos(brasil)["JAIR BOLSONARO"]).toMatchObject({ n: "22", sqcand: "280001618036", nm: "JAIR MESSIAS BOLSONARO" });
    expect(brasil.carg[0].agr.map((g: Arquivo) => g.nm)).toEqual(["COLIGAÇÃO BRASIL DA ESPERANÇA", "PELO BEM DO BRASIL"]);
  });

  it("a configuração de municípios e zonas é a de 2022: tem o Vaticano, não tem Boa Esperança do Norte", () => {
    const { tse } = tseFalsoAs("2022-10-30 16:00:00");

    const config = arquivo(tse, `${BASE}/config/mun-e006258-cm.json`);
    const municipios: Arquivo[] = config.abr.flatMap((uf: Arquivo) => uf.mu.map((m: Arquivo) => ({ uf: uf.cd, ...m })));

    expect(municipios).toHaveLength(5751);
    expect(municipios.reduce((s, m) => s + m.z.length, 0)).toBe(noite.zonas.length);
    expect(municipios.find((m) => m.cd === "99252")).toMatchObject({ uf: "zz", nm: "VATICANO", cdi: "" });
    expect(municipios.find((m) => m.cd === "73709")).toBeUndefined();
    expect(tse.responder({ url: u("zz", "99252") }).status).toBe(200);
    expect(tse.responder({ url: u("mt", "73709") }).status).toBe(404);
  });
});
