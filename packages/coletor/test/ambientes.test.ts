import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AMBIENTES, destinosDoColetor } from "../src/ambientes.ts";
import type { Buscar } from "../src/coletor.ts";
import { criarContadorDeGravacoes } from "../src/contador.ts";

// Os quatro destinos trocáveis por configuração (Arquitetura e tecnologia, decisão 15; Ensaio geral, decisão 5): o
// `--destino` do coletor escolhe o principal e o do plano B, e as chaves de escrita vêm só do `.env` do coletor. O
// destino do ensaio nunca é o de produção: outro bucket, outro Worker, outra pasta e outra chave.

let pasta: string;
beforeAll(async () => {
  pasta = await mkdtemp(join(tmpdir(), "ambientes-"));
});
afterAll(() => rm(pasta, { recursive: true, force: true }));

const CHAVES_DE_PRODUCAO = { R2_PRODUCAO_ACCESS_KEY_ID: "id-producao", R2_PRODUCAO_SECRET_ACCESS_KEY: "segredo-producao" };
const CHAVES_DO_ENSAIO = { R2_ENSAIO_ACCESS_KEY_ID: "id-ensaio", R2_ENSAIO_SECRET_ACCESS_KEY: "segredo-ensaio" };

function montar(destino: "producao" | "ensaio" | "pasta", env: Record<string, string>) {
  const pedidos: string[] = [];
  const implantados: string[] = [];
  const buscar: Buscar = async (url) => {
    pedidos.push(url);
    return new Response(null, { status: 200 });
  };
  const destinos = destinosDoColetor({
    destino,
    env,
    pasta: join(pasta, destino),
    comprimir: true,
    buscar,
    contador: criarContadorDeGravacoes(null, () => Date.parse("2026-10-22T21:00:00-03:00")),
    agora: () => Date.parse("2026-10-22T21:00:00-03:00"),
    implantar: async (configuracao) => {
      implantados.push(configuracao);
    },
    // A pasta do plano B de cada ambiente, numa pasta temporária: a do repositório pode ser a de um ensaio em andamento.
    ambientes: {
      producao: { ...AMBIENTES.producao, planoB: { ...AMBIENTES.producao.planoB, pasta: join(pasta, "plano-b") } },
      ensaio: { ...AMBIENTES.ensaio, planoB: { ...AMBIENTES.ensaio.planoB, pasta: join(pasta, "plano-b-ensaio") } },
    },
  });
  return { ...destinos, pedidos, implantados };
}

describe("os destinos do coletor", () => {
  it("o ensaio grava no bucket do ensaio e republica o Worker do ensaio, nunca os de produção", async () => {
    const { principal, planoB, pedidos, implantados } = montar("ensaio", { ...CHAVES_DE_PRODUCAO, ...CHAVES_DO_ENSAIO });

    await principal.gravar("rodada.json", new Uint8Array([123, 125]));
    await planoB!.gravar("rodada.json", new Uint8Array([123, 125]));
    await planoB!.fimDaRodada!();

    expect(pedidos).toEqual([`https://40aa2d90c0ed3139d2e8a10389f509ec.r2.cloudflarestorage.com/${AMBIENTES.ensaio.bucket}/rodada.json`]);
    expect(implantados).toEqual([AMBIENTES.ensaio.planoB.configuracao]);
  });

  it("sem a chave do ensaio no `.env`, o ensaio não começa, mesmo com a chave de produção ali", () => {
    expect(() => montar("ensaio", CHAVES_DE_PRODUCAO)).toThrow("Falta R2_ENSAIO_ACCESS_KEY_ID ou R2_ENSAIO_SECRET_ACCESS_KEY no .env do coletor (packages/coletor/.env)");
  });

  it("nada do ensaio é de produção: bucket, endereço, Worker, configuração, pasta e chave", () => {
    const { producao, ensaio } = AMBIENTES;
    const valores = (a: typeof producao | typeof ensaio) => [a.bucket, a.endereco, a.variaveis.chave, a.variaveis.segredo, a.planoB.worker, a.planoB.configuracao, a.planoB.pasta, a.planoB.endereco];
    expect(valores(ensaio).filter((v) => valores(producao).includes(v))).toEqual([]);
  });

  it("a produção grava no bucket dos JSONs ao vivo, e o plano B é o Worker em `*.workers.dev`", async () => {
    const { principal, pedidos } = montar("producao", CHAVES_DE_PRODUCAO);
    await principal.gravar("lugares/BR.json", new Uint8Array([123, 125]));

    expect(pedidos).toEqual(["https://40aa2d90c0ed3139d2e8a10389f509ec.r2.cloudflarestorage.com/apurador-ao-vivo/lugares/BR.json"]);
    expect(AMBIENTES.producao.endereco).toBe("https://ao-vivo.apurador.org/");
    expect(AMBIENTES.producao.planoB.endereco).toBe("https://apurador-plano-b.hicampos93.workers.dev/");
  });

  it("a pasta local não precisa de chave, e o plano B dela é outra pasta, sem republicação", async () => {
    const { principal, planoB, pedidos, implantados } = montar("pasta", {});
    await principal.gravar("rodada.json", new Uint8Array([123, 125]));
    await planoB!.gravar("rodada.json", new Uint8Array([123, 125]));
    await planoB!.fimDaRodada!();

    expect(pedidos).toEqual([]);
    expect(implantados).toEqual([]);
    expect(await readdir(join(pasta, "pasta"))).toEqual(["rodada.json"]);
    expect((await readdir(join(pasta, "pasta-plano-b"))).sort()).toEqual(["_headers", "rodada.json"]);
  });
});
