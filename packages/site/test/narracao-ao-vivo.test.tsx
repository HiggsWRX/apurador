import type { ArquivoDeRodada, ArquivoDoLugar, ChavesDaNoite, EventoDaNarracao } from "@apurador/coletor";
import type { Lugar } from "@apurador/pipeline";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { ColunaDaNarracao } from "../src/components/ColunaDaNarracao";
import { VistaDoBlocoAoVivo, type PropsDaVista } from "../src/components/VistaDoBlocoAoVivo";
import type { QuadroAoVivo } from "../src/lib/leitor-ao-vivo";
import { emLugar } from "../src/lib/lugares";
import { elemento, elementos, texto } from "./html";

// A narração da noite na página (Narração da noite, decisões 1, 7, 9 e 10; Telas da página de lugar, decisões 1, 4, 6
// e 7): a manchete, o placar, o último evento sob a manchete, a coluna da narração e os números na curva, renderizados
// em HTML como a ilha os desenha. Os eventos são os que o coletor publica, com os textos dos modelos da decisão 8.

const CANDIDATOS: ArquivoDeRodada["candidatos"] = [
  { numero: 22, nome: "FLAVIO BOLSONARO", partido: "PL", sequencial: "280002551544" },
  { numero: 13, nome: "LULA", partido: "PT", sequencial: "280002542548" },
];
const LIGADAS: ChavesDaNoite = { nucleoMinimo: true, projecao: true, baseComPesquisas: true, simulador: true, mapa: true, textosPreditivos: false };

/** Um evento publicado; `numero` e `ponto` só nos do próprio lugar. */
const evento = (lugar: string, tipo: EventoDaNarracao["tipo"], quando: string, texto: string, extra: Partial<EventoDaNarracao> = {}): EventoDaNarracao => ({
  lugar,
  tipo,
  quando: `2022-10-30 ${quando}`,
  texto,
  ...extra,
});

const VIRADA_NO_BRASIL = evento("BR", "virada", "18:44:00", "Virada no Brasil: Lula passa à frente no placar parcial, com 67,74% das seções totalizadas.", {
  trocas: 1,
});
const INDICACAO = evento("BR", "indicacao", "19:56:23", "O TSE indica Lula eleito: eleição matematicamente definida, com 98,81% das seções totalizadas.");

interface Momento {
  /** O id do lugar e o tipo dele. */
  lugar?: [string, PropsDaVista["lugar"]];
  /** A última totalização do Brasil, em Brasília: a hora do TSE, que no ensaio geral não é a do relógio. */
  agora?: string;
  tse?: Partial<ArquivoDoLugar["tse"]>;
  narracao?: EventoDaNarracao[];
  eventosDoBrasil?: EventoDaNarracao[];
  curva?: ArquivoDoLugar["curva"];
  fase?: QuadroAoVivo["fase"];
}

function quadroEm({
  lugar = ["BR", { tipo: "brasil", em: "no Brasil" }],
  agora = "19:42:15",
  tse = {},
  narracao = [],
  eventosDoBrasil = [],
  curva = [],
  fase = "ao-vivo",
}: Momento = {}): QuadroAoVivo {
  // A rodada vem do relógio do coletor, que no ensaio geral está em outro dia: a manchete não pode depender dele.
  const rodada: ArquivoDeRodada = {
    rodada: "2026-10-22T23:42:15.000Z",
    fase,
    novidade: { totalizacao: `2022-10-30 ${agora}`, vista: "2026-10-22T23:42:12.000Z" },
    candidatos: CANDIDATOS,
    chaves: LIGADAS,
    aviso: null,
    pesoDasPesquisas: 3,
    eventosDoBrasil,
  };
  const arquivo: ArquivoDoLugar = {
    lugar: lugar[0],
    tse: {
      totalizacao: "2022-10-30 19:42:10",
      secoes: { totalizadas: 319847, total: 472027, percentual: 67.76 },
      votos: [61000000, 61122000],
      percentuais: [49.95, 50.05],
      final: false,
      ...tse,
    },
    curva,
    narracao,
  };
  return { fase, indicador: { estado: "ao-vivo" }, rodada, lugar: arquivo, ultimaLeitura: 3, mudaram: [], chaves: LIGADAS, aviso: null };
}

const vista = (m: Momento = {}) =>
  render(
    <VistaDoBlocoAoVivo
      quadro={quadroEm(m)}
      lugar={(m.lugar ?? ["BR", { tipo: "brasil", em: "no Brasil" }])[1]}
      fotos={{}}
      movimentoReduzido={false}
      proximaLeitura={30}
      lendo={false}
    />,
  );
