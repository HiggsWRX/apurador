import type { Buscar } from "./coletor.ts";

// A conferência da entrega (Volume de gravações na noite, decisão 6; Arquitetura e tecnologia, decisão 15): a
// documentação não garante que a borda entregue certo, com ETag e 304, um objeto do R2 gravado com gzip. Esta
// conferência lê um objeto recém-gravado pelo endereço público, na ordem em que a noite o lê:
//
// 1. um leitor sem `Origin` (a sentinela, o painel do coletor), com o cache ainda frio: o JSON tem de chegar igual ao
//    gravado, com ETag e, no R2, com os 15 s de cache que a página espera (o TTL do navegador da zona em "Respect
//    Existing Headers");
// 2. o navegador, logo depois: a cópia da borda (a Cache Rule de `ao-vivo.apurador.org`), com o CORS. A Cloudflare
//    guarda os cabeçalhos de CORS na cópia, e a cópia feita pelo pedido sem `Origin` pode chegar ao navegador sem eles;
// 3. a releitura da página, com a ETag: 304, com o CORS, que é o que o código da página recebe;
// 4. no R2, o preflight do navegador, que manda o `If-None-Match` à mão (`enderecos-ao-vivo.ts`, no site).
//
// No Worker do plano B, os static assets dão o próprio cache (`max-age=0, must-revalidate`) e não atendem preflight: a
// página o lê sem cabeçalho próprio, e a conferência deixa de fora os itens 4 e o cache.

/** Um item da conferência: o que se espera, se a borda cumpriu e o que se viu. */
export interface ItemDaConferencia {
  id: "corpo" | "etag" | "cache-control" | "cache-da-borda" | "cors" | "304" | "preflight";
  descricao: string;
  ok: boolean;
  visto: string;
}

/** O preflight vale por pelo menos as 2 h que o Chrome aceita: acima disso, o navegador corta. */
const PREFLIGHT_MINIMO = 7200;

const iguais = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);
const valoresDoCabecalho = (valor: string | null) =>
  (valor ?? "")
    .toLowerCase()
    .split(",")
    .map((v) => v.trim());

/** Confere a entrega de um objeto recém-gravado, pelo endereço público, com uma borda de cache ainda fria para ele. */
export async function conferirEntrega(opcoes: {
  /** A URL pública do objeto. */
  url: string;
  /** Os bytes do JSON como o coletor os montou, antes da compressão. */
  esperado: Uint8Array;
  /** A origem da página, `https://apurador.org`. */
  origem: string;
  /** O endereço é o R2 (`ao-vivo.apurador.org`) ou o Worker do plano B. */
  tipo: "r2" | "worker";
  buscar: Buscar;
}): Promise<ItemDaConferencia[]> {
  const { url, esperado, origem, tipo, buscar } = opcoes;
  const itens: ItemDaConferencia[] = [];
  const item = (id: ItemDaConferencia["id"], descricao: string, ok: boolean, visto: string) => itens.push({ id, descricao, ok, visto });
  const permiteAOrigem = (r: Response) => [origem, "*"].includes(r.headers.get("access-control-allow-origin") ?? "");
  const origemNaResposta = (r: Response) => `Allow-Origin ${r.headers.get("access-control-allow-origin") ?? "ausente"}`;

  const primeira = await buscar(url, { headers: { "accept-encoding": "gzip, br" } });
  const corpo = new Uint8Array(await primeira.arrayBuffer());
  const codificacao = primeira.headers.get("content-encoding") ?? "sem Content-Encoding";
  item(
    "corpo",
    "o JSON chega igual ao gravado",
    primeira.status === 200 && iguais(corpo, esperado),
    `${primeira.status}, ${codificacao}, ${corpo.length} bytes`,
  );
  const etag = primeira.headers.get("etag");
  item("etag", "a resposta traz ETag", etag !== null, etag ?? "sem ETag");
  if (tipo === "r2") {
    const cabecalhoDeCache = primeira.headers.get("cache-control");
    item("cache-control", "o navegador recebe max-age=15", /(^|[ ,])max-age=15($|[ ,])/.test(cabecalhoDeCache ?? ""), cabecalhoDeCache ?? "sem Cache-Control");
  }

  const segunda = await buscar(url, { headers: { origin: origem } });
  await segunda.body?.cancel();
  if (tipo === "r2") {
    const status = segunda.headers.get("cf-cache-status");
    item("cache-da-borda", "o segundo pedido vem da cópia da borda", status === "HIT", `CF-Cache-Status ${status ?? "ausente"}`);
  }
  const expostos = valoresDoCabecalho(segunda.headers.get("access-control-expose-headers"));
  item(
    "cors",
    `de ${origem}, com Date e ETag expostos, mesmo depois de um pedido sem Origin`,
    permiteAOrigem(segunda) && expostos.includes("date") && expostos.includes("etag"),
    `${origemNaResposta(segunda)}, Expose-Headers ${segunda.headers.get("access-control-expose-headers") ?? "ausente"}`,
  );

  const terceira = await buscar(url, { headers: { origin: origem, "if-none-match": etag ?? "" } });
  await terceira.body?.cancel();
  item(
    "304",
    "com If-None-Match, a borda responde 304, com o CORS",
    terceira.status === 304 && permiteAOrigem(terceira),
    `${terceira.status}, ${origemNaResposta(terceira)}`,
  );

  if (tipo === "r2") {
    const preflight = await buscar(url, {
      method: "OPTIONS",
      headers: { origin: origem, "access-control-request-method": "GET", "access-control-request-headers": "if-none-match" },
    });
    await preflight.body?.cancel();
    const permitidos = valoresDoCabecalho(preflight.headers.get("access-control-allow-headers"));
    const validade = Number(preflight.headers.get("access-control-max-age") ?? 0);
    item(
      "preflight",
      `o preflight permite o If-None-Match e vale ${PREFLIGHT_MINIMO / 3600} h ou mais`,
      preflight.ok && permiteAOrigem(preflight) && (permitidos.includes("if-none-match") || permitidos.includes("*")) && validade >= PREFLIGHT_MINIMO,
      `${preflight.status}, ${origemNaResposta(preflight)}, Allow-Headers ${preflight.headers.get("access-control-allow-headers") || "ausente"}, Max-Age ${validade}`,
    );
  }
  return itens;
}
