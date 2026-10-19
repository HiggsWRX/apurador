// A indicação das pesquisas fora do Brasil (Agregado de pesquisas e erro histórico, decisões 6 e 7): não há
// agregado por UF ou município, então cada lugar parte do próprio 1º turno e recebe a mudança nacional.

/**
 * O placar entre finalistas: o % do primeiro finalista sobre a soma dos votos dos dois, base de toda comparação com o
 * 1º turno. `undefined` num lugar em que nenhum dos dois teve voto.
 */
export function placarEntreFinalistas(primeiro: number, segundo: number): number | undefined {
  return primeiro + segundo > 0 ? (100 * primeiro) / (primeiro + segundo) : undefined;
}

/**
 * A indicação das pesquisas num lugar, em % dos votos válidos do primeiro finalista: o placar entre finalistas do lugar
 * no 1º turno somado à mudança que o agregado mostra para o Brasil (agregado − placar entre finalistas do Brasil),
 * limitado a 0–100%.
 */
export function indicacaoDasPesquisas(entrada: { placarDoLugar: number; placarDoBrasil: number; agregado: number }): number {
  return Math.min(100, Math.max(0, entrada.placarDoLugar + entrada.agregado - entrada.placarDoBrasil));
}
