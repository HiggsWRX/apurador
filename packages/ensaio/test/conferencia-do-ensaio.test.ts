import { describe, expect, it } from "vitest";
import type { EventoDaNarracao, RegistroDaRodada } from "@apurador/coletor";
import { conferirEnsaio, narracaoDoReplay, registroDoEnsaio, type LeituraDoEnsaio, type NumerosDoEnsaio } from "../src/index.ts";
import { cadastro, instante, lugaresDoSite, noite, projecaoDe2022 } from "./noite-2022.ts";

// A conferência do ensaio geral sobre o que o leitor registrou (Ensaio geral, decisões 20, 22 e 23; Volume de gravações
// na noite, decisão 9). O placar certo é o do histórico oficial de totalização de 2022 às 18:44:04 (a virada), e o
// relógio é o do ensaio: 3x desde as 16:50, então as 18:44:04 da noite chegam 38 min 1 s e 1/3 depois da partida.

const PARTIDA = Date.parse("2026-10-23T21:00:00Z");
const AS_18H44 = PARTIDA + Math.round(((114 * 60 + 4) * 1000) / 3);
const PRINCIPAL = "https://ao-vivo-ensaio.exemplo/";
const PLANO_B = "https://plano-b-ensaio.exemplo/";

const CANDIDATOS = [
  { numero: 22, nome: "JAIR BOLSONARO", partido: "PL", sequencial: "1" },
  { numero: 13, nome: "LULA", partido: "PT", sequencial: "2" },
];
const chaves = (textosPreditivos = false) => ({ nucleoMinimo: true, projecao: true, baseComPesquisas: true, simulador: true, mapa: true, textosPreditivos });
const rodada = (totalizacao: string | null) => ({
  rodada: "2026-10-23T21:38:00.000Z",
  fase: "ao-vivo",
  novidade: { totalizacao, vista: null },
  candidatos: CANDIDATOS,
  chaves: chaves(),
  aviso: null,
  pesoDasPesquisas: 3,
  eventosDoBrasil: [],
});
const brasil = (totalizacao: string, narracao: EventoDaNarracao[] = []) => ({
  lugar: "BR",
  tse: {
    totalizacao,
    secoes: { totalizadas: 319_895, total: 472_075, percentual: 67.76 },
    votos: [40_074_362, 40_083_190],
    percentuais: [49.99, 50.01],
    final: false,
  },
  curva: [],
  narracao,
});

let numero = 0;
/** Uma resposta registrada pelo leitor, com o que importa a cada teste. */
const lida = (caminho: string, quando: number, extra: Partial<LeituraDoEnsaio> = {}): LeituraDoEnsaio => ({
  leitura: ++numero,
  quando,
  endereco: PRINCIPAL,
  tipo: "principal",
  caminho,
  status: 200,
  cache: "HIT",
  bytes: 1000,
  ...extra,
});

const conferir = (leituras: LeituraDoEnsaio[], extra: Partial<Parameters<typeof conferirEnsaio>[0]> = {}) =>
  conferirEnsaio({ leituras, fonte: { noite, cadastro }, relogio: { partida: PARTIDA }, rodadas: [], ...extra });

