import { Z_95, type CurvaDoLugar, type PontoDaCurva, type ViradaProjetada } from "@apurador/modelo";
import { formatarCalculo } from "../lib/formato";
import type { PontoDaCurvaRealNoSimulador } from "../lib/simulador-ao-vivo";
import type { FinalistaDaPagina } from "./ChanceDeVitoria";
import { ALTURA, COMECO_INSTAVEL, EixosDaCurva, eixosDaCurva, escalaDaCurva, LARGURA, MARGEM, type Eixos } from "./EixosDaCurva";

// A curva projetada (Telas da página de lugar, decisão 4): as duas linhas tracejadas espelhadas em torno de 50%, cada
// uma com a faixa de 95%, e a virada projetada como um losango sobre a faixa cinza em que ela é possível. Só gráfico e
// rótulos curtos (Segunda consulta jurídica, decisão 5): nenhuma frase diz quem vence ou quando vira, nem na descrição
// para o leitor de tela, e o rótulo do sinal de virada, que precisa de alguém atrás no placar parcial, fica com o
// bloco ao vivo. Sem estado e sem leitura: o painel de antes das 17h a desenha no build de 0% a 100% das seções, e o
// bloco ao vivo desenha as camadas dela (as linhas e as faixas, a faixa da virada e o losango) por cima da curva real,
// do ponto atual em diante. No simulador "e se" (decisão 8 de lá), a curva é a da simulação, pontilhada, sobre a curva
// projetada do site, tracejada e mais clara, e, na noite, sobre a curva real do Brasil, sólida, até o ponto atual.

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
  /** No simulador: a curva projetada do site, que vai por baixo; a `curva` é então a da simulação. */
  doSite?: CurvaDoLugar;
  /** No simulador, na noite: a curva real do Brasil, com a fatia do `primeiro` em cada % de seções. */
  real?: PontoDaCurvaRealNoSimulador[];
}

const pct = (fatia: number) => `${formatarCalculo(100 * fatia)}%`;

/** O ponto e a faixa da virada projetada que o gráfico desenha, cada um `null` quando não há. */
export type ViradaDesenhada = Pick<ViradaProjetada, "x" | "cedo" | "tarde">;

/**
 * Só o que a curva desenha, sem afirmar nada sobre a virada: "Curva projetada na base Só apuração: LULA de 48,2% a
 * 50,9% e …, de 12,0% a 100,0% das seções totalizadas". Os marcos da virada ficam nos atributos e na legenda.
 */
export function descricaoDaCurvaProjetada(
  base: string,
  primeiro: FinalistaDaPagina,
  segundo: FinalistaDaPagina,
  pontos: PontoDaCurva[],
  nome = "Curva projetada",
) {
  const inicio = pontos[0]!;
  const fim = pontos.at(-1)!;
  const deAte = `${primeiro.nomeUrna} de ${pct(inicio.y)} a ${pct(fim.y)} e ${segundo.nomeUrna} de ${pct(1 - inicio.y)} a ${pct(1 - fim.y)}`;
  return `${nome} na base ${base}: ${deAte}, de ${formatarCalculo(inicio.x)}% a ${formatarCalculo(fim.x)}% das seções totalizadas`;
}

/** A curva projetada de um lugar, de onde ela começa até 100% das seções, com a virada projetada. */
export function CurvaProjetada({ id, base, primeiro, segundo, curva, doSite, real = [] }: Props) {
  const { pontos, virada } = curva;
  if (pontos.length === 0) return null;
  const x = virada?.x ?? null;
  const cedo = virada?.cedo ?? null;
  const tarde = virada?.tarde ?? null;
  const fimDoSite = doSite?.pontos.at(-1);
  const descricao =
    descricaoDaCurvaProjetada(base, primeiro, segundo, pontos, doSite ? "Curva da simulação" : "Curva projetada") +
    (doSite && fimDoSite
      ? `; a curva projetada do Apurador termina com ${primeiro.nomeUrna} ${pct(fimDoSite.y)} e ${segundo.nomeUrna} ${pct(1 - fimDoSite.y)}`
      : "");

  return (
    <figure
      class="curva-projetada"
      data-curva-projetada
      {...(x === null ? {} : { "data-virada-x": Math.round(x) })}
      {...(cedo === null ? {} : { "data-virada-cedo": Math.round(cedo) })}
      {...(tarde === null ? {} : { "data-virada-tarde": Math.round(tarde) })}
    >
      <Grafico
        id={id}
        primeiro={primeiro}
        segundo={segundo}
        pontos={pontos}
        doSite={doSite?.pontos}
        real={real}
        virada={{ x, cedo, tarde }}
        descricao={descricao}
      />
      <LegendaDaCurvaProjetada virada={{ x, cedo, tarde }} simulacao={doSite !== undefined} real={real.length > 0} />
    </figure>
  );
}

