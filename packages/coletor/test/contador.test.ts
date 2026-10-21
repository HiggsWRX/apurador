import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarContadorDeGravacoes, gravarContadorDeGravacoes, lerContadorDeGravacoes } from "../src/contador.ts";

// O contador de gravações sobrevive a um reinício do coletor, soma os dois buckets separadamente e começa do zero no
// mês seguinte, como a cota do plano gratuito do R2.

let pasta: string;
beforeAll(async () => {
  pasta = await mkdtemp(join(tmpdir(), "contador-"));
});
afterAll(() => rm(pasta, { recursive: true, force: true }));

describe("o contador de gravações", () => {
  it("não existe antes da primeira gravação", async () => {
    expect(await lerContadorDeGravacoes(join(pasta, "nenhum.json"))).toBeNull();
  });

  it("retoma de onde o coletor anterior parou, com cada bucket à parte", async () => {
    const caminho = join(pasta, "gravacoes.json");
    const noEnsaio = criarContadorDeGravacoes(null, () => Date.parse("2026-10-22T21:00:00-03:00"));
    noEnsaio.contar("apurador-ensaio");
    noEnsaio.contar("apurador-ensaio");
    await gravarContadorDeGravacoes(caminho, noEnsaio.doMes());

    const naNoite = criarContadorDeGravacoes(await lerContadorDeGravacoes(caminho), () => Date.parse("2026-10-25T19:00:00-03:00"));
    naNoite.contar("apurador-ao-vivo");

    expect(naNoite.doMes()).toEqual({ mes: "2026-10", buckets: { "apurador-ensaio": 2, "apurador-ao-vivo": 1 } });
  });

  it("começa do zero no mês seguinte, em UTC: a noite que passa da meia-noite de 31/10 em Brasília já conta em novembro", () => {
    let agora = Date.parse("2026-10-31T20:59:00-03:00");
    const contador = criarContadorDeGravacoes({ mes: "2026-10", buckets: { "apurador-ao-vivo": 135_000 } }, () => agora);
    contador.contar("apurador-ao-vivo");
    expect(contador.doMes()).toEqual({ mes: "2026-10", buckets: { "apurador-ao-vivo": 135_001 } });

    agora = Date.parse("2026-10-31T21:00:00-03:00");
    expect(contador.doMes()).toEqual({ mes: "2026-11", buckets: {} });
  });
});
