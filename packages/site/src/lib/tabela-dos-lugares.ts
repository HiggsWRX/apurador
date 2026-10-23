import type { ArquivoDoMapa } from "@apurador/coletor";
import { lugarNoMapa } from "@apurador/coletor/arquivos";
import type { IdDaBase } from "./bases-da-projecao";
import { emPlanoZero } from "./chaves-ao-vivo";
import type { QuadroAoVivo } from "./leitor-ao-vivo";

// A tabela de lugares do cartão do mapa (Telas da página de lugar, decisão 8; ticket 18): os lugares logo abaixo da
// página (os estados e o Exterior no Brasil, os municípios numa UF, as cidades no Exterior; num município, os da UF
// dele), ordenável por qualquer coluna. Os nomes, os caminhos e o placar entre finalistas do 1º turno de 2026 vêm do
// build (`/tabela-de-lugares/<id>.json`), e é só isso que ela mostra antes das 17h. Na noite, o % de seções e o placar
// vêm do mapa.json, com as duas casas do TSE, e a projeção da base escolhida, com uma casa, da tabela de projeções da UF
// ou, no Brasil, do mapa.json. O mapa.json segue a ordem dos lugares do site sem os ids: a página só o lê com a
// assinatura dela.

/** Um lugar da tabela, como o build o escreve. */
export interface LinhaDoBuild {
  id: string;
  nome: string;
  caminho: string;
  /** A posição do lugar no `tse` do mapa.json: a dele nos lugares do site, sem o Brasil. */
  indice: number;
  /** O placar entre finalistas do partido de Bolsonaro no 1º turno de 2026, com uma casa, ou `null` sem votos. */
  primeiroTurno: number | null;
}

/** A tabela de lugares de um lugar, como o build a escreve (`/tabela-de-lugares/<id>.json`): só o Brasil, as UFs e o Exterior têm. */
export interface ArquivoDaTabelaDeLugares {
  /**
   * O lugar cujos lugares abaixo a tabela traz: `BR`, uma UF ou `ZZ`; ou `TODOS_OS_MUNICIPIOS`, a junção das tabelas das
   * UFs que o mapa do Brasil por municípios monta, sem tabela de projeções.
   */
  lugar: string;
  /** A assinatura dos lugares do site com que o build foi feito: o mapa.json tem de ter a mesma. */
  assinatura: string;
  /** Os finalistas do 1º turno de 2026, o do partido de Bolsonaro primeiro, como o placar entre finalistas. */
  candidatos: { nome: string; partido: string }[];
  linhas: LinhaDoBuild[];
}

/** O `lugar` da junção das tabelas das 27 UFs, com todos os municípios do Brasil: o build não tem uma tabela assim. */
export const TODOS_OS_MUNICIPIOS = "municipios";

/** O caminho da tabela de lugares do lugar no site. */
export const caminhoDaTabelaDeLugares = (lugar: string) => `/tabela-de-lugares/${lugar}.json`;

/** As colunas da tabela: o lugar, o 1º turno (antes das 17h) e, na noite, o % de seções, o placar e a projeção. */
export type ColunaDaTabela = "nome" | "primeiroTurno" | "secoes" | "placar" | "projecao";

/** Por qual coluna a tabela está ordenada, e em que sentido. */
export interface OrdemDaTabela {
  coluna: ColunaDaTabela;
  decrescente: boolean;
}

/** A tabela abre na ordem dos nomes. */
export const ORDEM_INICIAL: OrdemDaTabela = { coluna: "nome", decrescente: false };

/** Um lugar da tabela com os números que ela mostra; `null` onde não há número. */
export interface LinhaDaTabela {
  id: string;
  nome: string;
  caminho: string;
  primeiroTurno: number | null;
  /** O % de seções totalizadas, como o TSE o publica. */
  secoes: number | null;
  /** O % de cada candidato, como o TSE os publica, na ordem do arquivo de rodada, ou `null` sem votos válidos. */
  placar: [number, number] | null;
  /** O % do 1º candidato na projeção da base, com uma casa. */
  projecao: number | null;
}

/** O que a tabela mostra num quadro. */
export interface ConteudoDaTabela {
  /** O que são os lugares, para o cabeçalho da 1ª coluna. */
  deQue: "Estado" | "Município" | "Cidade";
  colunas: ColunaDaTabela[];
  /** Os candidatos dos números: os do arquivo de rodada na noite; antes, os finalistas do 1º turno. */
  candidatos: { nome: string; partido: string }[];
  linhas: LinhaDaTabela[];
}

