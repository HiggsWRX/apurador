import { Z_95, type CurvaDoLugar, type PontoDaCurva } from "@apurador/modelo";
import { formatarCalculo } from "../lib/formato";
import type { FinalistaDoPainel } from "./ChanceDeVitoria";

// A curva projetada (Telas da página de lugar, decisão 4): as duas linhas tracejadas espelhadas em torno de 50%, cada
// uma com a faixa de 95%, e a virada projetada como um losango sobre a faixa cinza em que ela é provável. Só gráfico e
// rótulos curtos (Segunda consulta jurídica, decisão 5): nenhuma frase diz quem vence ou quando vira, e o rótulo do
// sinal de virada, que precisa de alguém atrás no placar parcial, fica com o bloco ao vivo. Sem estado e sem leitura:
// o painel de antes das 17h a desenha no build de 0% a 100% das seções, e o bloco ao vivo pode desenhá-la do ponto
// atual em diante.

/** Até esse % de seções, o placar ainda pula demais para decidir a escala, como na curva real. */
const COMECO_INSTAVEL = 3;

// A mesma largura da curva real, com a margem da direita para os rótulos do fim.
const LARGURA = 340;
const ALTURA = 210;
const MARGEM = { esq: 34, dir: 44, topo: 10, base: 32 };
const largura = LARGURA - MARGEM.esq - MARGEM.dir;
const altura = ALTURA - MARGEM.topo - MARGEM.base;

interface Props {
  /** Distingue os ids internos do SVG (o recorte) quando a página tem mais de uma curva. */
  id: string;
  /** O nome da base da projeção que a curva desenha, para a descrição. */
  base: string;
  /** O finalista cuja fatia é o `y` dos pontos, e o outro. */
  primeiro: FinalistaDoPainel;
  segundo: FinalistaDoPainel;
  curva: CurvaDoLugar;
}

const pct = (fatia: number) => `${formatarCalculo(100 * fatia)}%`;

/** A curva projetada de um lugar, de onde ela começa até 100% das seções, com a virada projetada. */
export function CurvaProjetada({ id, base, primeiro, segundo, curva }: Props) {
  const { pontos, virada } = curva;
  const inicio = pontos[0];
  const fim = pontos.at(-1);
  if (!inicio || !fim) return null;
  const x = virada?.x ?? null;
  const cedo = virada?.cedo ?? null;
  const tarde = virada?.tarde ?? null;

  const descricao =
    `Curva projetada na base ${base}: ${primeiro.nomeUrna} de ${pct(inicio.y)} a ${pct(fim.y)} e ${segundo.nomeUrna} de ${pct(1 - inicio.y)} a ${pct(1 - fim.y)}, ` +
    `de ${formatarCalculo(inicio.x)}% a ${formatarCalculo(fim.x)}% das seções totalizadas` +
    (x === null ? "" : `; losango da virada projetada em ~${Math.round(x)}% das seções`) +
    (cedo === null ? "" : `; faixa da virada de ${Math.round(cedo)}% a ${Math.round(tarde ?? 100)}% das seções`);

  return (
    <figure
      class="curva-projetada"
      data-curva-projetada
      {...(x === null ? {} : { "data-virada-x": Math.round(x) })}
      {...(cedo === null ? {} : { "data-virada-cedo": Math.round(cedo) })}
      {...(tarde === null ? {} : { "data-virada-tarde": Math.round(tarde) })}
    >
      <Grafico id={id} primeiro={primeiro} segundo={segundo} pontos={pontos} x={x} cedo={cedo} tarde={tarde} descricao={descricao} />
      <figcaption class="legenda">
        <span>
          <i class="amostra amostra-tracejada" /> Curva projetada
        </span>
        <span>
          <i class="amostra amostra-faixa" /> Faixa de 95%
        </span>
        {x !== null && (
          <span>
            <i class="amostra amostra-losango" /> Virada projetada
          </span>
        )}
        {cedo !== null && (
          <span>
            <i class="amostra amostra-virada" /> % de seções em que a virada é possível
          </span>
        )}
      </figcaption>
    </figure>
  );
}

interface PropsDoGrafico {
  id: string;
  primeiro: FinalistaDoPainel;
  segundo: FinalistaDoPainel;
  pontos: PontoDaCurva[];
  x: number | null;
  cedo: number | null;
  tarde: number | null;
  descricao: string;
}

