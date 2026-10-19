import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { criarTseFalso, relogioManual, type EntradaDoRegistro, type Pedido } from "../src/index.ts";
import { cadastro, instante, noite } from "./noite-2022.ts";

// O TSE falso responde como o CDN do TSE (.scratch/apurador-2026/research/01-api-ao-vivo-tse.md, seções 4 e
// 5): ETag e 304, If-Modified-Since, gzip, o cabeçalho Date, 403 ao HEAD, a query string ignorada, 404 fora
// da configuração e o limite de 100 pedidos por segundo por IP, com bloqueio de 10 minutos.

const BASE = "/oficial/ele2026/6258";
const BRASIL = `${BASE}/dados/br/br-c0001-e006258-u.json`;
const ACRELANDIA = `${BASE}/dados/ac/ac01120-c0001-e006258-u.json`;

function tseFalsoAs(dataHora: string) {
  const relogio = relogioManual(instante(dataHora));
  const entradas: EntradaDoRegistro[] = [];
  const tse = criarTseFalso({ noite, cadastro, relogio, aoRegistrar: (e) => entradas.push(e) });
  return { relogio, tse, entradas, pedir: (url: string, extra: Omit<Pedido, "url"> = {}) => tse.responder({ url, ...extra }) };
}

describe("ETag, 304 e Last-Modified", () => {
  it("o mesmo arquivo no mesmo estado tem a mesma ETag, e um pedido condicional com ela recebe 304 sem corpo", () => {
    const { pedir } = tseFalsoAs("2022-10-30 19:00:00");

    const primeira = pedir(BRASIL);
    const segunda = pedir(BRASIL, { cabecalhos: { "if-none-match": primeira.cabecalhos["etag"] } });

    expect(primeira.cabecalhos["etag"]).toMatch(/^".+"$/);
    expect(segunda.status).toBe(304);
    expect(segunda.corpo).toHaveLength(0);
    expect(segunda.cabecalhos["etag"]).toBe(primeira.cabecalhos["etag"]);
  });

  it("a ETag muda quando o lugar recebe seções, e só então", () => {
    const { pedir, relogio } = tseFalsoAs("2022-10-30 19:00:00");
    const brasil = pedir(BRASIL).cabecalhos["etag"];
    // O Acre terminou às 22:29:40: Acrelândia não muda mais até a totalização final.
    relogio.ajustar(instante("2022-10-30 23:00:00"));
    const acrelandia = pedir(ACRELANDIA).cabecalhos["etag"];

    relogio.ajustar(instante("2022-10-30 23:30:00"));
    expect(pedir(ACRELANDIA, { cabecalhos: { "if-none-match": acrelandia } }).status).toBe(304);
    relogio.ajustar(instante("2022-10-31 00:18:04"));
    expect(pedir(ACRELANDIA, { cabecalhos: { "if-none-match": acrelandia } }).status).toBe(200);
    expect(pedir(BRASIL, { cabecalhos: { "if-none-match": brasil } }).status).toBe(200);
  });

  it("o Last-Modified é a hora da última totalização, e If-Modified-Since dá 304 quando nada mudou desde então", () => {
    const { pedir } = tseFalsoAs("2022-10-30 19:59:40");

    const df = pedir(`${BASE}/dados/df/df-c0001-e006258-u.json`);

    // O Distrito Federal terminou às 19:59:37 de Brasília, 22:59:37 em Greenwich.
    expect(df.cabecalhos["last-modified"]).toBe("Sun, 30 Oct 2022 22:59:37 GMT");
    expect(pedir(`${BASE}/dados/df/df-c0001-e006258-u.json`, { cabecalhos: { "if-modified-since": "Sun, 30 Oct 2022 22:59:37 GMT" } }).status).toBe(304);
    expect(pedir(`${BASE}/dados/df/df-c0001-e006258-u.json`, { cabecalhos: { "if-modified-since": "Sun, 30 Oct 2022 22:59:00 GMT" } }).status).toBe(200);
  });
});

