import { describe, expect, it } from "vitest";
import { conexaoMudou, ENDERECO_DO_IP, sondaDaConexao, type BloqueioDoTse, type ConexaoDoComputador } from "../src/conexao.ts";

// A conexão do computador (Operação na noite, decisão 12): parado no bloqueio do TSE, o coletor volta a pedir quando a
// conexão muda (o cabo pelo celular, que dá outro IP) ou cai e volta (o modo avião por 10 s). A sonda lê o IP público
// no rastro da Cloudflare; a rota padrão (cabo ou celular) vem do medidor do computador.

const NO_CABO: ConexaoDoComputador = { ip: "200.160.1.1", voltouEm: null, via: "cabo" };
const bloqueio = (conexao: ConexaoDoComputador | null): BloqueioDoTse => ({ desde: 1_000_000, status: 403, conexao });

describe("a conexão mudou desde o bloqueio", () => {
  it.each<[string, ConexaoDoComputador, boolean]>([
    ["nada mudou", NO_CABO, false],
    ["outro IP: o cabo pelo celular", { ip: "177.79.2.2", voltouEm: null, via: "celular" }, true],
    ["outro IP no mesmo cabo, do provedor", { ...NO_CABO, ip: "200.160.9.9" }, true],
    ["o mesmo IP, mas a internet caiu e voltou depois do bloqueio: o modo avião", { ...NO_CABO, voltouEm: 1_000_001 }, true],
    ["a internet voltou antes do bloqueio", { ...NO_CABO, voltouEm: 999_999 }, false],
    ["sem internet agora", { ip: null, voltouEm: 1_000_001, via: "cabo" }, false],
    ["sem a leitura do IP, mas a rota passou ao celular", { ip: null, voltouEm: null, via: "celular" }, true],
  ])("%s: %s", (_caso, agora, mudou) => {
    expect(conexaoMudou(bloqueio(NO_CABO), agora)).toBe(mudou);
  });

  it("sem a conexão de então (o IP ainda não lido), qualquer IP lido conta como a internet de volta", () => {
    expect(conexaoMudou(bloqueio({ ip: null, voltouEm: null, via: null }), NO_CABO)).toBe(true);
    expect(conexaoMudou(bloqueio({ ip: null, voltouEm: null, via: null }), { ip: null, voltouEm: null, via: "cabo" })).toBe(false);
  });
});

describe("a sonda da conexão", () => {
  /** Uma sonda cuja rede responde o que `rede` mandar, com o relógio na mão. */
  function sonda() {
    let agora = 0;
    let rede: () => Promise<Response> = async () => new Response("fl=1\nh=www.cloudflare.com\nip=200.160.1.1\nts=1\n");
    const pedidos: string[] = [];
    const s = sondaDaConexao({
      buscar: async (url) => {
        pedidos.push(url);
        return rede();
      },
      agora: () => agora,
      via: () => "cabo",
    });
    return {
      s,
      pedidos,
      em: (ms: number) => void (agora = ms),
      responder: (r: () => Promise<Response>) => void (rede = r),
    };
  }
  const comIp = (ip: string) => async () => new Response(`fl=1\nip=${ip}\nts=1\n`);
  const semInternet = async (): Promise<Response> => {
    throw new TypeError("fetch failed");
  };

  it("lê o IP público no rastro da Cloudflare, com a rota do medidor", async () => {
    const { s, pedidos } = sonda();
    expect(s.ler()).toEqual({ ip: null, voltouEm: null, via: "cabo" });

    await s.sondar();
    expect(pedidos).toEqual([ENDERECO_DO_IP]);
    expect(s.ler()).toEqual({ ip: "200.160.1.1", voltouEm: null, via: "cabo" });
  });

  it("sem internet, fica sem IP, e marca quando a internet voltou, mesmo com o mesmo IP", async () => {
    const { s, em, responder } = sonda();
    await s.sondar();
    em(5_000);
    responder(semInternet);
    await s.sondar();
    expect(s.ler()).toEqual({ ip: null, voltouEm: null, via: "cabo" });

    em(10_000);
    responder(comIp("200.160.1.1"));
    await s.sondar();
    expect(s.ler()).toEqual({ ip: "200.160.1.1", voltouEm: 10_000, via: "cabo" });
  });

  it("uma resposta de erro da Cloudflare não é a internet fora: fica a leitura anterior", async () => {
    const { s, em, responder } = sonda();
    await s.sondar();
    em(5_000);
    responder(async () => new Response("erro", { status: 503 }));
    await s.sondar();
    responder(async () => new Response("sem ip"));
    await s.sondar();
    expect(s.ler()).toEqual({ ip: "200.160.1.1", voltouEm: null, via: "cabo" });
  });

  it("a internet que nunca respondeu e começa a responder não é uma volta", async () => {
    const { s, em, responder } = sonda();
    responder(semInternet);
    await s.sondar();
    em(5_000);
    responder(comIp("200.160.1.1"));
    await s.sondar();
    expect(s.ler()).toEqual({ ip: "200.160.1.1", voltouEm: null, via: "cabo" });
  });
});
