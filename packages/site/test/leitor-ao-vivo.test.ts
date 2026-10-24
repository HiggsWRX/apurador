import type {
  ArquivoDeRodada,
  ArquivoDoLugar,
  ArquivoDoMapa,
  ArquivoDoSimuladorAoVivo,
  Buscar,
  ChavesDaNoite,
  MunicipiosDaTabela,
  ProjecoesDosMunicipios,
  TabelaDeProjecoes,
} from "@apurador/coletor";
import { describe, expect, it } from "vitest";
import { enderecosDoBuild } from "../src/lib/enderecos-ao-vivo";
import { criarLeitorAoVivo } from "../src/lib/leitor-ao-vivo";

// O leitor ao vivo é a lógica da ilha que decide o que mostrar (spec, "Fronteiras de teste", 3): ele lê o arquivo de
// rodada e o JSON do lugar como a página lê, e os testes respondem por ele com status, `Date`, ETag e corpo. O relógio
// do aparelho é injetado e nunca decide a fase nem a interrupção: só o cabeçalho `Date` da resposta, comparado com a
// hora da rodada.

const BASE = "https://ao-vivo.exemplo/";
const CANDIDATOS = [
  { numero: 22, nome: "FLAVIO BOLSONARO", partido: "PL", sequencial: "280002551544" },
  { numero: 13, nome: "LULA", partido: "PT", sequencial: "280002542548" },
];

/** As chaves que o coletor publica sem comando: tudo ligado menos os textos preditivos. */
const LIGADAS: ChavesDaNoite = { nucleoMinimo: true, projecao: true, baseComPesquisas: true, simulador: true, mapa: true, textosPreditivos: false };
/** O arquivo de chaves do site deste teste, com o mapa desligado para se distinguir do que o coletor publica. */
const DO_SITE: ChavesDaNoite = { ...LIGADAS, mapa: false };

function rodada(
  hora: string,
  fase: ArquivoDeRodada["fase"],
  novidade: Partial<ArquivoDeRodada["novidade"]> = {},
  controle: Partial<Pick<ArquivoDeRodada, "chaves" | "aviso">> = {},
): ArquivoDeRodada {
  return {
    rodada: new Date(hora).toISOString(),
    fase,
    novidade: { totalizacao: null, vista: null, ...novidade },
    candidatos: CANDIDATOS,
    chaves: LIGADAS,
    aviso: null,
    pesoDasPesquisas: 3,
    eventosDoBrasil: [],
    ...controle,
  };
}

// A hora do TSE (`totalizacao`) é a da noite de 2022, como no ensaio geral, e os relógios do coletor e da CDN são os de
// 2026: um teste que compare a hora do TSE com um deles falha aqui, e não no ensaio (ticket 15).
function lugar(percentualDeSecoes: number, totalizacao: string | null = null): ArquivoDoLugar {
  return {
    lugar: "BR",
    tse: { totalizacao, secoes: { totalizadas: 0, total: 472027, percentual: percentualDeSecoes }, votos: [0, 0], percentuais: [0, 0], final: false },
    curva: [],
    narracao: [],
  };
}

interface Resposta {
  status: number;
  /** O cabeçalho `Date` da CDN, a hora do outro lado. */
  date?: string;
  etag?: string;
  corpo?: unknown;
}

/** Um endereço ao vivo de mentira: cada caminho responde o que o teste mandar, e os pedidos ficam registrados. */
function cdn() {
  const respostas = new Map<string, Resposta | "sem-conexao">();
  const pedidos: { caminho: string; ifNoneMatch: string | undefined }[] = [];
  const buscar: Buscar = async (url, init) => {
    const caminho = url.slice(BASE.length);
    pedidos.push({ caminho, ifNoneMatch: new Headers(init?.headers).get("If-None-Match") ?? undefined });
    const r = respostas.get(caminho);
    if (r === "sem-conexao") throw new TypeError("Failed to fetch");
    if (!r) return new Response(null, { status: 404 });
    const headers = new Headers();
    if (r.date) headers.set("Date", new Date(r.date).toUTCString());
    if (r.etag) headers.set("ETag", r.etag);
    return new Response(r.corpo === undefined ? null : JSON.stringify(r.corpo), { status: r.status, headers });
  };
  return {
    buscar,
    pedidos,
    responder: (caminho: string, r: Resposta | "sem-conexao") => respostas.set(caminho, r),
  };
}

