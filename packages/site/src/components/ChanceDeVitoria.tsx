import { formatarChance } from "../lib/formato";
import type { Cor } from "../lib/identidade";

// A chance de vitória numa barra dividida (Telas da página de lugar, decisão 3): a parte de cada finalista na cor
// dele, com os dois números inteiros, "<1%" e ">99%" nas pontas. Sem estado e sem leitura: o painel de antes das 17h
// a desenha no build, e o bloco da projeção ao vivo pode desenhá-la com a projeção de cada leitura.

/** Um finalista como a página o nomeia nos cálculos: o nome de urna, como o TSE o escreve, e a cor dele. */
export interface FinalistaDaPagina {
  nomeUrna: string;
  cor: Cor;
}

interface Props {
  /** Os dois finalistas na ordem da página (a alfabética), com a chance de vitória de cada um, de 0 a 1. */
  chances: { finalista: FinalistaDaPagina; chance: number }[];
  /** Para onde "Chance de vitória" leva: a seção da metodologia que explica de onde ela vem. */
  href: string;
}

/** A barra dividida da chance de vitória dos dois finalistas, com os números. */
export function ChanceDeVitoria({ chances, href }: Props) {
  // Arredonda uma vez, a do primeiro; a do segundo é o complemento, para os dois inteiros somarem 100.
  const [doPrimeiro, doSegundo] = chances;
  const inteiroDoPrimeiro = Math.round(100 * (doPrimeiro?.chance ?? 0.5));
  const rotulos = [formatarChance(inteiroDoPrimeiro / 100), formatarChance((100 - inteiroDoPrimeiro) / 100)];
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
        {[doPrimeiro, doSegundo].map((c, i) =>
          c ? (
            <span key={c.finalista.nomeUrna} data-cor={c.finalista.cor}>
              {c.finalista.nomeUrna} <strong>{rotulos[i]}</strong>
            </span>
          ) : null,
        )}
      </p>
    </div>
  );
}
