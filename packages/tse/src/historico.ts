import { colunas, inteiro, lerCsvTse } from "./csv.ts";

// Leitores dos arquivos históricos por município e zona do portal de dados abertos do TSE
// (`votacao_candidato_munzona` e `detalhe_votacao_munzona`, membro `*_BR.csv`, só Presidente).

export type ArquivoHistorico = "votacao_candidato_munzona" | "detalhe_votacao_munzona" | "detalhe_votacao_secao";

/** O zip de um ano no portal de dados abertos do TSE. Tem centenas de MB: leia só o membro de Presidente. */
export function urlDadosAbertos(arquivo: ArquivoHistorico, ano: number): string {
  return `https://cdn.tse.jus.br/estatistica/sead/odsele/${arquivo}/${arquivo}_${ano}.zip`;
}

/** O membro de Presidente dentro dos zips por município e zona: `*_BR.csv`, com poucos MB. */
export const membroDePresidente = (nome: string) => nome.endsWith("_BR.csv");

/** Votos válidos de um candidato num município e zona. */
export interface VotoCandidatoMunzona {
  /** `DT_GERACAO HH_GERACAO`: o TSE regera os arquivos todo dia. */
  geracao: string;
  ano: number;
  turno: number;
  cargo: number;
  /** UF, ou `ZZ` para o Exterior. */
  uf: string;
  /** Código TSE do município, como inteiro (o arquivo de candidatos tira os zeros à esquerda). */
  municipio: number;
  nomeMunicipio: string;
  zona: number;
  numero: number;
  nome: string;
  nomeUrna: string;
  partido: string;
  votos: number;
  /** O dia da eleição daquele turno (`DT_ELEICAO`), `aaaa-mm-dd`. */
  dia: string;
}

/** Totais de um município e zona: eleitorado, votantes, válidos, brancos, nulos e seções. */
export interface DetalheMunzona {
  geracao: string;
  ano: number;
  turno: number;
  cargo: number;
  uf: string;
  municipio: number;
  nomeMunicipio: string;
  zona: number;
  aptos: number;
  /** Eleitores que votaram (`QT_COMPARECIMENTO`). O comparecimento é a fração votantes ÷ aptos. */
  votantes: number;
  abstencoes: number;
  validos: number;
  brancos: number;
  /** Inclui os nulos técnicos (`QT_TOTAL_VOTOS_NULOS`). */
  nulos: number;
  secoes: number;
}

const COLUNAS_CANDIDATO = [
  "DT_GERACAO",
  "HH_GERACAO",
  "ANO_ELEICAO",
  "NR_TURNO",
  "CD_CARGO",
  "SG_UF",
  "CD_MUNICIPIO",
  "NM_MUNICIPIO",
  "NR_ZONA",
  "NR_CANDIDATO",
  "NM_CANDIDATO",
  "NM_URNA_CANDIDATO",
  "SG_PARTIDO",
  "DT_ELEICAO",
] as const;

// Os arquivos de 2018 em diante separam os votos nominais válidos dos anulados. Os de 2002 a 2014 só têm os nominais,
// e para Presidente todos são válidos: nenhum candidato do 2º turno teve votos anulados.
const VOTOS_VALIDOS = "QT_VOTOS_NOMINAIS_VALIDOS";
const VOTOS_NOMINAIS = "QT_VOTOS_NOMINAIS";

export function lerVotacaoCandidatoMunzona(bytes: Uint8Array): VotoCandidatoMunzona[] {
  const { cabecalho, linhas } = lerCsvTse(bytes);
  const c = colunas(cabecalho, COLUNAS_CANDIDATO);
  const coluna = cabecalho.includes(VOTOS_VALIDOS) ? VOTOS_VALIDOS : VOTOS_NOMINAIS;
  const votos = colunas(cabecalho, [coluna])[coluna];
  return linhas.map((l) => ({
    geracao: `${l[c.DT_GERACAO]} ${l[c.HH_GERACAO]}`,
    ano: inteiro(l[c.ANO_ELEICAO], "ANO_ELEICAO"),
    turno: inteiro(l[c.NR_TURNO], "NR_TURNO"),
    cargo: inteiro(l[c.CD_CARGO], "CD_CARGO"),
    uf: l[c.SG_UF] ?? "",
    municipio: inteiro(l[c.CD_MUNICIPIO], "CD_MUNICIPIO"),
    nomeMunicipio: l[c.NM_MUNICIPIO] ?? "",
    zona: inteiro(l[c.NR_ZONA], "NR_ZONA"),
    numero: inteiro(l[c.NR_CANDIDATO], "NR_CANDIDATO"),
    nome: l[c.NM_CANDIDATO] ?? "",
    nomeUrna: l[c.NM_URNA_CANDIDATO] ?? "",
    partido: l[c.SG_PARTIDO] ?? "",
    votos: inteiro(l[votos], coluna),
    dia: diaIso(l[c.DT_ELEICAO]),
  }));
}

/** `dd/mm/aaaa` → `aaaa-mm-dd`. */
function diaIso(data: string | undefined): string {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data ?? "");
  if (!partes) throw new Error(`Valor inválido na coluna DT_ELEICAO: ${data}`);
  return `${partes[3]}-${partes[2]}-${partes[1]}`;
}

const COLUNAS_DETALHE = [
  "DT_GERACAO",
  "HH_GERACAO",
  "ANO_ELEICAO",
  "NR_TURNO",
  "CD_CARGO",
  "SG_UF",
  "CD_MUNICIPIO",
  "NM_MUNICIPIO",
  "NR_ZONA",
  "QT_APTOS",
  "QT_COMPARECIMENTO",
  "QT_ABSTENCOES",
  "QT_TOTAL_VOTOS_VALIDOS",
  "QT_VOTOS_BRANCOS",
  "QT_TOTAL_VOTOS_NULOS",
  "QT_TOTAL_SECOES",
] as const;

export function lerDetalheVotacaoMunzona(bytes: Uint8Array): DetalheMunzona[] {
  const { cabecalho, linhas } = lerCsvTse(bytes);
  const c = colunas(cabecalho, COLUNAS_DETALHE);
  return linhas.map((l) => ({
    geracao: `${l[c.DT_GERACAO]} ${l[c.HH_GERACAO]}`,
    ano: inteiro(l[c.ANO_ELEICAO], "ANO_ELEICAO"),
    turno: inteiro(l[c.NR_TURNO], "NR_TURNO"),
    cargo: inteiro(l[c.CD_CARGO], "CD_CARGO"),
    uf: l[c.SG_UF] ?? "",
    municipio: inteiro(l[c.CD_MUNICIPIO], "CD_MUNICIPIO"),
    nomeMunicipio: l[c.NM_MUNICIPIO] ?? "",
    zona: inteiro(l[c.NR_ZONA], "NR_ZONA"),
    aptos: inteiro(l[c.QT_APTOS], "QT_APTOS"),
    votantes: inteiro(l[c.QT_COMPARECIMENTO], "QT_COMPARECIMENTO"),
    abstencoes: inteiro(l[c.QT_ABSTENCOES], "QT_ABSTENCOES"),
    validos: inteiro(l[c.QT_TOTAL_VOTOS_VALIDOS], "QT_TOTAL_VOTOS_VALIDOS"),
    brancos: inteiro(l[c.QT_VOTOS_BRANCOS], "QT_VOTOS_BRANCOS"),
    nulos: inteiro(l[c.QT_TOTAL_VOTOS_NULOS], "QT_TOTAL_VOTOS_NULOS"),
    secoes: inteiro(l[c.QT_TOTAL_SECOES], "QT_TOTAL_SECOES"),
  }));
}
