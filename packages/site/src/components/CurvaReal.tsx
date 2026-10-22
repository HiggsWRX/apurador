import type { ArquivoDeRodada, EventoDaNarracao, PontoDaCurvaReal } from "@apurador/coletor";
import { formatarPctComCasas } from "../lib/formato";
import { corDoPartido, nomeCurto } from "../lib/identidade";
import type { CurvaProjetadaAoVivo } from "../lib/projecao-ao-vivo";
import type { FinalistaDaPagina } from "./ChanceDeVitoria";
import { ControleDaComparacao, distanciaDaComparacao, LinhasDaComparacao, type PropsDaComparacao } from "./CurvaDeComparacao";
import {
  descricaoDaCurvaProjetada,
  distanciaDaCurvaProjetada,
  FaixaDaVirada,
  LegendaDaCurvaProjetada,
  LinhasProjetadas,
  LosangoDaVirada,
} from "./CurvaProjetada";
import { ALTURA, COMECO_INSTAVEL, EixosDaCurva, eixosDaCurva, escalaDaCurva, LARGURA, MARGEM } from "./EixosDaCurva";
import { FrasesDasViradas, MarcadoresDaNarracao } from "./MarcadoresDaNarracao";

// A curva real (Telas da página de lugar, decisão 4): o % de cada candidato ao longo do % de seções totalizadas, as
// duas linhas espelhadas em torno de 50%. A escala vertical ignora o começo instável, até 3% das seções, e recorta o
// que passa dela: sem isso, os 70% do primeiro minuto achatam a noite inteira numa linha reta. Os números da narração
// e a virada real vão por cima (`MarcadoresDaNarracao`). A curva projetada da base escolhida, tracejada e com a faixa
// de 95%, entra pelas camadas da `CurvaProjetada`, nos mesmos eixos, entre a curva de comparação e a real; a faixa da
// virada vai por baixo de tudo, e o losango, por cima. Embaixo, o rótulo do sinal de virada (Sinal de virada). A
// curva de comparação é uma camada própria (`CurvaDeComparacao`): as linhas por baixo das da curva real, os botões
// embaixo do gráfico.

const MARGEM_DIREITA = 16;

interface Props {
  candidatos: ArquivoDeRodada["candidatos"];
  curva: PontoDaCurvaReal[];
  /** A curva de comparação, que a ilha guarda; sem ela, não há botões. */
  comparacao?: PropsDaComparacao;
  /** Os eventos da narração do próprio lugar: os números na curva e a virada real. */
  eventos?: EventoDaNarracao[];
  /** A curva projetada da base escolhida, com a projeção no ar. */
  projetada?: CurvaProjetadaAoVivo | null;
}

/** O cartão da curva real do lugar, com a nota enquanto não há seções. */
export function CurvaReal({ candidatos, curva, comparacao, eventos = [], projetada }: Props) {
  const ultimo = curva.at(-1);
  return (
    <section class="cartao curva-real" data-curva-real aria-labelledby="curva-real-titulo">
      <h2 id="curva-real-titulo">Como a apuração andou</h2>
      {!ultimo ? (
        <p class="nota">A curva começa com as primeiras seções totalizadas.</p>
      ) : (
        <>
          <Grafico candidatos={candidatos} curva={curva} ultimo={ultimo} comparacao={comparacao} eventos={eventos} projetada={projetada} />
          {projetada && <LegendaDaCurvaProjetada virada={projetada.virada} />}
          {projetada?.rotulo && (
            <p class="sinal-de-virada" data-sinal-de-virada>
              <a href="/metodologia/#virada">{projetada.rotulo}</a>
            </p>
          )}
          <FrasesDasViradas eventos={eventos} />
          {comparacao && <ControleDaComparacao {...comparacao} />}
        </>
      )}
      <p class="fonte">Cálculo do Apurador com dados do TSE</p>
    </section>
  );
}

function Grafico({ candidatos, curva, ultimo, comparacao, eventos = [], projetada }: Props & { ultimo: PontoDaCurvaReal }) {
  // A meia altura da escala: a maior distância de 50% depois do começo instável, nesta curva, na de comparação e na
  // projetada, com a faixa de 95%.
  let distancia = Math.max(comparacao ? distanciaDaComparacao(comparacao) : 0, projetada ? distanciaDaCurvaProjetada(projetada.pontos) : 0);
  for (const [secoes = 0, ...pcts] of curva) if (secoes > COMECO_INSTAVEL) for (const p of pcts) distancia = Math.max(distancia, Math.abs(p - 50));
  const escala = escalaDaCurva(distancia);
  const eixos = eixosDaCurva(escala, MARGEM_DIREITA);
  const { x, y, altura } = eixos;
  const linha = (i: number) => curva.map((ponto, j) => `${j ? "L" : "M"}${x(ponto[0] ?? 0).toFixed(1)},${y(ponto[i + 1] ?? 50).toFixed(1)}`).join("");
  const [primeiro, segundo] = candidatos.map((c): FinalistaDaPagina => ({ nomeUrna: c.nome, cor: corDoPartido(c.partido) })) as [
    FinalistaDaPagina,
    FinalistaDaPagina,
  ];
  const descricao =
    "Curva real: " +
    candidatos.map((c, i) => `${nomeCurto(c.nome)} ${formatarPctComCasas(ultimo[i + 1] ?? 0, 2)}`).join(" e ") +
    ` com ${formatarPctComCasas(ultimo[0] ?? 0, 2)} das seções totalizadas` +
    (projetada ? `; ${descricaoDaCurvaProjetada(projetada.base, primeiro, segundo, projetada.pontos)}` : "");

  return (
    <svg class="grafico-curva" viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={descricao}>
      <EixosDaCurva eixos={eixos} escala={escala} recorte="curva-real-recorte" />
      {projetada?.virada.cedo != null && <FaixaDaVirada eixos={eixos} cedo={projetada.virada.cedo} tarde={projetada.virada.tarde} />}
      <g clip-path="url(#curva-real-recorte)">
        {comparacao && <LinhasDaComparacao {...comparacao} eixos={eixos} />}
        {projetada && <LinhasProjetadas eixos={eixos} primeiro={primeiro} segundo={segundo} pontos={projetada.pontos} />}
        {candidatos.map((c, i) => (
          <path key={c.numero} class="linha-real" data-linha-real data-cor={corDoPartido(c.partido)} d={linha(i)} />
        ))}
      </g>
      {(ultimo[0] ?? 0) < 100 && <line class="agora" x1={x(ultimo[0] ?? 0)} x2={x(ultimo[0] ?? 0)} y1={MARGEM.topo} y2={MARGEM.topo + altura} />}
      {candidatos.map((c, i) => (
        <circle
          key={c.numero}
          class="ponto-atual"
          data-cor={corDoPartido(c.partido)}
          cx={x(ultimo[0] ?? 0)}
          cy={y(Math.min(50 + escala.meia, Math.max(50 - escala.meia, ultimo[i + 1] ?? 50)))}
          r={3.5}
        />
      ))}
      {projetada?.virada.x != null && <LosangoDaVirada eixos={eixos} x={projetada.virada.x} />}
      <MarcadoresDaNarracao eventos={eventos} eixos={eixos} escala={escala} />
    </svg>
  );
}
