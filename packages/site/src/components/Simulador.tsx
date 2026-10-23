import type { ArquivoDoSimuladorAoVivo, ChavesDaNoite } from "@apurador/coletor";
import { HIPOTESES_ZERADAS, type Hipoteses } from "@apurador/modelo";
import { useEffect, useMemo, useState } from "preact/hooks";
import type { ArquivoDoSimulador } from "../lib/arquivo-do-simulador";
import type { IdDaBase } from "../lib/bases-da-projecao";
import type { EnderecoAoVivo } from "../lib/enderecos-ao-vivo";
import { enderecoDaSimulacao, lerEndereco, mexidas, type EnderecoLido, type FinalistasDoSimulador } from "../lib/hipoteses";
import { useLeiturasAoVivo, useMovimentoReduzido } from "../lib/leituras-ao-vivo";
import { antesDaPrimeiraLeitura, criarLeitorAoVivo } from "../lib/leitor-ao-vivo";
import { baseNoSimulador, prepararSimulador, regiaoDaUf, simularNaTela, type DadosDoSimulador } from "../lib/simulador";
import { curvaRealNoSimulador, faseDoSimulador } from "../lib/simulador-ao-vivo";
import { IndicadorAoVivo } from "./IndicadorAoVivo";
import { SimuladorFechado } from "./SimuladorFechado";
import { VistaDoSimulador, type PropsDaVistaDoSimulador } from "./VistaDoSimulador";

// A ilha do simulador "e se", na tela própria dele (Simulador "e se", decisões 5, 6, 11, 12 e 13). No build, ela sai como
// "Carregando o simulador…": o modelo e o arquivo só carregam quando a tela abre, nunca na página de lugar. No
// navegador, baixa o arquivo do build (a base do modelo) e lê, pelo leitor ao vivo, o arquivo de rodada, o Brasil e o
// arquivo do simulador que o coletor publica, a cada 30 s, como uma página de lugar, com um leitor só. Antes das 17h,
// simula sobre o arquivo do build, nada totalizado; na noite, sobre cada arquivo novo do coletor, com as hipóteses
// paradas; no fim, fecha. O endereço traz a base escolhida na página, a UF de onde o simulador foi aberto e, num link
// compartilhado, as hipóteses.

/** O arquivo do simulador nos arquivos ao vivo, que o coletor grava a cada rodada em que ele muda. */
const ARQUIVO_DA_NOITE = "simulador.json";

/** O que o simulador faz, acima dele; a tela fechada fica sem. */
const Introducao = () => (
  <p class="sim-intro">
    Mude quanto o voto que falta pende para cada candidato e o comparecimento em cada região, e veja a simulação ao lado da projeção do Apurador. A simulação
    usa o mesmo modelo da projeção, com os dados de agora. <a href="/metodologia/#virada">Como funciona →</a>
  </p>
);

interface Props {
  /** O caminho do arquivo do simulador no site. */
  arquivo: string;
  finalistas: FinalistasDoSimulador;
  /** A base que a página abre, quando o endereço não traz outra. */
  basePadrao: IdDaBase;
  /** O voto das hipóteses prontas: quanto as pesquisas finais do 1º turno subestimaram o 1º finalista, em pontos entre os dois. */
  viesDoPrimeiroTurno: number;
  /** Se o simulador abre antes das 17h, pelas chaves de antes das 17h (`SIMULADOR_ANTES_DAS_17H`). */
  antesDas17h: boolean;
  /** Os endereços dos arquivos ao vivo, o principal primeiro, ou nenhum quando não há coletor. */
  enderecos: EnderecoAoVivo[];
  /** As chaves da noite do arquivo de chaves do site, que valem até a primeira rodada do coletor. */
  chaves: ChavesDaNoite;
}

type Estado = { tipo: "carregando" } | { tipo: "erro" } | { tipo: "pronto"; arquivo: ArquivoDoSimulador };

/** A projeção do Apurador em cada base, sobre o arquivo do build e, na noite, o do coletor; `null` se os dois não se juntam. */
function preparar(arquivo: ArquivoDoSimulador, daNoite: ArquivoDoSimuladorAoVivo | undefined): DadosDoSimulador | null {
  try {
    return prepararSimulador(arquivo, daNoite);
  } catch {
    return null;
  }
}

/** As regiões que abrem expandidas: a do lugar de onde o simulador foi aberto e as que o link traz mexidas. */
function regioesDoEndereco(dados: DadosDoSimulador, endereco: EnderecoLido): number[] {
  const doLugar = endereco.de === null ? null : regiaoDaUf(dados, endereco.de);
  const mexidasNoLink = endereco.hipoteses.voto.regioes.flatMap((v, r) => (v !== 0 || endereco.hipoteses.comparecimento[r] !== 0 ? [r] : []));
  return [...new Set([...(doLugar === null ? [] : [doLugar]), ...mexidasNoLink])];
}

