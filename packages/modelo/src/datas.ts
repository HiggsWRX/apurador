// Os dias do calendário da eleição, como `aaaa-mm-dd`, e a conta com eles.

const DIA_EM_MS = 86_400_000;

/** A data de um instante em Brasília (UTC−3, sem horário de verão desde 2019), `aaaa-mm-dd`. */
export const dataEmBrasilia = (instante: Date) => new Date(instante.getTime() - 3 * 3600_000).toISOString().slice(0, 10);

/** O dia `n` dias depois (ou antes, com `n` negativo). */
export const somarDias = (dia: string, n: number) => new Date(Date.parse(dia) + n * DIA_EM_MS).toISOString().slice(0, 10);

/** Quantos dias vão de um dia a outro. */
export const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate) - Date.parse(de)) / DIA_EM_MS);
