import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { criarTseFalso, relogioManual, type Resposta } from "../src/index.ts";
import { cadastro, instante, noite } from "./noite-2022.ts";

// A estrutura dos arquivos que o TSE falso serve, conferida campo a campo com os arquivos reais da divulgação
// de 2026 (test/amostras/tse, baixados de resultados.tse.jus.br em 19/10/2026): os zerados do 2º turno
// (eleição 6258) e os finais do 1º turno (eleição 6257). A configuração de municípios real foi cortada no
// Acre e em três cidades do Exterior.

const AMOSTRAS = new URL("amostras/tse/", import.meta.url);
const real = (pasta: string, arquivo: string) => JSON.parse(readFileSync(new URL(`${pasta}/${arquivo}`, AMOSTRAS), "utf8")) as unknown;

function servido(dataHora: string, caminho: string): unknown {
  const tse = criarTseFalso({ noite, cadastro, relogio: relogioManual(instante(dataHora)) });
  const r: Resposta = tse.responder({ url: caminho, cabecalhos: { "accept-encoding": "gzip" } });
  expect(r.status, caminho).toBe(200);
  return JSON.parse(new TextDecoder().decode(gunzipSync(r.corpo)));
}

/**
 * A estrutura de um arquivo: para cada caminho, as listas de chaves (na ordem em que aparecem) dos objetos que
 * estão nele, e o tipo das folhas. Os itens de `agr` são separados pelo tipo da agremiação (`tp`), porque um
 * partido isolado tem campos que uma coligação não tem.
 */
function estrutura(v: unknown): Record<string, string[]> {
  const saida = new Map<string, Set<string>>();
  const adicionar = (caminho: string, forma: string) => saida.set(caminho, (saida.get(caminho) ?? new Set()).add(forma));
  const percorrer = (x: unknown, caminho: string) => {
    if (Array.isArray(x)) {
      if (x.length === 0) adicionar(caminho, "[]");
      for (const item of x) percorrer(item, `${caminho}[]`);
    } else if (typeof x === "object" && x !== null) {
      const objeto = x as Record<string, unknown>;
      const aqui = caminho.endsWith(".agr[]") ? `${caminho}<${String(objeto["tp"])}>` : caminho;
      adicionar(aqui, Object.keys(objeto).join(","));
      for (const [k, filho] of Object.entries(objeto)) percorrer(filho, `${aqui}.${k}`);
    } else adicionar(caminho, typeof x);
  };
  percorrer(v, "");
  return Object.fromEntries([...saida].sort(([a], [b]) => a.localeCompare(b)).map(([k, formas]) => [k, [...formas].sort()]));
}

/** Tira da estrutura os caminhos de agremiações de um tipo que a noite não tem (em 2022, os dois concorreram por coligação). */
function soComAgremiacoes(e: Record<string, string[]>, tipos: string[]) {
  return Object.fromEntries(Object.entries(e).filter(([k]) => !/\.agr\[\]<(\w+)>/.test(k) || tipos.includes(/\.agr\[\]<(\w+)>/.exec(k)![1]!)));
}

/** Tira campos da estrutura: das listas de chaves e dos caminhos. */
function semCampos(e: Record<string, string[]>, campos: string[]) {
  const fora = (k: string) => campos.some((c) => k.endsWith(`.${c}`) || k.includes(`.${c}[]`));
  return Object.fromEntries(
    Object.entries(e)
      .filter(([k]) => !fora(k))
      .map(([k, formas]) => [
        k,
        formas.map((f) =>
          f
            .split(",")
            .filter((c) => !campos.includes(c))
            .join(","),
        ),
      ]),
  );
}

