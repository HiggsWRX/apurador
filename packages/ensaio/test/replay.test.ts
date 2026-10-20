import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { CONTROLE_INICIAL, criarColetor, relogioSemEspera, type ArquivoDeRodada, type ArquivoDoLugar, type Buscar, type Controle, type RegistroDaRodada } from "@apurador/coletor";
import { idDoMunicipio } from "@apurador/pipeline";
import type { AbrangenciaDaDivulgacao } from "@apurador/tse";
import { buscarNoTseFalso, conferirPlacar, criarTseFalso, relogioDoReplay, resultadosDoTseFalso, type TseFalso } from "../src/index.ts";
import { cadastro, instante, noite } from "./noite-2022.ts";

// O replay automático: o coletor inteiro, rodada a rodada, sobre o TSE falso servindo o 2º turno de 2022, sem
// rede e na velocidade máxima (o relógio do coletor não espera, e o do TSE falso anda com ele). As referências
// são o histórico oficial de totalização de 2022 e o próprio TSE falso, que o coletor tem de copiar sem alteração.

const BASE = "http://tse-falso.local/oficial";
/** Uma data e hora de Brasília, `AAAA-MM-DD HH:MM:SS`, em milissegundos. */
const ms = (dataHora: string) => Date.parse(`${dataHora.replace(" ", "T")}-03:00`);
const BRASIL = "/dados/br/br-c0001-e006258-u.json";

interface Gravacao {
  caminho: string;
  conteudo: unknown;
  bytes: Uint8Array;
  /** O relógio do coletor, em ms. */
  quando: number;
}

interface OpcoesDoReplay {
  /** O corpo que alguns pedidos recebem com status 200, no lugar do arquivo do TSE (`undefined`: o do TSE). */
  trocar?: (url: string, quando: number) => string | undefined;
  /** Põe na frente do TSE falso uma borda que guarda cada arquivo esse tanto de segundos, como o CDN do TSE. */
  borda?: number;
  /** O arquivo de controle que o coletor lê no começo de cada rodada, pelo relógio dele (ms): os comandos do dono em rodadas escolhidas. */
  controle?: (quando: number) => Controle;
}

/**
 * A borda do CDN do TSE, que o TSE falso não imita: guarda cada arquivo `segundos` desde que o buscou e, até lá,
 * responde com a cópia que tem (304 se a ETag pedida for a dela), com o `Date` de agora.
 */
function comBorda(buscar: Buscar, segundos: number, agora: () => number): Buscar {
  const guardados = new Map<string, { corpo: ArrayBuffer; etag: string; ate: number }>();
  return async (url, init) => {
    let guardado = guardados.get(url);
    if (!guardado || agora() >= guardado.ate) {
      const resposta = await buscar(url);
      if (resposta.status !== 200) return resposta;
      guardado = { corpo: await resposta.arrayBuffer(), etag: resposta.headers.get("etag")!, ate: agora() + segundos * 1000 };
      guardados.set(url, guardado);
    }
    const cabecalhos = { etag: guardado.etag, date: new Date(agora()).toUTCString() };
    if (new Headers(init?.headers).get("if-none-match") === guardado.etag) return new Response(null, { status: 304, headers: cabecalhos });
    return new Response(guardado.corpo, { status: 200, headers: cabecalhos });
  };
}

