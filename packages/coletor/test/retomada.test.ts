import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { criarContadorDeGravacoes, juntarGravacoes } from "../src/contador.ts";
import { escolherRetomada, estadoGuardadoEmJson, gravarEstadoNoDisco, lerEstadoDoDisco, objetosDaNoiteNaPasta, type EstadoGuardado } from "../src/retomada.ts";

// De onde o coletor retoma (Operação na noite, decisões 4 e 15; Volume de gravações na noite, decisão 3): do disco, com
// tudo; sem ele, do último objeto da noite; sem nenhum, a frio. Um estado de outra noite ou de outra eleição não serve.

const AGORA = Date.parse("2026-10-25T21:00:00-03:00");
const guardado = (quando: string, eleicao = "6258", numero = 1): EstadoGuardado =>
  JSON.parse(estadoGuardadoEmJson(JSON.stringify({ versao: 1, eleicao, numero, quando: new Date(Date.parse(quando)).toISOString() }), [])) as EstadoGuardado;

describe("de onde o coletor retoma", () => {
  const escolher = (disco: EstadoGuardado | null, objetoDaNoite: EstadoGuardado | null) => {
    const { partida, guardado } = escolherRetomada({ disco, objetoDaNoite, eleicao: "6258", agora: AGORA });
    return { partida, numero: guardado?.estado.numero };
  };

  it("do disco, com estado em disco; do objeto da noite, sem ele; a frio, sem nenhum", () => {
    expect(escolher(guardado("2026-10-25T20:59:40-03:00"), guardado("2026-10-25T20:59:40-03:00", "6258", 2))).toEqual({ partida: "disco", numero: 1 });
    expect(escolher(null, guardado("2026-10-25T20:59:40-03:00", "6258", 2))).toEqual({ partida: "objeto da noite", numero: 2 });
    expect(escolher(null, null)).toEqual({ partida: "a frio", numero: undefined });
  });

  it("do objeto da noite, se ele é mais novo que o disco: a gravação do disco falhou, ou outra máquina seguiu a noite", () => {
    expect(escolher(guardado("2026-10-25T20:30:00-03:00"), guardado("2026-10-25T20:59:40-03:00", "6258", 2))).toEqual({
      partida: "objeto da noite",
      numero: 2,
    });
  });

  it("não retoma de outra noite (mais de 6 h) nem de outra eleição", () => {
    // O ensaio de 23/10 e o coletor de 24/10, das 19h às 19h30, deixam estado no disco.
    expect(escolher(guardado("2026-10-24T19:30:00-03:00"), null)).toEqual({ partida: "a frio", numero: undefined });
    expect(escolher(guardado("2026-10-25T15:01:00-03:00"), null)).toEqual({ partida: "disco", numero: 1 });
    expect(escolher(guardado("2026-10-25T20:59:40-03:00", "6257"), null)).toEqual({ partida: "a frio", numero: undefined });
  });
});

describe("o estado em disco e os objetos da noite numa pasta", () => {
  const pastas: string[] = [];
  const pasta = async () => {
    const p = await mkdtemp(join(tmpdir(), "apurador-retomada-"));
    pastas.push(p);
    return p;
  };
  afterAll(async () => {
    for (const p of pastas) await rm(p, { recursive: true, force: true });
  });

  it("o disco guarda o estado inteiro de uma vez, e sem arquivo não há estado", async () => {
    const arquivo = join(await pasta(), "estado-producao.json");
    expect(await lerEstadoDoDisco(arquivo)).toBeNull();
    const json = estadoGuardadoEmJson(JSON.stringify({ versao: 1, eleicao: "6258", numero: 3, quando: "2026-10-25T23:00:00.000Z" }), [
      { abrangencia: { uf: "SP" }, etag: '"abc"', corpo: '{"ele":"6258"}' },
    ]);
    await gravarEstadoNoDisco(arquivo, json);
    await gravarEstadoNoDisco(arquivo, json);

    expect(await lerEstadoDoDisco(arquivo)).toEqual(JSON.parse(json));
    expect(await readdir(join(arquivo, ".."))).toEqual(["estado-producao.json"]);
  });

  it("um estado de outra versão não serve", async () => {
    const arquivo = join(await pasta(), "estado.json");
    await writeFile(arquivo, JSON.stringify({ estado: { versao: 0 }, arquivos: [] }));
    await expect(lerEstadoDoDisco(arquivo)).rejects.toThrow("O estado guardado não é da versão 1");
  });

  it("a pasta guarda um objeto por rodada, comprimido, e devolve o último desde a hora dada", async () => {
    const noite = objetosDaNoiteNaPasta(join(await pasta(), "noite"));
    expect(await noite.ultimo(0)).toBeNull();
    for (const [numero, quando] of [
      [1, "2026-10-25T20:00:00.000Z"],
      [2, "2026-10-25T20:00:20.000Z"],
    ] as const) {
      await noite.gravar(estadoGuardadoEmJson(JSON.stringify({ versao: 1, eleicao: "6258", numero, quando }), []), { numero, quando });
    }
    expect((await noite.ultimo(Date.parse("2026-10-25T14:00:00Z")))?.estado.numero).toBe(2);
    expect(await noite.ultimo(Date.parse("2026-10-25T20:01:00Z"))).toBeNull();
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
