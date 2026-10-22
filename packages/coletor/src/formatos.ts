import type { NivelDoAlerta } from "./alertas.ts";

// Como o painel do coletor, os alertas e a sentinela escrevem horas, tempos e números para o dono: em hora de Brasília e
// à brasileira. O módulo não usa nada do Node, porque a sentinela, um Worker, escreve as mensagens dela com ele.

/** A hora de Brasília de um instante em ms, `HH:MM:SS`. */
export const horaDeBrasilia = (ms: number) => new Date(ms).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Um tempo em ms como "75 s" ou "3 min 5 s". */
export function duracao(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 120 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}`;
}

/** Um número com as casas dadas, à brasileira ("50,9"). */
export const comCasas = (n: number, casas = 0) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** O nome de cada base da projeção, como a página o escreve. */
export const ROTULO_DAS_BASES = { soApuracao: "Só apuração", comPesquisas: "Apuração + pesquisas" } as const;

/** O nome de cada nível de alerta. */
export const ROTULO_DO_NIVEL: Record<NivelDoAlerta, string> = { critico: "crítico", atencao: "atenção" };

/** O título da mensagem do alerta crítico no celular e na notificação do Windows. */
export const TITULO_DO_ALERTA_CRITICO = "Apurador: alerta crítico";
