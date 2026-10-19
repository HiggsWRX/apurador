import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { escreverComoTse, percentual, percentualPreciso } from "../src/formato.ts";

// As regras de escrita dos números e do JSON, conferidas em todos os percentuais dos arquivos reais da
// divulgação de 2026 (test/amostras/tse): recalculados das contagens, têm de sair iguais aos do TSE.

const AMOSTRAS = new URL("amostras/tse/", import.meta.url);
const arquivos = ["6258", "6257", "comum"].flatMap((pasta) => readdirSync(new URL(`${pasta}/`, AMOSTRAS)).map((nome) => `${pasta}/${nome}`));
const ler = (arquivo: string) => readFileSync(new URL(arquivo, AMOSTRAS), "utf8");

/** Cada percentual, com a contagem e o todo de onde ele sai, como o TSE calcula. */
const PERCENTUAIS: Record<"s" | "e" | "v", [string, string, string][]> = {
  s: [
    ["pst", "st", "ts"],
    ["psnt", "snt", "ts"],
    ["psi", "si", "st"],
    ["psni", "sni", "st"],
    ["psa", "sa", "si"],
    ["psna", "sna", "si"],
  ],
  e: [
    ["pest", "est", "te"],
    ["pesnt", "esnt", "te"],
    ["pesi", "esi", "est"],
    ["pesni", "esni", "est"],
    ["pesa", "esa", "esi"],
    ["pesna", "esna", "esi"],
    ["pc", "c", "esi"],
    ["pa", "a", "esi"],
  ],
  v: [
    ["pvvc", "vvc", "tv"],
    ["pvv", "vv", "vvc"],
    ["pvnom", "vnom", "vv"],
    ["pvan", "van", "vv"],
    ["pvansj", "vansj", "vv"],
    ["pvb", "vb", "tv"],
    ["ptvn", "tvn", "tv"],
    ["pvn", "vn", "tvn"],
    ["pvnt", "vnt", "tvn"],
  ],
};

type Bloco = Record<string, string>;

describe("os números como o TSE escreve", () => {
  it("todo percentual dos arquivos reais sai igual das contagens, com duas e com nove casas", () => {
    const divergencias: string[] = [];
    let conferidos = 0;
    const conferir = (arquivo: string, bloco: Bloco, [campo, parte, todo]: [string, string, string], semTodo: string) => {
      const [p, t] = [Number(bloco[parte]), Number(bloco[todo])];
      for (const [nome, calculado] of [
        [campo, percentual(p, t)],
        [`${campo}n`, percentualPreciso(p, t, semTodo)],
      ] as const) {
        conferidos++;
        if (bloco[nome] !== calculado) divergencias.push(`${arquivo} ${nome}: ${bloco[nome]} no TSE, ${calculado} calculado`);
      }
    };
    for (const arquivo of arquivos.filter((a) => /-(u|ab)\.json$/.test(a))) {
      const json = JSON.parse(ler(arquivo)) as { abr?: Record<string, unknown>[] } & Record<string, unknown>;
      // Um arquivo de zona zerado escreve o pvnomn como "0", e não "0,00" como os outros: só esse caso fica de fora.
      const zonaZerada = /-z\d{4}-.*6258/.test(arquivo);
      for (const lugar of json.abr ?? [json]) {
        for (const regra of PERCENTUAIS.s) conferir(arquivo, lugar["s"] as Bloco, regra, "0");
        for (const regra of PERCENTUAIS.e) conferir(arquivo, lugar["e"] as Bloco, regra, "0");
        const v = lugar["v"] as Bloco | undefined;
        if (v) for (const regra of PERCENTUAIS.v) if (!(zonaZerada && regra[0] === "pvnom")) conferir(arquivo, v, regra, v["tv"] === "0" ? "0,00" : "0");
        // Os candidatos, sobre os votos válidos do lugar.
        const cargos = (lugar["carg"] ?? []) as { agr: { par: { cand: Bloco[] }[] }[] }[];
        for (const c of cargos.flatMap((x) => x.agr.flatMap((a) => a.par.flatMap((p) => p.cand)))) conferir(arquivo, { ...c, vv: v!["vv"]! }, ["pvap", "vap", "vv"], "0");
      }
    }

    expect(divergencias).toEqual([]);
    expect(conferidos).toBeGreaterThan(3000);
  });

  it("arredonda com duas casas, mas nunca mostra 0,00 de uma parte nem 100,00 de menos que o todo", () => {
    // Do Brasil final da eleição 6257: 423 eleitores de seções não instaladas em 158.745.502.
    expect(percentual(423, 158_745_502)).toBe("0,01");
    expect(percentual(158_745_079, 158_745_502)).toBe("99,99");
    expect(percentual(56_104_503, 119_300_788)).toBe("47,03");
  });

  it("escreve o JSON com o espaçamento do TSE: os arquivos reais saem iguais, byte a byte", () => {
    for (const arquivo of arquivos) expect(escreverComoTse(JSON.parse(ler(arquivo))), arquivo).toBe(ler(arquivo));
  });
});
