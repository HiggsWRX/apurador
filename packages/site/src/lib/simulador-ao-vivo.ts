import type { ArquivoDoSimuladorAoVivo } from "@apurador/coletor";
import { comOSimulador, emPlanoZero } from "./chaves-ao-vivo";
import type { QuadroAoVivo } from "./leitor-ao-vivo";
import { eleitoPelaIndicacao } from "./textos-ao-vivo";

// O que a tela do simulador "e se" mostra pela última leitura do leitor ao vivo (Simulador "e se", decisões 5 e 12). A
// fase vem do arquivo de rodada, como nas páginas de lugar: antes das 17h, a simulação parte do arquivo do build, nada
// totalizado, se a chave de antes das 17h deixa; na fase ao vivo, do arquivo que o coletor publica a cada rodada, com a
// chave do simulador. A tela fecha com a indicação do TSE e com a totalização final, e a passagem de uma situação a outra
// acontece na leitura em que ela muda, sem recarregar. Sem DOM nem nada do simulador: o bloco ao vivo de toda página de
// lugar importa daqui a regra do link da caixa da projeção.

/** Por que a tela do simulador está fechada, com o que ela diz. */
export type Fechamento = { tipo: "abre-as-17h" | "fora-do-ar" | "encerrada" } | { tipo: "indicacao"; eleito: string };

/**
 * Sobre o que a tela simula, ou por que ela está fechada. Ela fica esperando antes da primeira leitura (ou sem conexão
 * nela), quando não sabe a fase, e, na fase ao vivo, até o arquivo do coletor chegar com a apuração.
 */
export type SituacaoDoSimulador =
  | { tipo: "antes-das-17h" }
  | { tipo: "esperando" }
  | {
      tipo: "ao-vivo";
      /** O arquivo do coletor, com a apuração. */
      daNoite: ArquivoDoSimuladorAoVivo;
    }
  | Fechamento;

/**
 * Se o TSE já indicou o eleito, pela narração do Brasil ou pelos eventos do Brasil que o arquivo de rodada leva a toda
 * página: o simulador para.
 */
const comIndicacaoDoTse = (quadro: QuadroAoVivo) =>
  eleitoPelaIndicacao(quadro) !== null || (quadro.rodada?.eventosDoBrasil.some((e) => e.tipo === "indicacao") ?? false);

/** O simulador aberto na noite: no ar pelas chaves e antes da indicação do TSE. Só com ele a caixa da projeção leva o link. */
export const simuladorAberto = (quadro: QuadroAoVivo): boolean => comOSimulador(quadro) && !comIndicacaoDoTse(quadro);

/**
 * A situação da tela do simulador pelo quadro, com a chave de antes das 17h (`noArAntesDas17h`, a de
 * `SIMULADOR_ANTES_DAS_17H`) e se o leitor já leu (`lido`; sem leitor, a tela fica no quadro de antes da primeira leitura).
 */
export function situacaoDoSimulador(quadro: QuadroAoVivo, { noArAntesDas17h, lido }: { noArAntesDas17h: boolean; lido: boolean }): SituacaoDoSimulador {
  // Sem nenhuma rodada e sem conexão, a fase do quadro é a de antes da primeira leitura, não a da noite.
  if (!lido || (quadro.rodada === null && quadro.indicador.estado === "sem-conexao")) return { tipo: "esperando" };
  if (quadro.fase === "antes-das-17h") return noArAntesDas17h ? { tipo: "antes-das-17h" } : { tipo: "abre-as-17h" };
  if (emPlanoZero(quadro)) return { tipo: "fora-do-ar" };
  if (quadro.fase === "encerrada") return { tipo: "encerrada" };
  const eleito = eleitoPelaIndicacao(quadro);
  if (eleito !== null) return { tipo: "indicacao", eleito };
  if (!simuladorAberto(quadro)) return { tipo: "fora-do-ar" };
  return quadro.simulador?.apuracao ? { tipo: "ao-vivo", daNoite: quadro.simulador } : { tipo: "esperando" };
}

/** Um ponto da curva real no simulador: o % de seções totalizadas e a fatia do 1º finalista da base, de 0 a 1. */
export interface PontoDaCurvaRealNoSimulador {
  x: number;
  y: number;
}

/**
 * A curva real do Brasil da última leitura, para a curva do simulador: em cada ponto, o % de seções e a fatia do 1º
 * finalista da base (`primeiro`, o nome de urna dele), que pode ser o 2º do arquivo de rodada.
 */
export function curvaRealNoSimulador(quadro: QuadroAoVivo, primeiro: string): PontoDaCurvaRealNoSimulador[] {
  const { rodada, lugar } = quadro;
  if (!rodada || lugar?.lugar !== "BR") return [];
  const i = rodada.candidatos.findIndex((c) => c.nome === primeiro);
  if (i < 0) return [];
  return lugar.curva.map(([x = 0, ...pcts]) => ({ x, y: (pcts[i] ?? 50) / 100 }));
}
