import { data, dataHora, inteiro } from "./csv.ts";
import { percorrerCsvTse } from "./csv-em-fluxo.ts";

// Leitores dos arquivos por seção do TSE: `detalhe_votacao_secao` (membro `*_BR.csv`, só Presidente), com a
// hora em que cada seção foi totalizada, e os votos de cada votável em cada seção, do boletim de urna (`bweb`,
// um zip por UF) ou da votação por seção (`votacao_secao`). São arquivos de centenas de MB, lidos em fluxo.

/**
 * O zip do boletim de urna de uma UF (ou `ZZ`) num turno e o CSV dentro dele. O `carimbo` é a data de geração
 * que o TSE põe no nome dos zips do turno (`311020221535` no 2º turno de 2022). Em 2022, o CSV tem o nome do
 * zip. Em 2018, o zip tem o nome em maiúsculas (`BWEB_2t_AL_301020181744.zip`), e o CSV, gerado minutos depois,
 * tem outro carimbo (`bweb_2t_AL_301020181745.csv`).
 */
export function boletimDeUrna(opcoes: { ano: number; turno: number; uf: string; carimbo: string }): { url: string; membro: (nome: string) => boolean } {
  const prefixo = `bweb_${opcoes.turno}t_${opcoes.uf}_`;
  const zip = `${opcoes.ano === 2018 ? prefixo.replace("bweb", "BWEB") : prefixo}${opcoes.carimbo}`;
  return {
    url: `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes${opcoes.ano}/buweb/${zip}.zip`,
    membro: (nome) => nome.startsWith(prefixo) && nome.endsWith(".csv"),
  };
}

/** Uma seção, com os totais do boletim e a hora em que o TSE a totalizou. */
export interface DetalheSecao {
  /** `DT_GERACAO HH_GERACAO`. */
  geracao: string;
  ano: number;
  turno: number;
  /** `DT_ELEICAO`, como `AAAA-MM-DD`. Algumas seções de 2018 têm a 1ª totalização na véspera. */
  dataDaEleicao: string;
  cargo: number;
  /** UF, ou `ZZ` para o Exterior. */
  uf: string;
  municipio: number;
  zona: number;
  secao: number;
  aptos: number;
  /** Eleitores que votaram (`QT_COMPARECIMENTO`). */
  votantes: number;
  nominais: number;
  brancos: number;
  nulos: number;
  /**
   * `DT_PRIM_TOT_PARCIAL_HOR_TSE`: a primeira totalização parcial do boletim, em hora de Brasília, como
   * `AAAA-MM-DD HH:MM:SS`. É o instante em que a seção entra no placar parcial. `null` se nunca foi totalizada.
   */
  primeiraTotalizacao: string | null;
  /** As seções não instaladas entram no total de seções, sem votantes. `null` quando o TSE não diz, como em 2018. */
  instalada: boolean | null;
}

const COLUNAS_DETALHE = [
  "DT_GERACAO",
  "HH_GERACAO",
  "ANO_ELEICAO",
  "NR_TURNO",
  "DT_ELEICAO",
  "CD_CARGO",
  "SG_UF",
  "CD_MUNICIPIO",
  "NR_ZONA",
  "NR_SECAO",
  "QT_APTOS",
  "QT_COMPARECIMENTO",
  "QT_VOTOS_NOMINAIS",
  "QT_VOTOS_BRANCOS",
  "QT_VOTOS_NULOS",
  "DT_PRIM_TOT_PARCIAL_HOR_TSE",
  "ST_SECAO_INSTALADA",
] as const;

/** Lê o `detalhe_votacao_secao` em fluxo: cada seção, com a hora da primeira totalização. */
export function* lerDetalheVotacaoSecao(bytes: Uint8Array): Generator<DetalheSecao> {
  for (const l of percorrerCsvTse(bytes, COLUNAS_DETALHE)) {
    yield {
      geracao: `${l.DT_GERACAO} ${l.HH_GERACAO}`,
      ano: inteiro(l.ANO_ELEICAO, "ANO_ELEICAO"),
      turno: inteiro(l.NR_TURNO, "NR_TURNO"),
      dataDaEleicao: data(l.DT_ELEICAO, "DT_ELEICAO"),
      cargo: inteiro(l.CD_CARGO, "CD_CARGO"),
      uf: l.SG_UF,
      municipio: inteiro(l.CD_MUNICIPIO, "CD_MUNICIPIO"),
      zona: inteiro(l.NR_ZONA, "NR_ZONA"),
      secao: inteiro(l.NR_SECAO, "NR_SECAO"),
      aptos: inteiro(l.QT_APTOS, "QT_APTOS"),
      votantes: inteiro(l.QT_COMPARECIMENTO, "QT_COMPARECIMENTO"),
      nominais: inteiro(l.QT_VOTOS_NOMINAIS, "QT_VOTOS_NOMINAIS"),
      brancos: inteiro(l.QT_VOTOS_BRANCOS, "QT_VOTOS_BRANCOS"),
      nulos: inteiro(l.QT_VOTOS_NULOS, "QT_VOTOS_NULOS"),
      primeiraTotalizacao: dataHora(l.DT_PRIM_TOT_PARCIAL_HOR_TSE, "DT_PRIM_TOT_PARCIAL_HOR_TSE"),
      instalada: l.ST_SECAO_INSTALADA === "#NULO#" ? null : simOuNao(l.ST_SECAO_INSTALADA, "ST_SECAO_INSTALADA"),
    };
  }
}

