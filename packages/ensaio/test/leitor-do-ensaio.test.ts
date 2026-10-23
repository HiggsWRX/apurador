import { describe, expect, it } from "vitest";
import { criarLeitorDoEnsaio } from "../src/index.ts";

// O leitor do ensaio geral lê o endereço público como a página lê (Ensaio geral, decisão 20): a cada 30 s, com o
// `If-None-Match` e o `Origin` do site, e passa ao plano B pela regra da página (erro ou rodada com mais de 2 min pelo
// `Date` da resposta, ficando com a mais nova). Aqui, uma CDN de mentira com dois endereços e o relógio na mão.

const PRINCIPAL = "https://ao-vivo-ensaio.exemplo/";
const PLANO_B = "https://plano-b-ensaio.exemplo/";
const ORIGEM = "https://site-do-ensaio.exemplo";
const AS_18H = Date.parse("2026-10-23T21:00:00Z");

interface Arquivo {
  corpo: string;
  etag: string;
}

/** Uma borda de mentira: os arquivos de cada endereço, a hora do `Date` e o que cada pedido mandou. */
function cdn() {
  const arquivos = new Map<string, Arquivo>();
  const pedidos: { url: string; cabecalhos: Record<string, string> }[] = [];
  let data = AS_18H;
  const fora = new Set<string>();
  return {
    pedidos,
    publicar(url: string, conteudo: unknown, etag: string) {
      arquivos.set(url, { corpo: JSON.stringify(conteudo), etag });
    },
    rodada(endereco: string, rodada: number, etag: string) {
      this.publicar(`${endereco}rodada.json`, { rodada: new Date(rodada).toISOString(), fase: "ao-vivo" }, etag);
    },
    ajustarData(ms: number) {
      data = ms;
    },
    derrubar(endereco: string) {
      fora.add(endereco);
    },
    buscar: async (url: string, init?: RequestInit) => {
      const cabecalhos = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
      pedidos.push({ url, cabecalhos });
      if ([...fora].some((e) => url.startsWith(e))) return new Response("erro", { status: 503 });
      const arquivo = arquivos.get(url);
      const comuns = { date: new Date(data).toUTCString(), "cf-cache-status": "HIT" };
      if (!arquivo) return new Response("não há", { status: 404, headers: comuns });
      if (cabecalhos["if-none-match"] === arquivo.etag) return new Response(null, { status: 304, headers: { ...comuns, etag: arquivo.etag } });
      return new Response(arquivo.corpo, { status: 200, headers: { ...comuns, etag: arquivo.etag, "content-length": "123" } });
    },
  };
}

const leitor = (borda: ReturnType<typeof cdn>, municipios: string[] = [], porLeitura = 2) => {
  let agora = AS_18H;
  return {
    passar: (ms: number) => (agora += ms),
    ...criarLeitorDoEnsaio({
      enderecos: { principal: PRINCIPAL, planoB: PLANO_B },
      origem: ORIGEM,
      lugares: ["BR", "SP"],
      municipios,
      municipiosPorLeitura: porLeitura,
      buscar: borda.buscar,
      agora: () => agora,
    }),
  };
};

