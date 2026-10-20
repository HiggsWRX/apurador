import { colunas, data, inteiro, lerCsvTse } from "./csv.ts";

// O cadastro das candidaturas (`consulta_cand`) do portal de dados abertos do TSE: quem concorreu, por que
// partido, federação e coligação, com o número sequencial que os arquivos da divulgação usam (`sqcand`).
// O TSE falso tira dele os candidatos e os vices de uma noite passada.

/** O zip de um ano. Tem centenas de MB: leia só o membro de abrangência nacional. */
export const urlCandidaturas = (ano: number) => `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${ano}.zip`;

/** O membro com as candidaturas de abrangência nacional (Presidente e vice), `consulta_cand_<ano>_BRASIL.csv`. */
export const membroCandidaturasDoBrasil = (nome: string) => nome.endsWith("_BRASIL.csv");

/** Uma candidatura do `consulta_cand`, com o sequencial, o partido, a federação e a coligação. */
export interface Candidatura {
  geracao: string;
  ano: number;
  turno: number;
  /** 1 é Presidente, 2 é vice-presidente. */
  cargo: number;
  /** O número sequencial da candidatura, como texto: é o `sqcand` dos arquivos da divulgação. */
  sequencial: string;
  numero: number;
  nome: string;
  nomeUrna: string;
  /** `AAAA-MM-DD`, ou `null` quando o TSE não informa (acontece em candidaturas a outros cargos). */
  nascimento: string | null;
  partido: { numero: number; sigla: string; nome: string };
  /** Só quando o partido está numa federação. */
  federacao: { numero: number; nome: string; sigla: string; composicao: string } | null;
  /** "PARTIDO ISOLADO", "COLIGAÇÃO" ou "FEDERAÇÃO", como o TSE escreve. */
  agremiacao: string;
  coligacao: { sequencial: string; nome: string; composicao: string };
}

const COLUNAS = [
  "DT_GERACAO",
  "HH_GERACAO",
  "ANO_ELEICAO",
  "NR_TURNO",
  "CD_CARGO",
  "SQ_CANDIDATO",
  "NR_CANDIDATO",
  "NM_CANDIDATO",
  "NM_URNA_CANDIDATO",
  "TP_AGREMIACAO",
  "NR_PARTIDO",
  "SG_PARTIDO",
  "NM_PARTIDO",
  "NR_FEDERACAO",
  "NM_FEDERACAO",
  "SG_FEDERACAO",
  "DS_COMPOSICAO_FEDERACAO",
  "SQ_COLIGACAO",
  "NM_COLIGACAO",
  "DS_COMPOSICAO_COLIGACAO",
  "DT_NASCIMENTO",
] as const;

/** As candidaturas do membro nacional do `consulta_cand` (Presidente e vice). */
export function lerCandidaturas(bytes: Uint8Array): Candidatura[] {
  const { cabecalho, linhas } = lerCsvTse(bytes);
  const c = colunas(cabecalho, COLUNAS);
  const texto = (l: string[], coluna: (typeof COLUNAS)[number]) => l[c[coluna]] ?? "";
  return linhas.map((l) => {
    const federacao = inteiro(l[c.NR_FEDERACAO], "NR_FEDERACAO");
    return {
      geracao: `${texto(l, "DT_GERACAO")} ${texto(l, "HH_GERACAO")}`,
      ano: inteiro(l[c.ANO_ELEICAO], "ANO_ELEICAO"),
      turno: inteiro(l[c.NR_TURNO], "NR_TURNO"),
      cargo: inteiro(l[c.CD_CARGO], "CD_CARGO"),
      sequencial: texto(l, "SQ_CANDIDATO"),
      numero: inteiro(l[c.NR_CANDIDATO], "NR_CANDIDATO"),
      nome: texto(l, "NM_CANDIDATO"),
      nomeUrna: texto(l, "NM_URNA_CANDIDATO"),
      nascimento: texto(l, "DT_NASCIMENTO") === "" ? null : data(l[c.DT_NASCIMENTO], "DT_NASCIMENTO"),
      partido: { numero: inteiro(l[c.NR_PARTIDO], "NR_PARTIDO"), sigla: texto(l, "SG_PARTIDO"), nome: texto(l, "NM_PARTIDO") },
      // O TSE marca "sem federação" com -1 no número e #NULO nos textos.
      federacao:
        federacao < 0
          ? null
          : { numero: federacao, nome: texto(l, "NM_FEDERACAO"), sigla: texto(l, "SG_FEDERACAO"), composicao: texto(l, "DS_COMPOSICAO_FEDERACAO") },
      agremiacao: texto(l, "TP_AGREMIACAO"),
      coligacao: { sequencial: texto(l, "SQ_COLIGACAO"), nome: texto(l, "NM_COLIGACAO"), composicao: texto(l, "DS_COMPOSICAO_COLIGACAO") },
    };
  });
}
