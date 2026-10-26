import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { criarContadorDeGravacoes, juntarGravacoes } from "../src/contador.ts";
import {
  escolherRetomada,
  estadoGuardadoEmJson,
  gravarEstadoNoDisco,
  lerEstadoDoDisco,
  type ArquivoDoTseGuardado,
  type EstadoGuardado,
} from "../src/retomada.ts";

// De onde o coletor retoma (Operação na noite, decisões 4 e 15; Volume de gravações na noite, decisão 3): do disco, com
// tudo; sem ele, do último objeto da noite; sem nenhum, a frio. Um estado de outra noite ou de outra eleição não serve.

const AGORA = Date.parse("2026-10-25T21:00:00-03:00");
const guardado = (quando: string, eleicao = "6258", numero = 1, arquivos: ArquivoDoTseGuardado[] = []): EstadoGuardado =>
  JSON.parse(
    estadoGuardadoEmJson(JSON.stringify({ versao: 1, eleicao, numero, quando: new Date(Date.parse(quando)).toISOString() }), arquivos),
  ) as EstadoGuardado;
const arquivo = (uf: string, corpo: string): ArquivoDoTseGuardado => ({ abrangencia: { uf }, etag: null, corpo });

describe("de onde o coletor retoma", () => {
  const escolher = (disco: EstadoGuardado | null, objetoDaNoite: EstadoGuardado | null) => {
    const { partida, guardado } = escolherRetomada({ disco, objetoDaNoite, eleicao: "6258", agora: AGORA });
    return { partida, numero: guardado?.estado.numero };
  };

  it("do disco, com estado em disco; do objeto da noite, sem ele; a frio, sem nenhum", () => {
    expect(escolher(guardado("2026-10-25T20:59:40-03:00", "6258", 7), guardado("2026-10-25T20:59:40-03:00", "6258", 7))).toEqual({
      partida: "disco",
      numero: 7,
    });
    expect(escolher(null, guardado("2026-10-25T20:59:40-03:00", "6258", 7))).toEqual({ partida: "objeto da noite", numero: 7 });
    expect(escolher(null, null)).toEqual({ partida: "a frio", numero: undefined });
  });

  it("caído entre o objeto da noite e o disco, junta o estado do objeto aos arquivos do disco, com os do objeto por cima", () => {
    const disco = guardado("2026-10-25T20:59:20-03:00", "6258", 7, [arquivo("SP", "sp da 7"), arquivo("RJ", "rj da 7")]);
    const objeto = guardado("2026-10-25T20:59:40-03:00", "6258", 8, [arquivo("SP", "sp da 8")]);
    const { partida, guardado: retomado } = escolherRetomada({ disco, objetoDaNoite: objeto, eleicao: "6258", agora: AGORA });

    expect(partida).toBe("disco");
    expect(retomado!.estado.numero).toBe(8);
    expect(retomado!.arquivos.map((a) => a.corpo).sort()).toEqual(["rj da 7", "sp da 8"]);
  });

  it("do objeto da noite, se outra máquina seguiu a noite depois do disco", () => {
    expect(escolher(guardado("2026-10-25T20:30:00-03:00", "6258", 7), guardado("2026-10-25T20:59:40-03:00", "6258", 95))).toEqual({
      partida: "objeto da noite",
      numero: 95,
    });
  });

  it("não retoma de outra noite (mais de 6 h) nem de outra eleição", () => {
    // O ensaio de 23/10 e o coletor de 24/10, das 19h às 19h30, deixam estado no disco.
    expect(escolher(guardado("2026-10-24T19:30:00-03:00"), null)).toEqual({ partida: "a frio", numero: undefined });
    expect(escolher(guardado("2026-10-25T15:01:00-03:00"), null)).toEqual({ partida: "disco", numero: 1 });
    expect(escolher(guardado("2026-10-25T20:59:40-03:00", "6257"), null)).toEqual({ partida: "a frio", numero: undefined });
  });
});

describe("o estado em disco", () => {
  const pastas: string[] = [];
  const pasta = async () => {
    const p = await mkdtemp(join(tmpdir(), "apurador-retomada-"));
    pastas.push(p);
    return p;
  };
  afterAll(async () => {
    for (const p of pastas) await rm(p, { recursive: true, force: true });
  });

  it("é gravado inteiro de uma vez, e sem arquivo não há estado", async () => {
    const caminho = join(await pasta(), "estado-producao.json");
    expect(await lerEstadoDoDisco(caminho)).toBeNull();
    const json = estadoGuardadoEmJson(JSON.stringify({ versao: 1, eleicao: "6258", numero: 3, quando: "2026-10-25T23:00:00.000Z" }), [
      { abrangencia: { uf: "SP" }, etag: '"abc"', corpo: '{"ele":"6258"}' },
    ]);
    await gravarEstadoNoDisco(caminho, json);
    await gravarEstadoNoDisco(caminho, json);

    expect(await lerEstadoDoDisco(caminho)).toEqual(JSON.parse(json));
    expect(await readdir(join(caminho, ".."))).toEqual(["estado-producao.json"]);
  });

  it("um estado de outra versão não serve", async () => {
    const caminho = join(await pasta(), "estado.json");
    await writeFile(caminho, JSON.stringify({ estado: { versao: 0 }, arquivos: [] }));
    await expect(lerEstadoDoDisco(caminho)).rejects.toThrow("O estado guardado não é da versão 1");
  });
});

describe("o contador de gravações na retomada", () => {
  it("fica com o maior de cada bucket no mesmo mês, e com o do mês mais novo", () => {
    const disco = { mes: "2026-10", buckets: { "apurador-ao-vivo": 120_000, "apurador-ensaio": 230_000 } };
    const doObjeto = { mes: "2026-10", buckets: { "apurador-ao-vivo": 121_500, "apurador-noite": 900 } };
    expect(juntarGravacoes(disco, doObjeto)).toEqual({
      mes: "2026-10",
      buckets: { "apurador-ao-vivo": 121_500, "apurador-ensaio": 230_000, "apurador-noite": 900 },
    });
    expect(juntarGravacoes({ mes: "2026-09", buckets: { "apurador-ao-vivo": 9 } }, doObjeto)).toEqual(doObjeto);
    expect(juntarGravacoes(null, doObjeto)).toEqual(doObjeto);
    expect(juntarGravacoes(disco, null)).toEqual(disco);
  });

  it("o contador do coletor retomado junta o do estado ao do arquivo e segue contando", () => {
    const contador = criarContadorDeGravacoes({ mes: "2026-10", buckets: { "apurador-ensaio": 230_000 } }, () => AGORA);
    contador.juntar({ mes: "2026-10", buckets: { "apurador-ao-vivo": 121_500 } });
    contador.contar("apurador-ao-vivo");
    expect(contador.doMes()).toEqual({ mes: "2026-10", buckets: { "apurador-ensaio": 230_000, "apurador-ao-vivo": 121_501 } });
  });
});
