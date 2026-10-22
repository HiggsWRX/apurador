import { CONTROLE_INICIAL, type ArquivoDeRodada, type ArquivoDoLugar, type EventoDaNarracao } from "@apurador/coletor";
import { describe, expect, it } from "vitest";
import { conferirPreditivos, type JsonPublico } from "../src/index.ts";

// O script que confere os textos preditivos nos JSONs públicos (Ensaio geral, decisão 22), o mesmo no replay automático
// e no ensaio geral: os JSONs entram na ordem em que foram gravados, ou lidos no endereço público, e a chave de cada
// rodada é a do arquivo de rodada dela, que o coletor grava antes dos lugares. Os eventos são os modelos da decisão 8
// da Narração da noite.

const rodada = (textosPreditivos: boolean, totalizacao: string): JsonPublico => ({
  caminho: "rodada.json",
  conteudo: {
    novidade: { totalizacao, vista: null },
    chaves: { ...CONTROLE_INICIAL.chaves, textosPreditivos },
    eventosDoBrasil: [],
  } satisfies Partial<ArquivoDeRodada>,
});
const lugar = (id: string, totalizacao: string, narracao: EventoDaNarracao[]): JsonPublico => ({
  caminho: `lugares/${id}.json`,
  conteudo: { lugar: id, tse: { totalizacao }, narracao } satisfies Partial<Omit<ArquivoDoLugar, "tse">> & { tse: object },
});
const brasil = (totalizacao: string, narracao: EventoDaNarracao[]) => lugar("BR", totalizacao, narracao);

const MARCO: EventoDaNarracao = {
  lugar: "BR",
  tipo: "marco",
  quando: "2022-10-30 18:26:53",
  texto: "Passa de 50% das seções totalizadas no Brasil: 50,34%. Flávio 50,43%, Lula 49,57%.",
  marco: 50,
  numero: 5,
};
const COM_LINHA: EventoDaNarracao = { ...MARCO, linhaDaProjecao: { soApuracao: "Projeção do Apurador: Flávio 49,1% ± 0,6, Lula 50,9% ± 0,6." } };
const CHANCE = (quando: string): EventoDaNarracao => ({
  lugar: "BR",
  tipo: "chance",
  base: "soApuracao",
  quando,
  texto: "Projeção do Apurador: chance de vitória de Lula passa de 90%.",
});

describe("conferirPreditivos", () => {
  it("não acusa nada sem preditivos com a chave desligada, nem com eles depois de ela ligar", () => {
    expect(
      conferirPreditivos([
        rodada(false, "2022-10-30 18:26:53"),
        brasil("2022-10-30 18:26:53", [MARCO]),
        rodada(true, "2022-10-30 18:30:00"),
        brasil("2022-10-30 18:30:00", [CHANCE("2022-10-30 18:30:00"), MARCO]),
      ]),
    ).toEqual([]);
  });

  it("acusa com a chave desligada o evento preditivo, a linha da projeção do marco e qualquer texto com a projeção do Apurador", () => {
    const divergencias = conferirPreditivos([
      rodada(false, "2022-10-30 18:30:00"),
      brasil("2022-10-30 18:30:00", [
        CHANCE("2022-10-30 18:30:00"),
        COM_LINHA,
        { ...MARCO, texto: `${MARCO.texto} Projeção do Apurador: Flávio 49,1% ± 0,6.` },
      ]),
    ]);

    expect(divergencias).toHaveLength(3);
    expect(divergencias.every((d) => d.startsWith("lugares/BR.json") && d.includes("chave desligada"))).toBe(true);
  });

  it("acusa o que ficou no destino depois de a chave desligar: um JSON com preditivos que não foi regravado", () => {
    const divergencias = conferirPreditivos([
      rodada(true, "2022-10-30 18:30:00"),
      brasil("2022-10-30 18:30:00", [CHANCE("2022-10-30 18:30:00")]),
      rodada(false, "2022-10-30 18:31:00"),
      rodada(false, "2022-10-30 18:32:00"),
    ]);

    expect(divergencias).toEqual([
      "lugares/BR.json: com a chave desligada na rodada de 2022-10-30 18:31:00, ainda no ar: Projeção do Apurador: chance de vitória de Lula passa de 90%.",
    ]);
  });

  it("ligada no meio, acusa o preditivo de antes dela e o marco já publicado que ganha a linha da projeção", () => {
    const divergencias = conferirPreditivos([
      rodada(false, "2022-10-30 18:26:53"),
      brasil("2022-10-30 18:26:53", [MARCO]),
      rodada(true, "2022-10-30 18:30:00"),
      brasil("2022-10-30 18:30:00", [CHANCE("2022-10-30 18:20:00"), COM_LINHA]),
    ]);

    expect(divergencias).toHaveLength(2);
    expect(divergencias.every((d) => d.includes("antes de a chave ligar"))).toBe(true);
  });

  it("não acusa o preditivo da rodada da ligação com a hora do arquivo novo do lugar, mesmo mais velha que a de outro lugar", () => {
    // O coletor dá a um preditivo a hora do arquivo novo do lugar na rodada, que pode ser mais velha que a de outro.
    const emSaoPaulo = { ...CHANCE("2022-10-30 18:26:10"), lugar: "SP" };
    expect(
      conferirPreditivos([
        rodada(false, "2022-10-30 18:26:53"),
        lugar("SP", "2022-10-30 18:25:00", []),
        brasil("2022-10-30 18:26:53", []),
        rodada(true, "2022-10-30 18:26:53"),
        lugar("SP", "2022-10-30 18:26:10", [emSaoPaulo]),
      ]),
    ).toEqual([]);
  });
});