/** Os votos de um votável numa seção, do boletim de urna. */
export interface VotoSecao {
  geracao: string;
  ano: number;
  turno: number;
  cargo: number;
  uf: string;
  municipio: number;
  zona: number;
  secao: number;
  /**
   * Como o boletim classifica o votável. Um voto "nominal" num número que não é candidato válido do turno
   * (como o 28 no 1º turno de 2026) é nulo técnico, e quem soma os votos o conta como nulo. O voto "anulado e
   * apurado em separado" (o 97 da votação por seção) não é nulo: o TSE o conta só no comparecimento.
   */
  tipo: "nominal" | "branco" | "nulo" | "legenda" | "anulado";
  numero: number;
  votos: number;
}

const COLUNAS_BWEB = [
  "DT_GERACAO",
  "HH_GERACAO",
  "ANO_ELEICAO",
  "NR_TURNO",
  "CD_CARGO_PERGUNTA",
  "SG_UF",
  "CD_MUNICIPIO",
  "NR_ZONA",
  "NR_SECAO",
  "CD_TIPO_VOTAVEL",
  "NR_VOTAVEL",
  "QT_VOTOS",
] as const;

const TIPOS_DE_VOTAVEL: Record<string, VotoSecao["tipo"]> = { "1": "nominal", "2": "branco", "3": "nulo", "4": "legenda" };

/** Lê o boletim de urna (`bweb`) em fluxo: os votos de cada votável em cada seção. */
export function* lerBoletimDeUrna(bytes: Uint8Array): Generator<VotoSecao> {
  for (const l of percorrerCsvTse(bytes, COLUNAS_BWEB)) {
    // Em 2018, uma seção sem nenhum voto numa pergunta vem numa linha só, sem votável.
    if (l.CD_TIPO_VOTAVEL === "#NULO#" && l.QT_VOTOS === "0") continue;
    const tipo = TIPOS_DE_VOTAVEL[l.CD_TIPO_VOTAVEL];
    if (!tipo) throw new Error(`Tipo de votável desconhecido na coluna CD_TIPO_VOTAVEL: ${l.CD_TIPO_VOTAVEL}`);
    yield {
      geracao: `${l.DT_GERACAO} ${l.HH_GERACAO}`,
      ano: inteiro(l.ANO_ELEICAO, "ANO_ELEICAO"),
      turno: inteiro(l.NR_TURNO, "NR_TURNO"),
      cargo: inteiro(l.CD_CARGO_PERGUNTA, "CD_CARGO_PERGUNTA"),
      uf: l.SG_UF,
      municipio: inteiro(l.CD_MUNICIPIO, "CD_MUNICIPIO"),
      zona: inteiro(l.NR_ZONA, "NR_ZONA"),
      secao: inteiro(l.NR_SECAO, "NR_SECAO"),
      tipo,
      numero: inteiro(l.NR_VOTAVEL, "NR_VOTAVEL"),
      votos: inteiro(l.QT_VOTOS, "QT_VOTOS"),
    };
  }
}

/**
 * O zip da votação por seção de Presidente de um ano (`votacao_secao_<ano>_BR.zip`), com os votos de cada
 * votável em cada seção. Serve quando o boletim de urna é grande demais: o do 1º turno de 2026 tem 5 GB,
 * com todos os cargos, e este, 162 MB.
 */
export function votacaoSecao(ano: number): { url: string; membro: string } {
  const nome = `votacao_secao_${ano}_BR`;
  return { url: `https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/${nome}.zip`, membro: `${nome}.csv` };
}

const COLUNAS_VOTACAO_SECAO = [
  "DT_GERACAO",
  "HH_GERACAO",
  "ANO_ELEICAO",
  "NR_TURNO",
  "CD_CARGO",
  "SG_UF",
  "CD_MUNICIPIO",
  "NR_ZONA",
  "NR_SECAO",
  "NR_VOTAVEL",
  "QT_VOTOS",
] as const;

/** Os números que a `votacao_secao` dá aos votos que não são de candidato. */
const TIPOS_SEM_CANDIDATO: Record<number, VotoSecao["tipo"]> = { 95: "branco", 96: "nulo", 97: "anulado" };

/**
 * Os votos por seção da `votacao_secao`, que não diz o tipo do votável: o branco é o 95, o nulo, o 96, e o voto
 * anulado e apurado em separado, o 97 (em Presidente, só em duas seções de Salvador, no 1º turno de 2018).
 */
export function* lerVotacaoSecao(bytes: Uint8Array): Generator<VotoSecao> {
  for (const l of percorrerCsvTse(bytes, COLUNAS_VOTACAO_SECAO)) {
    const numero = inteiro(l.NR_VOTAVEL, "NR_VOTAVEL");
    yield {
      geracao: `${l.DT_GERACAO} ${l.HH_GERACAO}`,
      ano: inteiro(l.ANO_ELEICAO, "ANO_ELEICAO"),
      turno: inteiro(l.NR_TURNO, "NR_TURNO"),
      cargo: inteiro(l.CD_CARGO, "CD_CARGO"),
      uf: l.SG_UF,
      municipio: inteiro(l.CD_MUNICIPIO, "CD_MUNICIPIO"),
      zona: inteiro(l.NR_ZONA, "NR_ZONA"),
      secao: inteiro(l.NR_SECAO, "NR_SECAO"),
      tipo: TIPOS_SEM_CANDIDATO[numero] ?? "nominal",
      numero,
      votos: inteiro(l.QT_VOTOS, "QT_VOTOS"),
    };
  }
}

function simOuNao(valor: string, coluna: string): boolean {
  if (valor === "Sim" || valor === "S") return true;
  if (valor === "Não" || valor === "N") return false;
  throw new Error(`Valor inválido na coluna ${coluna}: ${valor}`);
}
