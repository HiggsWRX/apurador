import type { ArquivoDeRodada, PontoDaCurvaReal } from "@apurador/coletor";
import { formatarPctComCasas } from "../lib/formato";
import { corDoPartido, nomeCurto } from "../lib/identidade";
import { ALTURA, COMECO_INSTAVEL, EixosDaCurva, eixosDaCurva, escalaDaCurva, LARGURA, MARGEM } from "./EixosDaCurva";

// A curva real (Telas da página de lugar, decisão 4): o % de cada candidato ao longo do % de seções totalizadas, as
// duas linhas espelhadas em torno de 50%. A escala vertical ignora o começo instável, até 3% das seções, e recorta o
// que passa dela: sem isso, os 70% do primeiro minuto achatam a noite inteira numa linha reta. A curva projetada, a
// faixa e os marcadores da narração entram por cima nos tickets da projeção e da narração, com os eixos de
// `EixosDaCurva`, que a curva projetada de antes das 17h já usa.

const MARGEM_DIREITA = 16;

interface Props {
  candidatos: ArquivoDeRodada["candidatos"];
  curva: PontoDaCurvaReal[];
}

/** O cartão da curva real do lugar, com a nota enquanto não há seções. */
export function CurvaReal({ candidatos, curva }: Props) {
  const ultimo = curva.at(-1);
  return (
    <section class="cartao curva-real" data-curva-real aria-labelledby="curva-real-titulo">
      <h2 id="curva-real-titulo">Como a apuração andou</h2>
      {!ultimo ? (
        <p class="nota">A curva começa com as primeiras seções totalizadas.</p>
      ) : (
        <Grafico candidatos={candidatos} curva={curva} ultimo={ultimo} />
      )}
      <p class="fonte">Cálculo do Apurador com dados do TSE</p>
    </section>
  );
}

function Grafico({ candidatos, curva, ultimo }: Props & { ultimo: PontoDaCurvaReal }) {
  // A meia altura da escala: a maior distância de 50% depois do começo instável.
  let distancia = 0;
  for (const [secoes = 0, ...pcts] of curva) if (secoes > COMECO_INSTAVEL) for (const p of pcts) distancia = Math.max(distancia, Math.abs(p - 50));
  const escala = escalaDaCurva(distancia);
  const eixos = eixosDaCurva(escala, MARGEM_DIREITA);
  const { x, y, altura } = eixos;
  const linha = (i: number) => curva.map((ponto, j) => `${j ? "L" : "M"}${x(ponto[0] ?? 0).toFixed(1)},${y(ponto[i + 1] ?? 50).toFixed(1)}`).join("");
  const descricao =
    "Curva real: " +
    candidatos.map((c, i) => `${nomeCurto(c.nome)} ${formatarPctComCasas(ultimo[i + 1] ?? 0, 2)}`).join(" e ") +
    ` com ${formatarPctComCasas(ultimo[0] ?? 0, 2)} das seções totalizadas`;

  return (
    <svg class="grafico-curva" viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={descricao}>
      <EixosDaCurva eixos={eixos} escala={escala} recorte="curva-real-recorte" />
      <g clip-path="url(#curva-real-recorte)">
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
    </svg>
  );
}