describe("o leitor do ensaio geral", () => {
  it("lê o arquivo de rodada, os lugares de sempre, o mapa.json e uma fatia dos municípios, com o Origin do site", async () => {
    const borda = cdn();
    borda.rodada(PRINCIPAL, AS_18H - 10_000, '"r1"');
    const l = leitor(borda, ["71072", "38490", "02550"]);

    const lidas = await l.ler();

    expect(lidas.map((r) => r.caminho)).toEqual(["rodada.json", "lugares/BR.json", "lugares/SP.json", "mapa.json", "lugares/71072.json", "lugares/38490.json"]);
    expect(borda.pedidos.every((p) => p.cabecalhos.origin === ORIGEM)).toBe(true);
    expect(lidas[0]).toMatchObject({ leitura: 1, endereco: PRINCIPAL, tipo: "principal", status: 200, cache: "HIT", bytes: 123, quando: AS_18H });
    expect(lidas[0]!.conteudo).toMatchObject({ fase: "ao-vivo" });
    expect(lidas[1]).toMatchObject({ caminho: "lugares/BR.json", status: 404 });
    expect(lidas[1]!.conteudo).toBeUndefined();
  });

  it("devolve a ETag no If-None-Match, como a página, e registra o 304 sem corpo", async () => {
    const borda = cdn();
    borda.rodada(PRINCIPAL, AS_18H - 10_000, '"r1"');
    const l = leitor(borda);

    await l.ler();
    l.passar(30_000);
    const segunda = await l.ler();

    expect(borda.pedidos.filter((p) => p.url.endsWith("rodada.json")).map((p) => p.cabecalhos["if-none-match"])).toEqual([undefined, '"r1"']);
    expect(segunda[0]).toMatchObject({ leitura: 2, status: 304, bytes: 0, quando: AS_18H + 30_000 });
    expect(segunda[0]!.conteudo).toBeUndefined();
  });

  it("lê os municípios em rodízio: todos antes de repetir algum", async () => {
    const borda = cdn();
    borda.rodada(PRINCIPAL, AS_18H, '"r1"');
    const l = leitor(borda, ["1", "2", "3"], 2);

    const municipios = async () => (await l.ler()).filter((r) => /lugares\/\d/.test(r.caminho)).map((r) => r.caminho);

    expect(await municipios()).toEqual(["lugares/1.json", "lugares/2.json"]);
    expect(await municipios()).toEqual(["lugares/3.json", "lugares/1.json"]);
  });

  it("passa ao plano B com a rodada do principal de mais de 2 min pelo Date, e fica nele", async () => {
    const borda = cdn();
    borda.rodada(PRINCIPAL, AS_18H - 10_000, '"r1"');
    borda.rodada(PLANO_B, AS_18H - 5_000, '"b1"');
    const l = leitor(borda);

    expect((await l.ler()).filter((r) => r.endereco === PLANO_B)).toEqual([]);

    // O principal parou na rodada das 17:59:50; o plano B segue.
    borda.ajustarData(AS_18H + 3 * 60_000);
    borda.rodada(PLANO_B, AS_18H + 3 * 60_000 - 5_000, '"b2"');
    const depois = await l.ler();

    expect(depois.map((r) => `${r.tipo} ${r.caminho}`).slice(0, 3)).toEqual(["principal rodada.json", "plano B rodada.json", "plano B lugares/BR.json"]);
    // Na leitura seguinte, começa pelo plano B, e não volta ao principal enquanto o plano B está em dia.
    expect((await l.ler()).every((r) => r.tipo === "plano B")).toBe(true);
  });

  it("passa ao plano B quando o principal dá erro", async () => {
    const borda = cdn();
    borda.rodada(PRINCIPAL, AS_18H - 10_000, '"r1"');
    borda.rodada(PLANO_B, AS_18H - 5_000, '"b1"');
    borda.derrubar(PRINCIPAL);
    const l = leitor(borda);

    const lidas = await l.ler();

    expect(lidas[0]).toMatchObject({ tipo: "principal", caminho: "rodada.json", status: 503 });
    expect(lidas.slice(1).every((r) => r.tipo === "plano B")).toBe(true);
  });

  it("fica no principal se o plano B não tem rodada mais nova", async () => {
    const borda = cdn();
    borda.rodada(PRINCIPAL, AS_18H - 10_000, '"r1"');
    const l = leitor(borda);
    borda.ajustarData(AS_18H + 3 * 60_000);

    const lidas = await l.ler();

    expect(lidas.map((r) => `${r.tipo} ${r.caminho}`).slice(0, 3)).toEqual(["principal rodada.json", "plano B rodada.json", "principal lugares/BR.json"]);
  });

  it("registra um pedido sem resposta com o status 0", async () => {
    const l = criarLeitorDoEnsaio({
      enderecos: { principal: PRINCIPAL },
      origem: ORIGEM,
      lugares: [],
      municipios: [],
      municipiosPorLeitura: 0,
      buscar: () => Promise.reject(new TypeError("fetch failed")),
      agora: () => AS_18H,
    });

    expect(await l.ler()).toEqual([expect.objectContaining({ caminho: "rodada.json", status: 0, bytes: 0 })]);
  });
});
