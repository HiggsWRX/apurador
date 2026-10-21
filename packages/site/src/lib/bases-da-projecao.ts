// As duas bases da projeção, como o visitante as escolhe na caixa da projeção e no simulador (glossário: Base da
// projeção). Sem dados do build: a ilha do simulador também usa isto.

/** Um dos dois conjuntos de informações que a projeção usa, como o visitante o escolhe. */
export type IdDaBase = "so-apuracao" | "com-pesquisas";

/** As bases na ordem do controle. */
export const BASES_DA_PROJECAO: IdDaBase[] = ["so-apuracao", "com-pesquisas"];

/** O nome de cada base como a página o escreve. */
export const NOME_DA_BASE: Record<IdDaBase, string> = { "so-apuracao": "Só apuração", "com-pesquisas": "Apuração + pesquisas" };
