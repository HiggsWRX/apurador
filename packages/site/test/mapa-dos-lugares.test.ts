import type { ArquivoDeRodada, ArquivoDoMapa, ChavesDaNoite } from "@apurador/coletor";
import { describe, expect, it } from "vitest";
import { antesDaPrimeiraLeitura, type QuadroAoVivo, type TabelaDeProjecoesLida } from "../src/lib/leitor-ao-vivo";
import { mapaDosLugares, type ModoDoMapa } from "../src/lib/mapa-dos-lugares";
import { TODOS_OS_MUNICIPIOS, type ArquivoDaTabelaDeLugares } from "../src/lib/tabela-dos-lugares";

// O que o mapa do cartão pinta num quadro (Telas da página de lugar, decisão 8; ticket 26): a cor de quem lidera, mais
// forte com vantagem maior e mais transparente com menos seções, e cinza sem seções. Antes das 17h, o 1º turno de 2026
// pelo placar entre finalistas. No modo "Mudança desde o 1º turno", quem ganhou terreno desde o 1º turno com que a
// caixa da projeção compara (o do coletor, que no ensaio é o de 2022): pela projeção enquanto a noite corre e pelo
// resultado depois do fim. Os números são os da tabela de lugares, do mesmo quadro.

const CANDIDATOS: ArquivoDeRodada["candidatos"] = [
  { numero: 22, nome: "FLAVIO BOLSONARO", partido: "PL", sequencial: "280002551544" },
  { numero: 13, nome: "LULA", partido: "PT", sequencial: "280002542548" },
];
const LIGADAS: ChavesDaNoite = { nucleoMinimo: true, projecao: true, baseComPesquisas: true, simulador: true, mapa: true, textosPreditivos: false };

/** Quatro municípios de Minas Gerais: Águas Vermelhas não tem voto no 1º turno nem seção, e Empatópolis empata. */
const DE_MINAS: ArquivoDaTabelaDeLugares = {
  lugar: "MG",
  assinatura: "0badcafe",
  candidatos: [
    { nome: "FLAVIO BOLSONARO", partido: "PL" },
    { nome: "LULA", partido: "PT" },
  ],
  linhas: [
    { id: "41000", nome: "Abadia dos Dourados", caminho: "/mg/abadia-dos-dourados/", indice: 0, primeiroTurno: 62.3 },
    { id: "41238", nome: "Uberlândia", caminho: "/mg/uberlandia/", indice: 2, primeiroTurno: 48.1 },
    { id: "41999", nome: "Águas Vermelhas", caminho: "/mg/aguas-vermelhas/", indice: 4, primeiroTurno: null },
    { id: "41500", nome: "Empatópolis", caminho: "/mg/empatopolis/", indice: 5, primeiroTurno: 50 },
  ],
};
/** Abadia terminou com Flávio 60,12%; Uberlândia tem 55,50% das seções, com Lula 51,69%; Empatópolis, 50,00% a 50,00%. */
const MAPA: ArquivoDoMapa = { assinatura: "0badcafe", tse: [[100, 60.12], null, [55.5, 48.31, 51.69], null, [0, 0, 0], [20, 50]] };
const colunas = (projecao: number[]) => ({
  projecao,
  margem: projecao.map(() => 2.1),
  chance: projecao.map(() => 50),
  chanceDeVirada: projecao.map(() => null),
  sinalDeVirada: projecao.map(() => null),
  virada: projecao.map((): [null, null, null] => [null, null, null]),
});
/**
 * A tabela de projeções de Minas na "Só apuração": Abadia, que terminou, 60,1; Uberlândia, 48,4; Empatópolis, 50,0. O 1º
 * turno com que a caixa compara é o do coletor: o de Uberlândia (47,6) não é o da tabela de lugares (48,1), como no
 * ensaio, em que o coletor roda sobre a base de 2022.
 */
