import type { EventoDaNarracao } from "@apurador/coletor";
import { formatarPctComCasas } from "../lib/formato";
import { horaDoEvento } from "../lib/narracao";
import { MARGEM, type EscalaDaCurva, type Eixos } from "./EixosDaCurva";

// A narração por cima da curva real (Telas da página de lugar, decisão 4): cada evento factual do próprio lugar vira
// um número, que bate com o da lista, sobre o placar de quem liderava onde ele foi visto; a virada real vira um ponto
// cheio em 50%. Números que caem perto um do outro (os marcos do fim, a indicação do TSE) sobem em degraus.

/** O raio do círculo de um número, e o passo do degrau quando dois se encostam. */
const RAIO = 7;
const DEGRAU = 2 * RAIO + 1;

interface Props {
  /** Os eventos do próprio lugar, com o número e o ponto da curva. */
  eventos: EventoDaNarracao[];
  eixos: Eixos;
  escala: EscalaDaCurva;
}

/** Os números dos eventos e os pontos das viradas reais, dentro do SVG da curva real. */
export function MarcadoresDaNarracao({ eventos, eixos, escala }: Props) {
  const { x, y } = eixos;
  const naEscala = (pct: number) => Math.min(50 + escala.meia, Math.max(50 - escala.meia, pct));
  const comPonto = eventos.filter((e): e is EventoDaNarracao & { numero: number; ponto: number[] } => e.numero !== undefined && e.ponto !== undefined);
  const postos: { cx: number; cy: number }[] = [];
  const encosta = (cx: number, cy: number) => postos.some((p) => Math.abs(p.cx - cx) < DEGRAU && Math.abs(p.cy - cy) < DEGRAU);
  const marcas = [...comPonto]
    .sort((a, b) => a.numero - b.numero)
    .map((e) => {
      const [secoes = 0, ...pcts] = e.ponto;
      const cx = x(secoes);
      const naCurva = y(naEscala(Math.max(...pcts)));
      // Acima da linha de quem lidera; sem espaço em cima, abaixo dela.
      let cy = naCurva - RAIO - 4;
      while (encosta(cx, cy) && cy - DEGRAU >= MARGEM.topo + RAIO) cy -= DEGRAU;
      if (encosta(cx, cy)) for (cy = naCurva + RAIO + 4; encosta(cx, cy); cy += DEGRAU);
      postos.push({ cx, cy });
      return { numero: e.numero, cx, cy };
    });
  return (
    <g class="marcadores-da-narracao">
      {comPonto
        .filter((e) => e.tipo === "virada")
        .map((e) => (
          <circle key={`virada ${e.numero}`} class="virada-real" data-virada-real cx={x(e.ponto[0] ?? 0)} cy={y(50)} r={4.5} />
        ))}
      {marcas.map((m) => (
        <g key={m.numero} class="evento-na-curva" data-evento-na-curva={m.numero}>
          <circle cx={m.cx} cy={m.cy} r={RAIO} />
          <text x={m.cx} y={m.cy + 3.5} text-anchor="middle">
            {m.numero}
          </text>
        </g>
      ))}
    </g>
  );
}

/** "Virada às 18:44, com 67,74% das seções", uma linha por virada real do lugar, para ir com a curva. */
export function FrasesDasViradas({ eventos }: { eventos: EventoDaNarracao[] }) {
  const viradas = eventos.filter((e) => e.tipo === "virada" && e.ponto !== undefined).reverse();
  return (
    <>
      {viradas.map((e) => (
        <p key={e.quando} class="virada-real-frase" data-virada-real-frase>
          {`Virada às ${horaDoEvento(e)}, com ${formatarPctComCasas(e.ponto![0] ?? 0, 2)} das seções`}
        </p>
      ))}
    </>
  );
}