describe("gzip, Date, HEAD e query string", () => {
  it("comprime com gzip quando o pedido aceita, e o conteúdo é o mesmo", () => {
    const { pedir } = tseFalsoAs("2022-10-30 19:00:00");

    const comGzip = pedir(BRASIL, { cabecalhos: { "accept-encoding": "gzip, deflate, br" } });
    const sem = pedir(BRASIL);

    expect(comGzip.cabecalhos["content-encoding"]).toBe("gzip");
    expect(sem.cabecalhos["content-encoding"]).toBeUndefined();
    expect(Buffer.from(gunzipSync(comGzip.corpo)).equals(Buffer.from(sem.corpo))).toBe(true);
    expect(comGzip.corpo.length).toBeLessThan(sem.corpo.length / 2);
    expect(sem.cabecalhos["content-type"]).toBe("application/json");
  });

  it("o cabeçalho Date anda com o relógio do TSE falso", () => {
    const { pedir, relogio } = tseFalsoAs("2022-10-30 18:59:30");

    expect(pedir(BRASIL).cabecalhos["date"]).toBe("Sun, 30 Oct 2022 21:59:30 GMT");
    relogio.avancar(90);
    expect(pedir(BRASIL).cabecalhos["date"]).toBe("Sun, 30 Oct 2022 22:01:00 GMT");
  });

  it("responde 200 ao preflight de CORS, com o GET liberado por 10 min, como o CDN do TSE", () => {
    const { pedir } = tseFalsoAs("2022-10-30 19:00:00");

    const r = pedir(BRASIL, { metodo: "OPTIONS", cabecalhos: { origin: "https://exemplo.pages.dev", "access-control-request-headers": "cache-control" } });

    expect(r.status).toBe(200);
    expect(r.cabecalhos).toMatchObject({
      "access-control-allow-origin": "https://exemplo.pages.dev",
      "access-control-allow-methods": "GET",
      "access-control-allow-headers": "cache-control",
      "access-control-max-age": "600",
    });
  });

  it("responde 403 ao HEAD, como o CDN do TSE, e ignora a query string", () => {
    const { pedir } = tseFalsoAs("2022-10-30 19:00:00");

    expect(pedir(BRASIL, { metodo: "HEAD" }).status).toBe(403);
    expect(pedir(`${BRASIL}?nocache=1730325600`).status).toBe(200);
    expect(pedir(`${BRASIL}?nocache=1730325600`).cabecalhos["etag"]).toBe(pedir(BRASIL).cabecalhos["etag"]);
  });
});

describe("URLs fora da configuração", () => {
  it.each([
    ["outra eleição", "/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json"],
    ["município que não existe", `${BASE}/dados/sp/sp99999-c0001-e006258-u.json`],
    ["zona que não é do município", `${BASE}/dados/sp/sp71072-z9999-c0001-e006258-u.json`],
    ["município na pasta de outra UF", `${BASE}/dados/ac/sp71072-c0001-e006258-u.json`],
    ["UF que não existe", `${BASE}/dados/xx/xx-e006258-ab.json`],
    ["outro cargo", `${BASE}/dados/sp/sp-c0003-e006258-u.json`],
    ["versão assinada", `${BASE}/dados/br/br-c0001-e006258-u.jws`],
    ["município de 2026 que não votou em 2022", `${BASE}/dados/mt/mt73709-c0001-e006258-u.json`],
  ])("%s responde 404, e o pedido fica registrado", (_, url) => {
    const { pedir, tse, entradas } = tseFalsoAs("2022-10-30 19:00:00");

    expect(pedir(url, { cliente: "10.0.0.1" }).status).toBe(404);
    expect(tse.registro().naoEncontrados).toMatchObject([{ tipo: "404", url, cliente: "10.0.0.1", dataHora: "2022-10-30 19:00:00" }]);
    expect(entradas).toHaveLength(1);
  });

  it("um replay que só pede URLs da configuração não deixa nenhum 404 no registro", () => {
    const { pedir, tse } = tseFalsoAs("2022-10-30 19:00:00");

    for (const uf of cadastro.ufs) {
      const sigla = uf.sigla.toLowerCase();
      expect(pedir(`${BASE}/dados/${sigla}/${sigla}-e006258-ab.json`).status).toBe(200);
      expect(pedir(`${BASE}/dados/${sigla}/${sigla}${String(uf.municipios[0]!.codigo).padStart(5, "0")}-c0001-e006258-u.json`).status).toBe(200);
    }
    expect(tse.registro().naoEncontrados).toEqual([]);
    expect(tse.registro().porStatus).toEqual({ 200: 56 });
  });
});