async function replay(de: string, ate: string | ((tse: TseFalso) => boolean), opcoes: OpcoesDoReplay = {}) {
  const relogio = relogioSemEspera(ms(de));
  const tse = criarTseFalso({ noite, cadastro, relogio: relogioDoReplay(instante(de), relogio.agora) });
  const doTse = opcoes.borda === undefined ? buscarNoTseFalso(tse) : comBorda(buscarNoTseFalso(tse), opcoes.borda, relogio.agora);
  const pedidos: { url: string; quando: number }[] = [];
  const gravacoes: Gravacao[] = [];
  const arquivos = new Map<string, Gravacao>();
  const lerControle = opcoes.controle;
  const coletor = criarColetor({
    base: BASE,
    eleicao: "6258",
    relogio,
    controle: lerControle && (async () => lerControle(relogio.agora())),
    buscar: async (url, init) => {
      const quando = relogio.agora();
      pedidos.push({ url, quando });
      const trocado = opcoes.trocar?.(url, quando);
      return trocado === undefined ? doTse(url, init) : new Response(trocado, { status: 200 });
    },
    destino: {
      async gravar(caminho, bytes) {
        const g = { caminho, bytes, conteudo: JSON.parse(new TextDecoder().decode(bytes)), quando: relogio.agora() };
        gravacoes.push(g);
        arquivos.set(caminho, g);
      },
    },
  });
  const rodadas: RegistroDaRodada[] = [];
  const terminou = typeof ate === "string" ? () => relogio.agora() >= ms(ate) : () => ate(tse);
  await coletor.rodar({ ate: terminou, aoRodar: (r) => rodadas.push(r) });
  const publicado = <T = ArquivoDoLugar>(caminho: string) => arquivos.get(caminho)?.conteudo as T;
  const rodada = () => publicado<ArquivoDeRodada>("rodada.json");
  /** Cada gravação de um arquivo de lugar, para a conferência do placar. */
  const placares = () => {
    const candidatos = rodada().candidatos.map((c) => c.numero);
    return gravacoes.filter((g) => g.caminho.startsWith("lugares/")).map((g) => ({ candidatos, lugar: g.conteudo as ArquivoDoLugar }));
  };
  /** A fase de cada gravação do arquivo de rodada. */
  const fases = () => gravacoes.filter((g) => g.caminho === "rodada.json").map((g) => ({ fase: (g.conteudo as ArquivoDeRodada).fase, quando: g.quando }));
  return { tse, coletor, pedidos, gravacoes, rodadas, publicado, rodada, placares, fases };
}

/** Os lugares da noite, com o caminho do arquivo publicado de cada um. */
const lugares: { caminho: string; abrangencia: AbrangenciaDaDivulgacao }[] = [
  { caminho: "lugares/BR.json", abrangencia: {} },
  ...cadastro.ufs.flatMap((uf) => [
    { caminho: `lugares/${uf.sigla}.json`, abrangencia: { uf: uf.sigla } },
    ...uf.municipios.map((m) => ({ caminho: `lugares/${idDoMunicipio(m.codigo)}.json`, abrangencia: { uf: uf.sigla, municipio: m.codigo } })),
  ]),
];

/** As zonas dos municípios com mais de uma. */
const zonas: Required<AbrangenciaDaDivulgacao>[] = (() => {
  const doMunicipio = new Map<string, number[]>();
  for (const z of noite.zonas) doMunicipio.set(`${z.uf}/${z.municipio}`, [...(doMunicipio.get(`${z.uf}/${z.municipio}`) ?? []), z.zona]);
  return [...doMunicipio].filter(([, zs]) => zs.length > 1).flatMap(([k, zs]) => zs.map((zona) => ({ uf: k.split("/")[0]!, municipio: Number(k.split("/")[1]), zona })));
})();

describe("antes das 17h", () => {
  it("publica o arquivo de rodada na fase antes das 17h, com os candidatos em ordem alfabética, e o Brasil zerado", async () => {
    const { publicado, rodada } = await replay("2022-10-30 16:50:00", "2022-10-30 16:55:00");

    expect(rodada()).toMatchObject({
      fase: "antes-das-17h",
      novidade: { totalizacao: null },
      candidatos: [
        { numero: 22, nome: "JAIR BOLSONARO", partido: "PL" },
        { numero: 13, nome: "LULA", partido: "PT" },
      ],
    });
    expect(publicado("lugares/BR.json")).toEqual({
      lugar: "BR",
      tse: { totalizacao: null, secoes: { totalizadas: 0, total: 472_075, percentual: 0 }, votos: [0, 0], percentuais: [0, 0], final: false },
      curva: [],
    });
  }, 60_000);

  it("na partida, publica uma vez cada lugar; depois, sem novidade, só os índices, com ETag e 304", async () => {
    const { gravacoes, rodadas, tse } = await replay("2022-10-30 16:50:00", "2022-10-30 16:58:00");

    const publicados = gravacoes.filter((g) => g.caminho.startsWith("lugares/"));
    expect(new Set(publicados.map((g) => g.caminho))).toEqual(new Set(lugares.map((l) => l.caminho)));
    expect(publicados).toHaveLength(lugares.length);
    expect(tse.registro().naoEncontrados).toEqual([]);
    const depois = rodadas.slice(rodadas.findIndex((x) => x.baixados.municipios + x.baixados.zonas === 0));
    expect(depois.length).toBeGreaterThan(3);
    expect(depois.map((x) => x.respostas)).toEqual(depois.map(() => ({ 304: 29 })));
  }, 60_000);
});

