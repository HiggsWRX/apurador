import type { TipoDeLugar } from "@apurador/pipeline";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { ANTES_DA_PRIMEIRA_LEITURA, criarLeitorAoVivo, INTERVALO_DAS_LEITURAS } from "../lib/leitor-ao-vivo";
import { VistaDoBlocoAoVivo } from "./VistaDoBlocoAoVivo";

// A ilha do bloco ao vivo, em cada página de lugar. No build, ela sai no estado de antes das 17h, sem nenhuma leitura.
// No navegador, lê o arquivo de rodada e o JSON do lugar a cada 30 s e redesenha sem recarregar. Sem endereço ao vivo
// (o build da etapa "Antes da noite", sem o coletor), ela fica como saiu do build.

interface Props {
  /** O id do lugar nos arquivos ao vivo (`BR`, `SP`, `ZZ`, `71072`). */
  id: string;
  tipo: TipoDeLugar;
  uf?: string;
  /** A URL da foto oficial de cada candidato, pelo sequencial do TSE. */
  fotos: Record<string, string>;
  /** A raiz dos arquivos ao vivo, com a barra no fim, ou `null` quando não há coletor. */
  base: string | null;
}

/** A ilha do bloco ao vivo de um lugar. */
export default function BlocoAoVivo({ id, tipo, uf, fotos, base }: Props) {
  const leitor = useMemo(() => (base ? criarLeitorAoVivo({ base, lugar: id, buscar: (url, init) => fetch(url, init), relogio: () => performance.now() }) : null), [base, id]);
  const [quadro, setQuadro] = useState(ANTES_DA_PRIMEIRA_LEITURA);
  const [lendo, setLendo] = useState(false);
  const [proximaLeitura, setProximaLeitura] = useState<number | null>(null);
  const [movimentoReduzido, setMovimentoReduzido] = useState(false);
  const [placarNaTela, setPlacarNaTela] = useState(true);
  const raiz = useRef<HTMLDivElement>(null);

  // As leituras: a primeira logo ao abrir, as outras 30 s depois do começo da anterior, sem duas ao mesmo tempo. A
  // página volta a ler na hora quando a aba volta a aparecer ou a internet volta.
  useEffect(() => {
    if (!leitor) return;
    let proxima = 0;
    let espera: ReturnType<typeof setTimeout> | undefined;
    let emAndamento = false;
    const ler = async () => {
      if (emAndamento) return;
      emAndamento = true;
      clearTimeout(espera);
      const inicio = performance.now();
      proxima = inicio + INTERVALO_DAS_LEITURAS * 1000;
      setLendo(true);
      try {
        await leitor.ler();
      } finally {
        emAndamento = false;
        setLendo(false);
        setQuadro(leitor.quadro());
        espera = setTimeout(ler, Math.max(0, proxima - performance.now()));
      }
    };
    // A cada segundo: a contagem regressiva, "há N s" e o anel andam, sem ler nada.
    const segundos = setInterval(() => {
      setQuadro(leitor.quadro());
      setProximaLeitura(Math.max(0, Math.ceil((proxima - performance.now()) / 1000)));
    }, 1000);
    const aoAparecer = () => document.visibilityState === "visible" && ler();
    document.addEventListener("visibilitychange", aoAparecer);
    window.addEventListener("online", ler);
    void ler();
    return () => {
      clearTimeout(espera);
      clearInterval(segundos);
      document.removeEventListener("visibilitychange", aoAparecer);
      window.removeEventListener("online", ler);
    };
  }, [leitor]);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mudar = () => setMovimentoReduzido(consulta.matches);
    mudar();
    consulta.addEventListener("change", mudar);
    return () => consulta.removeEventListener("change", mudar);
  }, []);

  // A linha fixa fica logo abaixo do topo, que leva a busca e não pode ser coberto; a altura dele muda com a largura.
  useEffect(() => {
    const topo = document.querySelector<HTMLElement>(".topo");
    if (!topo) return;
    const medir = () => document.documentElement.style.setProperty("--altura-do-topo", `${topo.offsetHeight}px`);
    const observador = new ResizeObserver(medir);
    observador.observe(topo);
    return () => observador.disconnect();
  }, []);

  // A linha fixa aparece quando o cartão do placar sai da tela por cima.
  useEffect(() => {
    const placar = raiz.current?.querySelector("[data-placar-oficial]");
    if (!placar) return;
    const observador = new IntersectionObserver(([e]) => e && setPlacarNaTela(e.isIntersecting || e.boundingClientRect.top > 0));
    observador.observe(placar);
    return () => observador.disconnect();
  }, []);

  return (
    <div ref={raiz}>
      <VistaDoBlocoAoVivo
        quadro={quadro}
        lugar={{ tipo, uf }}
        fotos={fotos}
        movimentoReduzido={movimentoReduzido}
        proximaLeitura={proximaLeitura}
        lendo={lendo}
        placarNaTela={placarNaTela}
      />
    </div>
  );
}