function montar(pagina: Pick<Parameters<typeof criarLeitorAoVivo>[0], "lugar" | "tabelaDeProjecoes" | "simulador"> = { lugar: "BR" }) {
  const borda = cdn();
  let agora = 0;
  const leitor = criarLeitorAoVivo({ enderecos: enderecosDoBuild(BASE, null), buscar: borda.buscar, relogio: () => agora, chaves: DO_SITE, ...pagina });
  return { ...borda, leitor, passar: (ms: number) => (agora += ms) };
}

describe("leitor ao vivo", () => {
  it("antes das 17h, mostra a fase e o indicador de antes das 17h", async () => {
    const { leitor, responder } = montar();
    responder("rodada.json", { status: 200, date: "2026-10-25T14:00:00-03:00", etag: '"r1"', corpo: rodada("2026-10-25T13:59:50-03:00", "antes-das-17h") });
    responder("lugares/BR.json", { status: 200, date: "2026-10-25T14:00:00-03:00", etag: '"b1"', corpo: lugar(0) });

    await leitor.ler();

    expect(leitor.quadro().fase).toBe("antes-das-17h");
    expect(leitor.quadro().indicador.estado).toBe("antes-das-17h");
  });

  it("passa ao ao vivo na leitura em que o arquivo de rodada muda de fase, sem recarregar e sem olhar o relógio do aparelho", async () => {
    const { leitor, responder, passar } = montar();
    responder("rodada.json", { status: 200, date: "2026-10-25T17:00:05-03:00", etag: '"r1"', corpo: rodada("2026-10-25T16:59:55-03:00", "antes-das-17h") });
    await leitor.ler();
    expect(leitor.quadro().fase).toBe("antes-das-17h");

    // O aparelho pode estar adiantado ou atrasado: a fase só muda quando o arquivo de rodada diz.
    passar(30_000);
    responder("rodada.json", { status: 200, date: "2026-10-25T17:00:35-03:00", etag: '"r2"', corpo: rodada("2026-10-25T17:00:15-03:00", "ao-vivo") });
    responder("lugares/BR.json", { status: 200, date: "2026-10-25T17:00:35-03:00", etag: '"b2"', corpo: lugar(0.01, "2022-10-30 17:00:12") });
    await leitor.ler();

    expect(leitor.quadro().fase).toBe("ao-vivo");
    expect(leitor.quadro().indicador.estado).toBe("ao-vivo");
    expect(leitor.quadro().lugar?.tse.totalizacao).toBe("2022-10-30 17:00:12");
  });

  it("relê cada arquivo com a ETag da última resposta, e um 304 mantém os dados que a página já tem", async () => {
    const { leitor, responder, pedidos } = montar();
    responder("rodada.json", { status: 200, date: "2026-10-25T18:00:00-03:00", etag: '"r1"', corpo: rodada("2026-10-25T17:59:50-03:00", "ao-vivo") });
    responder("lugares/BR.json", { status: 200, date: "2026-10-25T18:00:00-03:00", etag: '"b1"', corpo: lugar(12.34, "2022-10-30 17:59:41") });
    await leitor.ler();

    responder("rodada.json", { status: 304, date: "2026-10-25T18:00:30-03:00", etag: '"r1"' });
    responder("lugares/BR.json", { status: 304, date: "2026-10-25T18:00:30-03:00", etag: '"b1"' });
    await leitor.ler();

    expect(pedidos.slice(2)).toEqual([
      { caminho: "rodada.json", ifNoneMatch: '"r1"' },
      { caminho: "lugares/BR.json", ifNoneMatch: '"b1"' },
    ]);
    expect(leitor.quadro().lugar?.tse.secoes.percentual).toBe(12.34);
    expect(leitor.quadro().fase).toBe("ao-vivo");
  });

  it("com 3 min sem rodada nova pelo `Date` da CDN, a atualização está interrompida, e com 10 min entra o link do app do TSE", async () => {
    const { leitor, responder } = montar();
    const lerCom = async (date: string) => {
      responder("rodada.json", { status: 200, date, etag: '"r1"', corpo: rodada("2026-10-25T19:42:10-03:00", "ao-vivo") });
      responder("lugares/BR.json", { status: 304, date, etag: '"b1"' });
      await leitor.ler();
      return leitor.quadro().indicador;
    };

    expect((await lerCom("2026-10-25T19:45:09-03:00")).estado).toBe("ao-vivo");
    expect(await lerCom("2026-10-25T19:45:10-03:00")).toEqual({ estado: "interrompido", atualizadoAs: "19:42", linkDoTse: false });
    expect(await lerCom("2026-10-25T19:52:09-03:00")).toEqual({ estado: "interrompido", atualizadoAs: "19:42", linkDoTse: false });
    expect(await lerCom("2026-10-25T19:52:10-03:00")).toEqual({ estado: "interrompido", atualizadoAs: "19:42", linkDoTse: true });
  });

  it("com o coletor parado antes da passagem, a atualização está interrompida quando o `Date` da CDN passa das 17h", async () => {
    const { leitor, responder } = montar();
    const lerCom = async (date: string) => {
      responder("rodada.json", { status: 200, date, etag: '"r1"', corpo: rodada("2026-10-25T16:56:00-03:00", "antes-das-17h") });
      await leitor.ler();
      return leitor.quadro().indicador;
    };

    expect(await lerCom("2026-10-25T16:59:59-03:00")).toEqual({ estado: "antes-das-17h", faltam: 1 });
    expect(await lerCom("2026-10-25T17:00:00-03:00")).toEqual({ estado: "interrompido", atualizadoAs: "16:56", linkDoTse: false });
    expect(await lerCom("2026-10-25T17:06:00-03:00")).toEqual({ estado: "interrompido", atualizadoAs: "16:56", linkDoTse: true });
  });

  it("uma rodada velha de outro dia, antes das 17h, não é interrupção: a página espera o coletor da noite", async () => {
    const { leitor, responder } = montar();
    // O coletor publica na produção das 19h às 19h30 de 24/10 e para; a CDN serve essa rodada na manhã de 25/10.
    responder("rodada.json", { status: 200, date: "2026-10-25T10:00:00-03:00", etag: '"r1"', corpo: rodada("2026-10-24T19:30:00-03:00", "antes-das-17h") });
    await leitor.ler();
    expect(leitor.quadro().indicador).toEqual({ estado: "antes-das-17h", faltam: null });
  });

  it('sem resposta nenhuma (a internet do visitante caiu), é "sem conexão" com os últimos dados à vista, até uma leitura responder', async () => {
    const { leitor, responder } = montar();
    responder("rodada.json", { status: 200, date: "2026-10-25T18:00:00-03:00", etag: '"r1"', corpo: rodada("2026-10-25T17:59:50-03:00", "ao-vivo") });
    responder("lugares/BR.json", { status: 200, date: "2026-10-25T18:00:00-03:00", etag: '"b1"', corpo: lugar(12.34) });
    await leitor.ler();

    responder("rodada.json", "sem-conexao");
    responder("lugares/BR.json", "sem-conexao");
    await leitor.ler();
    expect(leitor.quadro().indicador.estado).toBe("sem-conexao");
    expect(leitor.quadro().lugar?.tse.secoes.percentual).toBe(12.34);

    responder("rodada.json", { status: 200, date: "2026-10-25T18:01:00-03:00", etag: '"r2"', corpo: rodada("2026-10-25T18:00:50-03:00", "ao-vivo") });
    responder("lugares/BR.json", { status: 304, date: "2026-10-25T18:01:00-03:00", etag: '"b1"' });
    await leitor.ler();
    expect(leitor.quadro().indicador.estado).toBe("ao-vivo");
  });

  it("um erro da CDN não é falta de conexão: os dados ficam, e o `Date` da resposta conta para a interrupção", async () => {
    const { leitor, responder } = montar();
    responder("rodada.json", { status: 200, date: "2026-10-25T18:00:00-03:00", etag: '"r1"', corpo: rodada("2026-10-25T17:59:50-03:00", "ao-vivo") });
    responder("lugares/BR.json", { status: 200, date: "2026-10-25T18:00:00-03:00", etag: '"b1"', corpo: lugar(12.34) });
    await leitor.ler();

    responder("rodada.json", { status: 503, date: "2026-10-25T18:01:00-03:00" });
    responder("lugares/BR.json", { status: 503, date: "2026-10-25T18:01:00-03:00" });
    await leitor.ler();
    expect(leitor.quadro().indicador.estado).toBe("ao-vivo");
    expect(leitor.quadro().lugar?.tse.secoes.percentual).toBe(12.34);

    responder("rodada.json", { status: 503, date: "2026-10-25T18:02:50-03:00" });
    await leitor.ler();
    expect(leitor.quadro().indicador).toEqual({ estado: "interrompido", atualizadoAs: "17:59", linkDoTse: false });
  });

  it("com a fase encerrada, a apuração está encerrada e a interrupção nunca aparece, mesmo com o coletor parado", async () => {
    const { leitor, responder } = montar();
    responder("rodada.json", { status: 200, date: "2026-10-25T21:30:00-03:00", etag: '"r1"', corpo: rodada("2026-10-25T21:29:50-03:00", "encerrada") });
    await leitor.ler();
    expect(leitor.quadro().indicador.estado).toBe("encerrada");

    // O coletor para 30 min depois da totalização final, e a CDN continua servindo a última rodada.
    responder("rodada.json", { status: 304, date: "2026-10-25T23:00:00-03:00", etag: '"r1"' });
    await leitor.ler();
    expect(leitor.quadro().indicador.estado).toBe("encerrada");

    responder("rodada.json", "sem-conexao");
    await leitor.ler();
    expect(leitor.quadro().indicador.estado).toBe("encerrada");
  });

  it("com rodadas em dia e o TSE parado há 2 min, continua ao vivo e diz desde quando o TSE está sem novidade", async () => {
    const { leitor, responder } = montar();
    const novidade = { totalizacao: "2022-10-30 18:59:52", vista: new Date("2026-10-25T19:00:00-03:00").toISOString() };
    const lerCom = async (date: string, horaDaRodada: string) => {
      responder("rodada.json", { status: 200, date, etag: `"${horaDaRodada}"`, corpo: rodada(horaDaRodada, "ao-vivo", novidade) });
      await leitor.ler();
      return leitor.quadro().indicador;
    };

    expect(await lerCom("2026-10-25T19:01:59-03:00", "2026-10-25T19:01:50-03:00")).toEqual({ estado: "ao-vivo" });
    expect(await lerCom("2026-10-25T19:02:00-03:00", "2026-10-25T19:01:50-03:00")).toEqual({ estado: "tse-sem-novidade", desde: "18:59" });
  });

  it("na última hora antes das 17h, conta os segundos que faltam pelo `Date` da CDN, e o relógio do aparelho só faz a conta andar entre as leituras", async () => {
    const { leitor, responder, passar } = montar();
    const lerCom = async (date: string) => {
      responder("rodada.json", { status: 200, date, etag: `"${date}"`, corpo: rodada(date, "antes-das-17h") });
      await leitor.ler();
    };

    await lerCom("2026-10-25T15:59:59-03:00");
    expect(leitor.quadro().indicador).toEqual({ estado: "antes-das-17h", faltam: null });

    await lerCom("2026-10-25T16:00:00-03:00");
    expect(leitor.quadro().indicador).toEqual({ estado: "antes-das-17h", faltam: 3600 });
    passar(90_000);
    expect(leitor.quadro().indicador).toEqual({ estado: "antes-das-17h", faltam: 3510 });

    // Às 17h a contagem para no zero: a fase só muda com o arquivo de rodada.
    passar(2 * 3_600_000);
    expect(leitor.quadro().indicador).toEqual({ estado: "antes-das-17h", faltam: 0 });
  });

  it("diz quais números do placar mudaram na última leitura, para eles piscarem uma vez", async () => {
    const { leitor, responder } = montar();
    const comPlacar = (etag: string, percentual: number, votos: number[], percentuais: number[]) => {
      const dados = lugar(percentual, "2022-10-30 19:00:00");
      responder("lugares/BR.json", { status: 200, date: "2026-10-25T19:00:30-03:00", etag, corpo: { ...dados, tse: { ...dados.tse, votos, percentuais } } });
    };
    responder("rodada.json", { status: 200, date: "2026-10-25T19:00:30-03:00", etag: '"r1"', corpo: rodada("2026-10-25T19:00:20-03:00", "ao-vivo") });

    comPlacar('"b1"', 40.12, [1000, 900], [52.63, 47.37]);
    await leitor.ler();
    expect(leitor.quadro().mudaram).toEqual([]);

    comPlacar('"b2"', 40.5, [1100, 900], [55, 45]);
    await leitor.ler();
    expect(leitor.quadro().mudaram.sort()).toEqual(["percentual-0", "percentual-1", "secoes", "votos-0"]);

    responder("lugares/BR.json", { status: 304, date: "2026-10-25T19:01:00-03:00", etag: '"b2"' });
    await leitor.ler();
    expect(leitor.quadro().mudaram).toEqual([]);
  });

  it("diz há quantos segundos foi a última leitura que respondeu, para o detalhe do indicador", async () => {
    const { leitor, responder, passar } = montar();
    expect(leitor.quadro().ultimaLeitura).toBeNull();
    responder("rodada.json", { status: 200, date: "2026-10-25T19:42:20-03:00", etag: '"r1"', corpo: rodada("2026-10-25T19:42:15-03:00", "ao-vivo") });
    await leitor.ler();
    passar(12_400);
    expect(leitor.quadro().ultimaLeitura).toBe(12);

    responder("rodada.json", "sem-conexao");
    await leitor.ler();
    passar(30_000);
    expect(leitor.quadro().ultimaLeitura).toBe(42);
  });

  it("até a primeira rodada, as chaves são as do arquivo de chaves do site; depois, as do arquivo de rodada, que mudam na leitura em que ele muda", async () => {
    const { leitor, responder } = montar();
    expect(leitor.quadro().chaves).toEqual(DO_SITE);

    responder("rodada.json", { status: 200, date: "2026-10-25T18:00:00-03:00", etag: '"r1"', corpo: rodada("2026-10-25T17:59:50-03:00", "ao-vivo") });
    await leitor.ler();
    expect(leitor.quadro().chaves).toEqual(LIGADAS);

    // O dono desligou a projeção: a rodada seguinte traz a chave desligada, e o simulador com ela, sem recarregar.
    const semProjecao = { ...LIGADAS, projecao: false, simulador: false };
    responder("rodada.json", {
      status: 200,
      date: "2026-10-25T18:00:30-03:00",
      etag: '"r2"',
      corpo: rodada("2026-10-25T18:00:20-03:00", "ao-vivo", {}, { chaves: semProjecao }),
    });
    await leitor.ler();
    expect(leitor.quadro().chaves).toEqual(semProjecao);

    // Um 304 mantém as chaves da última rodada.
    responder("rodada.json", { status: 304, date: "2026-10-25T18:01:00-03:00", etag: '"r2"' });
    await leitor.ler();
    expect(leitor.quadro().chaves).toEqual(semProjecao);
  });

  it("o aviso pronto ativo é o do arquivo de rodada, e sai quando o dono o retira", async () => {
    const { leitor, responder } = montar();
    expect(leitor.quadro().aviso).toBeNull();

    responder("rodada.json", {
      status: 200,
      date: "2026-10-25T19:00:00-03:00",
      etag: '"r1"',
      corpo: rodada("2026-10-25T18:59:50-03:00", "ao-vivo", {}, { aviso: 2 }),
    });
    await leitor.ler();
    expect(leitor.quadro().aviso).toBe(2);

    responder("rodada.json", { status: 200, date: "2026-10-25T19:00:30-03:00", etag: '"r2"', corpo: rodada("2026-10-25T19:00:20-03:00", "ao-vivo") });
    await leitor.ler();
    expect(leitor.quadro().aviso).toBeNull();
  });
});

