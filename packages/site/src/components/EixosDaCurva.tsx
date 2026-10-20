// A escala e os eixos das curvas do placar parcial, a real e a projetada (Telas da página de lugar, decisão 4): as
// duas linhas espelhadas em torno de 50%, numa escala que ignora o começo instável, até 3% das seções, e recorta o que
// passa dela. Desenhadas para a largura do celular, como o gráfico da tendência do agregado; no computador, crescem
// com o cartão. A curva real e a projetada partilham isto para que a projetada possa entrar por cima da real na noite.

/** Até esse % de seções, o placar ainda pula demais para decidir a escala. */
export const COMECO_INSTAVEL = 3;

export const LARGURA = 340;
export const ALTURA = 210;
/** As margens de cima, de baixo e da esquerda; a da direita é de cada curva, conforme o que ela escreve no fim. */
export const MARGEM = { esq: 34, topo: 10, base: 32 };

/** A escala vertical: a meia altura em torno de 50%, o passo dos rótulos e os rótulos. */
export interface EscalaDaCurva {
  meia: number;
  passo: number;
  rotulos: number[];
}

/**
 * A escala para a maior distância de 50% que a curva alcança depois do começo instável: mais 1 ponto de folga, em
 * passos de 2, com mínimo de 4 e máximo de 50, e os rótulos de 2 em 2, de 5 em 5 ou de 10 em 10.
 */
export function escalaDaCurva(distancia: number): EscalaDaCurva {
  const meia = Math.min(50, Math.ceil((Math.max(distancia, 3) + 1) / 2) * 2);
  const passo = meia > 20 ? 10 : meia > 8 ? 5 : 2;
  const rotulos: number[] = [];
  for (let v = 50 - Math.floor(meia / passo) * passo; v <= 50 + meia; v += passo) rotulos.push(v);
  return { meia, passo, rotulos };
}

/** As funções que levam o % de seções e o % de votos aos pixels do SVG, com a área do gráfico. */
export interface Eixos {
  x: (secoes: number) => number;
  y: (pct: number) => number;
  largura: number;
  altura: number;
}

/** Os eixos de uma curva com a escala dada e a margem da direita dela. */
export function eixosDaCurva(escala: EscalaDaCurva, margemDireita: number): Eixos {
  const largura = LARGURA - MARGEM.esq - margemDireita;
  const altura = ALTURA - MARGEM.topo - MARGEM.base;
  return {
    x: (secoes) => MARGEM.esq + (secoes / 100) * largura,
    y: (pct) => MARGEM.topo + altura / 2 - ((pct - 50) / escala.meia) * (altura / 2),
    largura,
    altura,
  };
}

interface Props {
  eixos: Eixos;
  escala: EscalaDaCurva;
  /** O id do recorte da área do gráfico, que a curva usa em `clip-path`. */
  recorte: string;
}

/** O recorte, a grade com os rótulos do eixo vertical e os rótulos do eixo das seções. */
export function EixosDaCurva({ eixos, escala, recorte }: Props) {
  const { x, y, largura, altura } = eixos;
  return (
    <>
      <clipPath id={recorte}>
        <rect x={MARGEM.esq} y={MARGEM.topo} width={largura} height={altura} />
      </clipPath>
      {escala.rotulos.map((v) => (
        <g key={v}>
          <line class={v === 50 ? "grade grade-50" : "grade"} x1={MARGEM.esq} x2={MARGEM.esq + largura} y1={y(v)} y2={y(v)} />
          <text class="eixo" data-eixo-y x={MARGEM.esq - 6} y={y(v) + 3.5} text-anchor="end">
            {v}%
          </text>
        </g>
      ))}
      {[0, 25, 50, 75, 100].map((s) => (
        <text key={s} class="eixo" x={x(s)} y={MARGEM.topo + altura + 14} text-anchor="middle">
          {s}%
        </text>
      ))}
      <text class="eixo" x={MARGEM.esq + largura / 2} y={ALTURA - 3} text-anchor="middle">
        % de seções totalizadas
      </text>
    </>
  );
}
