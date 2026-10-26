import type { Lugar } from "@apurador/pipeline";
import type { IdDaBase } from "./bases-da-projecao";

// O endereço da tela do simulador "e se", que a caixa da projeção leva, antes das 17h e na noite. Fica à parte, sem dados
// do build: o bloco ao vivo de toda página de lugar o importa, e nada do simulador pode ir junto.

/** A tela do simulador. */
export const CAMINHO_DO_SIMULADOR = "/simulador/";

/**
 * O link "Simular 'e se' →" da caixa da projeção de um lugar: com a base escolhida e, numa UF ou num município, a UF, para
 * o simulador abrir com a região dela expandida (decisão 7). O Exterior não tem região.
 */
export function caminhoDoSimulador(base: IdDaBase, lugar?: Pick<Lugar, "tipo" | "uf">): string {
  const de = lugar?.uf && lugar.uf !== "ZZ" && (lugar.tipo === "uf" || lugar.tipo === "municipio") ? `&de=${lugar.uf.toLowerCase()}` : "";
  return `${CAMINHO_DO_SIMULADOR}?base=${base}${de}`;
}
