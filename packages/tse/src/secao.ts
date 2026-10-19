import { data, dataHora, inteiro } from "./csv.ts";
import { percorrerCsvTse } from "./csv-em-fluxo.ts";

// Leitores dos arquivos por seção do TSE: `detalhe_votacao_secao` (membro `*_BR.csv`, só Presidente), com a
// hora em que cada seção foi totalizada, e o boletim de urna (`bweb`, um zip por UF), com os votos de cada
// votável em cada seção. São arquivos de centenas de MB, lidos em fluxo.

/**
 * O zip do boletim de urna de uma UF (ou `ZZ`) num turno. O `carimbo` é a data de geração que o TSE põe no
 * nome dos zips do turno (`311020221535` no 2º turno de 2022), e o membro tem o mesmo nome, em `.csv`.
 */
export function boletimDeUrna(opcoes: { ano: number; turno: number; uf: string; carimbo: string }): { url: string; membro: string } {
  const nome = `bweb_${opcoes.turno}t_${opcoes.uf}_${opcoes.carimbo}`;
  return { url: `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes${opcoes.ano}/buweb/${nome}.zip`, membro: `${nome}.csv` };
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
  /** As seções não instaladas entram no total de seções, sem votantes. */
  instalada: boolean;
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
      instalada: simOuNao(l.ST_SECAO_INSTALADA, "ST_SECAO_INSTALADA"),
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
   * (como o 28 no 1º turno de 2026) é nulo técnico, e quem soma os votos o conta como nulo.
   */
  tipo: "nominal" | "branco" | "nulo" | "legenda";
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

export function* lerBoletimDeUrna(bytes: Uint8Array): Generator<VotoSecao> {
  for (const l of percorrerCsvTse(bytes, COLUNAS_BWEB)) {
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

function simOuNao(valor: string, coluna: string): boolean {
  if (valor === "Sim" || valor === "S") return true;
  if (valor === "Não" || valor === "N") return false;
  throw new Error(`Valor inválido na coluna ${coluna}: ${valor}`);
}
