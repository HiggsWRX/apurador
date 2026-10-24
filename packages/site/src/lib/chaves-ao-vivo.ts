import type { QuadroAoVivo } from "./leitor-ao-vivo";

// As chaves de publicação na página (Ensaio geral, decisão 19). Cada bloco lê a sua chave em `quadro.chaves` (o quadro
// do leitor ao vivo): até a primeira rodada do coletor, são as do arquivo de chaves do site (`CHAVES.noite`); depois,
// as do arquivo de rodada, que mudam sem recarregar. As regras que derivam de uma chave ficam aqui, para os blocos
// (projeção, base com pesquisas, simulador, mapa, textos preditivos) não repetirem cada um a sua.

/** O plano zero (Ensaio geral, decisão 24): a partir da fase ao vivo, com o núcleo mínimo desligado, nenhum dado ao vivo aparece. */
export const emPlanoZero = (quadro: QuadroAoVivo): boolean => quadro.fase !== "antes-das-17h" && !quadro.chaves.nucleoMinimo;

/**
 * O simulador "e se" no ar: com a chave dele e com a da projeção, que fica sempre ao lado da simulação, fora do plano
 * zero. O coletor já desliga o simulador com a projeção (`chavesEfetivas`); o arquivo de chaves do site, não.
 */
export const comOSimulador = (quadro: QuadroAoVivo): boolean => !emPlanoZero(quadro) && quadro.chaves.projecao && quadro.chaves.simulador;
