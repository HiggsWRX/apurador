import { HIPOTESES_ZERADAS, REGIOES, type Hipoteses, type ResultadoDoLugar } from "@apurador/modelo";
import { NOME_DA_BASE, type IdDaBase } from "../lib/bases-da-projecao";
import { formatarCalculo, formatarChance, umaCasa } from "../lib/formato";
import {
  FAIXAS,
  fraseDoQueSeriaPreciso,
  hipotesesProntas,
  mexidas,
  rotuloDoComparecimento,
  rotuloDoVoto,
  traducao,
  type Faixa,
  type FinalistaDoSimulador,
  type FinalistasDoSimulador,
} from "../lib/hipoteses";
import type { TelaDoSimulador } from "../lib/simulador";
import { CurvaProjetada } from "./CurvaProjetada";

// O desenho do simulador "e se" (Simulador "e se", decisões 6 a 10 e 13): a simulação no terceiro nível visual, em
// moldura pontilhada com fundo hachurado e o selo, sempre ao lado da projeção do Apurador; os controles das hipóteses,
// cada um com a tradução em relação ao 1º turno; "o que seria preciso"; as hipóteses prontas; a tabela das regiões;
// "Zerar" e "Copiar link". No celular, de cima para baixo, na ordem da decisão 13, com a barra da simulação fixa; no
// computador, os controles à esquerda e o resultado fixo à direita (o CSS reordena). Sem estado e sem leitura: a ilha
// (`Simulador.tsx`) guarda as hipóteses e passa a tela, e os testes renderizam esta vista em HTML. Nenhuma frase diz
// quem vence: os números, os rótulos curtos e a frase de "o que seria preciso", que fala da simulação.

const METODOLOGIA = "/metodologia/";
/** O selo da simulação (decisão 8). */
export const SELO_DA_SIMULACAO = "Simulação · com as suas hipóteses, não é a projeção do Apurador";

/** O que a vista recebe da ilha. */
export interface PropsDaVista {
  /** Na ordem da base do modelo: as fatias e as hipóteses são do primeiro. */
  finalistas: FinalistasDoSimulador;
  tela: TelaDoSimulador;
  hipoteses: Hipoteses;
  base: IdDaBase;
  /** As bases que vão ao ar: com uma só, não há o controle. */
  bases: IdDaBase[];
  /** O peso das pesquisas na base Apuração + pesquisas, ao lado do controle, ou `null` sem ela. */
  pesoDasPesquisas: number | null;
  /** Se as duas bases já coincidem no Brasil. */
  coincidem: boolean | null;
  /** O placar entre finalistas do Brasil no 1º turno, em % do 1º finalista. */
  placarEntreFinalistasDoBrasil: number;
  /** Quanto as pesquisas finais do 1º turno subestimaram o 1º finalista, em pontos entre os dois, com uma casa: o voto das hipóteses prontas. */
  viesDoPrimeiroTurno: number;
  /** Aberto de um link de outra pessoa, até a primeira mudança. */
  deOutraPessoa: boolean;
  /** As regiões, pela posição em `REGIOES`, que abrem expandidas. */
  regioesAbertas: number[];
  /** O que "Copiar link" deu: copiado, ou o endereço para copiar à mão, quando o navegador não deixa. */
  copia: { estado: "copiado" } | { estado: "manual"; endereco: string } | null;
  aoMudarHipoteses: (h: Hipoteses) => void;
  aoMudarBase: (base: IdDaBase) => void;
  aoCopiar: () => void;
}

/** Os dois finalistas em ordem alfabética, cada um com a posição na base do modelo. */
const emOrdemAlfabetica = (finalistas: FinalistasDoSimulador) =>
  finalistas.map((f, indice) => ({ ...f, indice })).sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR"));

/** Uma região com a preposição: "no Nordeste". */
const naRegiao = (nome: string) => `no ${nome}`;

