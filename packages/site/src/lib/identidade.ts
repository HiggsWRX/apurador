// As cores do histórico pelo partido: o PT na cor de Lula, o partido de Bolsonaro (PSL em 2018, PL
// depois) na de Flávio e os demais em cinza. As cores ficam em `estilos/global.css`.
export type Cor = "flavio" | "lula" | "cinza";

export function corDoPartido(partido: string): Cor {
  if (partido === "PT") return "lula";
  if (partido === "PL" || partido === "PSL") return "flavio";
  return "cinza";
}