describe("às 17h", () => {
  it("passa sozinho a ao vivo na primeira rodada depois das 17h do relógio do TSE", async () => {
    const fases = (await replay("2022-10-30 16:50:00", "2022-10-30 17:02:00")).fases();

    const primeira = fases.findIndex((f) => f.fase === "ao-vivo");
    expect(fases.slice(0, primeira).every((f) => f.fase === "antes-das-17h")).toBe(true);
    expect(fases.slice(primeira).every((f) => f.fase === "ao-vivo")).toBe(true);
    expect(fases[primeira]!.quando).toBeGreaterThanOrEqual(ms("2022-10-30 17:00:00"));
    expect(fases[primeira]!.quando).toBeLessThan(ms("2022-10-30 17:00:21"));
  }, 60_000);
});

describe("a primeira meia hora da apuração", () => {
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    r = await replay("2022-10-30 16:50:00", "2022-10-30 17:30:00");
  }, 120_000);

  it("publica em toda gravação o placar, o % de seções, o x de y e a hora do arquivo do TSE falso, sem divergência", () => {
    expect(r.placares().length).toBeGreaterThan(10_000);
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
  });

  it("não pede nenhuma URL inexistente nem passa do limite do TSE", () => {
    expect(r.tse.registro().naoEncontrados).toEqual([]);
    expect(r.tse.registro().violacoes).toEqual([]);
  });

  it("pede cada arquivo de resultado no máximo uma vez por minuto, e os 29 índices a cada rodada", () => {
    const ultimo = new Map<string, number>();
    const cedo: string[] = [];
    for (const p of r.pedidos.filter((p) => p.url.endsWith("-u.json"))) {
      const antes = ultimo.get(p.url);
      if (antes !== undefined && p.quando - antes < 60_000) cedo.push(p.url);
      ultimo.set(p.url, p.quando);
    }
    expect(cedo).toEqual([]);
    const indices = r.pedidos.filter((p) => p.url.endsWith("-ab.json")).length;
    expect(indices).toBe(29 * r.rodadas.length);
  });

  it("grava cada arquivo só quando os bytes mudam", () => {
    const anterior = new Map<string, string>();
    const repetidas: string[] = [];
    for (const g of r.gravacoes) {
      const texto = new TextDecoder().decode(g.bytes);
      if (anterior.get(g.caminho) === texto) repetidas.push(g.caminho);
      anterior.set(g.caminho, texto);
    }
    expect(repetidas).toEqual([]);
  });

  it("a curva real do Brasil é a sequência dos placares publicados, sem repetir um ponto, e a novidade é a hora do Brasil", () => {
    const brasil = r.gravacoes.filter((g) => g.caminho === "lugares/BR.json").map((g) => g.conteudo as ArquivoDoLugar);
    const ultimo = brasil.at(-1)!;
    // Uma totalização nova que não muda nenhum percentual de duas casas não é um ponto novo.
    const publicados = brasil
      .filter((b) => b.tse.secoes.totalizadas > 0)
      .map((b) => [b.tse.secoes.percentual, ...b.tse.percentuais])
      .filter((p, i, todos) => i === 0 || p.join() !== todos[i - 1]!.join());

    expect(ultimo.curva.length).toBeGreaterThan(20);
    expect(ultimo.curva).toEqual(publicados);
    expect(r.rodada().novidade.totalizacao).toBe(ultimo.tse.totalizacao);
  });
});