const manchete = (m: Momento) => texto(elemento(vista(m), /<p[^>]*data-manchete/));
const BAHIA: [string, PropsDaVista["lugar"]] = ["BA", { tipo: "uf", uf: "BA", em: "na Bahia" }];
const SALVADOR: [string, PropsDaVista["lugar"]] = ["38490", { tipo: "municipio", uf: "BA", em: "em Salvador (BA)" }];

describe("a manchete com a narração", () => {
  it('diz "Virada: …" por 10 minutos depois de uma virada no próprio lugar, pela hora do TSE', () => {
    const virada = { narracao: [{ ...VIRADA_NO_BRASIL, numero: 5, ponto: [67.74, 49.99, 50.01] }] };
    expect(manchete({ ...virada, agora: "18:53:59" })).toBe("Virada: Lula passa à frente com 50,05%, com 67,76% das seções totalizadas");
    expect(manchete({ ...virada, agora: "18:54:01" })).toBe("Lula lidera com 50,05% dos votos válidos e 67,76% das seções totalizadas");
    // A virada do Brasil, intercalada na página da Bahia, não muda a manchete dela.
    expect(manchete({ lugar: BAHIA, eventosDoBrasil: [VIRADA_NO_BRASIL], agora: "18:45:00" })).toBe(
      "Lula lidera com 50,05% dos votos válidos e 67,76% das seções totalizadas",
    );
  });

  it('não diz "Virada" quando as trocas da janela voltaram a liderança a quem estava à frente', () => {
    const idaEVolta = evento(
      "BR",
      "virada",
      "18:42:53",
      "Virada no Brasil: a liderança trocou 2 vezes entre 18:42 e 18:43; Lula à frente no placar parcial, com 66,85% das seções totalizadas.",
      {
        trocas: 2,
        numero: 5,
      },
    );
    expect(manchete({ narracao: [idaEVolta], agora: "18:44:00" })).toBe("Lula lidera com 50,05% dos votos válidos e 67,76% das seções totalizadas");
  });

  it('no Brasil, com a indicação do TSE, diz "O TSE indica X eleito"; na totalização final, "X foi eleito com Y% dos votos válidos"', () => {
    const indicado = {
      narracao: [{ ...INDICACAO, numero: 9, ponto: [98.81, 49.17, 50.83] }],
      tse: { percentuais: [49.17, 50.83], votos: [57_000_000, 58_920_000] },
    };
    expect(manchete(indicado)).toBe("O TSE indica Lula eleito");
    const final = {
      ...indicado,
      tse: { final: true, secoes: { totalizadas: 472027, total: 472027, percentual: 100 }, percentuais: [49.1, 50.9], votos: [58_206_354, 60_345_999] },
    };
    expect(manchete(final)).toBe("Lula foi eleito com 50,90% dos votos válidos");
  });

  it("numa UF ou num município que terminou, diz quem vence ali", () => {
    const terminou = { tse: { secoes: { totalizadas: 34424, total: 34424, percentual: 100 }, percentuais: [27.88, 72.12], votos: [2_000_000, 5_200_000] } };
    expect(manchete({ ...terminou, lugar: BAHIA })).toBe("Lula vence na Bahia com 72,12% dos votos válidos");
    expect(manchete({ ...terminou, lugar: SALVADOR })).toBe("Lula vence em Salvador (BA) com 72,12% dos votos válidos");
  });

  it("nomeia o lugar como a manchete o escreve", () => {
    const uf = (id: string, nome: string, artigo: Lugar["artigo"]): Lugar => ({ id, tipo: "uf", nome, uf: id, artigo, aptos: 0 });
    expect(emLugar({ id: "BR", tipo: "brasil", nome: "Brasil", aptos: 0 })).toBe("no Brasil");
    expect([uf("BA", "Bahia", "a"), uf("SP", "São Paulo", ""), uf("AC", "Acre", "o"), uf("DF", "Distrito Federal", "o")].map(emLugar)).toEqual([
      "na Bahia",
      "em São Paulo",
      "no Acre",
      "no Distrito Federal",
    ]);
    expect(emLugar({ id: "ZZ", tipo: "exterior", nome: "Exterior", uf: "ZZ", aptos: 0 })).toBe("no Exterior");
    expect(emLugar({ id: "38490", tipo: "municipio", nome: "Salvador", uf: "BA", aptos: 0 })).toBe("em Salvador (BA)");
    expect(emLugar({ id: "29955", tipo: "municipio", nome: "Lisboa", uf: "ZZ", aptos: 0 })).toBe("em Lisboa (Exterior)");
  });
});