describe("a conferência do ensaio geral", () => {
  it("confere o placar de cada arquivo de lugar lido contra o TSE falso, com os candidatos do arquivo de rodada", () => {
    const certo = brasil("2022-10-30 18:44:04");
    const errado = structuredClone(certo);
    errado.tse.percentuais = [50.01, 49.99];

    const n = conferir([
      lida("rodada.json", AS_18H44, { conteudo: rodada("2022-10-30 18:44:04") }),
      lida("lugares/BR.json", AS_18H44, { conteudo: certo }),
      lida("lugares/BR.json", AS_18H44 + 30_000, { conteudo: errado }),
      lida("lugares/SP.json", AS_18H44 + 30_000, { status: 304 }),
    ]);

    expect(n.placar.conferidos).toBe(2);
    expect(n.placar.divergencias).toHaveLength(1);
    expect(n.placar.divergencias[0]).toMatch(/BR.*18:44:04.*percentuais/);
  });

  it("acusa um preditivo no ar com a chave desligada", () => {
    const chance: EventoDaNarracao = { lugar: "BR", tipo: "chance", quando: "2022-10-30 18:44:04", texto: "Projeção do Apurador: chance de 80%" };

    const n = conferir([
      lida("rodada.json", AS_18H44, { conteudo: rodada("2022-10-30 18:44:04") }),
      lida("lugares/BR.json", AS_18H44, { conteudo: brasil("2022-10-30 18:44:04", [chance]) }),
    ]);

    expect(n.preditivos.divergencias).toEqual([expect.stringMatching(/lugares\/BR\.json.*chave desligada.*Projeção do Apurador: chance de 80%/)]);
  });

  it("mede o atraso de cada totalização do Brasil nova para quem lê, pela hora em que o TSE falso a pôs no ar, por endereço", () => {
    // O TSE falso pôs as 18:44:04 no ar em AS_18H44; as 18:44:34, 10 s reais depois (30 s da noite a 3x).
    const n = conferir([
      lida("lugares/BR.json", AS_18H44 + 20_000, { conteudo: brasil("2022-10-30 18:44:04") }),
      // A mesma totalização de novo não é um atraso novo.
      lida("lugares/BR.json", AS_18H44 + 50_000, { status: 304 }),
      lida("lugares/BR.json", AS_18H44 + 41_000, { conteudo: brasil("2022-10-30 18:44:04") }),
      lida("lugares/BR.json", AS_18H44 + 10_000 + 64_000, { conteudo: brasil("2022-10-30 18:44:34") }),
      lida("lugares/BR.json", AS_18H44 + 10_000 + 95_000, { tipo: "plano B", endereco: PLANO_B, conteudo: brasil("2022-10-30 18:44:37") }),
    ]);

    expect(n.atraso.principal).toEqual({ amostras: 2, mediana: 42, p95: 64, maximo: 64 });
    // As 18:44:37 entraram 11 s depois das 18:44:04.
    expect(n.atraso["plano B"]).toEqual({ amostras: 1, mediana: 94, p95: 94, maximo: 94 });
  });

  it("deixa fora do atraso as janelas que o dono marca, como uma queda provocada", () => {
    const n = conferir(
      [
        lida("lugares/BR.json", AS_18H44 + 20_000, { conteudo: brasil("2022-10-30 18:44:04") }),
        lida("lugares/BR.json", AS_18H44 + 10_000 + 400_000, { conteudo: brasil("2022-10-30 18:44:34") }),
      ],
      { excluir: [[AS_18H44 + 60_000, AS_18H44 + 600_000]] },
    );

    expect(n.atraso.principal).toEqual({ amostras: 1, mediana: 20, p95: 20, maximo: 20 });
  });

  it("conta no cache só as respostas do principal aos arquivos da página do Brasil, e da borda só HIT e REVALIDATED", () => {
    const n = conferir([
      lida("rodada.json", AS_18H44, { cache: "HIT" }),
      lida("lugares/BR.json", AS_18H44, { status: 304, cache: "REVALIDATED" }),
      // Um município do rodízio, que só o leitor pede.
      lida("lugares/01120.json", AS_18H44, { cache: "MISS" }),
      lida("mapa.json", AS_18H44, { cache: "EXPIRED" }),
      lida("rodada.json", AS_18H44, { status: 404, cache: "HIT" }),
      lida("rodada.json", AS_18H44, { tipo: "plano B", endereco: PLANO_B, cache: null }),
    ]);

    expect(n.cache).toEqual({ respostas: 3, daBorda: 2 });
  });

  it("soma os dados da página do Brasil das 17h às 20h da noite, e os leva à noite pela velocidade do relógio", () => {
    // As 17:00 da noite chegam 3 min 20 s depois da partida; as 20:00, 63 min 20 s.
    const as17h = PARTIDA + 200_000;
    const as20h = PARTIDA + 3_800_000;
    const n = conferir([
      lida("rodada.json", as17h - 1000, { bytes: 9999 }),
      lida("rodada.json", as17h, { bytes: 300 }),
      lida("lugares/BR.json", as17h, { bytes: 5000 }),
      lida("lugares/SP.json", as17h, { bytes: 7777 }),
      lida("mapa.json", as17h, { bytes: 25_000 }),
      lida("rodada.json", as20h - 1000, { bytes: 0, status: 304 }),
      lida("rodada.json", as20h, { bytes: 9999 }),
    ]);

    expect(n.dadosPorVisitante).toEqual({ bytes: 5300, bytesComOMapa: 30_300, fatorDaNoite: 3 });
  });

  it("resume as rodadas do coletor: o tempo, o do pico e as gravações por rodada e por hora", () => {
    const registro = (inicio: string, duracao: number, gravacoes: number, municipios: number) =>
      ({ inicio, duracao, gravacoes, baixados: { brasil: 1, ufs: 0, municipios, zonas: 0 } }) as RegistroDaRodada;

    const n = conferir([], {
      rodadas: [
        registro("2026-10-23T21:00:00.000Z", 3000, 100, 0),
        registro("2026-10-23T21:40:00.000Z", 15_500, 1200, 610),
        registro("2026-10-23T21:59:40.000Z", 18_200, 900, 300),
        registro("2026-10-23T22:00:00.000Z", 9000, 40, 10),
      ],
    });

    expect(n.rodadas).toEqual({
      quantidade: 4,
      duracao: { amostras: 4, mediana: 12.25, p95: 18.2, maximo: 18.2 },
      noPico: { inicio: "2026-10-23T21:40:00.000Z", duracao: 15.5, municipios: 610 },
      gravacoes: { total: 2240, maximaPorRodada: 1200, maximaPorHora: 2200 },
    });
  });

  it("compara com o painel da Cloudflare o contador do bucket do ensaio, não a soma dos dois buckets", () => {
    const gravacoes = { mes: "2026-10", buckets: { "apurador-ensaio": 115_002, "apurador-ao-vivo": 5_900 } };

    expect(conferir([], { contador: { gravacoes, bucket: "apurador-ensaio", daCloudflare: 114_950 } }).contador).toEqual({
      coletor: 115_002,
      daCloudflare: 114_950,
    });
    expect(conferir([], { contador: { gravacoes, bucket: "apurador-ensaio" } }).contador).toBeNull();
  });

  it("compara a narração do Brasil com a do replay da mesma noite: o que falta, o que sobra e a hora fora da tolerância", () => {
    const evento = (tipo: EventoDaNarracao["tipo"], quando: string, lugar = "BR", marco?: number): EventoDaNarracao => ({
      lugar,
      tipo,
      quando,
      texto: `${tipo} ${lugar}`,
      ...(marco === undefined ? {} : { marco }),
    });
    const doReplay = [evento("virada", "2022-10-30 18:44:04"), evento("virada", "2022-10-30 19:10:00", "MG"), evento("marco", "2022-10-30 18:00:00", "BR", 25)];
    const publicada = [
      evento("virada", "2022-10-30 18:45:00"),
      evento("marco", "2022-10-30 18:03:00", "BR", 25),
      evento("virada", "2022-10-30 19:20:00", "AM"),
    ];

    const n = conferir([lida("lugares/BR.json", AS_18H44, { conteudo: brasil("2022-10-30 18:44:04", publicada) })], { narracaoDoReplay: doReplay });

    expect(n.narracao).toEqual([
      "falta o evento do replay virada em MG às 2022-10-30 19:10:00: virada MG",
      "o marco 25% em BR saiu às 2022-10-30 18:03:00, e no replay às 2022-10-30 18:00:00",
      "sobra o evento virada em AM às 2022-10-30 19:20:00: virada AM",
    ]);
  });
});

