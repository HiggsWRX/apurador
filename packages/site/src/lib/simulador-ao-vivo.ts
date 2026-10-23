import type { ArquivoDoSimuladorAoVivo } from "@apurador/coletor";
import { comOSimulador } from "./chaves-ao-vivo";
import type { QuadroAoVivo } from "./leitor-ao-vivo";
import { eleitoPelaIndicacao } from "./textos-ao-vivo";

// O que a tela do simulador "e se" mostra pela última leitura do leitor ao vivo (Simulador "e se", decisões 5 e 12). A
// fase vem do arquivo de rodada, como nas páginas de lugar: antes das 17h, a simulação parte do arquivo do build, nada
// totalizado, se a chave de antes das 17h deixa; na fase ao vivo, do arquivo que o coletor publica a cada rodada, com a
// chave do simulador. A tela fecha com a indicação do TSE e com a totalização final, e a passagem de uma fase a outra
// acontece na leitura em que ela muda, sem recarregar.

/** Por que a tela do simulador está fechada, com o que ela diz. */
export type Fechamento = { tipo: "abre-as-17h" | "fora-do-ar" | "encerrada" } | { tipo: "indicacao"; eleito: string };

/** Sobre o que a tela simula, ou por que ela está fechada. */
export type FaseDoSimulador =
  | { tipo: "antes-das-17h" }
  | {
      tipo: "ao-vivo";
      /** O arquivo do coletor com a apuração, ou `null` enquanto ele não chega. */
      daNoite: ArquivoDoSimuladorAoVivo | null;
    }
  | Fechamento;

/** A fase da tela do simulador pelo quadro, com a chave de antes das 17h (`SIMULADOR_ANTES_DAS_17H`). */
export function faseDoSimulador(quadro: QuadroAoVivo, antesDas17h: boolean): FaseDoSimulador {
  if (quadro.fase === "antes-das-17h") return antesDas17h ? { tipo: "antes-das-17h" } : { tipo: "abre-as-17h" };
  if (!quadro.chaves.nucleoMinimo) return { tipo: "fora-do-ar" };
  if (quadro.fase === "encerrada") return { tipo: "encerrada" };
  const eleito = eleitoPelaIndicacao(quadro);
  if (eleito !== null) return { tipo: "indicacao", eleito };
  if (!comOSimulador(quadro)) return { tipo: "fora-do-ar" };
  return { tipo: "ao-vivo", daNoite: quadro.simulador?.apuracao ? quadro.simulador : null };
}

/** Um ponto da curva real no simulador: o % de seções totalizadas e a fatia do 1º finalista da base, de 0 a 1. */
export interface PontoDaCurvaRealNoSimulador {
  x: number;
  y: number;
}

/**
 * A curva real do Brasil da última leitura, para a curva do simulador: em cada ponto, o % de seções e a fatia do 1º
 * finalista da base (`nomes`, os nomes de urna na ordem da base), que pode ser o 2º do arquivo de rodada.
 */
export function curvaRealNoSimulador(quadro: QuadroAoVivo, nomes: readonly string[]): PontoDaCurvaRealNoSimulador[] {
  const { rodada, lugar } = quadro;
  if (!rodada || lugar?.lugar !== "BR") return [];
  const i = rodada.candidatos.findIndex((c) => c.nome === nomes[0]);
  if (i < 0) return [];
  return lugar.curva.map(([x = 0, ...pcts]) => ({ x, y: (pcts[i] ?? 50) / 100 }));
}
