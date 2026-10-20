// Números do TSE aparecem como o TSE publica: percentuais com duas casas, votos com separador de milhar.

const PCT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INTEIRO = new Intl.NumberFormat("pt-BR");

/** A parte do total em %, com as duas casas do TSE: "50,43%". */
export const formatarPct = (parte: number, total: number) => `${PCT.format((100 * parte) / total)}%`;
/** Votos com separador de milhar: "57.873.281". */
export const formatarVotos = (n: number) => INTEIRO.format(n);
/** O % do TSE como a página o mostra, com duas casas. */
export const duasCasas = (n: number) => Number(n.toFixed(2));
/** A hora de uma data do TSE (`AAAA-MM-DD HH:MM:SS`, em Brasília): `HH:MM:SS`, ou `HH:MM` sem os segundos. */
export const horaDoTse = (dataHora: string, comSegundos = true) => dataHora.slice(11, comSegundos ? 19 : 16);

// Os números de uma pesquisa aparecem como a fonte os publicou, com as casas que ela usou.
const PUBLICADO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
/** Um número de pesquisa com as casas que a fonte usou, até duas. */
export const formatarNumero = (n: number) => PUBLICADO.format(n);
/** `aaaa-mm-dd` → `dd/mm/aaaa`. */
export const formatarData = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
/** `aaaa-mm-dd` → `dd/mm`. */
export const formatarDia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// Os cálculos do Apurador aparecem arredondados, com uma casa: 51,1%, +0,1 ponto.
const UMA_CASA = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Um cálculo do Apurador com uma casa: "51,1". */
export const formatarCalculo = (n: number) => UMA_CASA.format(n);
/** O valor como a página o mostra, com uma casa: o que se soma ou se subtrai na página parte dele. */
export const umaCasa = (n: number) => Number(n.toFixed(1));
/** Um % já calculado, com as casas que ele tem na página: duas num número do TSE, uma num cálculo do Apurador. */
export const formatarPctComCasas = (pct: number, casas: 1 | 2) => `${(casas === 2 ? PCT : UMA_CASA).format(pct)}%`;
/** Uma mudança com sinal e uma casa: "+1,9", "−1,9", "0,0". */
export function formatarMudanca(n: number): string {
  const comUmaCasa = umaCasa(n);
  return `${comUmaCasa > 0 ? "+" : comUmaCasa < 0 ? "−" : ""}${formatarCalculo(Math.abs(comUmaCasa))}`;
}
/** Uma diferença em pontos, "0,1 ponto", "2,0 pontos". */
export const formatarPontos = (n: number) => `${formatarCalculo(n)} ${Math.abs(umaCasa(n)) < 2 ? "ponto" : "pontos"}`;
