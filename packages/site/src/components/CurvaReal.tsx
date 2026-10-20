import type { ArquivoDeRodada, PontoDaCurvaReal } from "@apurador/coletor";
import { formatarPctComCasas } from "../lib/formato";
import { corDoPartido, nomeCurto } from "../lib/identidade";

// A curva real (Telas da página de lugar, decisão 4): o % de cada candidato ao longo do % de seções totalizadas, as
// duas linhas espelhadas em torno de 50%. A escala vertical ignora o começo instável, até 3% das seções, e recorta o
// que passa dela: sem isso, os 70% do primeiro minuto achatam a noite inteira numa linha reta. A curva projetada, a
// faixa e os marcadores da narração entram por cima nos tickets da projeção e da narração.

/** Até esse % de seções, o placar ainda pula demais para decidir a escala. */
const COMECO_INSTAVEL = 3;

// Desenhada para a largura do celular, como o gráfico da tendência do agregado; no computador, ela cresce com o cartão.
const LARGURA = 340;
const ALTURA = 210;
const MARGEM = { esq: 34, dir: 16, topo: 10, base: 32 };
const largura = LARGURA - MARGEM.esq - MARGEM.dir;
const altura = ALTURA - MARGEM.topo - MARGEM.base;

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
  // A meia altura da escala: a maior distância de 50% depois do começo instável, mais 1 ponto de folga, em passos de 2.
  let distancia = 3;
  for (const [secoes = 0, ...pcts] of curva) if (secoes > COMECO_INSTAVEL) for (const p of pcts) distancia = Math.max(distancia, Math.abs(p - 50));
  const meia = Math.min(50, Math.ceil((distancia + 1) / 2) * 2);
  const passo = meia > 20 ? 10 : meia > 8 ? 5 : 2;

  const x = (secoes: number) => MARGEM.esq + (secoes / 100) * largura;
  const y = (pct: number) => MARGEM.topo + altura / 2 - ((pct - 50) / meia) * (altura / 2);
  const linha = (i: number) => curva.map((ponto, j) => `${j ? "L" : "M"}${x(ponto[0] ?? 0).toFixed(1)},${y(ponto[i + 1] ?? 50).toFixed(1)}`).join("");
  const rotulos: number[] = [];
  for (let v = 50 - Math.floor(meia / passo) * passo; v <= 50 + meia; v += passo) rotulos.push(v);
  const descricao =
    "Curva real: " +
    candidatos.map((c, i) => `${nomeCurto(c.nome)} ${formatarPctComCasas(ultimo[i + 1] ?? 0, 2)}`).join(" e ") +
    ` com ${formatarPctComCasas(ultimo[0] ?? 0, 2)} das seções totalizadas`;

  return (
    <svg class="grafico-curva" viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={descricao}>
      <clipPath id="curva-real-recorte">
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
      <g clip-path="url(#curva-real-recorte)">
        {candidatos.map((c, i) => (
          <path key={c.numero} class="linha-real" data-linha-real data-cor={corDoPartido(c.partido)} d={linha(i)} />
        ))}
      </g>
      {(ultimo[0] ?? 0) < 100 && <line class="agora" x1={x(ultimo[0] ?? 0)} x2={x(ultimo[0] ?? 0)} y1={MARGEM.topo} y2={MARGEM.topo + altura} />}
      {candidatos.map((c, i) => (
        <circle key={c.numero} class="ponto-atual" data-cor={corDoPartido(c.partido)} cx={x(ultimo[0] ?? 0)} cy={y(Math.min(50 + meia, Math.max(50 - meia, ultimo[i + 1] ?? 50)))} r={3.5} />
      ))}
    </svg>
  );
}
