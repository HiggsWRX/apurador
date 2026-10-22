import type { ChavesDaNoite } from "@apurador/coletor";
import { useEffect, useRef, useState } from "preact/hooks";
import { antesDaPrimeiraLeitura } from "../lib/leitor-ao-vivo";
import { mostrarOCartao, useBaseDaPagina, useQuadroDaPagina } from "../lib/quadro-da-pagina";
import { caminhoDaTabela, ORDEM_INICIAL, tabelaDosLugares, type ArquivoDaTabela } from "../lib/tabela-dos-lugares";
import { TabelaDosLugares } from "./TabelaDosLugares";

// A ilha do cartão do mapa, em cada página de lugar (Telas da página de lugar, decisão 8), com a tabela de lugares. O
// mapa desenhado entra no ticket 26. A ilha não lê os arquivos ao vivo: desenha o quadro e a base que a ilha do bloco
// ao vivo publica (`lib/quadro-da-pagina.ts`). Quando o cartão chega perto da tela, ela baixa a tabela do build e avisa
// o bloco, que passa a ler o mapa.json e a tabela de projeções: antes disso, nenhum dos dois é baixado. No build, sai só o
// título, com a nota de que a tabela vem a seguir.

interface Props {
  /** O id do lugar da página, que a tabela destaca quando ele está nela, como um município entre os da UF. */
  id: string;
  /** O lugar cujos lugares abaixo a tabela traz: o da página, ou a UF (ou o Exterior) de um município. */
  dono: string;
  titulo: string;
  /** As chaves da noite do arquivo de chaves do site, que valem até a primeira rodada do coletor. */
  chaves: ChavesDaNoite;
}

/** Quanto antes de entrar na tela o cartão começa a baixar o que mostra. */
const ANTES_DA_TELA = "300px";

/** A ilha do cartão do mapa de um lugar. */
export default function CartaoDoMapa({ id, dono, titulo, chaves }: Props) {
  const quadro = useQuadroDaPagina(antesDaPrimeiraLeitura(chaves));
  const base = useBaseDaPagina();
  const [arquivo, setArquivo] = useState<ArquivoDaTabela | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [ordem, setOrdem] = useState(ORDEM_INICIAL);
  const raiz = useRef<HTMLElement>(null);

  useEffect(() => {
    const cartao = raiz.current;
    if (!cartao) return;
    const observador = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        observador.disconnect();
        mostrarOCartao();
        fetch(caminhoDaTabela(dono))
          .then((r) => (r.ok ? (r.json() as Promise<ArquivoDaTabela>) : Promise.reject(new Error(`HTTP ${r.status}`))))
          .then(setArquivo, () => setFalhou(true));
      },
      { rootMargin: ANTES_DA_TELA },
    );
    observador.observe(cartao);
    return () => observador.disconnect();
  }, [dono]);

  return (
    <section ref={raiz} class="cartao cartao-do-mapa" data-cartao-do-mapa aria-labelledby="cartao-do-mapa-titulo">
      <h2 id="cartao-do-mapa-titulo">{titulo}</h2>
      {arquivo ? (
        <TabelaDosLugares tabela={tabelaDosLugares({ arquivo, quadro, base })} ordem={ordem} aoOrdenar={setOrdem} atual={id === dono ? undefined : id} />
      ) : (
        <p class="nota">{falhou ? "A tabela não carregou. Recarregue a página para tentar de novo." : "A tabela de lugares carrega quando chega à tela."}</p>
      )}
    </section>
  );
}
