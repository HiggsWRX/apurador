import type { ArquivoDeRodada, ArquivoDoLugar } from "@apurador/coletor";
import { NOME_DA_BASE, type IdDaBase } from "../lib/bases-da-projecao";
import { formatarCalculo } from "../lib/formato";
import { corDoPartido, nomeCurto } from "../lib/identidade";
import { mudancaEntre, type ProjecaoNaPagina } from "../lib/projecao-ao-vivo";
import { ChanceDeVitoria } from "./ChanceDeVitoria";
import { ValoresDosFinalistas } from "./ValoresDosFinalistas";

// A caixa da projeção durante a apuração (Telas da página de lugar, decisões 3 e 6), depois da curva: numa moldura
// tracejada com fundo próprio e o aviso, o resultado final estimado de cada candidato ± a margem de 95%, a chance de
// vitória, "A projeção, comparada" com o 1º turno e com a indicação das pesquisas (depois do fim do lugar, o resultado)
// e o controle Base da projeção, com o peso das pesquisas ao lado (Combinação de pesquisas e apuração, decisão 5). Os
// números vêm prontos do coletor, nos % do 1º candidato do arquivo de rodada; o do 2º é o que falta para 100. Nenhuma
// frase diz quem vence. A base escolhida fica na ilha, que a passa também à curva.

const METODOLOGIA = "/metodologia/";
/** A lista das pesquisas, na página do Brasil (`ListaDasPesquisas`). */
const PESQUISAS_DO_AGREGADO = "/#pesquisas-registradas";

interface Props {
  projecao: ProjecaoNaPagina;
  candidatos: ArquivoDeRodada["candidatos"];
  tse: ArquivoDoLugar["tse"];
  /** O eleito pela indicação do TSE, pelo nome curto, ou `null`: só no Brasil a chance vai a 100%. */
  eleito: string | null;
  /** Quantas pesquisas o agregado de pesquisas tem, ou `null` sem ele no ar. */
  pesquisasDoAgregado: number | null;
  aoEscolherBase: (base: IdDaBase) => void;
}

/** A projeção do lugar na base escolhida, com o controle das bases. */
export function ProjecaoAoVivo({ projecao, candidatos, tse, eleito, pesquisasDoAgregado, aoEscolherBase }: Props) {
  const { bases, base, naBase, doLugar } = projecao;
  const [primeiro, segundo] = candidatos as [ArquivoDeRodada["candidatos"][number], ArquivoDeRodada["candidatos"][number]];
  /** Um % do 1º candidato repartido entre os dois, como a página escreve um cálculo do Apurador. */
  const osDois = (doPrimeiro: number) => [
    { candidato: { nomeUrna: primeiro.nome, partido: primeiro.partido }, pct: doPrimeiro },
    { candidato: { nomeUrna: segundo.nome, partido: segundo.partido }, pct: 100 - doPrimeiro },
  ];
  const escritos = (doPrimeiro: number) => `${primeiro.nome} ${formatarCalculo(doPrimeiro)}%, ${segundo.nome} ${formatarCalculo(100 - doPrimeiro)}%`;
  // Durante a apuração, compara a projeção, porque o placar parcial depende da ordem de chegada; terminado o lugar, o
  // resultado, entre os dois, com uma casa.
  const terminou = tse.secoes.total > 0 && tse.secoes.totalizadas === tse.secoes.total;
  const [votos1 = 0, votos2 = 0] = tse.votos;
  const comparado = terminou && votos1 + votos2 > 0 ? Math.round((1000 * votos1) / (votos1 + votos2)) / 10 : naBase.projecao;
  const { primeiroTurno, pesquisas } = doLugar.comparacoes;
  const chanceDoPrimeiro = eleito === null ? naBase.chance : nomeCurto(primeiro.nome) === eleito ? 100 : 0;
  const chances = [
    { finalista: { nomeUrna: primeiro.nome, cor: corDoPartido(primeiro.partido) }, chance: chanceDoPrimeiro / 100 },
    { finalista: { nomeUrna: segundo.nome, cor: corDoPartido(segundo.partido) }, chance: 1 - chanceDoPrimeiro / 100 },
  ];

  return (
    <section class="cartao projecao" data-projecao-ao-vivo aria-labelledby="projecao-ao-vivo-titulo">
      <header class="projecao-topo">
        <span class="selo" id="projecao-ao-vivo-titulo">
          Projeção do Apurador
        </span>
        <p class="aviso">Estimativa do Apurador. Não é resultado oficial nem garantia do resultado.</p>
      </header>
      <h3 class="base-titulo">Base da projeção: {NOME_DA_BASE[base]}</h3>
      <ValoresDosFinalistas valores={osDois(naBase.projecao)} margem={naBase.margem} />
      <p class="nota">Resultado final estimado, em votos válidos, com a margem de 95%.</p>
      <ChanceDeVitoria chances={chances} href={`${METODOLOGIA}#chance`} definida={eleito !== null} />
      <p class="nota">
        {terminou ? "O resultado, comparado" : "A projeção, comparada"}: com o 1º turno, pelo placar entre finalistas ({escritos(primeiroTurno)}),{" "}
        {mudancaEntre(candidatos, primeiroTurno, comparado)}; com a indicação das pesquisas ({escritos(pesquisas)}),{" "}
        {mudancaEntre(candidatos, pesquisas, comparado)}.
      </p>
      {bases.length > 1 && (
        <>
          <div class="base-da-projecao" role="group" aria-label="Base da projeção">
            <span class="base-rotulo">Base da projeção</span>
            {bases.map((b) => (
              <button key={b} type="button" data-base-ao-vivo={b} aria-pressed={b === base ? "true" : "false"} onClick={() => aoEscolherBase(b)}>
                {NOME_DA_BASE[b]}
              </button>
            ))}
          </div>
          <p class="nota">
            <a href={`${METODOLOGIA}#juntas`}>
              {doLugar.coincidem ? "As duas bases já coincidem aqui." : `As pesquisas pesam ${projecao.pesoDasPesquisas ?? 0}% na projeção agora.`}
            </a>
          </p>
        </>
      )}
      <p class="links">
        <a href={METODOLOGIA}>Como calculamos →</a>
        {pesquisasDoAgregado !== null && <a href={PESQUISAS_DO_AGREGADO}>as {pesquisasDoAgregado} pesquisas do agregado</a>}
      </p>
      <p class="fonte">Cálculo do Apurador com dados do TSE</p>
    </section>
  );
}
