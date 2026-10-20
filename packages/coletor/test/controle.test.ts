import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CONTROLE_INICIAL } from "../src/chaves.ts";
import { gravarArquivoDeControle, lerArquivoDeControle } from "../src/controle.ts";

// O arquivo de controle no disco: o que o comando grava é o que o coletor lê, inteiro, na rodada seguinte; sem o
// arquivo, o coletor fica com o controle inicial; um arquivo que não serve é um erro, não um estado.

let pasta: string;
beforeAll(async () => {
  pasta = await mkdtemp(join(tmpdir(), "controle-"));
});
afterAll(() => rm(pasta, { recursive: true, force: true }));

describe("o arquivo de controle", () => {
  it("não existe antes do primeiro comando", async () => {
    expect(await lerArquivoDeControle(join(pasta, "nenhum.json"))).toBeNull();
  });

  it("volta como foi gravado, com a hora do comando, e sem arquivo pela metade ao lado", async () => {
    const caminho = join(pasta, "controle.json");
    const controle = { ...CONTROLE_INICIAL, chaves: { ...CONTROLE_INICIAL.chaves, mapa: false }, aviso: 3 as const };
    await gravarArquivoDeControle(caminho, controle, new Date("2026-10-25T20:10:00-03:00"));

    expect(await lerArquivoDeControle(caminho)).toEqual({ ...controle, gravadoEm: "2026-10-25T23:10:00.000Z" });
    await expect(readFile(`${caminho}.tmp`)).rejects.toThrow();
  });

  it("recusa um arquivo que não serve, para o coletor ficar com o controle anterior", async () => {
    const caminho = join(pasta, "estragado.json");
    await writeFile(caminho, '{"chaves": {"tudo": true}, "aviso": null, "planoB": false, "gravadoEm": "2026-10-25T23:10:00.000Z"}');
    await expect(lerArquivoDeControle(caminho)).rejects.toThrow(/faltando/);

    await writeFile(caminho, JSON.stringify({ ...CONTROLE_INICIAL, gravadoEm: "ontem" }));
    await expect(lerArquivoDeControle(caminho)).rejects.toThrow(/gravadoEm/);
  });
});