describe("o placar com a indicação do TSE", () => {
  const placar = (m: Momento) => texto(elemento(vista(m), /<section[^>]*data-placar-oficial/));

  it('mostra "matematicamente definida: X eleito" só no Brasil, e só com a indicação', () => {
    const tse = { percentuais: [49.17, 50.83], votos: [57_000_000, 58_920_000] };
    const html = vista({ tse, narracao: [{ ...INDICACAO, numero: 9 }] });
    expect(texto(elemento(elemento(html, /<section[^>]*data-placar-oficial/), /<p[^>]*data-indicacao-do-tse/))).toBe(
      "Indicação do TSE · matematicamente definida: Lula eleito",
    );
    expect(placar({ tse })).not.toContain("matematicamente definida");
    expect(placar({ tse, lugar: BAHIA, eventosDoBrasil: [INDICACAO] })).not.toContain("matematicamente definida");
  });
});

describe("o último evento sob a manchete", () => {
  it("é o mais novo do próprio lugar, nunca o de outro, com a hora e o link para a narração", () => {
    const html = vista({
      narracao: [
        evento("SP", "marco", "18:45:10", "Passa de 50% das seções totalizadas no estado de São Paulo: 50,12%. Flávio 55,40%, Lula 44,60%."),
        { ...VIRADA_NO_BRASIL, numero: 5 },
      ],
    });
    const ultimo = elemento(html, /<p[^>]*data-ultimo-evento/);
    expect(texto(ultimo)).toBe("18:44 Virada no Brasil: Lula passa à frente no placar parcial, com 67,74% das seções totalizadas. Narração →");
    expect(ultimo).toMatch(/<a[^>]*href="#narracao"/);
    expect(html.indexOf("data-manchete")).toBeLessThan(html.indexOf("data-ultimo-evento"));
  });

  it("não existe sem evento do lugar", () => {
    expect(vista({ lugar: BAHIA, eventosDoBrasil: [VIRADA_NO_BRASIL] })).not.toContain("data-ultimo-evento");
  });
});

