import { randomBytes } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { lerMembroRemoto } from "../src/index.ts";

/**
 * Um servidor falso que só responde a pedidos com Range, como o CDN do TSE, e anota cada pedido. `arquivoDoPedido`
 * troca o arquivo servido a cada pedido (o TSE regerando o zip no meio da leitura), cada versão com a sua ETag; como o
 * CDN, um `If-Range` com a ETag de outra versão recebe o arquivo inteiro, com 200.
 */
function servidorComRange(arquivo: Uint8Array<ArrayBuffer>, arquivoDoPedido: (pedido: number) => Uint8Array<ArrayBuffer> = () => arquivo) {
  const pedidos: { range: string | null; bytes: number }[] = [];
  const etags = new Map<Uint8Array, string>();
  const buscar = async (_url: string | URL | Request, init?: RequestInit) => {
    const atual = arquivoDoPedido(pedidos.length);
    if (!etags.has(atual)) etags.set(atual, `"v${etags.size}"`);
    const etag = etags.get(atual)!;
    const cabecalhos = new Headers(init?.headers);
    const range = cabecalhos.get("range");
    const total = atual.length;
    const m = range?.match(/^bytes=(\d*)-(\d*)$/);
    const seMudou = cabecalhos.get("if-range");
    if (!m || (seMudou !== null && seMudou !== etag)) {
      pedidos.push({ range, bytes: total });
      return new Response(atual, { status: 200, headers: { ETag: etag } });
    }
    const [inicio, fim] = m[1] === "" ? [total - Number(m[2]), total - 1] : [Number(m[1]), m[2] === "" ? total - 1 : Math.min(Number(m[2]), total - 1)];
    const fatia = atual.slice(inicio, fim + 1);
    pedidos.push({ range, bytes: fatia.length });
    return new Response(fatia, { status: 206, headers: { "Content-Range": `bytes ${inicio}-${fim}/${total}`, ETag: etag } });
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

  // O TSE regera o zip todo dia por volta das 08:45 UTC, a hora do CI agendado: em 23/10, o membro chegou de outra
  // versão do zip, e o `conferir` caiu com "invalid stored block lengths".
  it("lê de novo, do começo, quando o zip muda entre os pedidos", async () => {
    const outroCsv = strToU8('"DT_GERACAO";"NR_TURNO"\n"19/10/2026";"1"\n'.repeat(2000));
    const regerado = zipSync({
      "votacao_candidato_munzona_2026_AC.csv": randomBytes(310_000),
      "votacao_candidato_munzona_2026_BR.csv": outroCsv,
      "leiame.pdf": randomBytes(1_000),
    });
    // A cauda vem do zip de ontem; o resto, do regerado.
    const { buscar } = servidorComRange(zip, (pedido) => (pedido === 0 ? zip : regerado));

    const membro = await lerMembroRemoto({ url: "https://cdn.tse.jus.br/x.zip", membro: (nome) => nome.endsWith("_BR.csv"), buscar });

    expect(membro.dados).toEqual(outroCsv);
  });

  it("desiste quando o zip muda a cada leitura", async () => {
    const versoes = [0, 1, 2, 3, 4, 5].map((i) => zipSync({ "a.bin": randomBytes(1_000 * (i + 1)), "x_BR.csv": strToU8(`versão ${i}`) }));
    const { buscar } = servidorComRange(zip, (pedido) => versoes[Math.min(pedido, versoes.length - 1)]!);

    await expect(lerMembroRemoto({ url: "https://cdn.tse.jus.br/x.zip", membro: (nome) => nome.endsWith("_BR.csv"), buscar })).rejects.toThrow(/mudou/);
  });

  it("recusa um servidor que ignora o Range, em vez de baixar o zip inteiro", async () => {
    const buscar = async () => new Response(zip, { status: 200 });

    await expect(lerMembroRemoto({ url: "https://cdn.tse.jus.br/x.zip", membro: (nome) => nome.endsWith("_BR.csv"), buscar })).rejects.toThrow(/Range/);
  });
});
