import type { ArquivoDeRodada, ArquivoDoMapa, ChavesDaNoite } from "@apurador/coletor";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { TabelaDosLugares } from "../src/components/TabelaDosLugares";
import type { IdDaBase } from "../src/lib/bases-da-projecao";
import { antesDaPrimeiraLeitura, type QuadroAoVivo, type TabelaDeProjecoesLida } from "../src/lib/leitor-ao-vivo";
import { tabelaDosLugares, type ArquivoDaTabelaDeLugares, type OrdemDaTabela } from "../src/lib/tabela-dos-lugares";
import { elemento, elementos, texto } from "./html";

// A tabela de lugares do cartão do mapa (Telas da página de lugar, decisão 8; ticket 18): no Brasil, os estados; na UF, os
// municípios; no Exterior, as cidades. Antes das 17h, o placar entre finalistas do 1º turno de 2026, do build; na noite,
// o % de seções e o placar do TSE, com duas casas, do mapa.json, e a projeção da base escolhida, com uma casa, da tabela
// de projeções da UF ou, no Brasil, do mapa.json.

const CANDIDATOS: ArquivoDeRodada["candidatos"] = [
  { numero: 22, nome: "FLAVIO BOLSONARO", partido: "PL", sequencial: "280002551544" },
  { numero: 13, nome: "LULA", partido: "PT", sequencial: "280002542548" },
];
const LIGADAS: ChavesDaNoite = { nucleoMinimo: true, projecao: true, baseComPesquisas: true, simulador: true, mapa: true, textosPreditivos: false };