/** A legenda da curva projetada: as linhas, a faixa de 95% e, quando o gráfico os desenha, o losango e a faixa da virada. */
export function LegendaDaCurvaProjetada({ virada, simulacao = false, real = false }: { virada: ViradaDesenhada; simulacao?: boolean; real?: boolean }) {
  return (
    <figcaption class="legenda">
      {real && (
        <span>
          <i class="amostra amostra-solida" /> Curva real
        </span>
      )}
      {simulacao ? (
        <>
          <span>
            <i class="amostra amostra-pontilhada" /> Simulação
          </span>
          <span>
            <i class="amostra amostra-tracejada amostra-do-site" /> Projeção do Apurador
          </span>
        </>
      ) : (
        <span>
          <i class="amostra amostra-tracejada" /> Curva projetada
        </span>
      )}
      <span>
        <i class="amostra amostra-faixa" /> Faixa de 95%
      </span>
      {virada.x !== null && (
        <span>
          <i class="amostra amostra-losango" /> Virada projetada
        </span>
      )}
      {virada.cedo !== null && (
        <span>
          <i class="amostra amostra-virada" /> % de seções em que a virada é possível
        </span>
      )}
    </figcaption>
  );
}

/**
 * A maior distância de 50% que a curva alcança depois do começo instável, contando a faixa de 95% de cada ponto: é
 * o que ela soma à escala, sozinha ou por cima da curva real.
 */
export function distanciaDaCurvaProjetada(pontos: PontoDaCurva[]): number {
  let distancia = 0;
  for (const p of pontos) {
    if (p.x <= COMECO_INSTAVEL) continue;
    distancia = Math.max(distancia, Math.abs(100 * (p.y + Z_95 * p.desvio) - 50), Math.abs(100 * (p.y - Z_95 * p.desvio) - 50));
  }
  return distancia;
}

interface PropsDasLinhas {
  eixos: Eixos;
  primeiro: FinalistaDaPagina;
  segundo: FinalistaDaPagina;
  pontos: PontoDaCurva[];
  /** A classe das linhas: tracejadas, as do site por baixo da simulação ou as pontilhadas da simulação. */
  classe?: string;
  /** Sem a faixa de 95%: a curva do site por baixo da da simulação. */
  semFaixa?: boolean;
}

/** As faixas de 95% e as linhas dos dois finalistas, para o grupo recortado do gráfico. */
export function LinhasProjetadas({ eixos, primeiro, segundo, pontos, classe = "linha-projetada", semFaixa = false }: PropsDasLinhas) {
  const { x, y } = eixos;
  const ponto = (p: PontoDaCurva, valor: number) => `${x(p.x).toFixed(1)},${y(100 * valor).toFixed(1)}`;
  const linha = (valor: (p: PontoDaCurva) => number) => pontos.map((p, i) => `${i ? "L" : "M"}${ponto(p, valor(p))}`).join("");
  const faixa = (valor: (p: PontoDaCurva) => number) =>
    pontos.map((p, i) => `${i ? "L" : "M"}${ponto(p, valor(p) + Z_95 * p.desvio)}`).join("") +
    [...pontos]
      .reverse()
      .map((p) => `L${ponto(p, valor(p) - Z_95 * p.desvio)}`)
      .join("") +
    "Z";
  const doPrimeiro = (p: PontoDaCurva) => p.y;
  const doSegundo = (p: PontoDaCurva) => 1 - p.y;
  return (
    <>
      {!semFaixa && (
        <>
          <path class="faixa-projetada" data-cor={primeiro.cor} d={faixa(doPrimeiro)} />
          <path class="faixa-projetada" data-cor={segundo.cor} d={faixa(doSegundo)} />
        </>
      )}
      <path class={classe} data-cor={primeiro.cor} d={linha(doPrimeiro)} />
      <path class={classe} data-cor={segundo.cor} d={linha(doSegundo)} />
    </>
  );
}

