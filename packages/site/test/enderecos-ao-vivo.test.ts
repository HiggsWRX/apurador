import type { ArquivoDeRodada, ArquivoDoLugar, Buscar, ChavesDaNoite } from "@apurador/coletor";
import { describe, expect, it } from "vitest";
import { enderecosDoBuild } from "../src/lib/enderecos-ao-vivo";
import { criarLeitorAoVivo } from "../src/lib/leitor-ao-vivo";

// Os dois endereços dos arquivos ao vivo (Operação na noite, decisão 14; spec, "Fronteiras de teste", 3): a página lê
// o principal, no R2, e passa ao do plano B, o Worker em `*.workers.dev`, se o principal der erro ou se o arquivo de
// rodada dele tiver mais de 2 min pelo `Date` da resposta, e fica com a rodada mais nova. Os testes respondem pelos
// dois endereços com status, `Date`, ETag e corpo, como a CDN e os static assets respondem.

const PRINCIPAL = "https://ao-vivo.exemplo/";
const PLANO_B = "https://plano-b.exemplo.workers.dev/";
const CANDIDATOS = [
  { numero: 22, nome: "FLAVIO BOLSONARO", partido: "PL", sequencial: "280002551544" },
  { numero: 13, nome: "LULA", partido: "PT", sequencial: "280002542548" },
];
const LIGADAS: ChavesDaNoite = { nucleoMinimo: true, projecao: true, baseComPesquisas: true, simulador: true, mapa: true, textosPreditivos: false };

function rodada(hora: string): ArquivoDeRodada {
  return { rodada: new Date(hora).toISOString(), fase: "ao-vivo", novidade: { totalizacao: null, vista: null }, candidatos: CANDIDATOS, chaves: LIGADAS, aviso: null, eventosDoBrasil: [] };
}

function lugar(percentualDeSecoes: number): ArquivoDoLugar {
  return {
    lugar: "BR",
    tse: { totalizacao: "2022-10-30 19:41:30", secoes: { totalizadas: 1, total: 472027, percentual: percentualDeSecoes }, votos: [0, 0], percentuais: [0, 0], final: false },
    curva: [],
    narracao: [],
  };
}

interface Resposta {
  status: number;
  date?: string;
  etag?: string;
  corpo?: unknown;
}

/** Os dois endereços de mentira: cada URL responde o que o teste mandar, e os pedidos ficam registrados com o que levaram. */
function montar(enderecos = enderecosDoBuild(PRINCIPAL, PLANO_B)) {
  const respostas = new Map<string, Resposta | "sem-conexao">();
  let pedidos: { url: string; ifNoneMatch: string | null; cache: RequestCache | undefined }[] = [];
  const buscar: Buscar = async (url, init) => {
    pedidos.push({ url, ifNoneMatch: new Headers(init?.headers).get("If-None-Match"), cache: init?.cache });
    const r = respostas.get(url);
    if (r === "sem-conexao") throw new TypeError("Failed to fetch");
    if (!r) return new Response(null, { status: 404 });
    const headers = new Headers();
    if (r.date) headers.set("Date", new Date(r.date).toUTCString());
    if (r.etag) headers.set("ETag", r.etag);
    return new Response(r.corpo === undefined ? null : JSON.stringify(r.corpo), { status: r.status, headers });
  };
  const leitor = criarLeitorAoVivo({ enderecos, lugar: "BR", buscar, relogio: () => 0, chaves: LIGADAS });
  /** Os pedidos desde a última chamada, com o que levaram. */
  const tirarPedidos = () => {
    const feitos = pedidos;
    pedidos = [];
    return feitos;
  };
  return {
    leitor,
    responder: (url: string, r: Resposta | "sem-conexao") => respostas.set(url, r),
    pedidos: tirarPedidos,
    /** As URLs pedidas desde a última chamada. */
    urls: () => tirarPedidos().map((p) => p.url),
  };
}

const AGORA = "2026-10-25T19:42:00-03:00";

