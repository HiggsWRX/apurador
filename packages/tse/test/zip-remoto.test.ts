import { randomBytes } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { lerMembroRemoto } from "../src/index.ts";

/** Um servidor falso que só responde a pedidos com Range, como o CDN do TSE, e anota cada pedido. */
function servidorComRange(arquivo: Uint8Array<ArrayBuffer>) {
  const pedidos: { range: string | null; bytes: number }[] = [];
  const buscar = async (_url: string | URL | Request, init?: RequestInit) => {
    const range = new Headers(init?.headers).get("range");
    const total = arquivo.length;
    const m = range?.match(/^bytes=(\d*)-(\d*)$/);
    if (!m) {
      pedidos.push({ range, bytes: total });
      return new Response(arquivo, { status: 200 });
    }
    const [inicio, fim] = m[1] === "" ? [total - Number(m[2]), total - 1] : [Number(m[1]), m[2] === "" ? total - 1 : Math.min(Number(m[2]), total - 1)];
    const fatia = arquivo.slice(inicio, fim + 1);
    pedidos.push({ range, bytes: fatia.length });
    return new Response(fatia, { status: 206, headers: { "Content-Range": `bytes ${inicio}-${fim}/${total}` } });
  };
  return { buscar, pedidos };
}

describe("lerMembroRemoto", () => {
  const csvBr = strToU8('"DT_GERACAO";"NR_TURNO"\n"18/10/2026";"1"\n'.repeat(2000));
  const zip = zipSync({
    // membro grande e incompressível, que nunca deve ser baixado
    "votacao_candidato_munzona_2026_AC.csv": randomBytes(300_000),
    "votacao_candidato_munzona_2026_BR.csv": csvBr,
    "leiame.pdf": randomBytes(1_000),
  });

  it("baixa só o membro pedido, sempre por Range, sem baixar o zip inteiro", async () => {
    const { buscar, pedidos } = servidorComRange(zip);

    const membro = await lerMembroRemoto({ url: "https://cdn.tse.jus.br/x.zip", membro: (nome) => nome.endsWith("_BR.csv"), buscar });

    expect(membro.nome).toBe("votacao_candidato_munzona_2026_BR.csv");
    expect(membro.dados).toEqual(csvBr);
    expect(pedidos.every((p) => p.range !== null)).toBe(true);
    expect(pedidos.reduce((s, p) => s + p.bytes, 0)).toBeLessThan(100_000);
  });

  it("diz quais membros existem quando o pedido não casa com nenhum", async () => {
    const { buscar } = servidorComRange(zip);

    await expect(lerMembroRemoto({ url: "https://cdn.tse.jus.br/x.zip", membro: (nome) => nome.endsWith("_ZZ.csv"), buscar })).rejects.toThrow(
      /votacao_candidato_munzona_2026_BR\.csv/,
    );
  });

  it("recusa um servidor que ignora o Range, em vez de baixar o zip inteiro", async () => {
    const buscar = async () => new Response(zip, { status: 200 });

    await expect(lerMembroRemoto({ url: "https://cdn.tse.jus.br/x.zip", membro: (nome) => nome.endsWith("_BR.csv"), buscar })).rejects.toThrow(/Range/);
  });
});
