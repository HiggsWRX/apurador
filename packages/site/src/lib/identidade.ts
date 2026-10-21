import { PARTIDO_DE_BOLSONARO, PT } from "@apurador/pipeline/partidos";

// As cores do histórico pelo partido: o PT na cor de Lula, o partido de Bolsonaro (PSL em 2018, PL
// depois) na de Flávio e os demais em cinza. As cores ficam em `estilos/global.css`.
/** A cor de um partido na página. */
export type Cor = "flavio" | "lula" | "cinza";

export { PARTIDO_DE_BOLSONARO, PT };

/** A cor do partido: a de Lula para o PT, a de Flávio para o partido de Bolsonaro, cinza para os demais. */
export function corDoPartido(partido: string): Cor {
  if (PT.includes(partido)) return "lula";
  if (PARTIDO_DE_BOLSONARO.includes(partido)) return "flavio";
  return "cinza";
}

// O nome curto dos finalistas na manchete e na linha fixa ("Flávio lidera com …") é o da narração, que o coletor
// escreve: os nomes ficam num lugar só.
export { nomeCurto } from "@apurador/coletor/narracao";