/** A simulação no Brasil, ao lado da projeção do Apurador: a barra fixa no celular, o topo do resultado no computador. */
export function VistaDoSimulador(props: PropsDaVista) {
  const { finalistas, tela, hipoteses, base, deOutraPessoa } = props;
  const mudar = (h: Partial<Hipoteses["voto"]> & { comparecimento?: readonly number[] }) =>
    props.aoMudarHipoteses({
      voto: { brasil: h.brasil ?? hipoteses.voto.brasil, regioes: h.regioes ?? hipoteses.voto.regioes },
      comparecimento: h.comparecimento ?? hipoteses.comparecimento,
    });
  const preciso = fraseDoQueSeriaPreciso(tela.brasilNaSimulacao.projecao, tela.preciso, finalistas);
  // As hipóteses prontas só existem antes da apuração (decisão 9): depois da primeira seção, a projeção já leva em conta
  // os dados, e um atalho com esse nome mentiria sobre o que faz.
  const prontas = base === "com-pesquisas" && tela.brasilNaProjecao.secoes === 0 ? hipotesesProntas(finalistas, props.viesDoPrimeiroTurno) : [];

  return (
    <>
      {deOutraPessoa && (
        <p class="sim-outra-pessoa" data-outra-pessoa>
          Simulação de outra pessoa · com os dados de agora
        </p>
      )}
      <div class="simulador" data-simulador>
        <div class="sim-lado">
          <BarraDaSimulacao finalistas={finalistas} naSimulacao={tela.brasilNaSimulacao} naProjecao={tela.brasilNaProjecao} />
          <section class="cartao simulacao sim-curva" aria-labelledby="sim-curva-titulo">
            <p class="selo">{SELO_DA_SIMULACAO}</p>
            <h2 id="sim-curva-titulo" class="so-leitor">
              Curva da simulação
            </h2>
            <CurvaProjetada
              id="simulacao"
              base={NOME_DA_BASE[base]}
              primeiro={finalistas[0]}
              segundo={finalistas[1]}
              curva={tela.curvaDaSimulacao}
              doSite={tela.curvaDoSite}
            />
            <p class="nota">
              Resultado final estimado no Brasil, em votos válidos, com a margem de 95%, e <a href={`${METODOLOGIA}#chance`}>chance de vitória</a>.
              Estimativa do Apurador. Não é resultado oficial nem garantia do resultado.
            </p>
            <p class="fonte">Cálculo do Apurador com dados do TSE</p>
          </section>
          <TabelaDasRegioes finalistas={finalistas} tela={tela} />
        </div>
        <div class="sim-controles">
          <section class="cartao sim-preciso" aria-labelledby="sim-preciso-titulo" data-preciso>
            <h2 id="sim-preciso-titulo">O que seria preciso</h2>
            <p aria-live="polite">{preciso.texto}</p>
            {preciso.aplicar !== null && (
              <button type="button" class="sim-botao" onClick={() => mudar({ brasil: preciso.aplicar! })}>
                Aplicar
              </button>
            )}
          </section>
          {props.bases.length > 1 && (
            <div class="base-da-projecao sim-base" role="group" aria-label="Base da projeção">
              <span class="base-rotulo">Base da projeção</span>
              {props.bases.map((b) => (
                <button type="button" data-base-botao={b} aria-pressed={b === base ? "true" : "false"} onClick={() => props.aoMudarBase(b)}>
                  {NOME_DA_BASE[b]}
                </button>
              ))}
              {props.pesoDasPesquisas !== null && (
                <a class="sim-peso" href={`${METODOLOGIA}#juntas`}>
                  {props.coincidem ? "As duas bases já coincidem aqui." : `As pesquisas pesam ${Math.round(100 * props.pesoDasPesquisas)}% na projeção agora.`}
                </a>
              )}
            </div>
          )}
          {prontas.length > 0 && (
            <section class="cartao sim-prontas" aria-labelledby="sim-prontas-titulo" data-prontas>
              <h2 id="sim-prontas-titulo">Hipóteses prontas</h2>
              {prontas.map((p) => (
                <button
                  type="button"
                  class="sim-pronta"
                  aria-pressed={iguais(p.hipoteses, hipoteses) ? "true" : "false"}
                  onClick={() => props.aoMudarHipoteses(p.hipoteses)}
                >
                  {p.rotulo}
                </button>
              ))}
            </section>
          )}
          <section class="cartao sim-controle" aria-labelledby="sim-brasil-titulo" data-controle="brasil">
            <h2 id="sim-brasil-titulo">Voto que falta no Brasil</h2>
            <p class="nota">Quanto o voto que falta pende para um candidato além do que a projeção do Apurador espera, em pontos de votos válidos.</p>
            <ControleDoVoto
              id="sim-voto-brasil"
              rotulo="Voto que falta no Brasil"
              faixa={FAIXAS.brasil}
              pontos={hipoteses.voto.brasil}
              finalistas={finalistas}
              aoMudar={(brasil) => mudar({ brasil })}
            />
            <p class="sim-traducao">{traducao(tela.brasilNaSimulacao.projecao, props.placarEntreFinalistasDoBrasil, "no Brasil", finalistas)}</p>
          </section>
          <section class="cartao sim-regioes" aria-labelledby="sim-regioes-titulo">
            <h2 id="sim-regioes-titulo">Ajustar por região</h2>
            <p class="nota">O voto de cada região soma ao do Brasil. O Exterior segue o Brasil.</p>
            {REGIOES.map((nome, r) => (
              <details class="sim-regiao" data-regiao={nome} open={props.regioesAbertas.includes(r)}>
                <summary>
                  <span class="sim-regiao-nome">{nome}</span>
                  <span class="sim-resumo">{resumoDaRegiao(hipoteses, r, finalistas)}</span>
                </summary>
                <ControleDoVoto
                  id={`sim-voto-${r}`}
                  rotulo={`Voto que falta ${naRegiao(nome)}, além do Brasil`}
                  faixa={FAIXAS.regiao}
                  pontos={hipoteses.voto.regioes[r]!}
                  finalistas={finalistas}
                  aoMudar={(v) => mudar({ regioes: hipoteses.voto.regioes.map((x, i) => (i === r ? v : x)) })}
                />
                <Deslizante
                  id={`sim-comparecimento-${r}`}
                  rotulo={`Comparecimento ${naRegiao(nome)}`}
                  faixa={FAIXAS.comparecimento}
                  valor={hipoteses.comparecimento[r]!}
                  texto={rotuloDoComparecimento(hipoteses.comparecimento[r]!)}
                  pontas={[comSinal(FAIXAS.comparecimento.min), comSinal(FAIXAS.comparecimento.max)]}
                  aoMudar={(v) => mudar({ comparecimento: hipoteses.comparecimento.map((x, i) => (i === r ? v : x)) })}
                />
                <p class="sim-traducao">{traducao(tela.regioes[r]!.naSimulacao, tela.regioes[r]!.primeiroTurno, naRegiao(nome), finalistas)}</p>
              </details>
            ))}
          </section>
          <div class="sim-acoes">
            <button type="button" class="sim-botao" disabled={!mexidas(hipoteses)} onClick={() => props.aoMudarHipoteses(HIPOTESES_ZERADAS)}>
              Zerar
            </button>
            <button type="button" class="sim-botao" onClick={props.aoCopiar}>
              Copiar link
            </button>
            <span role="status" class="sim-copia">
              {props.copia?.estado === "copiado" && "Link copiado."}
            </span>
            {props.copia?.estado === "manual" && (
              <label class="sim-copia-manual">
                Copie o link:
                <input type="text" readOnly value={props.copia.endereco} onFocus={(e) => e.currentTarget.select()} />
              </label>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const iguais = (a: Hipoteses, b: Hipoteses) =>
  a.voto.brasil === b.voto.brasil && a.voto.regioes.every((v, i) => v === b.voto.regioes[i]) && a.comparecimento.every((v, i) => v === b.comparecimento[i]);

/** Um número inteiro com o sinal: "+10", "−10". */
const comSinal = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

/** O que está mexido numa região, para o resumo ao lado do nome: "Lula +2 · comparecimento +3 pontos percentuais". */
function resumoDaRegiao(h: Hipoteses, r: number, finalistas: FinalistasDoSimulador): string {
  const partes = [];
  if (h.voto.regioes[r] !== 0) partes.push(rotuloDoVoto(h.voto.regioes[r]!, finalistas));
  if (h.comparecimento[r] !== 0) partes.push(`comparecimento ${rotuloDoComparecimento(h.comparecimento[r]!)}`);
  return partes.join(" · ");
}

interface PropsDaBarra {
  finalistas: FinalistasDoSimulador;
  naSimulacao: ResultadoDoLugar;
  naProjecao: ResultadoDoLugar;
}

/**
 * A barra da simulação (decisão 13): a simulação e a projeção do Apurador no Brasil, uma linha cada, com o resultado ±
 * a margem de 95% e a chance de vitória. Fica fixa no alto, no celular, e no topo do resultado, no computador.
 */
function BarraDaSimulacao({ finalistas, naSimulacao, naProjecao }: PropsDaBarra) {
  return (
    <section class="sim-barra" aria-label="A simulação e a projeção do Apurador no Brasil" data-barra-da-simulacao>
      <LinhaDaBarra tipo="simulacao" rotulo="Simulação" finalistas={finalistas} resultado={naSimulacao} />
      <LinhaDaBarra tipo="projecao" rotulo="Projeção do Apurador" finalistas={finalistas} resultado={naProjecao} />
    </section>
  );
}

interface PropsDaLinha {
  tipo: "simulacao" | "projecao";
  rotulo: string;
  finalistas: FinalistasDoSimulador;
  resultado: ResultadoDoLugar;
}

function LinhaDaBarra({ tipo, rotulo, finalistas, resultado }: PropsDaLinha) {
  // Arredonda uma vez, a do 1º finalista; a do outro é o complemento, para os dois somarem 100, como na caixa da projeção.
  const doPrimeiro = umaCasa(100 * resultado.projecao);
  const chanceDoPrimeiro = Math.round(100 * resultado.chance);
  const ordem = emOrdemAlfabetica(finalistas);
  const pct = (indice: number) => (indice === 0 ? doPrimeiro : 100 - doPrimeiro);
  const chance = (indice: number) => (indice === 0 ? chanceDoPrimeiro : 100 - chanceDoPrimeiro) / 100;
  return (
    <div class={`sim-linha sim-linha-${tipo}`} data-linha={tipo}>
      <p class="sim-rotulo">{rotulo}</p>
      <p class="sim-valores">
        {ordem.map((f) => (
          <span data-cor={f.cor}>
            {f.nomeCurto} <strong>{formatarCalculo(pct(f.indice))}%</strong>
          </span>
        ))}
        <small class="margem">± {formatarCalculo(100 * resultado.margem)}</small>
      </p>
      {/* Compacta para a barra fixa do celular: "Chance 73% ▬▬ 27%", com os nomes, na ordem dos valores, só para o leitor de tela. */}
      <p class="sim-chance">
        Chance<span class="so-leitor"> de vitória:</span>
        {ordem.map((f, i) => (
          <>
            {i > 0 && (
              <span class="chance-barra" aria-hidden="true">
                {ordem.map((g) => (
                  <i data-cor={g.cor} style={{ width: `${(100 * (g.indice === 0 ? resultado.chance : 1 - resultado.chance)).toFixed(1)}%` }} />
                ))}
                <span class="chance-meio" />
              </span>
            )}
            <span data-cor={f.cor}>
              <span class="so-leitor">{f.nomeCurto} </span>
              <strong>{formatarChance(chance(f.indice))}</strong>
            </span>
          </>
        ))}
      </p>
    </div>
  );
}

interface PropsDaTabela {
  finalistas: FinalistasDoSimulador;
  tela: TelaDoSimulador;
}

/**
 * As cinco regiões, com o resultado final da simulação e o da projeção do Apurador (decisão 7), sem resultado por lugar.
 * As colunas da simulação levam a moldura pontilhada e o hachurado, e as da projeção, a tracejada (decisão 8).
 */
function TabelaDasRegioes({ finalistas, tela }: PropsDaTabela) {
  const ordem = emOrdemAlfabetica(finalistas);
  const pct = (fatia: number, indice: number) => {
    const doPrimeiro = umaCasa(100 * fatia);
    return `${formatarCalculo(indice === 0 ? doPrimeiro : 100 - doPrimeiro)}%`;
  };
  return (
    <section class="cartao sim-tabela" aria-labelledby="sim-tabela-titulo" data-tabela-das-regioes>
      <h2 id="sim-tabela-titulo">As cinco regiões</h2>
      <div class="sim-tabela-rolagem">
        <table>
          <colgroup>
            <col />
          </colgroup>
          <colgroup span={2} class="sim-colunas-da-simulacao" />
          <colgroup span={2} class="sim-colunas-da-projecao" />
          <thead>
            <tr>
              <td />
              <th scope="colgroup" colSpan={2}>
                Simulação
              </th>
              <th scope="colgroup" colSpan={2}>
                Projeção do Apurador
              </th>
            </tr>
            <tr>
              <th scope="col">Região</th>
              {[0, 1].map(() =>
                ordem.map((f) => (
                  <th scope="col" data-cor={f.cor}>
                    {f.nomeCurto}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {tela.regioes.map((r) => (
              <tr data-regiao={r.nome}>
                <th scope="row">{r.nome}</th>
                {ordem.map((f) => (
                  <td data-cor={f.cor}>{pct(r.naSimulacao, f.indice)}</td>
                ))}
                {ordem.map((f) => (
                  <td class="sim-do-site">{pct(r.naProjecao, f.indice)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="nota">Resultado final estimado em cada região, em votos válidos: na simulação, com as suas hipóteses, e na projeção do Apurador.</p>
      <p class="fonte">Cálculo do Apurador com dados do TSE</p>
    </section>
  );
}

interface PropsDoControleDoVoto {
  id: string;
  rotulo: string;
  faixa: Faixa;
  /** Em pontos para o 1º finalista da base. */
  pontos: number;
  finalistas: FinalistasDoSimulador;
  aoMudar: (pontos: number) => void;
}

/**
 * O controle do voto, com o candidato que vem primeiro em ordem alfabética à esquerda: ir para um lado é dar mais voto a
 * quem está daquele lado.
 */
function ControleDoVoto({ id, rotulo, faixa, pontos, finalistas, aoMudar }: PropsDoControleDoVoto) {
  const [esquerda, direita] = emOrdemAlfabetica(finalistas) as [FinalistaDoSimulador & { indice: number }, FinalistaDoSimulador & { indice: number }];
  // No controle, o valor cresce para a direita: são os pontos de quem está à direita.
  const sinal = direita.indice === 0 ? 1 : -1;
  return (
    <Deslizante
      id={id}
      rotulo={rotulo}
      faixa={faixa}
      valor={sinal * pontos}
      texto={rotuloDoVoto(pontos, finalistas)}
      pontas={[`${esquerda.nomeCurto} +${faixa.max}`, `${direita.nomeCurto} +${faixa.max}`]}
      aoMudar={(v) => aoMudar(sinal * v || 0)}
    />
  );
}

interface PropsDoDeslizante {
  id: string;
  rotulo: string;
  faixa: Faixa;
  valor: number;
  /** O valor como a tela o escreve, também para o leitor de tela. */
  texto: string;
  /** O que fica escrito em cada ponta. */
  pontas: [string, string];
  aoMudar: (valor: number) => void;
}

/**
 * Um controle deslizante nos passos da faixa. Um valor fora do passo, como os 2,1 de uma hipótese pronta ou o valor de
 * "Aplicar", fica no estado e no texto, e o navegador põe o cursor no passo mais perto.
 */
function Deslizante({ id, rotulo, faixa, valor, texto, pontas, aoMudar }: PropsDoDeslizante) {
  return (
    <div class="sim-deslizante">
      <div class="sim-deslizante-topo">
        <label for={id}>{rotulo}</label>
        <output for={id}>{texto}</output>
      </div>
      <input
        id={id}
        type="range"
        min={faixa.min}
        max={faixa.max}
        step={faixa.passo}
        value={valor}
        aria-valuetext={texto}
        onInput={(e) => aoMudar(Number(e.currentTarget.value))}
      />
      <div class="sim-pontas" aria-hidden="true">
        <span>{pontas[0]}</span>
        <span>0</span>
        <span>{pontas[1]}</span>
      </div>
    </div>
  );
}
