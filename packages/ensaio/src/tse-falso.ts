import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { dataHoraDoInstante, reproduzir, type Cadastro, type Noite, type Reproducao } from "@apurador/pipeline";
import { criarDivulgacao, type Documento } from "./divulgacao.ts";
import { dataHttp, escreverComoTse } from "./formato.ts";
import type { Momento, Relogio } from "./relogio.ts";

// O TSE falso: responde como o CDN do TSE, com os arquivos da divulgação no estado da noite reconstruída no
// instante do relógio dele. Como o CDN, ele dá ETag e 304, gzip e o cabeçalho `Date` (na hora da noite),
// responde 403 ao `HEAD` e 404 a toda URL fora da configuração, e aplica o limite de 100 pedidos por segundo
// por cliente, com os 404 e os 304 contando: quem passa fica bloqueado 10 minutos, e cada pedido no bloqueio
// recomeça a contagem. Por comando, ele responde 403 a todos por um tempo, para testar o bloqueio.

export interface Pedido {
  /** O caminho, com ou sem a query string, que o CDN ignora. */
  url: string;
  /** `GET` se faltar. */
  metodo?: string;
  /** Com os nomes em minúsculas. */
  cabecalhos?: Record<string, string | undefined>;
  /** Quem pede (o IP), para o limite por cliente. */
  cliente?: string;
}

export interface Resposta {
  status: number;
  /** Com os nomes em minúsculas. */
  cabecalhos: Record<string, string>;
  corpo: Uint8Array;
}

/** O que fica registrado: os pedidos que deram 404 ou 403 e as violações do limite. */
export interface EventoDoRegistro {
  tipo: "404" | "403" | "violacao";
  /** A hora real e o instante da noite. */
  momento: Momento;
  /** A hora da noite, `AAAA-MM-DD HH:MM:SS`. */
  hora: string;
  cliente: string;
  url: string;
  /** Na violação, os pedidos do cliente no último segundo; no 403, por que bloqueou. */
  detalhe?: string;
}

export interface Registro {
  pedidos: number;
  porStatus: Record<number, number>;
  naoEncontrados: EventoDoRegistro[];
  violacoes: EventoDoRegistro[];
  bloqueados: EventoDoRegistro[];
}

export interface TseFalso {
  responder(pedido: Pedido): Resposta;
  /** Responde 403 a todos os pedidos pelos próximos `segundos` do relógio real. */
  bloquear(segundos: number): void;
  desbloquear(): void;
  registro(): Registro;
  /** O instante da noite agora, e os da indicação do TSE e da totalização final. */
  estado(): { momento: Momento; hora: string; indicacao: string | null; totalizacaoFinal: string | null; bloqueadoAte: number | null };
}

export interface Limite {
  pedidosPorSegundo: number;
  /** O bloqueio de quem passa do limite. */
  bloqueioEmSegundos: number;
}

/** O limite do TSE: 100 pedidos por segundo por IP, com bloqueio de 10 minutos. */
export const LIMITE_DO_TSE: Limite = { pedidosPorSegundo: 100, bloqueioEmSegundos: 600 };

