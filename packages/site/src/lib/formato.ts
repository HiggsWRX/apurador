// Números do TSE aparecem como o TSE publica: percentuais com duas casas, votos com separador de milhar.

const PCT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INTEIRO = new Intl.NumberFormat("pt-BR");

export const formatarPct = (parte: number, total: number) => `${PCT.format((100 * parte) / total)}%`;
export const formatarVotos = (n: number) => INTEIRO.format(n);
