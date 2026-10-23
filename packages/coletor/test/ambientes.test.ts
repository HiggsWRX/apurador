import { readFileSync } from "node:fs";
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
const BYTES = new Uint8Array([123, 125]);

function montar(destino: "producao" | "ensaio" | "pasta", env: Record<string, string>, semDominio = false) {
  const pedidos: string[] = [];
  const implantados: { configuracao: string; variaveis: Record<string, string> }[] = [];
  const buscar: Buscar = async (url) => {
    pedidos.push(url);
    return new Response(null, { status: 200 });
  };
  const destinos = destinosDoColetor({
    destino,
    env,
    pasta: join(pasta, destino),
    comprimir: true,
    semDominio,
    buscar,
    contador: criarContadorDeGravacoes(null, () => Date.parse("2026-10-22T21:00:00-03:00")),
    agora: () => Date.parse("2026-10-22T21:00:00-03:00"),
    implantar: async (configuracao, variaveis) => {
      implantados.push({ configuracao: configuracao.replaceAll("\\", "/"), variaveis });
    },
    // A pasta do plano B de cada ambiente, numa pasta temporária: a do repositório pode ser a de um ensaio em andamento.
    ambientes: {
      producao: { ...AMBIENTES.producao, planoB: { ...AMBIENTES.producao.planoB, pasta: join(pasta, "plano-b") } },
      ensaio: { ...AMBIENTES.ensaio, planoB: { ...AMBIENTES.ensaio.planoB, pasta: join(pasta, "plano-b-ensaio") } },
    },
  });
  /** Grava no plano B e fecha a rodada, para a republicação começar. */
  const noPlanoB = async () => {
    await destinos.planoB.gravar("rodada.json", BYTES);
    await destinos.planoB.fimDaRodada!();
  };
  return { ...destinos, pedidos, implantados, noPlanoB };
}