describe("a tabela de projeções e o mapa.json", () => {
  // Volume de gravações na noite, decisão 1: a projeção do município sai da tabela da UF dele, e o mapa.json só é baixado
  // quando o cartão do mapa entra na tela. Cada um só é pedido quando pode aparecer.
  const DATE = "2026-10-25T19:00:00-03:00";
  const RODADA = rodada("2026-10-25T18:59:50-03:00", "ao-vivo");
  const PROJECOES: ProjecoesDosMunicipios = {
    assinatura: "0badcafe",
    validos: [16000],
    soApuracao: { projecao: [48.5], margem: [2.2], chance: [25], chanceDeVirada: [75], sinalDeVirada: ["virada projetada"], virada: [[92, 82, null]] },
  };
  const TABELA: TabelaDeProjecoes = { uf: "MG", projecao: PROJECOES };
  const MUNICIPIOS: MunicipiosDaTabela = { uf: "MG", assinatura: "0badcafe", municipios: ["41238"], comparacoes: { primeiroTurno: [53.2], pesquisas: [53.2] } };
  const MAPA: ArquivoDoMapa = { assinatura: "0badcafe", tse: [[12.34, 50.1, 49.9], null] };
  const doLugar = (id: string): ArquivoDoLugar => ({ ...lugar(12.34, "2022-10-30 18:00:00"), lugar: id });
  const caminhos = (pedidos: { caminho: string }[]) => pedidos.map((p) => p.caminho).sort();
  const NO_MUNICIPIO = { lugar: "41238", tabelaDeProjecoes: { uf: "MG", desdeOInicio: true } };
  /** Responde a rodada, o município de Uberlândia, a tabela de Minas Gerais, os municípios dela e o mapa.json. */
  function responderTudo(responder: ReturnType<typeof montar>["responder"], corpoDaRodada = RODADA, date = DATE) {
    responder("rodada.json", { status: 200, date, etag: `"${corpoDaRodada.rodada}"`, corpo: corpoDaRodada });
    responder("lugares/41238.json", { status: 200, date, etag: '"m1"', corpo: doLugar("41238") });
    responder("tabelas/MG.json", { status: 200, date, etag: '"t1"', corpo: TABELA });
    responder("tabelas/MG-municipios.json", { status: 200, date, etag: '"c1"', corpo: MUNICIPIOS });
    responder("mapa.json", { status: 200, date, etag: '"a1"', corpo: MAPA });
  }

  it("num município, lê também a tabela de projeções da UF dele e os municípios dela, desde a primeira leitura, e junta os dois", async () => {
    const { leitor, responder, pedidos } = montar(NO_MUNICIPIO);
    responderTudo(responder);
    await leitor.ler();
    expect(caminhos(pedidos)).toEqual(["lugares/41238.json", "rodada.json", "tabelas/MG-municipios.json", "tabelas/MG.json"]);
    expect(leitor.quadro().tabelaDeProjecoes).toEqual({ ...MUNICIPIOS, projecao: PROJECOES });

    // Um 304 mantém o que a página tem.
    responder("tabelas/MG.json", { status: 304, date: DATE, etag: '"t1"' });
    responder("tabelas/MG-municipios.json", { status: 304, date: DATE, etag: '"c1"' });
    await leitor.ler();
    expect(pedidos.filter((p) => p.caminho === "tabelas/MG.json").at(-1)).toEqual({ caminho: "tabelas/MG.json", ifNoneMatch: '"t1"' });
    expect(leitor.quadro()).toMatchObject({ tabelaDeProjecoes: { ...MUNICIPIOS, projecao: PROJECOES }, mapa: null });
  });

  it("não junta os municípios de outra base à tabela: sem a mesma assinatura, as colunas não estariam na ordem deles", async () => {
    const { leitor, responder } = montar(NO_MUNICIPIO);
    responderTudo(responder);
    responder("tabelas/MG.json", { status: 200, date: DATE, etag: '"t2"', corpo: { ...TABELA, projecao: { ...PROJECOES, assinatura: "12345678" } } });
    await leitor.ler();
    expect(leitor.quadro().tabelaDeProjecoes).toEqual(MUNICIPIOS);
  });

  it("numa UF, só passa a ler a tabela dela e o mapa.json quando o cartão do mapa entra na tela", async () => {
    const { leitor, responder, pedidos } = montar({ lugar: "MG", tabelaDeProjecoes: { uf: "MG", desdeOInicio: false } });
    responderTudo(responder);
    responder("lugares/MG.json", { status: 200, date: DATE, etag: '"u1"', corpo: doLugar("MG") });
    await leitor.ler();
    expect(caminhos(pedidos)).toEqual(["lugares/MG.json", "rodada.json"]);
    expect(leitor.quadro()).toMatchObject({ tabelaDeProjecoes: null, mapa: null });

    leitor.incluirOCartao();
    await leitor.ler();
    expect(caminhos(pedidos.slice(2))).toEqual(["lugares/MG.json", "mapa.json", "rodada.json", "tabelas/MG-municipios.json", "tabelas/MG.json"]);
    expect(leitor.quadro()).toMatchObject({ tabelaDeProjecoes: { ...MUNICIPIOS, projecao: PROJECOES }, mapa: MAPA });
  });

  it("no Brasil, o cartão do mapa lê só o mapa.json, que traz a projeção das UFs", async () => {
    const { leitor, responder, pedidos } = montar();
    responderTudo(responder);
    leitor.incluirOCartao();
    await leitor.ler();
    expect(caminhos(pedidos)).toEqual(["lugares/BR.json", "mapa.json", "rodada.json"]);
    expect(leitor.quadro()).toMatchObject({ tabelaDeProjecoes: null, mapa: MAPA });
  });

  it("antes das 17h, só a primeira leitura pede a tabela e o mapa.json; a que passa ao ao vivo pede os dois nela mesma", async () => {
    // O coletor só grava os municípios da tabela a partir das 17h: antes, cada pedido a eles seria um 404.
    const { leitor, responder, pedidos } = montar(NO_MUNICIPIO);
    leitor.incluirOCartao();
    responderTudo(responder, rodada("2026-10-25T15:59:50-03:00", "antes-das-17h"), "2026-10-25T16:00:00-03:00");
    await leitor.ler();
    expect(pedidos).toHaveLength(5);
    await leitor.ler();
    expect(caminhos(pedidos.slice(5))).toEqual(["lugares/41238.json", "rodada.json"]);

    responderTudo(responder, rodada("2026-10-25T17:00:10-03:00", "ao-vivo"), "2026-10-25T17:00:20-03:00");
    await leitor.ler();
    expect(caminhos(pedidos.slice(7))).toEqual(["lugares/41238.json", "mapa.json", "rodada.json", "tabelas/MG-municipios.json", "tabelas/MG.json"]);
    expect(leitor.quadro()).toMatchObject({ fase: "ao-vivo", tabelaDeProjecoes: { ...MUNICIPIOS, projecao: PROJECOES }, mapa: MAPA });
  });

  it("com a chave da projeção desligada, não pede a tabela; no plano zero, nem o mapa.json", async () => {
    const { leitor, responder, pedidos } = montar(NO_MUNICIPIO);
    leitor.incluirOCartao();
    responderTudo(responder, rodada("2026-10-25T18:59:50-03:00", "ao-vivo", {}, { chaves: { ...LIGADAS, projecao: false, simulador: false } }));
    await leitor.ler();
    await leitor.ler();
    expect(caminhos(pedidos.slice(5))).toEqual(["lugares/41238.json", "mapa.json", "rodada.json"]);

    responderTudo(responder, rodada("2026-10-25T19:00:10-03:00", "ao-vivo", {}, { chaves: { ...LIGADAS, nucleoMinimo: false } }), "2026-10-25T19:00:20-03:00");
    await leitor.ler();
    await leitor.ler();
    expect(caminhos(pedidos.slice(-2))).toEqual(["lugares/41238.json", "rodada.json"]);
  });
});

