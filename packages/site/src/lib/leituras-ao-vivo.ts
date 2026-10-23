import { useEffect, useRef, useState } from "preact/hooks";
import { INTERVALO_DAS_LEITURAS, type LeitorAoVivo, type QuadroAoVivo } from "./leitor-ao-vivo";

// O ritmo das leituras na ilha que tem o leitor ao vivo da página: o bloco ao vivo, nas páginas de lugar, e o simulador,
// na tela dele. Cada página tem um leitor só, e as outras ilhas recebem o quadro dela (`quadro-da-pagina.ts`).

/** O que as leituras dão à ilha: o quadro da última, o anel dos 30 s e um jeito de ler fora do ritmo. */
export interface LeiturasAoVivo {
  quadro: QuadroAoVivo;
  /** Uma leitura em andamento: o anel vira uma rodinha. */
  lendo: boolean;
  /** Os segundos até a próxima leitura, para o anel. */
  proximaLeitura: number | null;
  /** Se alguma leitura já terminou: antes dela, a ilha ainda não sabe a fase. */
  lida: boolean;
  /** Lê agora, fora do ritmo dos 30 s, como quando o cartão do mapa entra na tela. */
  lerAgora: () => void;
}

/**
 * As leituras: a primeira logo ao abrir, as outras 30 s depois do começo da anterior, sem duas ao mesmo tempo. A página
 * volta a ler na hora quando a aba volta a aparecer ou a internet volta; pedida no meio de outra, a leitura vem logo
 * depois dela. A cada segundo, a contagem regressiva, "há N s" e o anel andam, sem ler nada. Sem leitor (o build sem o
 * coletor), fica o quadro inicial.
 */
export function useLeiturasAoVivo(leitor: LeitorAoVivo | null, inicial: () => QuadroAoVivo): LeiturasAoVivo {
  const lerAgora = useRef<(() => void) | null>(null);
  const [quadro, setQuadro] = useState(inicial);
  const [lendo, setLendo] = useState(false);
  const [lida, setLida] = useState(false);
  const [proximaLeitura, setProximaLeitura] = useState<number | null>(null);

  useEffect(() => {
    if (!leitor) return;
    let proxima = 0;
    let espera: ReturnType<typeof setTimeout> | undefined;
    let emAndamento = false;
    let outraPedida = false;
    const ler = async () => {
      if (emAndamento) {
        outraPedida = true;
        return;
      }
      emAndamento = true;
      outraPedida = false;
      clearTimeout(espera);
      const inicio = performance.now();
      proxima = inicio + INTERVALO_DAS_LEITURAS * 1000;
      setLendo(true);
      try {
        await leitor.ler();
      } finally {
        emAndamento = false;
        setLendo(false);
        setLida(true);
        setQuadro(leitor.quadro());
        espera = setTimeout(ler, outraPedida ? 0 : Math.max(0, proxima - performance.now()));
      }
    };
    lerAgora.current = () => void ler();
    const segundos = setInterval(() => {
      setQuadro(leitor.quadro());
      setProximaLeitura(Math.max(0, Math.ceil((proxima - performance.now()) / 1000)));
    }, 1000);
    const aoAparecer = () => document.visibilityState === "visible" && ler();
    document.addEventListener("visibilitychange", aoAparecer);
    window.addEventListener("online", ler);
    void ler();
    return () => {
      lerAgora.current = null;
      clearTimeout(espera);
      clearInterval(segundos);
      document.removeEventListener("visibilitychange", aoAparecer);
      window.removeEventListener("online", ler);
    };
  }, [leitor]);

  return { quadro, lendo, proximaLeitura, lida, lerAgora: () => lerAgora.current?.() };
}

/** Se o visitante prefere movimento reduzido: nada pulsa nem pisca, e o anel vira texto. */
export function useMovimentoReduzido(): boolean {
  const [movimentoReduzido, setMovimentoReduzido] = useState(false);
  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mudar = () => setMovimentoReduzido(consulta.matches);
    mudar();
    consulta.addEventListener("change", mudar);
    return () => consulta.removeEventListener("change", mudar);
  }, []);
  return movimentoReduzido;
}
