import { HIPOTESES_ZERADAS, type Hipoteses } from "@apurador/modelo";
import { useEffect, useMemo, useState } from "preact/hooks";
import type { ArquivoDoSimulador } from "../lib/arquivo-do-simulador";
import type { IdDaBase } from "../lib/bases-da-projecao";
import { enderecoDaSimulacao, lerEndereco, mexidas, type FinalistasDoSimulador } from "../lib/hipoteses";
import { baseNoSimulador, prepararSimulador, regiaoDaUf, simularNaTela, type DadosDoSimulador } from "../lib/simulador";
import { VistaDoSimulador, type PropsDaVistaDoSimulador } from "./VistaDoSimulador";

// A ilha do simulador "e se", na tela própria dele (Simulador "e se", decisões 5, 6, 11 e 13). No build, ela sai como
// "Carregando o simulador…": o modelo e o arquivo só carregam quando a tela abre, nunca na página de lugar. No
// navegador, baixa o arquivo, prepara a projeção do Apurador em cada base e recalcula a simulação a cada hipótese. O
// endereço traz a base escolhida na página, a UF de onde o simulador foi aberto e, num link compartilhado, as hipóteses.

interface Props {
  /** O caminho do arquivo do simulador no site. */
  arquivo: string;
  finalistas: FinalistasDoSimulador;
  /** A base que a página abre, quando o endereço não traz outra. */
  basePadrao: IdDaBase;
  /** O voto das hipóteses prontas: quanto as pesquisas finais do 1º turno subestimaram o 1º finalista, em pontos entre os dois. */
  viesDoPrimeiroTurno: number;
}

type Estado = { tipo: "carregando" } | { tipo: "erro" } | { tipo: "pronto"; dados: DadosDoSimulador };

/** A ilha do simulador: o arquivo, as hipóteses e a base escolhida. */
export default function Simulador({ arquivo, finalistas, basePadrao, viesDoPrimeiroTurno }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });
  const [hipoteses, setHipoteses] = useState<Hipoteses>(HIPOTESES_ZERADAS);
  const [base, setBase] = useState<IdDaBase>(basePadrao);
  const [deOutraPessoa, setDeOutraPessoa] = useState(false);
  const [regioesAbertas, setRegioesAbertas] = useState<number[]>([]);
  const [copia, setCopia] = useState<PropsDaVistaDoSimulador["copia"]>(null);

  useEffect(() => {
    const endereco = lerEndereco(location.search, finalistas);
    if (endereco.base) setBase(endereco.base);
    setHipoteses(endereco.hipoteses);
    // Um link com hipóteses é a simulação de outra pessoa, recalculada com os dados de agora (decisão 11).
    setDeOutraPessoa(mexidas(endereco.hipoteses));
    let cancelado = false;
    fetch(arquivo)
      .then((r) => {
        if (!r.ok) throw new Error(`${arquivo}: ${r.status}`);
        return r.json() as Promise<ArquivoDoSimulador>;
      })
      .then((a) => {
        if (cancelado) return;
        const dados = prepararSimulador(a);
        // Aberto de uma UF ou de um município, a região do lugar vem expandida, e também as que o link traz mexidas.
        const doLugar = endereco.de === null ? null : regiaoDaUf(dados, endereco.de);
        const mexidasNoLink = endereco.hipoteses.voto.regioes.flatMap((v, r) => (v !== 0 || endereco.hipoteses.comparecimento[r] !== 0 ? [r] : []));
        setRegioesAbertas([...new Set([...(doLugar === null ? [] : [doLugar]), ...mexidasNoLink])]);
        setEstado({ tipo: "pronto", dados });
      })
      .catch(() => !cancelado && setEstado({ tipo: "erro" }));
    return () => {
      cancelado = true;
    };
  }, [arquivo, finalistas]);

  const dados = estado.tipo === "pronto" ? estado.dados : null;
  // A base que vai ao ar: sem o agregado no arquivo, só a "Só apuração", qualquer que seja a do endereço.
  const baseNoAr = dados ? baseNoSimulador(dados, base).id : base;
  const tela = useMemo(() => (dados ? simularNaTela(dados, baseNoAr, hipoteses) : null), [dados, baseNoAr, hipoteses]);

  if (estado.tipo === "erro") {
    return (
      <p class="cartao sim-aviso" role="alert">
        Não conseguimos carregar o simulador. Confira a sua conexão e recarregue a página.
      </p>
    );
  }
  if (!dados || !tela) {
    return (
      <p class="cartao sim-aviso" aria-busy="true">
        Carregando o simulador…
      </p>
    );
  }

  // Depois de qualquer mudança, a simulação deixa de ser a do link de outra pessoa, e o link copiado, o de agora.
  const mexeu = () => {
    setDeOutraPessoa(false);
    setCopia(null);
  };
  const copiar = () => {
    const endereco = `${location.origin}${location.pathname}${enderecoDaSimulacao(baseNoAr, hipoteses, finalistas)}`;
    // Sem a área de transferência (página sem HTTPS, navegador antigo), o endereço fica à vista para copiar à mão.
    if (!navigator.clipboard) return setCopia({ estado: "manual", endereco });
    navigator.clipboard.writeText(endereco).then(
      () => setCopia({ estado: "copiado" }),
      () => setCopia({ estado: "manual", endereco }),
    );
  };
  const comPesquisas = dados.bases.find((b) => b.id === "com-pesquisas")?.partida.projecao;

  return (
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
  );
}