const TABELA: TabelaDeProjecoesLida = {
  uf: "MG",
  assinatura: "cafe0001",
  municipios: ["41000", "41238", "41500"],
  comparacoes: { primeiroTurno: [62.3, 47.6, 50], pesquisas: [62.3, 48.1, 50] },
  projecao: { assinatura: "cafe0001", validos: [4000, 380000, 900], soApuracao: colunas([60.1, 48.4, 50]) },
};

const aoVivo = (parte: Partial<QuadroAoVivo> = {}): QuadroAoVivo => ({
  ...antesDaPrimeiraLeitura(LIGADAS),
  fase: "ao-vivo",
  indicador: { estado: "ao-vivo" },
  rodada: {
    rodada: "2026-10-25T22:42:15.000Z",
    fase: "ao-vivo",
    novidade: { totalizacao: "2022-10-30 19:42:10", vista: "2026-10-25T22:42:12.000Z" },
    candidatos: CANDIDATOS,
    chaves: LIGADAS,
    aviso: null,
    pesoDasPesquisas: 0,
    eventosDoBrasil: [],
  },
  mapa: MAPA,
  tabelaDeProjecoes: TABELA,
  ...parte,
});

const pintar = (quadro: QuadroAoVivo, modo: ModoDoMapa = "placar", arquivo = DE_MINAS) => {
  const conteudo = mapaDosLugares({ arquivo, quadro, base: "so-apuracao", modo });
  return { ...conteudo, de: (id: string) => conteudo.lugares.find((l) => l.id === id)! };
};

describe("mapa dos lugares antes das 17h", () => {
  const mapa = pintar(antesDaPrimeiraLeitura(LIGADAS));

  it("pinta cada lugar com a cor de quem liderou o 1º turno entre os finalistas, sem transparência", () => {
    expect(mapa.mostra).toBe("primeiroTurno");
    expect(mapa.de("41000").pintura).toMatchObject({ cor: "flavio", opacidade: 1 });
    expect(mapa.de("41238").pintura).toMatchObject({ cor: "lula", opacidade: 1 });
  });

  it("deixa em cinza o lugar sem voto e não oferece o modo de mudança", () => {
    expect(mapa.de("41999").pintura.cor).toBeNull();
    expect(mapa.de("41500").pintura.cor).toBe("empate");
    expect(mapa.modos).toEqual([]);
  });

  it("pinta mais forte a vantagem maior", () => {
    // Abadia: 62,3 a 37,7; Uberlândia: 51,9 a 48,1.
    expect(mapa.de("41000").pintura.forca).toBeGreaterThan(mapa.de("41238").pintura.forca);
  });
});

describe("mapa dos lugares na noite, pelo placar", () => {
  const mapa = pintar(aoVivo());

  it("pinta com a cor de quem lidera o placar do TSE e oferece o modo de mudança com a projeção no ar", () => {
    expect(mapa.mostra).toBe("placar");
    expect(mapa.modos).toEqual(["placar", "mudanca"]);
    expect(mapa.de("41000").pintura.cor).toBe("flavio");
    expect(mapa.de("41238").pintura.cor).toBe("lula");
    expect(mapa.de("41500").pintura.cor).toBe("empate");
  });

  it("pinta mais transparente o lugar com menos seções, e em cinza o que não tem nenhuma", () => {
    expect(mapa.de("41000").pintura.opacidade).toBe(1);
    expect(mapa.de("41238").pintura.opacidade).toBeLessThan(1);
    expect(mapa.de("41238").pintura.opacidade).toBeGreaterThan(mapa.de("41500").pintura.opacidade);
    expect(mapa.de("41999").pintura.cor).toBeNull();
  });

  it("traz os números da tabela, como o TSE os publica", () => {
    expect(mapa.de("41238")).toMatchObject({ nome: "Uberlândia", caminho: "/mg/uberlandia/", secoes: 55.5, placar: [48.31, 51.69], projecao: 48.4 });
  });

  it("não oferece o modo de mudança sem a projeção no ar, enquanto os lugares apuram", () => {
    const semProjecao = pintar(aoVivo({ chaves: { ...LIGADAS, projecao: false } }), "mudanca");
    expect(semProjecao.modos).toEqual([]);
    expect(semProjecao.mostra).toBe("placar");
  });
});

