import type { BaseDaProjecao } from "@apurador/coletor";

// As duas bases da projeção, como o visitante as escolhe na caixa da projeção e no simulador (glossário: Base da
// projeção). Sem dados do build: a ilha do simulador também usa isto.

/** Um dos dois conjuntos de informações que a projeção usa, como o visitante o escolhe. */
export type IdDaBase = "so-apuracao" | "com-pesquisas";

/** Como os arquivos ao vivo nomeiam cada base: a chave dela na projeção e nos textos preditivos. */
export const BASE_NOS_ARQUIVOS = { "so-apuracao": "soApuracao", "com-pesquisas": "comPesquisas" } as const satisfies Record<IdDaBase, BaseDaProjecao>;

/** As bases na ordem do controle. */
export const BASES_DA_PROJECAO: IdDaBase[] = ["so-apuracao", "com-pesquisas"];

/** O nome de cada base como a página o escreve. */
export const NOME_DA_BASE: Record<IdDaBase, string> = { "so-apuracao": "Só apuração", "com-pesquisas": "Apuração + pesquisas" };

/** A base que a caixa da projeção abre na noite, quando ela está no ar (Combinação de pesquisas e apuração, decisão 5). */
export const BASE_DA_NOITE: IdDaBase = "com-pesquisas";