describe("o limite de 100 pedidos por segundo por cliente", () => {
  it("o 101º pedido no mesmo segundo é uma violação: fica registrada, e o cliente recebe 403; os 404 e os 304 contam", () => {
    const { pedir, tse, relogio } = tseFalsoAs("2022-10-30 19:00:00");
    const etag = pedir(BRASIL, { cliente: "outro" }).cabecalhos["etag"];

    for (let i = 0; i < 50; i++) expect(pedir(`${BASE}/dados/sp/sp99999-c0001-e006258-u.json`, { cliente: "1.2.3.4" }).status).toBe(404);
    relogio.avancar(0.5);
    for (let i = 0; i < 50; i++) expect(pedir(BRASIL, { cliente: "1.2.3.4", cabecalhos: { "if-none-match": etag } }).status).toBe(304);
    const excesso = pedir(BRASIL, { cliente: "1.2.3.4" });

    expect(excesso.status).toBe(403);
    expect(tse.registro().violacoes).toMatchObject([{ tipo: "violacao", cliente: "1.2.3.4", dataHora: "2022-10-30 19:00:00", detalhe: "101 pedidos em 1 s" }]);
    // Outro cliente não é afetado.
    expect(pedir(BRASIL, { cliente: "5.6.7.8" }).status).toBe(200);
  });

  it("100 pedidos por segundo, sempre, não violam o limite", () => {
    const { pedir, tse, relogio } = tseFalsoAs("2022-10-30 19:00:00");

    for (let i = 0; i < 1000; i++) {
      expect(pedir(BRASIL, { cliente: "1.2.3.4" }).status).toBe(200);
      relogio.avancar(0.01);
    }
    expect(tse.registro().violacoes).toEqual([]);
  });

  it("quem viola fica bloqueado 10 minutos, e cada pedido no bloqueio recomeça a contagem", () => {
    const { pedir, relogio } = tseFalsoAs("2022-10-30 19:00:00");
    for (let i = 0; i <= 100; i++) pedir(BRASIL, { cliente: "1.2.3.4" });

    relogio.avancar(5 * 60);
    expect(pedir(BRASIL, { cliente: "1.2.3.4" }).status).toBe(403);
    relogio.avancar(10 * 60 - 1);
    expect(pedir(BRASIL, { cliente: "1.2.3.4" }).status).toBe(403);
    relogio.avancar(10 * 60 + 1);
    expect(pedir(BRASIL, { cliente: "1.2.3.4" }).status).toBe(200);
  });
});

describe("o bloqueio por comando", () => {
  it("responde 403 a todos os clientes durante o tempo pedido, registra cada pedido e depois volta", () => {
    const { pedir, tse, relogio } = tseFalsoAs("2022-10-30 19:00:00");

    tse.bloquear(60);
    expect(pedir(BRASIL, { cliente: "1.2.3.4" }).status).toBe(403);
    relogio.avancar(59);
    expect(pedir(ACRELANDIA, { cliente: "5.6.7.8" }).status).toBe(403);
    relogio.avancar(1);
    expect(pedir(BRASIL, { cliente: "1.2.3.4" }).status).toBe(200);

    expect(tse.registro().bloqueados).toMatchObject([
      { tipo: "403", cliente: "1.2.3.4", url: BRASIL, dataHora: "2022-10-30 19:00:00", detalhe: "bloqueio por comando" },
      { tipo: "403", cliente: "5.6.7.8", url: ACRELANDIA, dataHora: "2022-10-30 19:00:59", detalhe: "bloqueio por comando" },
    ]);
  });

  it("pode ser desfeito antes da hora", () => {
    const { pedir, tse } = tseFalsoAs("2022-10-30 19:00:00");

    tse.bloquear(600);
    expect(pedir(BRASIL).status).toBe(403);
    tse.desbloquear();
    expect(pedir(BRASIL).status).toBe(200);
  });
});
