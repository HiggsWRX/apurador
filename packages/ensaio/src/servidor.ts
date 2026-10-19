import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { TseFalso } from "./tse-falso.ts";

// Os dois jeitos de usar o TSE falso: dentro do processo, como a função `fetch` que o coletor recebe por
// parâmetro (o replay automático, na velocidade máxima), e como servidor HTTP local, no computador do dono,
// para o ensaio geral.

/**
 * O TSE falso com a forma do `fetch`: o coletor pede como pediria ao TSE, e a resposta vem sem rede. O corpo vem
 * sem compressão, como o `fetch` do Node o entrega depois de descomprimir o gzip do TSE.
 */
export function buscarNoTseFalso(tse: TseFalso, cliente = "replay"): (url: string | URL, init?: RequestInit) => Promise<Response> {
  return async (url, init) => {
    const cabecalhos: Record<string, string> = {};
    new Headers(init?.headers).forEach((valor, nome) => (cabecalhos[nome] = valor));
    delete cabecalhos["accept-encoding"];
    const endereco = new URL(url);
    const r = tse.responder({ url: endereco.pathname + endereco.search, metodo: init?.method ?? "GET", cabecalhos, cliente });
    return new Response(r.status === 304 ? null : (r.corpo as BodyInit), { status: r.status, headers: r.cabecalhos });
  };
}

/** O TSE falso como servidor HTTP local. O cliente de cada pedido é o IP de onde ele veio. */
export async function servirTseFalso(tse: TseFalso, opcoes: { porta?: number; host?: string } = {}): Promise<{ url: string; fechar(): Promise<void> }> {
  const servidor = createServer((pedido, resposta) => {
    const cabecalhos = Object.fromEntries(Object.entries(pedido.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v]));
    const r = tse.responder({ url: pedido.url ?? "/", metodo: pedido.method, cabecalhos, cliente: pedido.socket.remoteAddress ?? "desconhecido" });
    // O cabeçalho Date é o do relógio do TSE falso, não o do computador.
    resposta.sendDate = false;
    resposta.writeHead(r.status, { ...r.cabecalhos, "content-length": String(r.corpo.length) });
    resposta.end(r.corpo);
  });
  await new Promise<void>((pronto) => servidor.listen(opcoes.porta ?? 0, opcoes.host ?? "127.0.0.1", pronto));
  const { address, port } = servidor.address() as AddressInfo;
  return {
    url: `http://${address.includes(":") ? `[${address}]` : address}:${port}`,
    fechar: () => new Promise<void>((pronto, falha) => servidor.close((erro) => (erro ? falha(erro) : pronto()))),
  };
}