/**
 * A tabela de lugares para o quadro, na base escolhida. Antes das 17h, no plano zero e enquanto não houver um mapa.json
 * da mesma lista de lugares, só o 1º turno; a projeção, só na fase ao vivo, com a chave dela e a do lugar no ar.
 */
export function tabelaDosLugares({ arquivo, quadro, base }: { arquivo: ArquivoDaTabelaDeLugares; quadro: QuadroAoVivo; base: IdDaBase }): ConteudoDaTabela {
  const deQue = arquivo.lugar === "BR" ? "Estado" : arquivo.lugar === "ZZ" ? "Cidade" : "Município";
  const mapa = quadro.mapa?.assinatura === arquivo.assinatura ? quadro.mapa : null;
  const doLugar = (l: LinhaDoBuild): LinhaDaTabela => ({ ...l, secoes: null, placar: null, projecao: null });
  if (quadro.fase === "antes-das-17h" || emPlanoZero(quadro) || !mapa || !quadro.rodada) {
    return { deQue, colunas: ["nome", "primeiroTurno"], candidatos: arquivo.candidatos, linhas: arquivo.linhas.map(doLugar) };
  }
  const projecoes = projecaoDosLugares(arquivo, quadro, mapa, base);
  return {
    deQue,
    colunas: ["nome", "secoes", "placar", ...(projecoes ? (["projecao"] as const) : [])],
    candidatos: quadro.rodada.candidatos,
    linhas: arquivo.linhas.map((l) => {
      const doMapa = lugarNoMapa(mapa.tse[l.indice] ?? null);
      if (!doMapa) return doLugar(l);
      const { secoes, placar } = doMapa;
      return { ...doLugar(l), secoes, placar: placar[0] + placar[1] > 0 ? placar : null, projecao: projecoes?.get(l.id) ?? null };
    }),
  };
}

/**
 * A projeção de cada lugar da tabela na base escolhida (a "Só apuração" se a com pesquisas não estiver no ar), em % do 1º
 * candidato, ou `null` sem ela: no Brasil, a das UFs no mapa.json; numa UF, a da tabela de projeções dela.
 */
function projecaoDosLugares(arquivo: ArquivoDaTabelaDeLugares, quadro: QuadroAoVivo, mapa: ArquivoDoMapa, base: IdDaBase): Map<string, number> | null {
  if (quadro.fase !== "ao-vivo" || !quadro.chaves.projecao) return null;
  const comPesquisas = quadro.chaves.baseComPesquisas && base === "com-pesquisas";
  if (arquivo.lugar === "BR") {
    if (!mapa.projecao) return null;
    return new Map(Object.entries((comPesquisas && mapa.projecao.comPesquisas) || mapa.projecao.soApuracao));
  }
  const tabela = quadro.tabelaDeProjecoes?.uf === arquivo.lugar ? quadro.tabelaDeProjecoes : null;
  if (!tabela?.projecao) return null;
  const colunas = (comPesquisas && tabela.projecao.comPesquisas) || tabela.projecao.soApuracao;
  return new Map(tabela.municipios.map((id, i) => [id, colunas.projecao[i]!]));
}

/** O valor de uma linha pelo qual a coluna ordena: o placar e a projeção, pelo % do 1º candidato, a ordem fixa do site. */
const valor = (l: LinhaDaTabela, coluna: Exclude<ColunaDaTabela, "nome">) => (coluna === "placar" ? (l.placar?.[0] ?? null) : l[coluna]);

/** As linhas na ordem pedida, com os lugares sem número por último. Uma coluna que a tabela não tem ordena pelos nomes. */
export function ordenarLinhas(tabela: ConteudoDaTabela, ordem: OrdemDaTabela): LinhaDaTabela[] {
  const { coluna, decrescente } = tabela.colunas.includes(ordem.coluna) ? ordem : ORDEM_INICIAL;
  const sentido = decrescente ? -1 : 1;
  return [...tabela.linhas].sort((a, b) => {
    if (coluna === "nome") return sentido * a.nome.localeCompare(b.nome, "pt-BR");
    const [x, y] = [valor(a, coluna), valor(b, coluna)];
    if (x === null || y === null) return x === y ? a.nome.localeCompare(b.nome, "pt-BR") : x === null ? 1 : -1;
    return sentido * (x - y) || a.nome.localeCompare(b.nome, "pt-BR");
  });
}

/** A ordem depois de tocar no cabeçalho de uma coluna: a mesma coluna inverte; outra abre nos nomes de A a Z e nos números do maior ao menor. */
export function proximaOrdem(atual: OrdemDaTabela, coluna: ColunaDaTabela): OrdemDaTabela {
  if (atual.coluna === coluna) return { coluna, decrescente: !atual.decrescente };
  return { coluna, decrescente: coluna !== "nome" };
}
