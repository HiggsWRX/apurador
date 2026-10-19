// Números do TSE aparecem como o TSE publica: percentuais com duas casas, votos com separador de milhar.

const PCT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INTEIRO = new Intl.NumberFormat("pt-BR");

export const formatarPct = (parte: number, total: number) => `${PCT.format((100 * parte) / total)}%`;
export const formatarVotos = (n: number) => INTEIRO.format(n);

// Os números de uma pesquisa aparecem como a fonte os publicou, com as casas que ela usou.
const PUBLICADO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
export const formatarNumero = (n: number) => PUBLICADO.format(n);
/** `aaaa-mm-dd` → `dd/mm/aaaa`. */
export const formatarData = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