describe("um arquivo que o coletor não aceita", () => {
  // Três minutos: com um pedido por minuto ao arquivo do Brasil, ele vem estragado pelo menos duas vezes.
  const [de, ate] = [ms("2022-10-30 17:03:00"), ms("2022-10-30 17:06:00")];

  async function comBrasilTrocado(corpo: string) {
    const r = await replay("2022-10-30 16:50:00", "2022-10-30 17:09:00", { trocar: (url, quando) => (url.endsWith(BRASIL) && quando >= de && quando < ate ? corpo : undefined) });
    return { r, falhas: r.rodadas.flatMap((x) => x.falhas).filter((f) => f.includes(BRASIL)), brasil: r.gravacoes.filter((g) => g.caminho === "lugares/BR.json") };
  }

  it("fica de fora quando o leitor não o entende: o Brasil mantém o último placar bom, e o coletor pede de novo", async () => {
    const { r, falhas, brasil } = await comBrasilTrocado("<html>Erro</html>");

    expect(falhas.length).toBeGreaterThanOrEqual(2);
    expect(falhas[0]).toMatch(/não é JSON/);
    // Nada errado foi publicado, e o Brasil não muda enquanto o arquivo vem estragado.
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
    expect(brasil.filter((g) => g.quando >= de + 1_000 && g.quando < ate)).toEqual([]);
    // Depois, o coletor volta a pedir e publica o Brasil de novo.
    expect(brasil.at(-1)!.quando).toBeGreaterThanOrEqual(ate);
  }, 60_000);

  it("fica de fora quando não traz os mesmos candidatos, sem derrubar o coletor", async () => {
    // O Brasil zerado de 2026, só com o candidato 22: falta o 13.
    const real = JSON.parse(readFileSync(new URL("amostras/tse/6258/br-c0001-e006258-u.json", import.meta.url), "utf8"));
    for (const agremiacao of real.carg[0].agr) for (const partido of agremiacao.par) partido.cand = partido.cand.filter((c: { n: string }) => c.n !== "13");
    const { r, falhas, brasil } = await comBrasilTrocado(JSON.stringify(real));

    expect(falhas.length).toBeGreaterThanOrEqual(2);
    expect(falhas[0]).toMatch(/candidatos \(22\) não são os do Brasil \(13, 22\)/);
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
    expect(brasil.filter((g) => g.quando >= de + 1_000 && g.quando < ate)).toEqual([]);
    expect(r.rodadas.at(-1)!.falhas).toEqual([]);
    expect(brasil.at(-1)!.quando).toBeGreaterThanOrEqual(ate);
  }, 60_000);
});

describe("com o cache de 60 s da borda do TSE", () => {
  // Na borda, um arquivo pode vir até 60 s mais velho que o índice, e uma zona, mais velha que o município dela.
  // O TSE falso do ensaio geral não tem borda: só o replay põe o coletor diante dela antes da noite.
  const FIM = "2022-10-30 21:00:00";
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    r = await replay("2022-10-30 16:50:00", FIM, { borda: 60 });
  }, 300_000);

  it("publica só placares do TSE falso, mesmo com cópias velhas na borda", () => {
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
  }, 120_000);

  it("alcança o TSE em até 5 min: os lugares, e as zonas dos municípios que pararam de mudar, estão em dia", () => {
    const tse = resultadosDoTseFalso({ noite, cadastro });
    const limite = instante(FIM) - 5 * 60;
    tse.avancarAte(limite);
    const atrasados = lugares.filter((l) => (r.publicado(l.caminho).tse.totalizacao ?? "") < (tse.resultado(l.abrangencia)!.ultimaTotalizacao ?? ""));
    expect(atrasados).toEqual([]);

    tse.avancarAte(instante(FIM));
    const paradas = zonas.filter((z) => {
      const municipio = tse.resultado({ uf: z.uf, municipio: z.municipio })!.ultimaTotalizacao;
      return municipio !== null && instante(municipio) <= limite;
    });
    expect(paradas.length).toBeGreaterThan(100);
    expect(paradas.filter((z) => JSON.stringify(r.coletor.resultado(z)) !== JSON.stringify(tse.resultado(z)))).toEqual([]);
  });
});

