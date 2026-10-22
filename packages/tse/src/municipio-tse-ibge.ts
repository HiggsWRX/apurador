import { colunas, inteiro, lerCsvTse } from "./csv.ts";

// A tabela oficial do TSE que casa o código de município do TSE com o do IBGE (`municipio_tse_ibge`).
// Cobre os 5.571 municípios do Brasil. O Exterior (`ZZ`) não está nela, porque não tem código IBGE.

/** O zip da tabela no portal de dados abertos do TSE (cerca de 140 KB). */
export const URL_MUNICIPIO_TSE_IBGE = "https://cdn.tse.jus.br/estatistica/sead/odsele/municipio_tse_ibge/municipio_tse_ibge.zip";

/** O membro com a tabela, dentro do zip, que também traz o dicionário em PDF. */
export const MEMBRO_MUNICIPIO_TSE_IBGE = "municipio_tse_ibge.csv";

/** Um município com o código do TSE e o do IBGE. */
export interface MunicipioTseIbge {
  geracao: string;
  uf: string;
  nomeUf: string;
  /** Código TSE do município, como inteiro, igual ao `CD_MUNICIPIO` dos arquivos de resultados. */
  municipio: number;
  nomeTse: string;
  ibge: number;
  nomeIbge: string;
}

const COLUNAS = ["DT_GERACAO", "HH_GERACAO", "SG_UF", "NM_UF", "CD_MUNICIPIO_TSE", "NM_MUNICIPIO_TSE", "CD_MUNICIPIO_IBGE", "NM_MUNICIPIO_IBGE"] as const;

/** Lê a tabela `municipio_tse_ibge` do TSE. */
export function lerMunicipioTseIbge(bytes: Uint8Array): MunicipioTseIbge[] {
  const { cabecalho, linhas } = lerCsvTse(bytes);
  const c = colunas(cabecalho, COLUNAS);
  return linhas.map((l) => ({
    geracao: `${l[c.DT_GERACAO]} ${l[c.HH_GERACAO]}`,
    uf: l[c.SG_UF] ?? "",
    nomeUf: l[c.NM_UF] ?? "",
    municipio: inteiro(l[c.CD_MUNICIPIO_TSE], "CD_MUNICIPIO_TSE"),
    nomeTse: l[c.NM_MUNICIPIO_TSE] ?? "",
    ibge: inteiro(l[c.CD_MUNICIPIO_IBGE], "CD_MUNICIPIO_IBGE"),
    nomeIbge: l[c.NM_MUNICIPIO_IBGE] ?? "",
  }));
}
