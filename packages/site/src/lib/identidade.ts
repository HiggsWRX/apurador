// As cores do histórico pelo partido: o PT na cor de Lula, o partido de Bolsonaro (PSL em 2018, PL
// depois) na de Flávio e os demais em cinza. As cores ficam em `estilos/global.css`.
/** A cor de um partido na página. */
export type Cor = "flavio" | "lula" | "cinza";

export const PT = ["PT"];
export const PARTIDO_DE_BOLSONARO = ["PSL", "PL"];

/** A cor do partido: a de Lula para o PT, a de Flávio para o partido de Bolsonaro, cinza para os demais. */
export function corDoPartido(partido: string): Cor {
  if (PT.includes(partido)) return "lula";
  if (PARTIDO_DE_BOLSONARO.includes(partido)) return "flavio";
  return "cinza";
}

// O nome curto dos finalistas na manchete e na linha fixa ("Flávio lidera com …"), pelo nome de urna, que o TSE
// escreve em maiúsculas e sem acento. O 2º turno de 2022 entra porque o TSE falso o serve no ensaio geral.
const NOMES_CURTOS: Record<string, string> = { "FLAVIO BOLSONARO": "Flávio", LULA: "Lula", "JAIR BOLSONARO": "Bolsonaro" };

/** "FLAVIO BOLSONARO" → "Flávio". Um nome de urna sem nome curto fica como o TSE o escreve. */
export const nomeCurto = (nomeUrna: string) => NOMES_CURTOS[nomeUrna] ?? nomeUrna;
