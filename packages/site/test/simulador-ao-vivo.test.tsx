import type { ArquivoDeRodada, ArquivoDoLugar, ArquivoDoSimuladorAoVivo, ChavesDaNoite, EventoDaNarracao } from "@apurador/coletor";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { SimuladorFechado } from "../src/components/SimuladorFechado";
import { antesDaPrimeiraLeitura, type QuadroAoVivo } from "../src/lib/leitor-ao-vivo";
import { curvaRealNoSimulador, faseDoSimulador, type Fechamento } from "../src/lib/simulador-ao-vivo";
import { elemento, texto } from "./html";

// O que a tela do simulador mostra pela última leitura do leitor ao vivo (Simulador "e se", decisões 5 e 12): sobre que
// arquivo ela simula, quando fica fora do ar pelas chaves e como fecha com a indicação do TSE e com a totalização final.

const LIGADAS: ChavesDaNoite = { nucleoMinimo: true, projecao: true, baseComPesquisas: true, simulador: true, mapa: true, textosPreditivos: false };
const CANDIDATOS: ArquivoDeRodada["candidatos"] = [
  { numero: 22, nome: "FLAVIO BOLSONARO", partido: "PL", sequencial: "280002551544" },
  { numero: 13, nome: "LULA", partido: "PT", sequencial: "280002542548" },
];
const SIMULADOR: ArquivoDoSimuladorAoVivo = {
  assinatura: "0badcafe",
  apuracao: { secoes: [3], secoesTotais: [40], aptos: [900], aptosTotais: [12000], votos: [[400], [380]] },
  agregado: { valor: 51.1, incerteza: 1.5 },
};
const INDICACAO: EventoDaNarracao = { lugar: "BR", tipo: "indicacao", quando: "2022-10-30 19:56:23", texto: "O TSE indica Lula eleito." };

/** O Brasil com Lula à frente no placar parcial e, se vier, a narração com a indicação. */
function brasil(narracao: EventoDaNarracao[] = [], final = false): ArquivoDoLugar {
  return {
    lugar: "BR",
    tse: {
      totalizacao: "2022-10-30 19:56:23",
      secoes: { totalizadas: final ? 472027 : 465000, total: 472027, percentual: final ? 100 : 98.51 },
      votos: [57000000, 58920000],
      percentuais: [49.17, 50.83],
      final,
    },
    curva: [],
    narracao,
  };
}

function quadro(fase: ArquivoDeRodada["fase"], parte: Partial<QuadroAoVivo> = {}, chaves: Partial<ChavesDaNoite> = {}): QuadroAoVivo {
  const daRodada = { ...LIGADAS, ...chaves };
  const rodada: ArquivoDeRodada = {
    rodada: "2026-10-25T22:42:15.000Z",
    fase,
    novidade: { totalizacao: "2022-10-30 19:42:10", vista: "2026-10-25T22:42:12.000Z" },
    candidatos: CANDIDATOS,
    chaves: daRodada,
    aviso: null,
    pesoDasPesquisas: 3,
    eventosDoBrasil: [],
  };
  return { ...antesDaPrimeiraLeitura(LIGADAS), fase, rodada, chaves: daRodada, lugar: brasil(), simulador: SIMULADOR, ...parte };
}