describe('mapa dos lugares no modo "Mudança desde o 1º turno"', () => {
  const mapa = pintar(aoVivo(), "mudanca");

  it("compara a projeção com o 1º turno com que a caixa compara, na cor de quem ganhou terreno", () => {
    expect(mapa.mostra).toBe("mudanca");
    // Uberlândia: Lula lidera o placar, mas a projeção de Flávio (48,4) passa a do 1º turno do coletor (47,6).
    expect(mapa.de("41238")).toMatchObject({ mudanca: "FLAVIO BOLSONARO +0,8", pintura: { cor: "flavio" } });
  });

  it("compara a projeção também num lugar que terminou, em que ela já é o resultado, como na caixa", () => {
    // Abadia: 60,1 contra 62,3.
    expect(mapa.de("41000")).toMatchObject({ mudanca: "LULA +2,2", pintura: { cor: "lula", opacidade: 1 } });
    expect(mapa.de("41000").pintura.forca).toBeGreaterThan(mapa.de("41238").pintura.forca);
  });

  it("deixa em cinza o lugar sem seções e neutro o que não mudou", () => {
    expect(mapa.de("41999")).toMatchObject({ mudanca: null, pintura: { cor: null } });
    expect(mapa.de("41500")).toMatchObject({ mudanca: "sem mudança", pintura: { cor: "empate" } });
  });

  it("depois do fim da noite, compara o resultado de cada lugar, sem a projeção", () => {
    const tse: ArquivoDoMapa["tse"] = [[100, 60.12], null, [100, 47.9], null, [0, 0, 0], [100, 50]];
    const encerrada = pintar(aoVivo({ fase: "encerrada", mapa: { ...MAPA, tse } }), "mudanca");
    expect(encerrada.modos).toEqual(["placar", "mudanca"]);
    // Uberlândia: 47,9 contra 47,6.
    expect(encerrada.de("41238")).toMatchObject({ mudanca: "FLAVIO BOLSONARO +0,3", pintura: { cor: "flavio" } });
  });

  it("no Brasil por estados, compara com o 1º turno de cada UF que o mapa.json traz", () => {
    const doBrasil: ArquivoDaTabelaDeLugares = {
      ...DE_MINAS,
      lugar: "BR",
      linhas: [{ id: "MG", nome: "Minas Gerais", caminho: "/mg/", indice: 1, primeiroTurno: 52.7 }],
    };
    const mapaJson: ArquivoDoMapa = { ...MAPA, tse: [null, [40, 49.2]], projecao: { soApuracao: { MG: 49.6 }, primeiroTurno: { MG: 50.5 } } };
    const brasil = pintar(aoVivo({ mapa: mapaJson }), "mudanca", doBrasil);
    expect(brasil.modos).toEqual(["placar", "mudanca"]);
    expect(brasil.de("MG")).toMatchObject({ mudanca: "LULA +0,9", pintura: { cor: "lula" } });
    // Um coletor de antes deste ticket, ainda no ar com o site novo, grava o mapa.json sem o 1º turno: o mapa segue no placar.
    const deAntes: ArquivoDoMapa = { ...mapaJson, projecao: { soApuracao: { MG: 49.6 } } };
    expect(pintar(aoVivo({ mapa: deAntes }), "mudanca", doBrasil)).toMatchObject({ modos: [], mostra: "placar" });
  });

  it("não é oferecido no Brasil por municípios, que não baixa as tabelas de projeções, nem depois do fim", () => {
    const todos: ArquivoDaTabelaDeLugares = { ...DE_MINAS, lugar: TODOS_OS_MUNICIPIOS };
    expect(pintar(aoVivo(), "mudanca", todos)).toMatchObject({ modos: [], mostra: "placar" });
    expect(pintar(aoVivo({ fase: "encerrada" }), "mudanca", todos)).toMatchObject({ modos: [], mostra: "placar" });
  });
});
