import type { ChavesDaNoite } from "@apurador/coletor";
import { antesDaPrimeiraLeitura } from "../lib/leitor-ao-vivo";
import { useQuadroDaPagina } from "../lib/quadro-da-pagina";
import { ColunaDaNarracao } from "./ColunaDaNarracao";

// A ilha da coluna da narração, em cada página de lugar. Ela não lê nada: desenha o quadro que a ilha do bloco ao vivo
// publica a cada leitura (`lib/quadro-da-pagina.ts`). No build, sai no estado de antes das 17h.

interface Props {
  /** O id do lugar nos arquivos ao vivo (`BR`, `SP`, `ZZ`, `71072`). */
  id: string;
  /** As chaves da noite do arquivo de chaves do site, que valem até a primeira rodada do coletor. */
  chaves: ChavesDaNoite;
}

/** A ilha da coluna da narração de um lugar. */
export default function NarracaoDaNoite({ id, chaves }: Props) {
  const quadro = useQuadroDaPagina(antesDaPrimeiraLeitura(chaves));
  return <ColunaDaNarracao quadro={quadro} id={id} />;
}
