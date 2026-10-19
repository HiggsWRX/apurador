import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buscarNoTseFalso, criarTseFalso, relogioManual, servirTseFalso } from "../src/index.ts";
import { cadastro, instante, noite } from "./noite-2022.ts";

// Os dois jeitos de rodar o TSE falso, lidos pelo `fetch`, como o coletor lê o TSE: dentro do processo (o
// replay) e como servidor HTTP local (o ensaio geral), este ouvindo só no 127.0.0.1, com o relógio na mão do teste.

const CAMINHO = "/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json";

describe("o TSE falso dentro do processo", () => {
  const relogio = relogioManual(instante("2022-10-30 18:44:04"));
  const tse = criarTseFalso({ noite, cadastro, relogio });
  const buscar = buscarNoTseFalso(tse);

  it("responde ao fetch como o TSE: corpo JSON, ETag, Date e 304 com If-None-Match", async () => {
    const r = await buscar(`https://resultados.tse.jus.br${CAMINHO}`);
    const brasil = (await r.json()) as { ht: string; s: { pst: string } };

    expect(r.status).toBe(200);
    expect(brasil).toMatchObject({ ht: "18:44:04", s: { pst: "67,76" } });
    expect(r.headers.get("date")).toBe("Sun, 30 Oct 2022 21:44:04 GMT");
    const deNovo = await buscar(`https://resultados.tse.jus.br${CAMINHO}`, { headers: { "If-None-Match": r.headers.get("etag")! } });
    expect(deNovo.status).toBe(304);
  });

  it("conta os pedidos do replay no registro, inclusive os 404", async () => {
    expect((await buscar("https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/nada.json")).status).toBe(404);
    expect(tse.registro().naoEncontrados).toMatchObject([{ cliente: "replay", url: "/oficial/ele2026/6258/dados/br/nada.json" }]);
  });
});

describe("o TSE falso como servidor HTTP local", () => {
  const relogio = relogioManual(instante("2022-10-30 18:44:04"));
  const tse = criarTseFalso({ noite, cadastro, relogio });
  let servidor: { url: string; fechar(): Promise<void> };

  beforeAll(async () => {
    servidor = await servirTseFalso(tse);
  });
  afterAll(() => servidor.fechar());

  it("serve com gzip, ETag, 304 e o Date do relógio dele", async () => {
    const r = await fetch(`${servidor.url}${CAMINHO}`);

    expect(r.status).toBe(200);
    expect(r.headers.get("content-encoding")).toBe("gzip");
    expect(r.headers.get("date")).toBe("Sun, 30 Oct 2022 21:44:04 GMT");
    expect(((await r.json()) as { s: { st: string } }).s.st).toBe("319895");
    expect((await fetch(`${servidor.url}${CAMINHO}`, { headers: { "If-None-Match": r.headers.get("etag")! } })).status).toBe(304);
  });

  it("responde 404 fora da configuração e registra o IP de quem pediu", async () => {
    expect((await fetch(`${servidor.url}/oficial/ele2026/6258/dados/sp/sp99999-c0001-e006258-u.json`)).status).toBe(404);
    expect(tse.registro().naoEncontrados.at(-1)?.cliente).toMatch(/127\.0\.0\.1/);
  });

  it("o bloqueio por comando chega a quem pede pela rede", async () => {
    tse.bloquear(30);
    expect((await fetch(`${servidor.url}${CAMINHO}`)).status).toBe(403);
    tse.desbloquear();
    expect((await fetch(`${servidor.url}${CAMINHO}`)).status).toBe(200);
  });
});
