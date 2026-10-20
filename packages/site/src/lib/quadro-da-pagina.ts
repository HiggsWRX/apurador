import { useEffect, useState } from "preact/hooks";
import type { QuadroAoVivo } from "./leitor-ao-vivo";

// O quadro do leitor ao vivo, partilhado entre as ilhas de uma página. A ilha do bloco ao vivo faz as leituras e publica
// aqui cada quadro; a coluna da narração, outra ilha (no computador, ela fica à direita da coluna principal, fora do
// bloco), desenha a partir dele, sem ler os arquivos de novo. As duas ilhas importam este módulo, e o navegador o
// carrega uma vez só por página.

let ultimo: QuadroAoVivo | null = null;
const ouvintes = new Set<(quadro: QuadroAoVivo) => void>();

/** Publica o quadro da última leitura para as outras ilhas da página. */
export function publicarQuadro(quadro: QuadroAoVivo) {
  ultimo = quadro;
  for (const ouvir of ouvintes) ouvir(quadro);
}

/** O quadro que a ilha do bloco ao vivo publicou por último, ou o inicial até a primeira publicação. */
export function useQuadroDaPagina(inicial: QuadroAoVivo): QuadroAoVivo {
  const [quadro, setQuadro] = useState(() => ultimo ?? inicial);
  useEffect(() => {
    ouvintes.add(setQuadro);
    if (ultimo) setQuadro(ultimo);
    return () => void ouvintes.delete(setQuadro);
  }, []);
  return quadro;
}
