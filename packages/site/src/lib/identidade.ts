// As cores do histórico pelo partido: o PT na cor de Lula, o partido de Bolsonaro (PSL em 2018, PL
// depois) na de Flávio e os demais em cinza. As cores ficam em `estilos/global.css`.
export type Cor = "flavio" | "lula" | "cinza";

export const PT = ["PT"];
export const PARTIDO_DE_BOLSONARO = ["PSL", "PL"];

export function corDoPartido(partido: string): Cor {
  if (PT.includes(partido)) return "lula";
  if (PARTIDO_DE_BOLSONARO.includes(partido)) return "flavio";
  return "cinza";
}