describe("os dois endereços dos arquivos ao vivo", () => {
  it("com o principal em dia, lê só ele", async () => {
    const { leitor, responder, urls } = montar();
    responder(`${PRINCIPAL}rodada.json`, { status: 200, date: AGORA, corpo: rodada("2026-10-25T19:41:40-03:00") });
    responder(`${PRINCIPAL}lugares/BR.json`, { status: 200, date: AGORA, corpo: lugar(40) });

    await leitor.ler();

    expect(urls()).toEqual([`${PRINCIPAL}rodada.json`, `${PRINCIPAL}lugares/BR.json`]);
    expect(leitor.quadro().lugar?.tse.secoes.percentual).toBe(40);
  });

  it("com erro no principal, lê o plano B e mostra a rodada e o lugar dele", async () => {
    const { leitor, responder, urls } = montar();
    responder(`${PRINCIPAL}rodada.json`, { status: 503, date: AGORA });
    responder(`${PRINCIPAL}lugares/BR.json`, { status: 503, date: AGORA });
    responder(`${PLANO_B}rodada.json`, { status: 200, date: AGORA, corpo: rodada("2026-10-25T19:41:30-03:00") });
    responder(`${PLANO_B}lugares/BR.json`, { status: 200, date: AGORA, corpo: lugar(41) });

    await leitor.ler();

    expect(urls()).toEqual([`${PRINCIPAL}rodada.json`, `${PRINCIPAL}lugares/BR.json`, `${PLANO_B}rodada.json`, `${PLANO_B}lugares/BR.json`]);
    expect(leitor.quadro().rodada?.rodada).toBe("2026-10-25T22:41:30.000Z");
    expect(leitor.quadro().lugar?.tse.secoes.percentual).toBe(41);
    expect(leitor.quadro().indicador.estado).toBe("ao-vivo");
  });

  it("sem resposta nenhuma do principal (a rede ou o CORS dele), passa ao plano B, e o visitante não está sem conexão", async () => {
    const { leitor, responder } = montar();
    responder(`${PRINCIPAL}rodada.json`, "sem-conexao");
    responder(`${PRINCIPAL}lugares/BR.json`, "sem-conexao");
    responder(`${PLANO_B}rodada.json`, { status: 200, date: AGORA, corpo: rodada("2026-10-25T19:41:30-03:00") });
    responder(`${PLANO_B}lugares/BR.json`, { status: 200, date: AGORA, corpo: lugar(41) });

    await leitor.ler();

    expect(leitor.quadro().indicador.estado).toBe("ao-vivo");
    expect(leitor.quadro().lugar?.tse.secoes.percentual).toBe(41);
  });

  it("sem resposta de endereço nenhum, o visitante está sem conexão", async () => {
    const { leitor, responder } = montar();
    for (const base of [PRINCIPAL, PLANO_B]) {
      responder(`${base}rodada.json`, "sem-conexao");
      responder(`${base}lugares/BR.json`, "sem-conexao");
    }

    await leitor.ler();

    expect(leitor.quadro().indicador.estado).toBe("sem-conexao");
  });

  it("com a rodada do principal com mais de 2 min pelo `Date`, lê o plano B e fica com a mais nova", async () => {
    const { leitor, responder } = montar();
    responder(`${PRINCIPAL}rodada.json`, { status: 200, date: AGORA, corpo: rodada("2026-10-25T19:39:59-03:00") });
    responder(`${PRINCIPAL}lugares/BR.json`, { status: 200, date: AGORA, corpo: lugar(38) });
    responder(`${PLANO_B}rodada.json`, { status: 200, date: AGORA, corpo: rodada("2026-10-25T19:41:20-03:00") });
    responder(`${PLANO_B}lugares/BR.json`, { status: 200, date: AGORA, corpo: lugar(41) });

    await leitor.ler();

    expect(leitor.quadro().rodada?.rodada).toBe("2026-10-25T22:41:20.000Z");
    expect(leitor.quadro().lugar?.tse.secoes.percentual).toBe(41);
  });

  it("com a rodada do principal velha e o plano B sem nada, fica com a do principal, e a interrupção conta dela", async () => {
    const { leitor, responder } = montar();
    responder(`${PRINCIPAL}rodada.json`, { status: 200, date: AGORA, corpo: rodada("2026-10-25T19:38:30-03:00") });
    responder(`${PRINCIPAL}lugares/BR.json`, { status: 200, date: AGORA, corpo: lugar(38) });

    await leitor.ler();

    expect(leitor.quadro().rodada?.rodada).toBe("2026-10-25T22:38:30.000Z");
    expect(leitor.quadro().lugar?.tse.secoes.percentual).toBe(38);
    expect(leitor.quadro().indicador).toEqual({ estado: "interrompido", atualizadoAs: "19:38", linkDoTse: false });
  });

  it("com 2 min em ponto, a rodada do principal ainda vale e o plano B nem é lido", async () => {
    const { leitor, responder, urls } = montar();
    responder(`${PRINCIPAL}rodada.json`, { status: 200, date: AGORA, corpo: rodada("2026-10-25T19:40:00-03:00") });
    responder(`${PRINCIPAL}lugares/BR.json`, { status: 200, date: AGORA, corpo: lugar(38) });

    await leitor.ler();

    expect(urls()).toEqual([`${PRINCIPAL}rodada.json`, `${PRINCIPAL}lugares/BR.json`]);
  });

  it("no principal, pede com o If-None-Match à mão; no plano B, sem cabeçalho próprio e com o cache do navegador, porque os static assets não atendem o preflight", async () => {
    const { leitor, responder, pedidos } = montar();
    responder(`${PRINCIPAL}rodada.json`, { status: 200, date: AGORA, etag: '"r1"', corpo: rodada("2026-10-25T19:41:40-03:00") });
    responder(`${PRINCIPAL}lugares/BR.json`, { status: 200, date: AGORA, etag: '"b1"', corpo: lugar(40) });
    await leitor.ler();
    pedidos();

    // Três minutos depois, o principal continua com a mesma rodada (304), velha, e o plano B tem a mais nova.
    responder(`${PRINCIPAL}rodada.json`, { status: 304, date: "2026-10-25T19:45:00-03:00", etag: '"r1"' });
    responder(`${PRINCIPAL}lugares/BR.json`, { status: 304, date: "2026-10-25T19:45:00-03:00", etag: '"b1"' });
    responder(`${PLANO_B}rodada.json`, { status: 200, date: "2026-10-25T19:45:00-03:00", etag: '"p1"', corpo: rodada("2026-10-25T19:44:40-03:00") });
    responder(`${PLANO_B}lugares/BR.json`, { status: 200, date: "2026-10-25T19:45:00-03:00", etag: '"p2"', corpo: lugar(44) });
    await leitor.ler();

    expect(pedidos()).toEqual([
      { url: `${PRINCIPAL}rodada.json`, ifNoneMatch: '"r1"', cache: "no-store" },
      { url: `${PRINCIPAL}lugares/BR.json`, ifNoneMatch: '"b1"', cache: "no-store" },
      { url: `${PLANO_B}rodada.json`, ifNoneMatch: null, cache: "no-cache" },
      { url: `${PLANO_B}lugares/BR.json`, ifNoneMatch: null, cache: "no-cache" },
    ]);
    expect(leitor.quadro().lugar?.tse.secoes.percentual).toBe(44);
  });

  it("passada ao plano B, a página começa a ler por ele; se ele parar, volta ao principal", async () => {
    const { leitor, responder, urls } = montar();
    responder(`${PRINCIPAL}rodada.json`, { status: 503, date: AGORA });
    responder(`${PLANO_B}rodada.json`, { status: 200, date: AGORA, corpo: rodada("2026-10-25T19:41:30-03:00") });
    responder(`${PLANO_B}lugares/BR.json`, { status: 200, date: AGORA, corpo: lugar(41) });
    await leitor.ler();
    urls();

    await leitor.ler();
    expect(urls()).toEqual([`${PLANO_B}rodada.json`, `${PLANO_B}lugares/BR.json`]);

    responder(`${PLANO_B}rodada.json`, { status: 200, date: "2026-10-25T19:45:00-03:00", corpo: rodada("2026-10-25T19:41:30-03:00") });
    responder(`${PRINCIPAL}rodada.json`, { status: 200, date: "2026-10-25T19:45:00-03:00", corpo: rodada("2026-10-25T19:44:50-03:00") });
    responder(`${PRINCIPAL}lugares/BR.json`, { status: 200, date: "2026-10-25T19:45:00-03:00", corpo: lugar(45) });
    await leitor.ler();
    expect(urls()).toEqual([`${PLANO_B}rodada.json`, `${PLANO_B}lugares/BR.json`, `${PRINCIPAL}rodada.json`, `${PRINCIPAL}lugares/BR.json`]);
    expect(leitor.quadro().lugar?.tse.secoes.percentual).toBe(45);
  });

  it("sem domínio, só existe o endereço do Worker, e a página lê dele", async () => {
    const { leitor, responder, pedidos } = montar(enderecosDoBuild(undefined, PLANO_B));
    responder(`${PLANO_B}rodada.json`, { status: 200, date: AGORA, corpo: rodada("2026-10-25T19:41:40-03:00") });
    responder(`${PLANO_B}lugares/BR.json`, { status: 200, date: AGORA, corpo: lugar(40) });

    await leitor.ler();

    expect(pedidos().map((p) => [p.url, p.cache])).toEqual([
      [`${PLANO_B}rodada.json`, "no-cache"],
      [`${PLANO_B}lugares/BR.json`, "no-cache"],
    ]);
    expect(leitor.quadro().indicador.estado).toBe("ao-vivo");
    expect(leitor.quadro().lugar?.tse.secoes.percentual).toBe(40);
  });
});
