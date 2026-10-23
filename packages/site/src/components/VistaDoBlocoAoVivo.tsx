import { BASE_DA_NOITE, type IdDaBase } from "../lib/bases-da-projecao";
import { caminhoDoSimulador } from "../lib/caminho-do-simulador";
import { comOSimulador, emPlanoZero } from "../lib/chaves-ao-vivo";
import type { QuadroAoVivo } from "../lib/leitor-ao-vivo";
import { eventosDoLugar } from "../lib/narracao";
import { curvaProjetadaAoVivo, projecaoNaPagina } from "../lib/projecao-ao-vivo";
import { eleitoPelaIndicacao, manchete, type LugarDaManchete } from "../lib/textos-ao-vivo";
import type { PropsDaComparacao } from "./CurvaDeComparacao";
import { CurvaReal } from "./CurvaReal";
import { FaixaDeAviso } from "./FaixaDeAviso";
import { IndicadorAoVivo } from "./IndicadorAoVivo";
import { LinhaFixa } from "./LinhaFixa";
import { PlacarOficial } from "./PlacarOficial";
import { PlanoZero } from "./PlanoZero";
import { ProjecaoAoVivo } from "./ProjecaoAoVivo";
import { UltimoEvento } from "./UltimoEvento";

// O desenho do bloco ao vivo para um quadro do leitor (Telas da página de lugar, decisões 1 a 6): a manchete com o
// último evento da narração, o placar oficial, a curva real com a curva projetada por cima e a caixa da projeção. Não
// guarda estado nem lê nada: a ilha (`BlocoAoVivo`) faz as leituras, guarda a base da projeção escolhida e passa os
// dois, e os testes renderizam esta vista em HTML.

/** O que a vista recebe da ilha: o quadro da última leitura e o que a ilha sabe da tela e do tempo. */
export interface PropsDaVista {
  quadro: QuadroAoVivo;
  lugar: LugarDaManchete;
  /** A URL da foto oficial de cada candidato, pelo sequencial do TSE. */
  fotos: Record<string, string>;
  /** O visitante prefere movimento reduzido: nada pulsa nem pisca. */
  movimentoReduzido: boolean;
  /** Os segundos até a próxima leitura, para o anel de 30 s. */
  proximaLeitura: number | null;
  /** Uma leitura em andamento: o anel vira uma rodinha. */
  lendo: boolean;
  /** O cartão do placar está na tela: a linha fixa fica escondida. */
  placarNaTela?: boolean;
  /** A curva de comparação: os turnos passados do lugar, o que está ligado e o clique, que a ilha guarda. */
  comparacao?: PropsDaComparacao;
  /** A base da projeção que o visitante escolheu. Padrão: a da noite, "Apuração + pesquisas". */
  base?: IdDaBase;
  aoEscolherBase?: (base: IdDaBase) => void;
  /** Quantas pesquisas o agregado de pesquisas tem, para o link da caixa da projeção, ou `null` sem ele no ar. */
  pesquisasDoAgregado?: number | null;
}

/** O bloco ao vivo para o quadro: a manchete, a linha fixa, o placar oficial, a curva real e a projeção. */
export function VistaDoBlocoAoVivo({
  quadro,
  lugar,
  fotos,
  movimentoReduzido,
  proximaLeitura,
  lendo,
  placarNaTela = true,
  comparacao,
  base = BASE_DA_NOITE,
  aoEscolherBase = () => {},
  pesquisasDoAgregado = null,
}: PropsDaVista) {
  // No plano zero, o bloco inteiro dá lugar ao convite ao app oficial do TSE; a faixa do aviso pronto continua.
  if (emPlanoZero(quadro)) {
    return (
      <div class="bloco-ao-vivo">
        <PlanoZero />
        <FaixaDeAviso aviso={quadro.aviso} />
      </div>
    );
  }
  // Antes das 17h o placar só diz quando a divulgação começa, mesmo com o coletor publicando o TSE zerado.
  const dados = quadro.fase !== "antes-das-17h" && quadro.rodada && quadro.lugar ? { candidatos: quadro.rodada.candidatos, tse: quadro.lugar.tse } : null;
  const indicador = () => (
    <IndicadorAoVivo
      indicador={quadro.indicador}
      ultimaLeitura={quadro.ultimaLeitura}
      ultimaTotalizacao={quadro.rodada?.novidade.totalizacao ?? null}
      movimentoReduzido={movimentoReduzido}
      proximaLeitura={proximaLeitura}
      lendo={lendo}
    />
  );
  // Com movimento reduzido, nada pisca.
  const mudou = (numero: string) => !movimentoReduzido && quadro.mudaram.includes(numero);
  const projecao = dados ? projecaoNaPagina(quadro, base) : null;
  const frase = manchete(quadro, lugar, projecao);
  const eleito = eleitoPelaIndicacao(quadro);
  // O simulador para com a indicação do TSE: a tela dele só diria que o voto que falta não muda mais o resultado.
  const simulador = comOSimulador(quadro) && eleito === null ? caminhoDoSimulador(base, lugar) : null;
  return (
    <div class="bloco-ao-vivo">
      {dados && <LinhaFixa candidatos={dados.candidatos} tse={dados.tse} escondida={placarNaTela} indicador={indicador()} mudou={mudou} />}
      {frase && (
        <p class="manchete" data-manchete>
          {frase}
        </p>
      )}
      <UltimoEvento quadro={quadro} base={base} />
      <FaixaDeAviso aviso={quadro.aviso} />
      <PlacarOficial
        antesDas17h={quadro.fase === "antes-das-17h"}
        candidatos={dados?.candidatos ?? null}
        tse={dados?.tse ?? null}
        fotos={fotos}
        indicador={indicador()}
        mudou={mudou}
        eleito={eleito}
      />
      {dados && (
        <CurvaReal
          candidatos={dados.candidatos}
          curva={quadro.lugar!.curva}
          comparacao={comparacao}
          eventos={eventosDoLugar(quadro)}
          projetada={projecao && curvaProjetadaAoVivo(projecao)}
        />
      )}
      {dados && projecao && (
        <ProjecaoAoVivo
          projecao={projecao}
          candidatos={dados.candidatos}
          tse={dados.tse}
          eleito={eleito}
          pesquisasDoAgregado={pesquisasDoAgregado}
          simulador={simulador}
          aoEscolherBase={aoEscolherBase}
        />
      )}
    </div>
  );
}
