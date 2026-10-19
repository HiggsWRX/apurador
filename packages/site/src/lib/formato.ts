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
/** `aaaa-mm-dd` → `dd/mm`. */
export const formatarDia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// Os cálculos do Apurador aparecem arredondados, com uma casa: 51,1%, +0,1 ponto.
const UMA_CASA = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const formatarCalculo = (n: number) => UMA_CASA.format(n);
/** O valor como a página o mostra, com uma casa: o que se soma ou se subtrai na página parte dele. */
export const umaCasa = (n: number) => Number(n.toFixed(1));
/** Uma diferença em pontos, "0,1 ponto", "2,0 pontos". */
export const formatarPontos = (n: number) => `${formatarCalculo(n)} ${Math.abs(umaCasa(n)) < 2 ? "ponto" : "pontos"}`;
