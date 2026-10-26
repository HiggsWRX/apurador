import { randomBytes } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { lerMembroRemoto } from "../src/index.ts";

/**
 * Um servidor falso que só responde a pedidos com Range, como o CDN do TSE, e anota cada pedido. Com uma função, o arquivo
 * servido muda a cada pedido (o TSE regerando o zip no meio da leitura), cada versão com a sua ETag; como o CDN, um
 * `If-Range` com a ETag de outra versão recebe o arquivo inteiro, com 200. `comEtag: false` é um servidor sem ETag.
 */
function servidorComRange(arquivo: Uint8Array<ArrayBuffer> | ((pedido: number) => Uint8Array<ArrayBuffer>), { comEtag = true } = {}) {
  const pedidos: { range: string | null; bytes: number }[] = [];
  const etags = new Map<Uint8Array, string>();
  const buscar = async (_url: string | URL | Request, init?: RequestInit) => {
    const atual = typeof arquivo === "function" ? arquivo(pedidos.length) : arquivo;
    if (!etags.has(atual)) etags.set(atual, `"v${etags.size}"`);
    const etag = etags.get(atual)!;
    const comEsta: Record<string, string> = comEtag ? { ETag: etag } : {};
    const cabecalhos = new Headers(init?.headers);
    const range = cabecalhos.get("range");
    const total = atual.length;
    const m = range?.match(/^bytes=(\d*)-(\d*)$/);
    const etagPedida = cabecalhos.get("if-range");
    if (!m || (etagPedida !== null && etagPedida !== etag)) {
      pedidos.push({ range, bytes: total });
      return new Response(atual, { status: 200, headers: comEsta });
    }
    const [inicio, fim] = m[1] === "" ? [total - Number(m[2]), total - 1] : [Number(m[1]), m[2] === "" ? total - 1 : Math.min(Number(m[2]), total - 1)];
    const fatia = atual.slice(inicio, fim + 1);
    pedidos.push({ range, bytes: fatia.length });
    return new Response(fatia, { status: 206, headers: { "Content-Range": `bytes ${inicio}-${fim}/${total}`, ...comEsta } });
  };
  return { buscar, pedidos };
}

/** Os pedidos da cauda do zip: um por leitura. */
const leituras = (pedidos: { range: string | null }[]) => pedidos.filter((p) => p.range?.startsWith("bytes=-")).length;

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

  // O TSE regera os zips sem hora certa: em 23/10, o `conferir` caiu com um membro que não descomprimia ("invalid stored
  // block lengths"), como um membro lido de outra versão do zip.
  describe("quando o zip muda entre os pedidos", () => {
    const outroCsv = strToU8('"DT_GERACAO";"NR_TURNO"\n"19/10/2026";"1"\n'.repeat(2000));
    const regerado = zipSync({
      "votacao_candidato_munzona_2026_AC.csv": randomBytes(310_000),
      "votacao_candidato_munzona_2026_BR.csv": outroCsv,
      "leiame.pdf": randomBytes(1_000),
    });
    // A cauda vem do zip de ontem; o resto, do regerado.
    const ontemEDepoisRegerado = (pedido: number) => (pedido === 0 ? zip : regerado);

    it("lê de novo, do começo, quando o CDN diz pela ETag que ele mudou", async () => {
      const { buscar, pedidos } = servidorComRange(ontemEDepoisRegerado);

      const membro = await lerMembroRemoto({ url: "https://cdn.tse.jus.br/x.zip", membro: (nome) => nome.endsWith("_BR.csv"), buscar });

      expect(membro.dados).toEqual(outroCsv);
      expect(leituras(pedidos)).toBe(2);
    });

    it("lê de novo, do começo, quando o membro chega corrompido sem ETag para avisar", async () => {
      const { buscar, pedidos } = servidorComRange(ontemEDepoisRegerado, { comEtag: false });

      const membro = await lerMembroRemoto({ url: "https://cdn.tse.jus.br/x.zip", membro: (nome) => nome.endsWith("_BR.csv"), buscar });

      expect(membro.dados).toEqual(outroCsv);
      expect(leituras(pedidos)).toBe(2);
    });

    it("desiste depois de 3 leituras quando ele muda a cada pedido", async () => {
      const versoes = new Map<number, Uint8Array<ArrayBuffer>>();
      const aCadaPedido = (pedido: number) =>
        versoes.get(pedido) ?? versoes.set(pedido, zipSync({ "a.bin": randomBytes(1_000 + pedido), "x_BR.csv": strToU8(`versão ${pedido}`) })).get(pedido)!;
      const { buscar, pedidos } = servidorComRange(aCadaPedido);

      await expect(lerMembroRemoto({ url: "https://cdn.tse.jus.br/x.zip", membro: (nome) => nome.endsWith("_BR.csv"), buscar })).rejects.toThrow(/mudou/);
      expect(leituras(pedidos)).toBe(3);
    });
  });

  it("diz que um membro corrompido no próprio zip chegou corrompido, depois de 3 leituras", async () => {
    // Um byte trocado no meio dos dados do membro do Brasil: o zip não muda, mas o CRC nunca bate.
    const corrompido = zip.slice();
    const nome = strToU8("votacao_candidato_munzona_2026_BR.csv");
    const cabecalho = corrompido.findIndex(
      (_, i) => corrompido[i] === 0x50 && corrompido[i + 1] === 0x4b && corrompido[i + 2] === 3 && nome.every((b, j) => corrompido[i + 30 + j] === b),
    );
    corrompido[cabecalho + 30 + nome.length + 200]! ^= 0xff;
    const { buscar, pedidos } = servidorComRange(corrompido);

    await expect(lerMembroRemoto({ url: "https://cdn.tse.jus.br/x.zip", membro: (n) => n.endsWith("_BR.csv"), buscar })).rejects.toThrow(/chegou corrompido/);
    expect(leituras(pedidos)).toBe(3);
  });

  it("recusa um servidor que ignora o Range, em vez de baixar o zip inteiro", async () => {
    const buscar = async () => new Response(zip, { status: 200 });

    await expect(lerMembroRemoto({ url: "https://cdn.tse.jus.br/x.zip", membro: (nome) => nome.endsWith("_BR.csv"), buscar })).rejects.toThrow(/Range/);
  });
});