function Grafico({ id, primeiro, segundo, pontos, x: xDaVirada, cedo, tarde, descricao }: PropsDoGrafico) {
  // A meia altura da escala, como na curva real: a maior distância de 50% depois do começo instável, aqui contando a
  // faixa de 95%, mais 1 ponto de folga, em passos de 2. O que passa é recortado.
  let distancia = 3;
  for (const p of pontos) {
    if (p.x <= COMECO_INSTAVEL) continue;
    distancia = Math.max(distancia, Math.abs(100 * (p.y + Z_95 * p.desvio) - 50), Math.abs(100 * (p.y - Z_95 * p.desvio) - 50));
  }
  const meia = Math.min(50, Math.ceil((distancia + 1) / 2) * 2);
  const passo = meia > 20 ? 10 : meia > 8 ? 5 : 2;
  const rotulos: number[] = [];
  for (let v = 50 - Math.floor(meia / passo) * passo; v <= 50 + meia; v += passo) rotulos.push(v);

  const x = (secoes: number) => MARGEM.esq + (secoes / 100) * largura;
  const y = (pct: number) => MARGEM.topo + altura / 2 - ((pct - 50) / meia) * (altura / 2);
  const ponto = (p: PontoDaCurva, valor: number) => `${x(p.x).toFixed(1)},${y(100 * valor).toFixed(1)}`;
  const linha = (valor: (p: PontoDaCurva) => number) => pontos.map((p, i) => `${i ? "L" : "M"}${ponto(p, valor(p))}`).join("");
  const faixa = (valor: (p: PontoDaCurva) => number) =>
    pontos.map((p, i) => `${i ? "L" : "M"}${ponto(p, valor(p) + Z_95 * p.desvio)}`).join("") + [...pontos].reverse().map((p) => `L${ponto(p, valor(p) - Z_95 * p.desvio)}`).join("") + "Z";
  const doPrimeiro = (p: PontoDaCurva) => p.y;
  const doSegundo = (p: PontoDaCurva) => 1 - p.y;
  const fim = pontos.at(-1)!;
  // Os rótulos do fim, afastados um do outro quando a projeção fica perto de 50%.
  const yFim = [y(100 * fim.y), y(100 * (1 - fim.y))];
  if (Math.abs(yFim[0]! - yFim[1]!) < 14) {
    const meio = (yFim[0]! + yFim[1]!) / 2;
    yFim[0] = meio + (yFim[0]! >= yFim[1]! ? 7 : -7);
    yFim[1] = meio + (yFim[1]! > yFim[0]! ? 7 : -7);
  }
  const recorte = `curva-projetada-${id}`;

  return (
    <svg class="grafico-curva" viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={descricao}>
      <clipPath id={recorte}>
        <rect x={MARGEM.esq} y={MARGEM.topo} width={largura} height={altura} />
      </clipPath>
      {rotulos.map((v) => (
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
      {cedo !== null && <rect class="faixa-virada" x={x(cedo).toFixed(1)} y={MARGEM.topo} width={Math.max(2, x(tarde ?? 100) - x(cedo)).toFixed(1)} height={altura} />}
      <g clip-path={`url(#${recorte})`}>
        <path class="faixa-projetada" data-cor={primeiro.cor} d={faixa(doPrimeiro)} />
        <path class="faixa-projetada" data-cor={segundo.cor} d={faixa(doSegundo)} />
        <path class="linha-projetada" data-cor={primeiro.cor} d={linha(doPrimeiro)} />
        <path class="linha-projetada" data-cor={segundo.cor} d={linha(doSegundo)} />
      </g>
      {xDaVirada !== null && <path class="losango-virada" d={`M${x(xDaVirada).toFixed(1)},${(y(50) - 6).toFixed(1)}l6,6l-6,6l-6,-6z`} />}
      <text class="rotulo-fim" data-cor={primeiro.cor} x={MARGEM.esq + largura + 5} y={(yFim[0]! + 3.5).toFixed(1)}>
        {pct(fim.y)}
      </text>
      <text class="rotulo-fim" data-cor={segundo.cor} x={MARGEM.esq + largura + 5} y={(yFim[1]! + 3.5).toFixed(1)}>
        {pct(1 - fim.y)}
      </text>
    </svg>
  );
}