const D = "/oficial/ele2026/6258/dados";
/** Os arquivos conferidos: o caminho no TSE falso e o nome do arquivo real equivalente (com a eleição no lugar de `{e}`). */
const ARQUIVOS: [string, string][] = [
  [`${D}/br/br-c0001-e006258-u.json`, "br-c0001-e00{e}-u.json"],
  [`${D}/ac/ac-c0001-e006258-u.json`, "ac-c0001-e00{e}-u.json"],
  [`${D}/zz/zz-c0001-e006258-u.json`, "zz-c0001-e00{e}-u.json"],
  [`${D}/ac/ac01120-c0001-e006258-u.json`, "ac01120-c0001-e00{e}-u.json"],
  [`${D}/sp/sp71072-c0001-e006258-u.json`, "sp71072-c0001-e00{e}-u.json"],
  [`${D}/sp/sp71072-z0001-c0001-e006258-u.json`, "sp71072-z0001-c0001-e00{e}-u.json"],
  [`${D}/zz/zz29254-c0001-e006258-u.json`, "zz29254-c0001-e00{e}-u.json"],
  [`${D}/br/br-e006258-ab.json`, "br-e00{e}-ab.json"],
  [`${D}/ac/ac-e006258-ab.json`, "ac-e00{e}-ab.json"],
  ["/oficial/ele2026/6258/config/mun-e006258-cm.json", "mun-e00{e}-cm.json"],
];

describe("a estrutura dos arquivos servidos", () => {
  it.each(ARQUIVOS)("antes da apuração, %s é como o zerado da eleição 6258", (caminho, arquivo) => {
    const esperado = soComAgremiacoes(estrutura(real("6258", arquivo.replace("{e}", "6258"))), ["c"]);
    expect(estrutura(servido("2022-10-30 16:00:00", caminho))).toEqual(esperado);
  });

  it.each(ARQUIVOS)("depois da totalização final, %s é como o final da eleição 6257", (caminho, arquivo) => {
    const esperado = soComAgremiacoes(estrutura(real("6257", arquivo.replace("{e}", "6257"))), ["c"]);
    expect(estrutura(servido("2022-10-31 01:00:00", caminho))).toEqual(esperado);
  });

  it.each(ARQUIVOS)("durante a apuração, %s é como o final, sem os campos que só a totalização final traz", (caminho, arquivo) => {
    const esperado = semCampos(soComAgremiacoes(estrutura(real("6257", arquivo.replace("{e}", "6257"))), ["c"]), ["esae", "mnae"]);
    expect(estrutura(servido("2022-10-30 19:00:00", caminho))).toEqual(esperado);
  });

  it("com a indicação do TSE, o Brasil é como durante a apuração, mais o campo md depois do andamento", () => {
    const esperado = semCampos(soComAgremiacoes(estrutura(real("6257", "br-c0001-e006257-u.json")), ["c"]), ["esae", "mnae"]);
    esperado[""] = esperado[""]!.map((chaves) => chaves.replace(",and,", ",and,md,"));
    esperado[".md"] = ["string"];

    expect(estrutura(servido("2022-10-30 20:00:00", `${D}/br/br-c0001-e006258-u.json`))).toEqual(
      Object.fromEntries(Object.entries(esperado).sort(([a], [b]) => a.localeCompare(b))),
    );
  });

  it("a configuração das eleições tem só campos e formas que a real tem, e a eleição 6258 igual à real", () => {
    const oficial = real("comum", "ele-c.json") as { pl: { e: { cd: string }[] }[] };
    const falsa = servido("2022-10-30 16:00:00", "/oficial/comum/config/ele-c.json") as { pl: { e: { cd: string }[] }[] };

    const formasReais = estrutura(oficial);
    for (const [caminho, formas] of Object.entries(estrutura(falsa))) expect(formasReais[caminho], caminho).toEqual(expect.arrayContaining(formas));
    const daEleicao = (c: typeof oficial) => c.pl.flatMap((p) => p.e).find((e) => e.cd === "6258");
    expect(estrutura(daEleicao(falsa))).toEqual(estrutura(daEleicao(oficial)));
  });
});