/** A ilha do simulador: o arquivo, as leituras, as hipóteses e a base escolhida. */
export default function Simulador({ arquivo, finalistas, basePadrao, viesDoPrimeiroTurno, antesDas17h, enderecos, chaves }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });
  const [endereco, setEndereco] = useState<EnderecoLido | null>(null);
  const [hipoteses, setHipoteses] = useState<Hipoteses>(HIPOTESES_ZERADAS);
  const [base, setBase] = useState<IdDaBase>(basePadrao);
  const [deOutraPessoa, setDeOutraPessoa] = useState(false);
  const [copia, setCopia] = useState<PropsDaVistaDoSimulador["copia"]>(null);
  const leitor = useMemo(
    () =>
      enderecos.length > 0
        ? criarLeitorAoVivo({
            enderecos,
            lugar: "BR",
            buscar: (url, init) => fetch(url, init),
            relogio: () => performance.now(),
            chaves,
            simulador: ARQUIVO_DA_NOITE,
          })
        : null,
    [enderecos, chaves],
  );
  const { quadro, lendo, proximaLeitura, lida } = useLeiturasAoVivo(leitor, () => antesDaPrimeiraLeitura(chaves));
  const movimentoReduzido = useMovimentoReduzido();

  useEffect(() => {
    const lido = lerEndereco(location.search, finalistas);
    setEndereco(lido);
    if (lido.base) setBase(lido.base);
    setHipoteses(lido.hipoteses);
    // Um link com hipóteses é a simulação de outra pessoa, recalculada com os dados de agora (decisão 11).
    setDeOutraPessoa(mexidas(lido.hipoteses));
    let cancelado = false;
    fetch(arquivo)
      .then((r) => {
        if (!r.ok) throw new Error(`${arquivo}: ${r.status}`);
        return r.json() as Promise<ArquivoDoSimulador>;
      })
      .then((a) => !cancelado && setEstado({ tipo: "pronto", arquivo: a }))
      .catch(() => !cancelado && setEstado({ tipo: "erro" }));
    return () => {
      cancelado = true;
    };
  }, [arquivo, finalistas]);

  // Com o leitor, a fase só se sabe depois da primeira leitura: até lá, a tela espera, para não simular antes das 17h
  // no meio da noite.
  const fase = leitor && !lida ? null : faseDoSimulador(quadro, antesDas17h);
  const daNoite = fase?.tipo === "ao-vivo" ? fase.daNoite : undefined;
  const doBuild = estado.tipo === "pronto" ? estado.arquivo : null;
  // Cada arquivo novo do coletor refaz a projeção; as hipóteses ficam.
  const dados = useMemo(() => (doBuild && fase !== null && daNoite !== null ? preparar(doBuild, daNoite) : null), [doBuild, fase !== null, daNoite]);
  // A base que vai ao ar: sem o agregado, só a "Só apuração", qualquer que seja a do endereço.
  const baseNoAr = dados ? baseNoSimulador(dados, base).id : base;
  const tela = useMemo(() => (dados ? simularNaTela(dados, baseNoAr, hipoteses) : null), [dados, baseNoAr, hipoteses]);
  const regioesAbertas = useMemo(() => (dados && endereco ? regioesDoEndereco(dados, endereco) : []), [dados, endereco]);

  if (fase && fase.tipo !== "antes-das-17h" && fase.tipo !== "ao-vivo") return <SimuladorFechado fechamento={fase} />;
  if (estado.tipo === "erro" || (doBuild && fase !== null && daNoite !== null && !dados)) {
    return (
      <>
        <Introducao />
        <p class="cartao sim-aviso" role="alert">
          Não conseguimos carregar o simulador. Confira a sua conexão e recarregue a página.
        </p>
      </>
    );
  }
  if (!dados || !tela) {
    return (
      <>
        <Introducao />
        <p class="cartao sim-aviso" aria-busy="true">
          Carregando o simulador…
        </p>
      </>
    );
  }

  // Depois de qualquer mudança, a simulação deixa de ser a do link de outra pessoa, e o link copiado, o de agora.
  const mexeu = () => {
    setDeOutraPessoa(false);
    setCopia(null);
  };
  const copiar = () => {
    const link = `${location.origin}${location.pathname}${enderecoDaSimulacao(baseNoAr, hipoteses, finalistas)}`;
    // Sem a área de transferência (página sem HTTPS, navegador antigo), o endereço fica à vista para copiar à mão.
    if (!navigator.clipboard) return setCopia({ estado: "manual", endereco: link });
    navigator.clipboard.writeText(link).then(
      () => setCopia({ estado: "copiado" }),
      () => setCopia({ estado: "manual", endereco: link }),
    );
  };
  const comPesquisas = dados.bases.find((b) => b.id === "com-pesquisas")?.partida.projecao;
  const naNoite = fase?.tipo === "ao-vivo";

  return (
    <>
      <Introducao />
      <VistaDoSimulador
        finalistas={finalistas}
        tela={tela}
        hipoteses={hipoteses}
        base={baseNoAr}
        bases={dados.bases.map((b) => b.id)}
        pesoDasPesquisas={comPesquisas ? comPesquisas.pesoDasPesquisas : null}
        coincidem={dados.coincidem}
        placarEntreFinalistasDoBrasil={dados.placarEntreFinalistasDoBrasil}
        viesDoPrimeiroTurno={viesDoPrimeiroTurno}
        deOutraPessoa={deOutraPessoa}
        regioesAbertas={regioesAbertas}
        copia={copia}
        indicador={
          naNoite && (
            <IndicadorAoVivo
              indicador={quadro.indicador}
              ultimaLeitura={quadro.ultimaLeitura}
              ultimaTotalizacao={quadro.rodada?.novidade.totalizacao ?? null}
              movimentoReduzido={movimentoReduzido}
              proximaLeitura={proximaLeitura}
              lendo={lendo}
            />
          )
        }
        curvaReal={naNoite ? curvaRealNoSimulador(quadro, [finalistas[0].nomeUrna, finalistas[1].nomeUrna]) : undefined}
        aoMudarHipoteses={(h) => {
          setHipoteses(h);
          mexeu();
        }}
        aoMudarBase={(b) => {
          setBase(b);
          mexeu();
        }}
        aoCopiar={copiar}
      />
    </>
  );
}
