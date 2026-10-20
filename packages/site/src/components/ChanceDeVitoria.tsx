import { formatarChance } from "../lib/formato";
import type { Cor } from "../lib/identidade";

// A chance de vitória numa barra dividida (Telas da página de lugar, decisão 3): a parte de cada finalista na cor
// dele, com os dois números inteiros, "<1%" e ">99%" nas pontas. Sem estado e sem leitura: o painel de antes das 17h
// a desenha no build, e o bloco da projeção ao vivo pode desenhá-la com a projeção de cada leitura.

/** Um finalista como o painel o nomeia: o nome de urna, como o TSE o escreve, e a cor dele na página. */
export interface FinalistaDoPainel {
  nomeUrna: string;
  cor: Cor;
}

interface Props {
  /** Os dois finalistas na ordem da página (a alfabética), com a chance de vitória de cada um, de 0 a 1. */
  chances: { finalista: FinalistaDoPainel; chance: number }[];
  /** Para onde "Chance de vitória" leva: a seção da metodologia que explica de onde ela vem. */
  href: string;
}

/** A barra dividida da chance de vitória dos dois finalistas, com os números. */
export function ChanceDeVitoria({ chances, href }: Props) {
  // Arredonda uma vez, a do primeiro; a do segundo é o complemento, para os dois inteiros somarem 100.
  const doPrimeiro = Math.round(100 * (chances[0]?.chance ?? 0.5));
  const inteiros = [doPrimeiro, 100 - doPrimeiro];
  return (
    <div class="chance" data-chance-de-vitoria>
      <h3 class="chance-titulo">
        <a href={href}>Chance de vitória</a>
      </h3>
      <div class="chance-barra" aria-hidden="true">
        {chances.map((c) => (
          <i key={c.finalista.nomeUrna} data-cor={c.finalista.cor} style={{ width: `${(100 * c.chance).toFixed(1)}%` }} />
        ))}
        <span class="chance-meio" />
      </div>
      <p class="chance-rotulos">
        {chances.map((c, i) => (
          <span key={c.finalista.nomeUrna} data-cor={c.finalista.cor}>
            {c.finalista.nomeUrna} <strong>{formatarChance(inteiros[i]! / 100)}</strong>
          </span>
        ))}
      </p>
    </div>
  );
}