describe("os destinos do coletor", () => {
  it("o ensaio grava no bucket do ensaio e republica o Worker do ensaio, nunca os de produção", async () => {
    const { principal, noPlanoB, pedidos, implantados } = montar("ensaio", { ...CHAVES_DE_PRODUCAO, ...CHAVES_DO_ENSAIO });

    await principal.gravar("rodada.json", BYTES);
    await noPlanoB();

    expect(pedidos).toEqual(["https://40aa2d90c0ed3139d2e8a10389f509ec.r2.cloudflarestorage.com/apurador-ensaio/rodada.json"]);
    expect(implantados.map((i) => i.configuracao.split("/").slice(-2).join("/"))).toEqual(["cloudflare/plano-b-ensaio.jsonc"]);
  });

  it("sem a chave do ensaio no `.env`, o ensaio não começa, mesmo com a chave de produção ali", () => {
    expect(() => montar("ensaio", CHAVES_DE_PRODUCAO)).toThrow(
      "Falta R2_ENSAIO_ACCESS_KEY_ID ou R2_ENSAIO_SECRET_ACCESS_KEY no .env do coletor (packages/coletor/.env)",
    );
  });

  it("nada do ensaio é de produção: bucket, endereço, site, Worker, configuração, pasta e chave", () => {
    const { producao, ensaio } = AMBIENTES;
    const valores = (a: typeof producao | typeof ensaio) => [
      a.bucket,
      a.endereco,
      a.site,
      a.variaveis.chave,
      a.variaveis.segredo,
      a.planoB.worker,
      a.planoB.configuracao,
      a.planoB.pasta,
      a.planoB.endereco,
      a.noite.bucket,
      a.noite.variaveis.chave,
      a.noite.variaveis.segredo,
    ];
    expect(valores(ensaio).filter((v) => valores(producao).includes(v))).toEqual([]);
  });

  it("o CORS de cada bucket, na pasta cloudflare/, deixa ler só o site do próprio ambiente", () => {
    const origens = (arquivo: string) =>
      (JSON.parse(readFileSync(new URL(`../cloudflare/${arquivo}`, import.meta.url), "utf8")) as { rules: { allowed: { origins: string[] } }[] }).rules.flatMap(
        (r) => r.allowed.origins,
      );

    expect(origens("cors-ao-vivo.json")).toEqual([AMBIENTES.producao.site]);
    expect(origens("cors-ao-vivo-ensaio.json")).toEqual([AMBIENTES.ensaio.site]);
  });

  it("a produção grava no bucket dos JSONs ao vivo e republica o Worker do plano B pelo login do wrangler", async () => {
    const { principal, noPlanoB, pedidos, implantados } = montar("producao", CHAVES_DE_PRODUCAO);
    await principal.gravar("lugares/BR.json", BYTES);
    await noPlanoB();

    expect(pedidos).toEqual(["https://40aa2d90c0ed3139d2e8a10389f509ec.r2.cloudflarestorage.com/apurador-ao-vivo/lugares/BR.json"]);
    expect(implantados.map((i) => [i.configuracao.split("/").slice(-2).join("/"), i.variaveis])).toEqual([["cloudflare/plano-b.jsonc", {}]]);
  });

  it("com um CLOUDFLARE_API_TOKEN no `.env`, a republicação vai por ele, na conta do projeto", async () => {
    const { noPlanoB, implantados } = montar("producao", { ...CHAVES_DE_PRODUCAO, CLOUDFLARE_API_TOKEN: "token-de-teste" });
    await noPlanoB();

    expect(implantados[0]!.variaveis).toEqual({ CLOUDFLARE_API_TOKEN: "token-de-teste", CLOUDFLARE_ACCOUNT_ID: "40aa2d90c0ed3139d2e8a10389f509ec" });
  });

  it("sem domínio, só existe o Worker: ele é o principal e o plano B, e o R2 não entra, nem a chave dele", async () => {
    const { principal, planoB, noPlanoB, pedidos, implantados } = montar("producao", {}, true);
    await noPlanoB();

    expect(principal).toBe(planoB);
    expect(pedidos).toEqual([]);
    expect(implantados).toHaveLength(1);
  });

  it("a pasta local não precisa de chave, e o plano B dela é outra pasta, sem republicação", async () => {
    const { principal, noPlanoB, pedidos, implantados } = montar("pasta", {});
    await principal.gravar("rodada.json", BYTES);
    await noPlanoB();

    expect(pedidos).toEqual([]);
    expect(implantados).toEqual([]);
    expect(await readdir(join(pasta, "pasta"))).toEqual(["rodada.json"]);
    expect((await readdir(join(pasta, "pasta-plano-b"))).sort()).toEqual(["_headers", "rodada.json"]);
  });

  it("os objetos da noite vão para o bucket da noite do ambiente, com a chave dele, e sem ela ficam de fora", async () => {
    const chavesDaNoite = { R2_NOITE_ACCESS_KEY_ID: "id-noite", R2_NOITE_SECRET_ACCESS_KEY: "segredo-noite" };
    const { objetosDaNoite, pedidos } = montar("producao", { ...CHAVES_DE_PRODUCAO, ...chavesDaNoite });
    await objetosDaNoite!.gravar("{}", { numero: 1, quando: "2026-10-25T20:00:00.000Z" });

    expect(pedidos).toEqual(["https://40aa2d90c0ed3139d2e8a10389f509ec.r2.cloudflarestorage.com/apurador-noite/noite/2026-10-25T20-00-00.000Z-r00001.json.gz"]);
    expect(AMBIENTES.producao.noite.bucket).not.toBe(AMBIENTES.producao.bucket);
    expect(montar("producao", CHAVES_DE_PRODUCAO).objetosDaNoite).toBeNull();
    expect(montar("producao", chavesDaNoite, true).objetosDaNoite).not.toBeNull();
  });

  it("na pasta local, sem objetos da noite: o coletor só retoma do disco", () => {
    expect(montar("pasta", {}).objetosDaNoite).toBeNull();
  });
});