describe("a coluna da narração", () => {
  const coluna = (m: Momento, id = (m.lugar ?? ["BR"])[0]) => render(<ColunaDaNarracao quadro={quadroEm(m)} id={id} />);
  const itens = (html: string) => elementos(html, /<li[^>]*data-evento/);

  it("antes das 17h, diz quando a narração começa", () => {
    const html = render(<ColunaDaNarracao quadro={{ ...quadroEm(), fase: "antes-das-17h", rodada: null, lugar: null }} id="BR" />);
    expect(texto(elemento(html, /<aside[^>]*id="narracao"/))).toBe(
      "Narração da noite A narração começa às 17h, com as primeiras seções totalizadas. Narração do Apurador com dados do TSE",
    );
    expect(itens(html)).toEqual([]);
  });

  it("lista o evento mais novo primeiro, com hora e número, e o selo da narração", () => {
    const narracao = [
      { ...VIRADA_NO_BRASIL, numero: 5 },
      evento("SP", "marco", "18:38:10", "Passa de 50% das seções totalizadas no estado de São Paulo: 50,12%. Flávio 55,40%, Lula 44,60%."),
      evento(
        "BR",
        "marco",
        "18:26:53",
        "Passa de 50% das seções totalizadas no Brasil: 50,34%. Flávio 50,43%, Lula 49,57%. Das seções que faltam, 51% são do Sudeste e 30% do Nordeste.",
        {
          numero: 4,
        },
      ),
    ];
    const html = coluna({ narracao });
    expect(itens(html).map(texto)).toEqual([
      "5 18:44 Virada no Brasil: Lula passa à frente no placar parcial, com 67,74% das seções totalizadas.",
      "18:38 Passa de 50% das seções totalizadas no estado de São Paulo: 50,12%. Flávio 55,40%, Lula 44,60%.",
      "4 18:26 Passa de 50% das seções totalizadas no Brasil: 50,34%. Flávio 50,43%, Lula 49,57%. Das seções que faltam, 51% são do Sudeste e 30% do Nordeste.",
    ]);
    expect(texto(html)).toContain("Narração do Apurador com dados do TSE");
  });

  it('numa UF, intercala os eventos do Brasil pela hora, marcados como "Brasil" e sem número', () => {
    const narracao = [
      evento("BA", "marco", "18:52:45", "Passa de 75% das seções totalizadas no estado da Bahia: 75,02%. Flávio 27,90%, Lula 72,10%.", { numero: 5 }),
      evento("BA", "marco", "18:29:23", "Passa de 50% das seções totalizadas no estado da Bahia: 50,01%. Flávio 28,10%, Lula 71,90%.", { numero: 4 }),
    ];
    const html = coluna({ lugar: BAHIA, narracao, eventosDoBrasil: [INDICACAO, VIRADA_NO_BRASIL] });
    expect(itens(html).map(texto)).toEqual([
      "Brasil 19:56 O TSE indica Lula eleito: eleição matematicamente definida, com 98,81% das seções totalizadas.",
      "5 18:52 Passa de 75% das seções totalizadas no estado da Bahia: 75,02%. Flávio 27,90%, Lula 72,10%.",
      "Brasil 18:44 Virada no Brasil: Lula passa à frente no placar parcial, com 67,74% das seções totalizadas.",
      "4 18:29 Passa de 50% das seções totalizadas no estado da Bahia: 50,01%. Flávio 28,10%, Lula 71,90%.",
    ]);
  });

  it('no celular, mostra os 5 últimos e "Ver toda a narração"; os outros ficam na lista, para o computador', () => {
    const narracao = Array.from({ length: 8 }, (_, i) =>
      evento("BR", "marco", `18:${String(10 + i).padStart(2, "0")}:00`, `Evento ${i + 1}.`, { numero: i + 1 }),
    ).reverse();
    const html = coluna({ narracao });
    expect(itens(html)).toHaveLength(8);
    expect(itens(html).map((li) => li.includes("data-fora-do-resumo"))).toEqual([false, false, false, false, false, true, true, true]);
    expect(texto(elemento(html, /<button[^>]*data-ver-toda/))).toBe("Ver toda a narração (8)");
    expect(coluna({ narracao: narracao.slice(0, 5) })).not.toContain("data-ver-toda");
  });

  it("no plano zero, não mostra nada ao vivo", () => {
    const quadro = { ...quadroEm({ narracao: [{ ...VIRADA_NO_BRASIL, numero: 5 }] }), chaves: { ...LIGADAS, nucleoMinimo: false } };
    expect(render(<ColunaDaNarracao quadro={quadro} id="BR" />)).not.toContain("Virada");
  });
});

describe("a narração na curva", () => {
  const curva = [
    [3, 56, 44],
    [25, 51.2, 48.8],
    [50.34, 50.43, 49.57],
    [67.74, 49.99, 50.01],
    [70, 49.8, 50.2],
  ];
  const narracao = [
    { ...VIRADA_NO_BRASIL, numero: 5, ponto: [67.74, 49.99, 50.01] },
    evento("SP", "marco", "18:38:10", "Passa de 50% das seções totalizadas no estado de São Paulo: 50,12%.", {}),
    evento("BR", "marco", "18:26:53", "Passa de 50% das seções totalizadas no Brasil: 50,34%.", { numero: 4, ponto: [50.34, 50.43, 49.57] }),
  ];
  const svg = elemento(vista({ curva, narracao, tse: { secoes: { totalizadas: 330419, total: 472027, percentual: 70 } } }), /<section[^>]*data-curva-real/);

  it("marca com números os eventos do próprio lugar, onde eles foram vistos", () => {
    const marcas = [...svg.matchAll(/<g[^>]*data-evento-na-curva="(\d+)"[^>]*>[\s\S]*?<circle[^>]*cx="([\d.]+)"/g)].map((m) => [m[1], Number(m[2])]);
    expect(marcas.map(([n]) => n)).toEqual(["4", "5"]);
    // O eixo das seções vai de 34 px (0%) a 324 px (100%).
    expect(marcas.map(([, x]) => Math.round(x as number))).toEqual([Math.round(34 + 2.9 * 50.34), Math.round(34 + 2.9 * 67.74)]);
  });

  it('mostra a virada real como ponto cheio, com "Virada às HH:MM, com X% das seções"', () => {
    expect(svg).toMatch(/<circle[^>]*data-virada-real/);
    expect(texto(svg)).toContain("Virada às 18:44, com 67,74% das seções");
  });
});
