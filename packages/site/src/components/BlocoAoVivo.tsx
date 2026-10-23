import type { ChavesDaNoite } from "@apurador/coletor";
import type { TipoDeLugar } from "@apurador/pipeline";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { BASE_DA_NOITE, type IdDaBase } from "../lib/bases-da-projecao";
import { emPlanoZero } from "../lib/chaves-ao-vivo";
import type { TurnoPassado } from "../lib/curva-de-comparacao";
import type { EnderecoAoVivo } from "../lib/enderecos-ao-vivo";
import { useLeiturasAoVivo, useMovimentoReduzido } from "../lib/leituras-ao-vivo";
import { antesDaPrimeiraLeitura, criarLeitorAoVivo, type OpcaoDaTabelaDeProjecoes } from "../lib/leitor-ao-vivo";
import { publicarBase, publicarQuadro, useCartaoNaTela } from "../lib/quadro-da-pagina";
import { useComparacao } from "./CurvaDeComparacao";
import { VistaDoBlocoAoVivo } from "./VistaDoBlocoAoVivo";

// A ilha do bloco ao vivo, em cada página de lugar. No build, ela sai no estado de antes das 17h, sem nenhuma leitura.
// No navegador, lê o arquivo de rodada e o JSON do lugar a cada 30 s e redesenha sem recarregar, no endereço principal ou
// no do plano B (lib/enderecos-ao-vivo.ts). Num município, lê também a tabela de projeções da UF, de onde sai a projeção
// dele; quando o cartão do mapa entra na tela, passa a ler os arquivos dele, na hora e depois a cada leitura. Sem
// endereço ao vivo (o build da etapa "Antes da noite", sem o coletor), ela fica como saiu do build. Ela guarda a base da
// projeção escolhida, que vale para a caixa, a curva e a tabela de lugares, e põe a fase na raiz da página: o painel de
// antes das 17h sai quando a fase passa a ao vivo (`global.css`).

interface Props {
  /** O id do lugar nos arquivos ao vivo (`BR`, `SP`, `ZZ`, `71072`). */
  id: string;
  tipo: TipoDeLugar;
  uf?: string;
  /** O lugar com a preposição, como a manchete o escreve ("na Bahia"). */
  em: string;
  /** A URL da foto oficial de cada candidato, pelo sequencial do TSE. */
  fotos: Record<string, string>;
  /** Os endereços dos arquivos ao vivo, o principal primeiro, ou nenhum quando não há coletor. */
  enderecos: EnderecoAoVivo[];
  /** As chaves da noite do arquivo de chaves do site, que valem até a primeira rodada do coletor. */
  chaves: ChavesDaNoite;
  /** Os turnos passados que o lugar tem, para os botões da curva de comparação; as curvas só vêm no clique. */
  turnosPassados: TurnoPassado[];
  /** Quantas pesquisas o agregado de pesquisas tem, para o link da caixa da projeção, ou `null` sem ele no ar. */
  pesquisasDoAgregado: number | null;
  /** A tabela de projeções que a página lê, se alguma (no Brasil, nenhuma). */
  tabelaDeProjecoes?: OpcaoDaTabelaDeProjecoes;
}

/** A ilha do bloco ao vivo de um lugar. */
export default function BlocoAoVivo({ id, tipo, uf, em, fotos, enderecos, chaves, turnosPassados, pesquisasDoAgregado, tabelaDeProjecoes }: Props) {
  const comparacao = useComparacao(id, turnosPassados);
  const [base, setBase] = useState<IdDaBase>(BASE_DA_NOITE);
  const leitor = useMemo(
    () =>
      enderecos.length > 0
        ? criarLeitorAoVivo({ enderecos, lugar: id, buscar: (url, init) => fetch(url, init), relogio: () => performance.now(), chaves, tabelaDeProjecoes })
        : null,
    [enderecos, id, chaves, tabelaDeProjecoes],
  );
  const cartaoNaTela = useCartaoNaTela();
  const { quadro, lendo, proximaLeitura, lerAgora } = useLeiturasAoVivo(leitor, () => antesDaPrimeiraLeitura(chaves));
  const movimentoReduzido = useMovimentoReduzido();
  const [placarNaTela, setPlacarNaTela] = useState(true);
  const raiz = useRef<HTMLDivElement>(null);

  // A coluna da narração e o cartão do mapa, outras ilhas, desenham a partir do mesmo quadro e da mesma base.
  useEffect(() => publicarQuadro(quadro), [quadro]);
  useEffect(() => publicarBase(base), [base]);
  useEffect(() => void (document.documentElement.dataset.fase = quadro.fase), [quadro.fase]);

  // O cartão do mapa entrou na tela: os arquivos dele vêm na hora, e depois a cada leitura.
  useEffect(() => {
    if (!leitor || !cartaoNaTela) return;
    leitor.incluirOCartao();
    lerAgora();
  }, [leitor, cartaoNaTela]);

  // A linha fixa fica logo abaixo do topo, que leva a busca e não pode ser coberto; a altura dele muda com a largura.
  useEffect(() => {
    const topo = document.querySelector<HTMLElement>(".topo");
    if (!topo) return;
    const medir = () => document.documentElement.style.setProperty("--altura-do-topo", `${topo.offsetHeight}px`);
    const observador = new ResizeObserver(medir);
    observador.observe(topo);
    return () => observador.disconnect();
  }, []);

  // A linha fixa aparece quando o cartão do placar sai da tela por cima. No plano zero não há placar; quando ele volta,
  // o observador é refeito.
  const planoZero = emPlanoZero(quadro);
  useEffect(() => {
    const placar = raiz.current?.querySelector("[data-placar-oficial]");
    if (!placar) return;
    const observador = new IntersectionObserver(([e]) => e && setPlacarNaTela(e.isIntersecting || e.boundingClientRect.top > 0));
    observador.observe(placar);
    return () => observador.disconnect();
  }, [planoZero]);

  return (
    <div ref={raiz}>
      <VistaDoBlocoAoVivo
        quadro={quadro}
        lugar={{ tipo, uf, em }}
        fotos={fotos}
        movimentoReduzido={movimentoReduzido}
        proximaLeitura={proximaLeitura}
        lendo={lendo}
        placarNaTela={placarNaTela}
        comparacao={comparacao}
        base={base}
        aoEscolherBase={setBase}
        pesquisasDoAgregado={pesquisasDoAgregado}
      />
    </div>
  );
}