describe("o arquivo do simulador", () => {
  // Simulador "e se", decisão 12: a tela do simulador relê o arquivo completo no ritmo da página de lugar, pelo mesmo leitor
  // que lê o arquivo de rodada e o Brasil. Só ela o pede, e só quando ele pode estar no ar.
  const DATE = "2026-10-25T19:00:00-03:00";
  const SIMULADOR: ArquivoDoSimuladorAoVivo = {
    assinatura: "0badcafe",
    apuracao: { secoes: [3], secoesTotais: [40], aptos: [900], aptosTotais: [12000], votos: [[400], [380]] },
    agregado: { valor: 51.1, incerteza: 1.5 },
  };
  const caminhos = (pedidos: { caminho: string }[]) => pedidos.map((p) => p.caminho).sort();
  function responderTudo(responder: ReturnType<typeof montar>["responder"], corpoDaRodada: ArquivoDeRodada, date = DATE, simulador = SIMULADOR) {
    responder("rodada.json", { status: 200, date, etag: `"${corpoDaRodada.rodada}"`, corpo: corpoDaRodada });
    responder("lugares/BR.json", { status: 200, date, etag: '"b1"', corpo: lugar(12.34, "2022-10-30 18:00:00") });
    responder("simulador.json", { status: 200, date, etag: `"${JSON.stringify(simulador).length}"`, corpo: simulador });
  }

  it("na tela do simulador, lê o arquivo do simulador com o arquivo de rodada e o Brasil, a cada leitura; a página do Brasil, não", async () => {
    const naTela = montar({ lugar: "BR", simulador: "simulador.json" });
    responderTudo(naTela.responder, rodada("2026-10-25T18:59:50-03:00", "ao-vivo"));
    await naTela.leitor.ler();
    expect(caminhos(naTela.pedidos)).toEqual(["lugares/BR.json", "rodada.json", "simulador.json"]);
    expect(naTela.leitor.quadro().simulador).toEqual(SIMULADOR);

    // A leitura seguinte traz a apuração nova; um 304 depois dela mantém a que a tela tem.
    const novo = { ...SIMULADOR, apuracao: { ...SIMULADOR.apuracao!, secoes: [4] } };
    naTela.responder("simulador.json", { status: 200, date: DATE, etag: '"s2"', corpo: novo });
    await naTela.leitor.ler();
    expect(naTela.leitor.quadro().simulador).toEqual(novo);
    naTela.responder("simulador.json", { status: 304, date: DATE, etag: '"s2"' });
    await naTela.leitor.ler();
    expect(naTela.pedidos.at(-1)).toMatchObject({ ifNoneMatch: '"s2"' });
    expect(naTela.leitor.quadro().simulador).toEqual(novo);

    const naPagina = montar();
    responderTudo(naPagina.responder, rodada("2026-10-25T18:59:50-03:00", "ao-vivo"));
    await naPagina.leitor.ler();
    expect(caminhos(naPagina.pedidos)).toEqual(["lugares/BR.json", "rodada.json"]);
    expect(naPagina.leitor.quadro().simulador).toBeNull();
  });

  it("antes das 17h, só a primeira leitura pede o arquivo do simulador; a que passa ao ao vivo o pede nela mesma", async () => {
    const { leitor, responder, pedidos } = montar({ lugar: "BR", simulador: "simulador.json" });
    responderTudo(responder, rodada("2026-10-25T15:59:50-03:00", "antes-das-17h"), "2026-10-25T16:00:00-03:00", { assinatura: "0badcafe" });
    await leitor.ler();
    expect(caminhos(pedidos)).toEqual(["lugares/BR.json", "rodada.json", "simulador.json"]);
    await leitor.ler();
    expect(caminhos(pedidos.slice(3))).toEqual(["lugares/BR.json", "rodada.json"]);

    responderTudo(responder, rodada("2026-10-25T17:00:10-03:00", "ao-vivo"), "2026-10-25T17:00:20-03:00");
    await leitor.ler();
    expect(caminhos(pedidos.slice(5))).toEqual(["lugares/BR.json", "rodada.json", "simulador.json"]);
    expect(leitor.quadro()).toMatchObject({ fase: "ao-vivo", simulador: SIMULADOR });
  });

  it("com a chave do simulador desligada (ou a da projeção, que a leva junto), não pede o arquivo; no plano zero, também não", async () => {
    const { leitor, responder, pedidos } = montar({ lugar: "BR", simulador: "simulador.json" });
    responderTudo(responder, rodada("2026-10-25T18:59:50-03:00", "ao-vivo", {}, { chaves: { ...LIGADAS, simulador: false } }));
    await leitor.ler();
    await leitor.ler();
    expect(caminhos(pedidos.slice(3))).toEqual(["lugares/BR.json", "rodada.json"]);

    responderTudo(responder, rodada("2026-10-25T19:00:10-03:00", "ao-vivo", {}, { chaves: { ...LIGADAS, nucleoMinimo: false } }), "2026-10-25T19:00:20-03:00");
    await leitor.ler();
    await leitor.ler();
    expect(caminhos(pedidos.slice(-2))).toEqual(["lugares/BR.json", "rodada.json"]);
  });
});
