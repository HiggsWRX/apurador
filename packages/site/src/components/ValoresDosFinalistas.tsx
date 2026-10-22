import { formatarCalculo } from "../lib/formato";
import { corDoPartido } from "../lib/identidade";

// O par de números de um cálculo do Apurador, um por finalista, na cor de cada um e com uma casa, e, numa projeção,
// ± a margem de 95%. Sem estado: os blocos de antes das 17h o desenham no build, e a caixa da projeção ao vivo, a cada
// leitura.

interface Props {
  /** Os dois finalistas na ordem da página, cada um com o % dele. */
  valores: { candidato: { nomeUrna: string; partido: string }; pct: number }[];
  /** A margem de 95% da projeção, em pontos: "± 3,5" ao lado de cada número. */
  margem?: number;
}

/** O % de cada finalista num cálculo do Apurador, com a margem de 95% numa projeção. */
export function ValoresDosFinalistas({ valores, margem }: Props) {
  return (
    <p class="valores">
      {valores.map((c) => (
        <span key={c.candidato.nomeUrna} data-cor={corDoPartido(c.candidato.partido)}>
          {c.candidato.nomeUrna} <strong>{formatarCalculo(c.pct)}%</strong>
          {margem !== undefined && <small class="margem">± {formatarCalculo(margem)}</small>}
        </span>
      ))}
    </p>
  );
}
