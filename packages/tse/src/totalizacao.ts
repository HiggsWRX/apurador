import { colunas, dataHora, inteiro, lerCsvTse } from "./csv.ts";

// O histórico oficial de totalização nacional (`Historico_Totalizacao_Presidente_BR_<turno>T_<ano>.zip`): uma
// linha por instante de totalização, com o acumulado do Brasil. Só existe para 2022. Serve para conferir a
// noite reconstruída seção por seção.

/** O zip do histórico de um turno e o membro dele, com o mesmo nome, em `.csv`. */
export function historicoDeTotalizacao(ano: number, turno: number): { url: string; membro: string } {
  const nome = `Historico_Totalizacao_Presidente_BR_${turno}T_${ano}`;
  return { url: `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes${ano}/${nome}.zip`, membro: `${nome}.csv` };
}

/** O acumulado do Brasil num instante de totalização. */
export interface LinhaDoHistorico {
  /** `AAAA-MM-DD HH:MM:SS`, em hora de Brasília. */
  totalizacao: string;
  secoes: number;
  totalDeSecoes: number;
  aptos: number;
  /** Todos os votos para Presidente, válidos, brancos e nulos: um por votante. */
  votos: number;
  validos: number;
  brancos: number;
  nulos: number;
  /** Os votos de cada candidato, pelo nome de urna. */
  candidatos: Record<string, number>;
}

const COLUNAS = [
  "DT_TOTALIZACAO",
  "QT_SECOES_TOTAL",
  "QT_SECOES_TOT_ACUMULADO",
  "QT_APTOS_TOT_ACUMULADO",
  "QT_VOTOS_TOTAL_ACUMULADO",
  "QT_VOTOS_CONCORRENTES_ACUMULADO",
  "BRANCO_QT_VOTOS_TOT_ACUMULADO",
  "NULO_QT_VOTOS_TOT_ACUMULADO",
] as const;
const SUFIXO_DO_CANDIDATO = "_QT_VOTOS_TOT_ACUMULADO";

export function lerHistoricoDeTotalizacao(bytes: Uint8Array): LinhaDoHistorico[] {
  // Os campos vêm alinhados com espaços, inclusive os nomes das colunas.
  const { cabecalho: bruto, linhas } = lerCsvTse(bytes);
  const cabecalho = bruto.map((c) => c.trim());
  const c = colunas(cabecalho, COLUNAS);
  const candidatos = cabecalho
    .map((nome, i) => ({ nome, i }))
    .filter(({ nome }) => nome.endsWith(SUFIXO_DO_CANDIDATO) && !["BRANCO", "NULO"].includes(nome.slice(0, -SUFIXO_DO_CANDIDATO.length)))
    .map(({ nome, i }) => ({ coluna: nome, nomeUrna: nome.slice(0, -SUFIXO_DO_CANDIDATO.length).replaceAll("_", " "), i }));

  return linhas.map((bruta) => {
    const l = bruta.map((v) => v.trim());
    const n = (coluna: (typeof COLUNAS)[number]) => inteiro(l[c[coluna]], coluna);
    const totalizacao = dataHora(l[c.DT_TOTALIZACAO], "DT_TOTALIZACAO");
    if (totalizacao === null) throw new Error("Linha do histórico sem DT_TOTALIZACAO");
    return {
      totalizacao,
      secoes: n("QT_SECOES_TOT_ACUMULADO"),
      totalDeSecoes: n("QT_SECOES_TOTAL"),
      aptos: n("QT_APTOS_TOT_ACUMULADO"),
      votos: n("QT_VOTOS_TOTAL_ACUMULADO"),
      validos: n("QT_VOTOS_CONCORRENTES_ACUMULADO"),
      brancos: n("BRANCO_QT_VOTOS_TOT_ACUMULADO"),
      nulos: n("NULO_QT_VOTOS_TOT_ACUMULADO"),
      candidatos: Object.fromEntries(candidatos.map(({ coluna, nomeUrna, i }) => [nomeUrna, inteiro(l[i], coluna)])),
    };
  });
}