describe("a tela do simulador pela última leitura", () => {
  it("antes das 17h, simula sobre o arquivo do build com a chave de antes das 17h; sem ela, diz que abre às 17h", () => {
    expect(faseDoSimulador(antesDaPrimeiraLeitura(LIGADAS), true)).toEqual({ tipo: "antes-das-17h" });
    expect(faseDoSimulador(quadro("antes-das-17h"), true)).toEqual({ tipo: "antes-das-17h" });
    expect(faseDoSimulador(quadro("antes-das-17h"), false)).toEqual({ tipo: "abre-as-17h" });
  });

  it("na fase ao vivo, simula sobre o arquivo do coletor, e espera enquanto ele não chega com a apuração", () => {
    expect(faseDoSimulador(quadro("ao-vivo"), false)).toEqual({ tipo: "ao-vivo", daNoite: SIMULADOR });
    expect(faseDoSimulador(quadro("ao-vivo", { simulador: null }), true)).toEqual({ tipo: "ao-vivo", daNoite: null });
    expect(faseDoSimulador(quadro("ao-vivo", { simulador: { assinatura: "0badcafe" } }), true)).toEqual({ tipo: "ao-vivo", daNoite: null });
  });

  it("desligada a chave do simulador, ou a da projeção, ou no plano zero, fica fora do ar", () => {
    expect(faseDoSimulador(quadro("ao-vivo", {}, { simulador: false }), true)).toEqual({ tipo: "fora-do-ar" });
    // Até a primeira rodada, valem as chaves do site, em que nada liga o simulador sem a projeção.
    expect(faseDoSimulador(quadro("ao-vivo", {}, { projecao: false }), true)).toEqual({ tipo: "fora-do-ar" });
    expect(faseDoSimulador(quadro("ao-vivo", {}, { nucleoMinimo: false }), true)).toEqual({ tipo: "fora-do-ar" });
  });

  it("com a indicação do TSE, fecha com o eleito; na totalização final, com o fim da apuração", () => {
    expect(faseDoSimulador(quadro("ao-vivo", { lugar: brasil([INDICACAO]) }), true)).toEqual({ tipo: "indicacao", eleito: "Lula" });
    expect(faseDoSimulador(quadro("encerrada", { lugar: brasil([INDICACAO], true) }), true)).toEqual({ tipo: "encerrada" });
    // Com a chave desligada depois da indicação, a tela ainda diz por que o simulador parou.
    expect(faseDoSimulador(quadro("ao-vivo", { lugar: brasil([INDICACAO]) }, { simulador: false }), true)).toEqual({ tipo: "indicacao", eleito: "Lula" });
  });
});

describe("a curva real do Brasil no simulador", () => {
  it("vem do Brasil da última leitura, na fatia do 1º finalista da base, qualquer que seja a ordem do arquivo de rodada", () => {
    const curva: ArquivoDoLugar["curva"] = [
      [0.5, 60, 40],
      [10.2, 52.5, 47.5],
    ];
    const comCurva = quadro("ao-vivo", { lugar: { ...brasil(), curva } });
    // 2026: Flávio é o 1º finalista da base e o 1º do arquivo de rodada, em ordem alfabética.
    expect(curvaRealNoSimulador(comCurva, ["FLAVIO BOLSONARO", "LULA"])).toEqual([
      { x: 0.5, y: 0.6 },
      { x: 10.2, y: 0.525 },
    ]);
    // 2022, no ensaio: Lula é o 1º finalista da base e o 2º do arquivo de rodada.
    expect(curvaRealNoSimulador(comCurva, ["LULA", "FLAVIO BOLSONARO"])).toEqual([
      { x: 0.5, y: 0.4 },
      { x: 10.2, y: 0.475 },
    ]);
    expect(curvaRealNoSimulador(antesDaPrimeiraLeitura(LIGADAS), ["FLAVIO BOLSONARO", "LULA"])).toEqual([]);
  });
});

describe("a tela fechada", () => {
  const fechada = (fechamento: Fechamento) => elemento(render(<SimuladorFechado fechamento={fechamento} />), /<section[^>]*data-simulador-fechado/);

  it("diz por que fechou, sempre com o link de volta à página do Brasil", () => {
    expect(texto(fechada({ tipo: "abre-as-17h" }))).toBe("O simulador abre às 17h, com a apuração. Voltar à página do Brasil");
    expect(texto(fechada({ tipo: "fora-do-ar" }))).toBe("O simulador está fora do ar agora. Voltar à página do Brasil");
    expect(texto(fechada({ tipo: "indicacao", eleito: "Lula" }))).toBe(
      "O TSE indica Lula eleito. O voto que falta não muda mais o resultado. Voltar à página do Brasil",
    );
    expect(texto(fechada({ tipo: "encerrada" }))).toBe("A apuração terminou. Voltar à página do Brasil");
    expect(fechada({ tipo: "encerrada" })).toMatch(/<a href="\/">Voltar à página do Brasil<\/a>/);
  });
});