describe("a narração do replay, a referência da narração factual", () => {
  it("dá a virada do Brasil às ~18:44, como a medição de 2022, num trecho da noite", async () => {
    // A primeira troca para Lula depois de 3% é às 18:42:53, e a última, às 18:44:50. O coletor lê o Brasil uma vez por
    // minuto: a virada sai na primeira leitura com Lula à frente, até 18:45:50 (a mesma conta do `replay-da-noite-inteira.test.ts`).
    const narracao = await narracaoDoReplay({
      noite,
      cadastro,
      lugares: lugaresDoSite,
      projecao: projecaoDe2022,
      de: instante("2022-10-30 18:30:00"),
      ate: instante("2022-10-30 19:00:00"),
    });

    const viradas = narracao.filter((e) => e.lugar === "BR" && e.tipo === "virada");
    expect(viradas).toHaveLength(1);
    expect(viradas[0]!.quando >= "2022-10-30 18:42:53" && viradas[0]!.quando <= "2022-10-30 18:45:50").toBe(true);
  }, 120_000);
});

describe("o registro do ensaio", () => {
  const numeros: NumerosDoEnsaio = {
    leituras: 170,
    placar: { conferidos: 15_234, divergencias: [] },
    preditivos: { divergencias: ["lugares/BR.json: ainda no ar: Projeção do Apurador: chance de 80%"] },
    atraso: { principal: { amostras: 120, mediana: 31.4, p95: 64.6, maximo: 80 }, "plano B": { amostras: 10, mediana: 80, p95: 140, maximo: 141 } },
    cache: { respostas: 1000, daBorda: 899 },
    dadosPorVisitante: { bytes: 2_100_000, bytesComOMapa: 3_400_000, fatorDaNoite: 3 },
    rodadas: {
      quantidade: 250,
      duracao: { amostras: 250, mediana: 6.2, p95: 12.04, maximo: 14.36 },
      noPico: { inicio: "2026-10-23T21:40:00.000Z", duracao: 13.1, municipios: 612 },
      gravacoes: { total: 112_345, maximaPorRodada: 1204, maximaPorHora: 40_120 },
    },
    contador: { coletor: 115_002, daCloudflare: 114_950 },
    narracao: null,
  };

  it("põe cada número contra a meta do critério, com o veredito do número", () => {
    const texto = registroDoEnsaio(numeros);

    expect(texto).toContain("| Placar idêntico | 15.234 arquivos de lugar conferidos, 0 divergências | nenhuma divergência | passa |");
    expect(texto).toContain("| Textos preditivos com a chave desligada | 1 divergência | nenhuma | não passa |");
    expect(texto).toContain("| Atraso no caminho R2 | mediana de 31 s e p95 de 65 s (120 totalizações) | mediana até 35 s e p95 até 70 s | passa |");
    expect(texto).toContain("| Atraso no plano B | mediana de 80 s e p95 de 140 s (10 totalizações) | mediana até 75 s e p95 até 150 s | não passa |");
    expect(texto).toContain("| Cache no caminho R2 | 89,9% da borda (899 de 1.000 respostas) | pelo menos 90% | não passa |");
    expect(texto).toContain("| Tempo de cada rodada | até 14,4 s (p95 de 12,0 s); no pico, com 612 municípios, 13,1 s | menos de 20 s no pico a 3x |");
    expect(texto).toContain("| Contador do coletor contra o painel da Cloudflare | 115.002 contra 114.950, 0,05% de diferença | até 1% |");
    expect(texto).toContain(
      "| Dados por visitante na página do Brasil, das 17h às 20h | 2,1 MB (3,4 MB com o mapa); levados à noite (x3), 6,3 MB (10,2 MB) | até 10 MB |",
    );
    expect(texto).toContain("Projeção do Apurador: chance de 80%");
  });

  it("diz o que não foi medido, sem veredito", () => {
    const texto = registroDoEnsaio({ ...numeros, atraso: { principal: null, "plano B": null }, contador: null, narracao: null });

    expect(texto).toContain("| Atraso no plano B | sem leitura | mediana até 75 s e p95 até 150 s | não medido |");
    expect(texto).toContain("| Contador do coletor contra o painel da Cloudflare | sem o número do painel da Cloudflare (--painel-da-cloudflare) | até 1% |");
    expect(texto).toContain("| Narração factual | sem o replay da mesma noite | igual à do replay, salvo o que as quedas explicam | não medido |");
  });
});