/** Três municípios de Minas Gerais, nas posições deles no mapa.json; Águas Vermelhas não tem voto no 1º turno nem seção. */
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
  ],
};
/** Abadia terminou com Flávio 60,12%; Uberlândia tem 55,50% das seções, com Lula 51,69% (o 2º % no arquivo, que não fecha 100). */
const MAPA: ArquivoDoMapa = { assinatura: "0badcafe", tse: [[100, 60.12], null, [55.5, 48.31, 51.69], null, [0, 0, 0]] };
const colunas = (projecao: number[]) => ({
  projecao,
  margem: [0, 2.1],
  chance: [100, 9],
  chanceDeVirada: [null, null],
  sinalDeVirada: [null, null],
  virada: projecao.map((): [null, null, null] => [null, null, null]),
});
/** A tabela de projeções de Minas Gerais como o leitor a junta, com dois dos três municípios. */
const TABELA: TabelaDeProjecoesLida = {
  uf: "MG",
  assinatura: "cafe0001",
  municipios: ["41000", "41238"],
  comparacoes: { primeiroTurno: [62.3, 48.1], pesquisas: [62.3, 48.1] },
  projecao: {
    assinatura: "cafe0001",
    validos: [4000, 380000],
    soApuracao: colunas([60.1, 48.4]),
    comPesquisas: colunas([60.1, 48.0]),
    coincidem: [true, false],
  },
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

const NOME: OrdemDaTabela = { coluna: "nome", decrescente: false };
const desenhar = (quadro: QuadroAoVivo, outras: { arquivo?: ArquivoDaTabelaDeLugares; base?: IdDaBase; ordem?: OrdemDaTabela; atual?: string } = {}) => {
  const tabela = tabelaDosLugares({ arquivo: outras.arquivo ?? DE_MINAS, quadro, base: outras.base ?? "com-pesquisas" });
  return render(<TabelaDosLugares tabela={tabela} ordem={outras.ordem ?? NOME} aoOrdenar={() => {}} atual={outras.atual} />);
};
const cabecalho = (html: string) => elementos(elemento(html, /<thead/), /<th[ >]/).map(texto);
const linhas = (html: string) => elementos(elemento(html, /<tbody/), /<tr/).map((tr) => elementos(tr, /<t[dh][ >]/).map(texto));
const notas = (html: string) => elementos(html, /<p class="fonte"/).map(texto);

describe("tabela de lugares antes das 17h", () => {
  it("traz o placar entre finalistas do 1º turno de 2026 de cada lugar, com uma casa, a partir do build", () => {
    const html = desenhar(antesDaPrimeiraLeitura(LIGADAS));
    expect(cabecalho(html)).toEqual(["Município", "1º turno de 2026"]);
    expect(linhas(html)).toEqual([
      ["Abadia dos Dourados", "Flávio 62,3%"],
      ["Águas Vermelhas", "—"],
      ["Uberlândia", "Lula 51,9%"],
    ]);
    expect(notas(html)).toEqual(["Placar entre finalistas no 1º turno de 2026: Cálculo do Apurador com dados do TSE"]);
    expect(html).toContain('<a href="/mg/uberlandia/">Uberlândia</a>');
  });

  it("no plano zero, ou com um mapa.json de outra lista de lugares, fica como antes das 17h: nenhum número da noite aparece", () => {
    expect(cabecalho(desenhar(aoVivo({ chaves: { ...LIGADAS, nucleoMinimo: false } })))).toEqual(["Município", "1º turno de 2026"]);
    expect(cabecalho(desenhar(aoVivo({ mapa: { ...MAPA, assinatura: "12345678" } })))).toEqual(["Município", "1º turno de 2026"]);
    expect(cabecalho(desenhar(aoVivo({ mapa: null })))).toEqual(["Município", "1º turno de 2026"]);
  });
});

describe("tabela de lugares na noite", () => {
  it("traz o % de seções e o placar do TSE com duas casas e a projeção da base escolhida com uma casa, com as atribuições", () => {
    const html = desenhar(aoVivo());
    expect(cabecalho(html)).toEqual(["Município", "Seções", "Placar", "Projeção"]);
    expect(linhas(html)).toEqual([
      ["Abadia dos Dourados", "100,00%", "Flávio 60,12%", "Flávio 60,1%"],
      ["Águas Vermelhas", "0,00%", "—", "—"],
      ["Uberlândia", "55,50%", "Lula 51,69%", "Lula 52,0%"],
    ]);
    expect(notas(html)).toEqual(["Seções e placar: TSE, sem alteração (CC-BY)", "Projeção: Cálculo do Apurador com dados do TSE"]);
    // Na "Só apuração", a projeção dela.
    expect(linhas(desenhar(aoVivo(), { base: "so-apuracao" }))[2]).toEqual(["Uberlândia", "55,50%", "Lula 51,69%", "Lula 51,6%"]);
  });

  it("o 2º % é o do mapa.json quando ele vem; sem ele, o que falta para 100,00", () => {
    const html = desenhar(aoVivo({ mapa: { ...MAPA, tse: [[100, 49.99], null, [55.5, 48.31, 51.69], null, [0, 0, 0]] } }));
    expect(linhas(html)[0]).toEqual(["Abadia dos Dourados", "100,00%", "Lula 50,01%", "Flávio 60,1%"]);
  });

  it("no Brasil, a projeção de cada estado vem do mapa.json, e o Exterior entra como uma linha", () => {
    const doBrasil: ArquivoDaTabelaDeLugares = {
      ...DE_MINAS,
      lugar: "BR",
      linhas: [
        { id: "MG", nome: "Minas Gerais", caminho: "/mg/", indice: 0, primeiroTurno: 52.4 },
        { id: "ZZ", nome: "Exterior", caminho: "/exterior/", indice: 2, primeiroTurno: 41.3 },
      ],
    };
    const mapa: ArquivoDoMapa = {
      ...MAPA,
      projecao: { soApuracao: { MG: 49.6, ZZ: 40.2 }, comPesquisas: { MG: 49.8, ZZ: 40.2 }, primeiroTurno: { MG: 48.1, ZZ: 40 } },
    };
    const html = desenhar(aoVivo({ mapa, tabelaDeProjecoes: null }), { arquivo: doBrasil });
    expect(cabecalho(html)).toEqual(["Estado", "Seções", "Placar", "Projeção"]);
    expect(linhas(html)).toEqual([
      ["Exterior", "55,50%", "Lula 51,69%", "Lula 59,8%"],
      ["Minas Gerais", "100,00%", "Flávio 60,12%", "Lula 50,2%"],
    ]);
  });

  it("sem a projeção no ar, a coluna sai, e a atribuição da camada analítica fica: chave desligada, tabela sem projeção, de outra UF, ou a totalização final", () => {
    const semProjecao: TabelaDeProjecoesLida = { uf: "MG", assinatura: TABELA.assinatura, municipios: TABELA.municipios, comparacoes: TABELA.comparacoes };
    for (const parte of [
      { chaves: { ...LIGADAS, projecao: false, simulador: false } },
      { tabelaDeProjecoes: semProjecao },
      { tabelaDeProjecoes: { ...TABELA, uf: "SP" } },
      { fase: "encerrada" as const, indicador: { estado: "encerrada" as const } },
    ]) {
      const html = desenhar(aoVivo(parte));
      expect(cabecalho(html)).toEqual(["Município", "Seções", "Placar"]);
      expect(notas(html)).toEqual(["Seções e placar: TSE, sem alteração (CC-BY)", "Cálculo do Apurador com dados do TSE"]);
    }
    // Desligada a base com pesquisas, a coluna mostra a "Só apuração", qualquer que seja a escolhida.
    const semPesquisas = desenhar(aoVivo({ chaves: { ...LIGADAS, baseComPesquisas: false } }));
    expect(linhas(semPesquisas)[2]).toEqual(["Uberlândia", "55,50%", "Lula 51,69%", "Lula 51,6%"]);
  });

  it("destaca o próprio lugar na página de um município", () => {
    const html = desenhar(aoVivo(), { atual: "41238" });
    expect(elementos(html, /<tr[^>]*aria-current="page"/).map((tr) => texto(tr))).toEqual(["Uberlândia 55,50% Lula 51,69% Lula 52,0%"]);
  });
});

describe("ordenar a tabela de lugares", () => {
  const nomes = (html: string) => linhas(html).map((l) => l[0]);
  const por = (coluna: OrdemDaTabela["coluna"], decrescente: boolean) => nomes(desenhar(aoVivo(), { ordem: { coluna, decrescente } }));

  it("por qualquer coluna, nos dois sentidos, com os lugares sem número por último", () => {
    expect(por("nome", false)).toEqual(["Abadia dos Dourados", "Águas Vermelhas", "Uberlândia"]);
    expect(por("nome", true)).toEqual(["Uberlândia", "Águas Vermelhas", "Abadia dos Dourados"]);
    expect(por("secoes", true)).toEqual(["Abadia dos Dourados", "Uberlândia", "Águas Vermelhas"]);
    expect(por("secoes", false)).toEqual(["Águas Vermelhas", "Uberlândia", "Abadia dos Dourados"]);
    // O placar e a projeção ordenam pelo % do 1º candidato, a ordem fixa do site.
    expect(por("placar", true)).toEqual(["Abadia dos Dourados", "Uberlândia", "Águas Vermelhas"]);
    expect(por("placar", false)).toEqual(["Uberlândia", "Abadia dos Dourados", "Águas Vermelhas"]);
    expect(por("projecao", false)).toEqual(["Uberlândia", "Abadia dos Dourados", "Águas Vermelhas"]);
    const antes = (decrescente: boolean) => nomes(desenhar(antesDaPrimeiraLeitura(LIGADAS), { ordem: { coluna: "primeiroTurno", decrescente } }));
    expect(antes(true)).toEqual(["Abadia dos Dourados", "Uberlândia", "Águas Vermelhas"]);
  });

  it("cada cabeçalho é um botão, e o da coluna ordenada diz o sentido", () => {
    const html = desenhar(aoVivo(), { ordem: { coluna: "secoes", decrescente: true } });
    expect(elementos(html, /<th[^>]*aria-sort/).map((th) => /aria-sort="([a-z]+)"/.exec(th)![1])).toEqual(["none", "descending", "none", "none"]);
    expect(elementos(elemento(html, /<thead/), /<th[ >]/).every((th) => th.includes("<button"))).toBe(true);
  });

  it("uma coluna que saiu não ordena: a tabela volta à ordem dos nomes", () => {
    expect(nomes(desenhar(antesDaPrimeiraLeitura(LIGADAS), { ordem: { coluna: "projecao", decrescente: true } }))).toEqual([
      "Abadia dos Dourados",
      "Águas Vermelhas",
      "Uberlândia",
    ]);
  });
});
