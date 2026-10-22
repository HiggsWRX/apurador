import { useEffect, useState } from "preact/hooks";
import { BASE_DA_NOITE, type IdDaBase } from "./bases-da-projecao";
import type { QuadroAoVivo } from "./leitor-ao-vivo";

// O quadro do leitor ao vivo, partilhado entre as ilhas de uma página. A ilha do bloco ao vivo faz as leituras e publica
// aqui cada quadro e a base da projeção escolhida; a coluna da narração e o cartão do mapa, outras ilhas (no computador,
// fora do bloco), desenham a partir deles, sem ler os arquivos de novo. O cartão do mapa avisa por aqui que entrou na
// tela, e o bloco passa a ler também os arquivos dele. As ilhas importam este módulo, e o navegador o carrega uma vez só
// por página.

/** Um valor que uma ilha publica e as outras acompanham. */
function partilhado<T>(inicial: T) {
  let valor = inicial;
  const ouvintes = new Set<(valor: T) => void>();
  return {
    publicar(novo: T) {
      valor = novo;
      for (const ouvir of ouvintes) ouvir(novo);
    },
    /** O valor publicado por último, que acompanha as publicações seguintes. */
    usar(): T {
      const [atual, setAtual] = useState(() => valor);
      useEffect(() => {
        const ouvir = (novo: T) => setAtual(() => novo);
        ouvintes.add(ouvir);
        ouvir(valor);
        return () => void ouvintes.delete(ouvir);
      }, []);
      return atual;
    },
  };
}

const quadro = partilhado<QuadroAoVivo | null>(null);
const base = partilhado<IdDaBase>(BASE_DA_NOITE);
const cartaoNaTela = partilhado(false);

/** Publica o quadro da última leitura para as outras ilhas da página. */
export const publicarQuadro = (novo: QuadroAoVivo) => quadro.publicar(novo);

/** O quadro que a ilha do bloco ao vivo publicou por último, ou o inicial até a primeira publicação. */
export const useQuadroDaPagina = (inicial: QuadroAoVivo): QuadroAoVivo => quadro.usar() ?? inicial;

/** Publica a base da projeção que o visitante escolheu na caixa da projeção. */
export const publicarBase = (nova: IdDaBase) => base.publicar(nova);

/** A base da projeção escolhida na página: a da noite até o visitante trocar. */
export const useBaseDaPagina = (): IdDaBase => base.usar();

/** O cartão do mapa entrou na tela: o bloco ao vivo passa a ler o mapa.json e a tabela de projeções. */
export const mostrarOCartao = () => cartaoNaTela.publicar(true);

/** Se o cartão do mapa já entrou na tela. */
export const useCartaoNaTela = (): boolean => cartaoNaTela.usar();
