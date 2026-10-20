import { Z_95, type CurvaDoLugar, type PontoDaCurva, type ViradaProjetada } from "@apurador/modelo";
import { formatarCalculo } from "../lib/formato";
import type { FinalistaDaPagina } from "./ChanceDeVitoria";
import { ALTURA, COMECO_INSTAVEL, EixosDaCurva, eixosDaCurva, escalaDaCurva, LARGURA, MARGEM } from "./EixosDaCurva";

// A curva projetada (Telas da página de lugar, decisão 4): as duas linhas tracejadas espelhadas em torno de 50%, cada
// uma com a faixa de 95%, e a virada projetada como um losango sobre a faixa cinza em que ela é possível. Só gráfico e
// rótulos curtos (Segunda consulta jurídica, decisão 5): nenhuma frase diz quem vence ou quando vira, nem na descrição
// para o leitor de tela, e o rótulo do sinal de virada, que precisa de alguém atrás no placar parcial, fica com o
// bloco ao vivo. Sem estado e sem leitura: o painel de antes das 17h a desenha no build de 0% a 100% das seções, e o
// bloco ao vivo pode desenhá-la do ponto atual em diante.

/** A margem da direita cabe os rótulos do fim ("51,1%"). */
const MARGEM_DIREITA = 44;

interface Props {
  /** Distingue os ids internos do SVG (o recorte) quando a página tem mais de uma curva. */
  id: string;
  /** O nome da base da projeção que a curva desenha, para a descrição. */
  base: string;
  /** O finalista cuja fatia é o `y` dos pontos, e o outro. */
  primeiro: FinalistaDaPagina;
  segundo: FinalistaDaPagina;
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
  // Só o que a curva desenha, sem afirmar nada sobre a virada: os marcos dela ficam nos atributos e na legenda.
  const descricao =
    `Curva projetada na base ${base}: ${primeiro.nomeUrna} de ${pct(inicio.y)} a ${pct(fim.y)} e ${segundo.nomeUrna} de ${pct(1 - inicio.y)} a ${pct(1 - fim.y)}, ` +
    `de ${formatarCalculo(inicio.x)}% a ${formatarCalculo(fim.x)}% das seções totalizadas`;

  return (
    <figure
      class="curva-projetada"
      data-curva-projetada
      {...(x === null ? {} : { "data-virada-x": Math.round(x) })}
      {...(cedo === null ? {} : { "data-virada-cedo": Math.round(cedo) })}
      {...(tarde === null ? {} : { "data-virada-tarde": Math.round(tarde) })}
    >
      <Grafico id={id} primeiro={primeiro} segundo={segundo} pontos={pontos} virada={{ x, cedo, tarde }} descricao={descricao} />
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
  primeiro: FinalistaDaPagina;
  segundo: FinalistaDaPagina;
  pontos: PontoDaCurva[];
  /** O ponto e a faixa da virada projetada, cada um `null` quando a curva não o tem. */
  virada: Pick<ViradaProjetada, "x" | "cedo" | "tarde">;
  descricao: string;
}

function Grafico({ id, primeiro, segundo, pontos, virada, descricao }: PropsDoGrafico) {
  // A meia altura da escala, como na curva real, aqui contando a faixa de 95% de cada ponto depois do começo instável.
  let distancia = 0;
  for (const p of pontos) {
    if (p.x <= COMECO_INSTAVEL) continue;
    distancia = Math.max(distancia, Math.abs(100 * (p.y + Z_95 * p.desvio) - 50), Math.abs(100 * (p.y - Z_95 * p.desvio) - 50));
  }
  const escala = escalaDaCurva(distancia);
  const eixos = eixosDaCurva(escala, MARGEM_DIREITA);
  const { x, y, largura, altura } = eixos;
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
      <EixosDaCurva eixos={eixos} escala={escala} recorte={recorte} />
      {virada.cedo !== null && (
        <rect class="faixa-virada" x={x(virada.cedo).toFixed(1)} y={MARGEM.topo} width={Math.max(2, x(virada.tarde ?? 100) - x(virada.cedo)).toFixed(1)} height={altura} />
      )}
      <g clip-path={`url(#${recorte})`}>
        <path class="faixa-projetada" data-cor={primeiro.cor} d={faixa(doPrimeiro)} />
        <path class="faixa-projetada" data-cor={segundo.cor} d={faixa(doSegundo)} />
        <path class="linha-projetada" data-cor={primeiro.cor} d={linha(doPrimeiro)} />
        <path class="linha-projetada" data-cor={segundo.cor} d={linha(doSegundo)} />
      </g>
      {virada.x !== null && <path class="losango-virada" d={`M${x(virada.x).toFixed(1)},${(y(50) - 6).toFixed(1)}l6,6l-6,6l-6,-6z`} />}
      <text class="rotulo-fim" data-cor={primeiro.cor} x={MARGEM.esq + largura + 5} y={(yFim[0]! + 3.5).toFixed(1)}>
        {pct(fim.y)}
      </text>
      <text class="rotulo-fim" data-cor={segundo.cor} x={MARGEM.esq + largura + 5} y={(yFim[1]! + 3.5).toFixed(1)}>
        {pct(1 - fim.y)}
      </text>
    </svg>
  );
}
