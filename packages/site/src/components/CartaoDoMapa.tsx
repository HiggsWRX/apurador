import type { ChavesDaNoite } from "@apurador/coletor";
import { useEffect, useRef, useState } from "preact/hooks";
import { antesDaPrimeiraLeitura } from "../lib/leitor-ao-vivo";
import { mostrarOCartao, useBaseDaPagina, useQuadroDaPagina } from "../lib/quadro-da-pagina";
import { caminhoDaTabelaDeLugares, ORDEM_INICIAL, tabelaDosLugares, type ArquivoDaTabelaDeLugares } from "../lib/tabela-dos-lugares";
import { TabelaDosLugares } from "./TabelaDosLugares";

// A ilha do cartão do mapa, em cada página de lugar (Telas da página de lugar, decisão 8), com a tabela de lugares. O
// mapa desenhado entra no ticket 26. A ilha não lê os arquivos ao vivo: desenha o quadro e a base que a ilha do bloco
// ao vivo publica (`lib/quadro-da-pagina.ts`). Quando o cartão chega perto da tela, ela baixa a tabela de lugares do
// build e avisa o bloco, que passa a ler o mapa.json e a tabela de projeções: antes disso, nenhum dos dois é baixado. No
// build, sai só o título, com a nota de que a tabela vem a seguir. Numa página de município, a tabela abre rolada até ele.

interface Props {
  /** O id do lugar da página, que a tabela destaca quando ele está nela, como um município entre os da UF. */
  id: string;
  /** O lugar cuja tabela de lugares o cartão mostra: o da página, ou a UF (ou o Exterior) de um município. */
  lugarDaTabela: string;
  titulo: string;
  /** As chaves da noite do arquivo de chaves do site, que valem até a primeira rodada do coletor. */
  chaves: ChavesDaNoite;
}

/** Quanto antes de entrar na tela o cartão começa a baixar o que mostra. */
const ANTES_DA_TELA = "300px";

/** A ilha do cartão do mapa de um lugar. */
export default function CartaoDoMapa({ id, lugarDaTabela, titulo, chaves }: Props) {
  const quadro = useQuadroDaPagina(antesDaPrimeiraLeitura(chaves));
  const base = useBaseDaPagina();
  const [arquivo, setArquivo] = useState<ArquivoDaTabelaDeLugares | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [ordem, setOrdem] = useState(ORDEM_INICIAL);
  const raiz = useRef<HTMLElement>(null);
  const atual = id === lugarDaTabela ? undefined : id;

  useEffect(() => {
    const cartao = raiz.current;
    if (!cartao) return;
    const observador = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        observador.disconnect();
        mostrarOCartao();
        fetch(caminhoDaTabelaDeLugares(lugarDaTabela))
          .then((r) => (r.ok ? (r.json() as Promise<ArquivoDaTabelaDeLugares>) : Promise.reject(new Error(`HTTP ${r.status}`))))
          .then(setArquivo, () => setFalhou(true));
      },
      { rootMargin: ANTES_DA_TELA },
    );
    observador.observe(cartao);
    return () => observador.disconnect();
  }, [lugarDaTabela]);

  // A tabela de uma UF tem centenas de municípios, e o da página estaria escondido no meio dela: ela abre rolada até ele,
  // uma vez, sem mexer na rolagem da página.
  useEffect(() => {
    const linha = arquivo && raiz.current?.querySelector<HTMLElement>("tr[aria-current]");
    const caixa = linha?.closest<HTMLElement>(".tabela-dos-lugares");
    if (!linha || !caixa) return;
    caixa.scrollTop += linha.getBoundingClientRect().top - caixa.getBoundingClientRect().top - caixa.clientHeight / 2;
  }, [arquivo]);

  return (
    <section ref={raiz} class="cartao cartao-do-mapa" data-cartao-do-mapa aria-labelledby="cartao-do-mapa-titulo">
      <h2 id="cartao-do-mapa-titulo">{titulo}</h2>
      {arquivo ? (
        <TabelaDosLugares tabela={tabelaDosLugares({ arquivo, quadro, base })} ordem={ordem} aoOrdenar={setOrdem} atual={atual} />
      ) : (
        <p class="nota">{falhou ? "A tabela não carregou. Recarregue a página para tentar de novo." : "A tabela de lugares carrega quando chega à tela."}</p>
      )}
    </section>
  );
}