describe("a noite inteira", () => {
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    // Das 16:50 até 30 min depois da totalização final, quando o coletor para (ticket 23).
    r = await replay("2022-10-30 16:50:00", (tse) => tse.estado().momento.instante >= instante(tse.estado().dataHoraDaTotalizacaoFinal!) + 30 * 60);
  }, 600_000);

  it("publica em toda gravação de toda rodada o placar do TSE falso, sem divergência", () => {
    expect(r.placares().length).toBeGreaterThan(90_000);
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
  }, 120_000);

  it("termina com o resultado oficial em todos os lugares, e a fase encerrada", () => {
    const final = r.tse.estado().dataHoraDaTotalizacaoFinal!;
    const ultimos = lugares.map((l) => r.publicado(l.caminho));

    expect(ultimos.filter((l) => !l.tse.final || l.tse.totalizacao !== final || l.tse.secoes.totalizadas !== l.tse.secoes.total)).toEqual([]);
    // O resultado oficial do 2º turno de 2022: Bolsonaro 58.206.354 e Lula 60.345.999.
    expect(r.publicado("lugares/BR.json").tse).toMatchObject({ secoes: { totalizadas: 472_075, total: 472_075, percentual: 100 }, votos: [58_206_354, 60_345_999] });
    expect(r.rodada().fase).toBe("encerrada");
  });

  it("passa a encerrada na primeira rodada depois da totalização final, e não sai mais dela", () => {
    const fases = r.fases();
    const primeira = fases.findIndex((f) => f.fase === "encerrada");

    expect(fases[primeira]!.quando - ms(r.tse.estado().dataHoraDaTotalizacaoFinal!)).toBeLessThan(80_000);
    expect(fases.slice(primeira).every((f) => f.fase === "encerrada")).toBe(true);
  });

  it("guarda as zonas dos municípios com mais de uma, iguais às do TSE falso no fim", () => {
    const tse = resultadosDoTseFalso({ noite, cadastro });
    tse.avancarAte(Infinity);

    expect(zonas.length).toBeGreaterThan(500);
    expect(zonas.filter((z) => JSON.stringify(r.coletor.resultado(z)) !== JSON.stringify(tse.resultado(z)))).toEqual([]);
  });

  it("registra o tempo de cada rodada, e nenhuma passa dos 15 s: nem a partida a frio, nem o pico de ~600 municípios, nem a varredura do fim", () => {
    const pico = r.rodadas.filter((x) => x.fase === "ao-vivo").reduce((a, b) => (b.baixados.municipios > a.baixados.municipios ? b : a));

    expect(r.rodadas.every((x) => x.duracao > 0 && x.duracao <= 15_000)).toBe(true);
    expect(pico.baixados.municipios).toBeGreaterThan(400);
    // O custo de calcular a rodada do pico, no relógio do computador, fica muito abaixo dos 15 s.
    expect(pico.processamento).toBeLessThan(5_000);
    // A partida a frio, com os ~6.500 arquivos, cabe em poucas rodadas antes das 17h.
    expect(r.rodadas.findIndex((x) => x.baixados.municipios === 0)).toBeLessThan(15);
  });

  it("nunca passa de 50 pedidos num segundo, o limite que alerta o dono, nem pede URL inexistente", () => {
    let maximo = 0;
    for (let fim = 0, inicio = 0; fim < r.pedidos.length; fim++) {
      while (r.pedidos[fim]!.quando - r.pedidos[inicio]!.quando >= 1000) inicio++;
      maximo = Math.max(maximo, fim - inicio + 1);
    }
    expect(maximo).toBeLessThanOrEqual(50);
    expect(r.tse.registro().naoEncontrados).toEqual([]);
    expect(r.tse.registro().violacoes).toEqual([]);
  });
});

