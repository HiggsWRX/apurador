import { describe, expect, it } from "vitest";
import type { Buscar } from "../src/coletor.ts";
import { conferirEntrega } from "../src/entrega.ts";

// A conferência da entrega (Volume de gravações na noite, decisão 6; Arquitetura e tecnologia, decisão 15): um objeto
// gravado no R2 chega certo ao navegador pela borda, com ETag e 304, com o cache que a página espera e o CORS que ela
// precisa. Aqui a borda é de mentira, com cada defeito que a conferência tem de apontar; na conta, ela roda contra
// `ao-vivo.apurador.org` (`npm run conferir-entrega`).

const URL_DO_OBJETO = "https://ao-vivo.exemplo/conferencia/entrega-1.json";
const ORIGEM = "https://apurador.org";
const JSON_GRAVADO = new TextEncoder().encode('{"conferencia":"ação em São Paulo","percentual":12.34}');

interface Defeitos {
  /** O corpo chega com os bytes gzip, sem `Content-Encoding`: o navegador não o descomprime. */
  gzipSemCabecalho?: boolean;
  /** A borda recomprime (com brotli) e troca a ETag por uma fraca: o que a documentação não garante. */
  recomprime?: boolean;
  /** A borda responde 200 a um `If-None-Match` com a ETag certa. */
  sem304?: boolean;
  /** O TTL do navegador da zona sobrescreve o `max-age` da origem (o padrão de 4 h do plano gratuito). */
  ttlDaZona?: boolean;
  /** Sem a Cache Rule, a borda não guarda JSON. */
  semCacheRule?: boolean;
  /** Os cabeçalhos de CORS ficam na cópia da borda: a cópia feita por um pedido sem `Origin` chega sem eles. */
  corsNaCopia?: boolean;
  /** O preflight não permite o `If-None-Match`. */
  preflightSemIfNoneMatch?: boolean;
}

/** A borda de `ao-vivo.apurador.org`, com o objeto gravado e os defeitos do teste. */
function borda(defeitos: Defeitos = {}) {
  const etag = defeitos.recomprime ? 'W/"9b2cf535f27731c974343645a3985328"' : '"9b2cf535f27731c974343645a3985328"';
  let copia: { comCors: boolean } | null = null;
  const buscar: Buscar = async (url, init) => {
    const pedido = new Headers(init?.headers);
    const origem = pedido.get("origin");
    const cors = (comCors: boolean): Record<string, string> =>
      comCors && origem === ORIGEM ? { "access-control-allow-origin": ORIGEM, "access-control-expose-headers": "Date,ETag" } : {};
    if (url !== URL_DO_OBJETO) return new Response(null, { status: 404 });
    if (init?.method === "OPTIONS") {
      const permitidos = defeitos.preflightSemIfNoneMatch ? "" : "if-none-match";
      return new Response(null, { status: 204, headers: { ...cors(true), "access-control-allow-methods": "GET, HEAD", "access-control-allow-headers": permitidos, "access-control-max-age": "86400" } });
    }
    const status = defeitos.semCacheRule ? "DYNAMIC" : copia ? "HIT" : "MISS";
    if (!defeitos.semCacheRule) copia ??= { comCors: origem !== null };
    const comCors = defeitos.corsNaCopia ? (copia?.comCors ?? true) : true;
    const cabecalhos = {
      ...cors(comCors),
      etag,
      date: "Sun, 25 Oct 2026 22:00:00 GMT",
      "cache-control": defeitos.ttlDaZona ? "public, max-age=14400" : "public, max-age=15",
      "cf-cache-status": status,
      "content-type": "application/json",
      ...(defeitos.recomprime ? { "x-encoding-original": "br" } : {}),
    };
    if (!defeitos.sem304 && pedido.get("if-none-match") === etag) return new Response(null, { status: 304, headers: cabecalhos });
    const corpo = defeitos.gzipSemCabecalho ? new Uint8Array([0x1f, 0x8b, 0x08, 0, 0, 0, 0, 0]) : JSON_GRAVADO;
    return new Response(corpo, { status: 200, headers: cabecalhos });
  };
  return buscar;
}

/** O resultado de cada item da conferência, pelo id. */
const resultado = async (tipo: "r2" | "worker", defeitos?: Defeitos) =>
  Object.fromEntries((await conferirEntrega({ url: URL_DO_OBJETO, esperado: JSON_GRAVADO, origem: ORIGEM, tipo, buscar: borda(defeitos) })).map((i) => [i.id, i.ok]));

describe("a conferência da entrega", () => {
  it("no R2 pela borda certa, todos os itens passam", async () => {
    expect(await resultado("r2")).toEqual({ corpo: true, etag: true, "cache-control": true, "cache-da-borda": true, cors: true, "304": true, preflight: true });
  });

  it("uma borda que recomprime e enfraquece a ETag ainda passa: o JSON chega igual e o 304 vale para a ETag fraca", async () => {
    expect(Object.values(await resultado("r2", { recomprime: true })).every(Boolean)).toBe(true);
  });

  it("aponta cada defeito no seu item", async () => {
    expect(await resultado("r2", { gzipSemCabecalho: true })).toMatchObject({ corpo: false, etag: true });
    expect(await resultado("r2", { sem304: true })).toMatchObject({ "304": false, corpo: true });
    expect(await resultado("r2", { ttlDaZona: true })).toMatchObject({ "cache-control": false });
    expect(await resultado("r2", { semCacheRule: true })).toMatchObject({ "cache-da-borda": false });
    expect(await resultado("r2", { preflightSemIfNoneMatch: true })).toMatchObject({ preflight: false, cors: true });
  });

  it("aponta o CORS que fica na cópia da borda: depois de um pedido sem `Origin`, o navegador receberia a cópia sem ele", async () => {
    expect(await resultado("r2", { corsNaCopia: true })).toMatchObject({ cors: false, "cache-da-borda": true });
  });

  it("no Worker do plano B, confere o corpo, a ETag, o 304 e o CORS, sem preflight nem o cache de 15 s", async () => {
    expect(await resultado("worker")).toEqual({ corpo: true, etag: true, cors: true, "304": true });
  });
});