export function criarTseFalso(opcoes: { noite: Noite; cadastro: Cadastro; relogio: Relogio; limite?: Limite; aoRegistrar?: (evento: EventoDoRegistro) => void }): TseFalso {
  const { noite, relogio } = opcoes;
  const limite = opcoes.limite ?? LIMITE_DO_TSE;
  const divulgacao = criarDivulgacao(noite, opcoes.cadastro);

  // O estado da noite anda só para a frente: voltar no tempo refaz a reprodução desde o começo.
  let estado: Reproducao = reproduzir(noite);
  let instanteDoEstado = -Infinity;
  function estadoEm(instante: number): Reproducao {
    if (instante < instanteDoEstado) estado = reproduzir(noite);
    estado.avancarAte(instante);
    instanteDoEstado = instante;
    return estado;
  }

  // O que já foi escrito, por caminho, enquanto a versão do arquivo não muda. A ETag sai do caminho e da versão,
  // que muda junto com o conteúdo, sem passar o hash pelo corpo inteiro (os índices das UFs somam ~6 MB). O gzip
  // só é feito quando alguém pede com gzip.
  type Escrito = { versao: string; corpo: Uint8Array; gzip?: Uint8Array; etag: string; geracao: number };
  const escritos = new Map<string, Escrito>();
  function escrito(caminho: string, documento: Documento, e: Reproducao): Escrito {
    const versao = divulgacao.versao(documento, e);
    const antes = escritos.get(caminho);
    if (antes?.versao === versao) return antes;
    const corpo = new TextEncoder().encode(escreverComoTse(divulgacao.escrever(documento, e)));
    const novo: Escrito = { versao, corpo, etag: `"${createHash("md5").update(`${caminho}@${versao}`).digest("hex")}"`, geracao: divulgacao.geracao(documento, e) };
    escritos.set(caminho, novo);
    return novo;
  }

  const registro: Registro = { pedidos: 0, porStatus: {}, naoEncontrados: [], violacoes: [], bloqueados: [] };
  const hora = (instante: number) => dataHoraDoInstante(noite, instante);
  function registrar(evento: Omit<EventoDoRegistro, "hora">) {
    const completo = { ...evento, hora: hora(evento.momento.instante) };
    ({ "404": registro.naoEncontrados, "403": registro.bloqueados, violacao: registro.violacoes })[evento.tipo].push(completo);
    opcoes.aoRegistrar?.(completo);
  }

  let bloqueadoAte: number | null = null;
  const clientes = new Map<string, { pedidos: number[]; bloqueadoAte: number }>();

  function responder(pedido: Pedido): Resposta {
    const momento = relogio.agora();
    const cliente = pedido.cliente ?? "local";
    const caminho = pedido.url.split("?")[0]!;
    const cabecalhos: Record<string, string> = {
      date: dataHttp(hora(momento.instante)),
      "access-control-allow-origin": pedido.cabecalhos?.["origin"] ?? "*",
      vary: "Origin, Accept-Encoding",
    };
    const responderCom = (status: number, corpo: Uint8Array = new Uint8Array(), extra: Record<string, string> = {}): Resposta => {
      registro.pedidos++;
      registro.porStatus[status] = (registro.porStatus[status] ?? 0) + 1;
      return { status, cabecalhos: { ...cabecalhos, ...extra }, corpo };
    };
    const proibido = (detalhe: string) => {
      registrar({ tipo: "403", momento, cliente, url: pedido.url, detalhe });
      return responderCom(403, new TextEncoder().encode("Access Denied"), { "content-type": "text/html" });
    };

    if (bloqueadoAte !== null && momento.real < bloqueadoAte) return proibido("bloqueio por comando");

    // O limite por cliente: todo pedido conta, e o bloqueio recomeça a cada pedido feito durante ele.
    const c = clientes.get(cliente) ?? { pedidos: [], bloqueadoAte: -Infinity };
    clientes.set(cliente, c);
    if (momento.real < c.bloqueadoAte) {
      c.bloqueadoAte = momento.real + limite.bloqueioEmSegundos * 1000;
      return proibido("bloqueio por excesso de pedidos");
    }
    c.pedidos = c.pedidos.filter((t) => t > momento.real - 1000);
    c.pedidos.push(momento.real);
    if (c.pedidos.length > limite.pedidosPorSegundo) {
      registrar({ tipo: "violacao", momento, cliente, url: pedido.url, detalhe: `${c.pedidos.length} pedidos em 1 s` });
      c.bloqueadoAte = momento.real + limite.bloqueioEmSegundos * 1000;
      return proibido("bloqueio por excesso de pedidos");
    }

    if ((pedido.metodo ?? "GET").toUpperCase() !== "GET") return proibido(`método ${pedido.metodo}`);

    const documento = divulgacao.documento(caminho);
    if (!documento) {
      registrar({ tipo: "404", momento, cliente, url: pedido.url });
      const xml = `<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchKey</Code><Key>${caminho}</Key></Error>`;
      return responderCom(404, new TextEncoder().encode(xml), { "content-type": "application/xml" });
    }

    const arquivo = escrito(caminho, documento, estadoEm(momento.instante));
    const ultimaModificacao = dataHttp(hora(arquivo.geracao));
    const validacao = { etag: arquivo.etag, "last-modified": ultimaModificacao, "cache-control": "max-age=60" };
    const desde = pedido.cabecalhos?.["if-modified-since"];
    const naoMudou =
      pedido.cabecalhos?.["if-none-match"] !== undefined
        ? pedido.cabecalhos["if-none-match"].split(",").some((e) => e.trim() === arquivo.etag)
        : desde !== undefined && Date.parse(desde) >= Date.parse(ultimaModificacao);
    if (naoMudou) return responderCom(304, new Uint8Array(), validacao);

    const comGzip = /\bgzip\b/.test(pedido.cabecalhos?.["accept-encoding"] ?? "");
    if (comGzip) arquivo.gzip ??= new Uint8Array(gzipSync(arquivo.corpo));
    return responderCom(200, comGzip ? arquivo.gzip! : arquivo.corpo, {
      ...validacao,
      "content-type": "application/json",
      ...(comGzip ? { "content-encoding": "gzip" } : {}),
    });
  }

  return {
    responder,
    bloquear(segundos) {
      bloqueadoAte = relogio.agora().real + segundos * 1000;
    },
    desbloquear() {
      bloqueadoAte = null;
    },
    registro: () => structuredClone(registro),
    estado() {
      const momento = relogio.agora();
      const ou = (i: number | null) => (i === null ? null : hora(i));
      return { momento, hora: hora(momento.instante), indicacao: ou(divulgacao.indicacao), totalizacaoFinal: ou(divulgacao.totalizacaoFinal), bloqueadoAte };
    },
  };
}