/** A faixa cinza em que a virada é possível, de alto a baixo do gráfico, por baixo das curvas. */
export function FaixaDaVirada({ eixos, cedo, tarde }: { eixos: Eixos; cedo: number; tarde: number | null }) {
  const { x, altura } = eixos;
  return <rect class="faixa-virada" x={x(cedo).toFixed(1)} y={MARGEM.topo} width={Math.max(2, x(tarde ?? 100) - x(cedo)).toFixed(1)} height={altura} />;
}

/** O losango da virada projetada, sobre os 50%, por cima das curvas. */
export function LosangoDaVirada({ eixos, x }: { eixos: Eixos; x: number }) {
  return <path class="losango-virada" d={`M${eixos.x(x).toFixed(1)},${(eixos.y(50) - 6).toFixed(1)}l6,6l-6,6l-6,-6z`} />;
}

interface PropsDoGrafico {
  id: string;
  primeiro: FinalistaDaPagina;
  segundo: FinalistaDaPagina;
  pontos: PontoDaCurva[];
  /** Os pontos da curva projetada do site, sem faixa, por baixo dos da simulação. */
  doSite?: PontoDaCurva[];
  /** A curva real, sólida, por baixo de todas. */
  real?: PontoDaCurvaRealNoSimulador[];
  /** O ponto e a faixa da virada projetada, cada um `null` quando a curva não o tem. */
  virada: ViradaDesenhada;
  descricao: string;
}

function Grafico({ id, primeiro, segundo, pontos, doSite = [], real = [], virada, descricao }: PropsDoGrafico) {
  // A meia altura da escala, como na curva real, aqui contando a faixa de 95% de cada ponto depois do começo instável.
  let distancia = distanciaDaCurvaProjetada(pontos);
  for (const p of [...doSite, ...real]) if (p.x > COMECO_INSTAVEL) distancia = Math.max(distancia, Math.abs(100 * p.y - 50));
  const escala = escalaDaCurva(distancia);
  const eixos = eixosDaCurva(escala, MARGEM_DIREITA);
  const { y, largura } = eixos;
  // Na simulação, as linhas dela são pontilhadas, e as do site, tracejadas e mais claras, vão por baixo.
  const classeDaLinha = doSite.length > 0 ? "linha-da-simulacao" : "linha-projetada";
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
      {virada.cedo !== null && <FaixaDaVirada eixos={eixos} cedo={virada.cedo} tarde={virada.tarde} />}
      <g clip-path={`url(#${recorte})`}>
        {real.length > 0 &&
          [primeiro, segundo].map((f, i) => (
            <path
              key={f.cor}
              class="linha-real"
              data-linha-real
              data-cor={f.cor}
              d={real.map((p, j) => `${j ? "L" : "M"}${eixos.x(p.x).toFixed(1)},${y(100 * (i === 0 ? p.y : 1 - p.y)).toFixed(1)}`).join("")}
            />
          ))}
        {doSite.length > 0 && (
          <LinhasProjetadas eixos={eixos} primeiro={primeiro} segundo={segundo} pontos={doSite} classe="linha-projetada linha-do-site" semFaixa />
        )}
        <LinhasProjetadas eixos={eixos} primeiro={primeiro} segundo={segundo} pontos={pontos} classe={classeDaLinha} />
      </g>
      {virada.x !== null && <LosangoDaVirada eixos={eixos} x={virada.x} />}
      <text class="rotulo-fim" data-cor={primeiro.cor} x={MARGEM.esq + largura + 5} y={(yFim[0]! + 3.5).toFixed(1)}>
        {pct(fim.y)}
      </text>
      <text class="rotulo-fim" data-cor={segundo.cor} x={MARGEM.esq + largura + 5} y={(yFim[1]! + 3.5).toFixed(1)}>
        {pct(1 - fim.y)}
      </text>
    </svg>
  );
}