describe("as chaves de publicação e os avisos prontos, pelo arquivo de controle", () => {
  // O dono age em rodadas escolhidas: desliga a projeção às 17:05, publica o aviso 1 às 17:10, liga o plano zero às
  // 17:15 e, às 17:20, religa o núcleo mínimo e retira o aviso. A projeção fica desligada até o fim.
  const comChaves = (parte: Partial<Controle["chaves"]>, resto: Partial<Controle> = {}): Controle => ({ ...CONTROLE_INICIAL, chaves: { ...CONTROLE_INICIAL.chaves, ...parte }, ...resto });
  const comandos = [
    { desde: ms("2022-10-30 17:05:00"), controle: comChaves({ projecao: false }) },
    { desde: ms("2022-10-30 17:10:00"), controle: comChaves({ projecao: false }, { aviso: 1 }) },
    { desde: ms("2022-10-30 17:15:00"), controle: comChaves({ projecao: false, nucleoMinimo: false }, { aviso: 1 }) },
    { desde: ms("2022-10-30 17:20:00"), controle: comChaves({ projecao: false }) },
  ];
  /** O critério do Ensaio geral (decisão 20): a chave aparece no site em até 2 rodadas mais o cache. */
  const DUAS_RODADAS = 2 * 20_000;
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    r = await replay("2022-10-30 16:50:00", "2022-10-30 17:26:00", { controle: (quando) => comandos.filter((c) => c.desde <= quando).at(-1)?.controle ?? CONTROLE_INICIAL });
  }, 120_000);
  const rodadas = () => r.gravacoes.filter((g) => g.caminho === "rodada.json").map((g) => ({ ...(g.conteudo as ArquivoDeRodada), quando: g.quando }));
  const entre = (de: string, ate: string) => rodadas().filter((x) => x.quando >= ms(de) && x.quando < ms(ate));

  it("sem comando, publica todas as chaves ligadas menos os textos preditivos, e nenhum aviso", () => {
    expect(rodadas()[0]).toMatchObject({
      chaves: { nucleoMinimo: true, projecao: true, baseComPesquisas: true, simulador: true, mapa: true, textosPreditivos: false },
      aviso: null,
    });
  });

  it("uma chave desligada aparece no arquivo de rodada em até 2 rodadas, e desligar a projeção desliga junto o simulador", () => {
    expect(entre("2022-10-30 16:50:00", "2022-10-30 17:05:00").every((x) => x.chaves.projecao && x.chaves.simulador)).toBe(true);
    const primeira = rodadas().find((x) => !x.chaves.projecao)!;
    expect(primeira.quando).toBeGreaterThanOrEqual(ms("2022-10-30 17:05:00"));
    expect(primeira.quando).toBeLessThan(ms("2022-10-30 17:05:00") + DUAS_RODADAS);
    expect(primeira.chaves).toMatchObject({ projecao: false, simulador: false, nucleoMinimo: true, baseComPesquisas: true, mapa: true });
    expect(rodadas().filter((x) => x.quando >= primeira.quando).every((x) => !x.chaves.projecao && !x.chaves.simulador)).toBe(true);
  });

  it("o aviso pronto entra e sai do arquivo de rodada nas rodadas escolhidas", () => {
    const comAviso = rodadas().filter((x) => x.aviso !== null);
    expect(comAviso[0]!.quando).toBeGreaterThanOrEqual(ms("2022-10-30 17:10:00"));
    expect(comAviso[0]!.quando).toBeLessThan(ms("2022-10-30 17:10:00") + DUAS_RODADAS);
    expect(comAviso.every((x) => x.aviso === 1)).toBe(true);
    expect(comAviso.at(-1)!.quando).toBeGreaterThanOrEqual(ms("2022-10-30 17:20:00") - 20_000);
    expect(comAviso.at(-1)!.quando).toBeLessThan(ms("2022-10-30 17:20:00") + DUAS_RODADAS);
    expect(entre("2022-10-30 17:10:40", "2022-10-30 17:20:00").every((x) => x.aviso === 1)).toBe(true);
  });

  it("no plano zero, o coletor publica só o arquivo de rodada, a cada rodada, ainda na fase ao vivo", () => {
    const planoZero = rodadas().filter((x) => !x.chaves.nucleoMinimo);
    const [inicio, fim] = [planoZero[0]!.quando, planoZero.at(-1)!.quando];
    expect(inicio).toBeGreaterThanOrEqual(ms("2022-10-30 17:15:00"));
    expect(inicio).toBeLessThan(ms("2022-10-30 17:15:00") + DUAS_RODADAS);
    expect(fim).toBeGreaterThanOrEqual(ms("2022-10-30 17:20:00") - 20_000);
    // Cinco minutos de rodadas de 20 s: a página continua sabendo a fase e os candidatos, e nada mais sai.
    expect(planoZero.length).toBeGreaterThan(10);
    expect(planoZero.every((x) => x.fase === "ao-vivo" && x.candidatos.length === 2)).toBe(true);
    expect(r.gravacoes.filter((g) => g.caminho !== "rodada.json" && g.quando >= inicio && g.quando <= fim)).toEqual([]);
  });

  it("religado o núcleo mínimo, os lugares voltam em até 2 rodadas, com o placar do TSE e a curva do Brasil inteira", () => {
    const brasil = r.gravacoes.filter((g) => g.caminho === "lugares/BR.json");
    const antes = brasil.filter((g) => g.quando < ms("2022-10-30 17:15:00")).at(-1)!;
    const depois = brasil.find((g) => g.quando > antes.quando)!;
    expect(depois.quando).toBeGreaterThanOrEqual(ms("2022-10-30 17:20:00"));
    expect(depois.quando).toBeLessThan(ms("2022-10-30 17:20:00") + DUAS_RODADAS);

    // A curva não tem buraco: os placares que o coletor viu no plano zero entram nela, e ela volta inteira.
    const curvaAntes = (antes.conteudo as ArquivoDoLugar).curva;
    const curvaDepois = (depois.conteudo as ArquivoDoLugar).curva;
    expect(curvaDepois.slice(0, curvaAntes.length)).toEqual(curvaAntes);
    const noPlanoZero = curvaDepois.slice(curvaAntes.length, -1);
    expect(noPlanoZero.length).toBeGreaterThanOrEqual(3);
    expect(curvaDepois.every((p, i) => i === 0 || p[0]! >= curvaDepois[i - 1]![0]!)).toBe(true);
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
  });
});
