import {
  agregadoDePesquisas,
  DIA_DA_ELEICAO,
  diaDoAgregado,
  indicacaoDasPesquisas,
  INICIO_DO_2O_TURNO,
  placarEntreFinalistas,
  tendenciaDoAgregado,
  type Agregado,
} from "@apurador/modelo";
import {
  agregadoDaNoite,
  finalistas,
  lerPesquisasHistoricas,
  listaDasPesquisas,
  pesquisasDaNoitePassada,
  pesquisasDoAgregado,
  type CandidatoDoTurno,
  type ExtratoDoTse,
  type PesquisaHistorica,
  type ResultadoHistorico,
  type Turno,
} from "@apurador/pipeline";
import historicasCsv from "../../../../dados/pesquisas-historicas.csv?raw";
import institutos from "../../../../dados/pesquisas-institutos.csv?raw";
import extrato from "../../../../dados/pesquisas-tse.json";
import verificacoes from "../../../../dados/pesquisas-verificacoes.csv?raw";
import pesquisasCsv from "../../../../dados/pesquisas.csv?raw";
import resultadosHistoricos from "../../../../dados/resultados-historicos.json";
import primeiroTurnoDe2022 from "../../../../dados/turnos/2022-1.json";
import primeiroTurno from "../../../../dados/turnos/2026-1.json";
import retiradasDoEnsaio from "../../ensaio/pesquisas-retiradas.json";
import { ENSAIO } from "./ensaio";
import { umaCasa } from "./formato";

// As pesquisas no build: a lista conferida no TSE, o agregado de pesquisas, a tendência e a indicação das pesquisas
// de cada lugar, todos do módulo `modelo` sobre o mesmo pesquisas.csv. Os exportados soltos são os da noite que o
// painel de antes das 17h mostra: a de 25/10 ou, no build do ensaio geral, a de 30/10/2022, com as pesquisas finais do
// 2º turno de 2022 e o 1º turno de 2022 (Ensaio geral, decisão 3). A metodologia fala sempre de 2026 e lê
// `PESQUISAS_DE_2026`.

export const EXTRATO = extrato as ExtratoDoTse;
const TURNO_DE_2026 = primeiroTurno as Turno;

/** A lista das pesquisas. Uma linha do pesquisas.csv que não bata com o extrato do TSE quebra o build: nunca vai ao ar. */
export const PESQUISAS = listaDasPesquisas({ pesquisas: pesquisasCsv, institutos, extrato: EXTRATO, verificacoes, turno: TURNO_DE_2026 });

/** Um valor do primeiro finalista (em %) repartido entre os dois, na ordem alfabética, a mesma de toda a página. */
export interface PctDoCandidato {
  candidato: CandidatoDoTurno;
  pct: number;
}

/** A indicação das pesquisas de um lugar, com o placar entre finalistas dele, ou por que ela não existe. */
export type IndicacaoDoLugar =
  { tipo: "indicacao"; placarEntreFinalistas: number; indicacao: number } | { tipo: "sem-votacao" } | { tipo: "sem-voto-nos-finalistas" };

/** As pesquisas de uma noite no build, sobre o 1º turno dela, com as contas entre os finalistas que a página faz. */
export interface PesquisasDaNoite {
  turno: Turno;
  agregado: Agregado | undefined;
  tendencia: Agregado[];
  /** O dia seguinte ao 1º turno, de onde a tendência parte, e o dia da eleição, `aaaa-mm-dd`. */
  calendario: { inicio: string; dia: string };
  /** Os dois finalistas na ordem do agregado: o primeiro é aquele cujo % o agregado dá. */
  finalistas: readonly [CandidatoDoTurno, CandidatoDoTurno];
  /** O placar entre finalistas do Brasil no 1º turno, em % do primeiro finalista: a base da mudança nacional. */
  placarEntreFinalistasDoBrasil: number;
  /** O % do primeiro finalista repartido entre os dois, na ordem da página. */
  entreOsFinalistas(doPrimeiro: number): PctDoCandidato[];
  /** Quem ganhou terreno, no formato "LULA +1,8": a diferença no % do primeiro finalista, já com uma casa. */
  quemGanhou(diferenca: number): { candidato: CandidatoDoTurno; pontos: number } | undefined;
  /**
   * Quem ganhou terreno de um % do primeiro finalista a outro, entre os números como a página os mostra, com uma casa,
   * para a conta fechar na página: 51,0%, +0,1, 51,1%.
   */
  quemGanhouEntre(de: number, para: number): { candidato: CandidatoDoTurno; pontos: number } | undefined;
  /** A indicação das pesquisas de uma UF, do Exterior ou de um município, ou o motivo de não haver. */
  indicacaoDoLugar(id: string): IndicacaoDoLugar | undefined;
}

function pesquisasDaNoite(turno: Turno, agregado: Agregado | undefined, tendencia: Agregado[], calendario: PesquisasDaNoite["calendario"]): PesquisasDaNoite {
  const [primeiro, segundo] = finalistas(turno).map((n) => turno.candidatos.findIndex((c) => c.numero === n)) as [number, number];
  const doisFinalistas = [turno.candidatos[primeiro]!, turno.candidatos[segundo]!] as const;
  const placarDoLugar = (id: string): number | undefined => {
    const votos = turno.lugares[id]?.votos;
    return votos && placarEntreFinalistas(votos[primeiro]!, votos[segundo]!);
  };
  const doBrasil = placarDoLugar("BR")!;
  const quemGanhou = (diferenca: number) => (diferenca === 0 ? undefined : { candidato: doisFinalistas[diferenca > 0 ? 0 : 1], pontos: Math.abs(diferenca) });
  return {
    turno,
    agregado,
    tendencia,
    calendario,
    finalistas: doisFinalistas,
    placarEntreFinalistasDoBrasil: doBrasil,
    entreOsFinalistas: (doPrimeiro) =>
      [
        { candidato: doisFinalistas[0], pct: doPrimeiro },
        { candidato: doisFinalistas[1], pct: 100 - doPrimeiro },
      ].sort((a, b) => a.candidato.nomeUrna.localeCompare(b.candidato.nomeUrna)),
    quemGanhou,
    quemGanhouEntre: (de, para) => quemGanhou(umaCasa(umaCasa(para) - umaCasa(de))),
    indicacaoDoLugar(id) {
      if (!agregado) return undefined;
      if (!turno.lugares[id]) return { tipo: "sem-votacao" };
      const placar = placarDoLugar(id);
      if (placar === undefined) return { tipo: "sem-voto-nos-finalistas" };
      return {
        tipo: "indicacao",
        placarEntreFinalistas: placar,
        indicacao: indicacaoDasPesquisas({ placarEntreFinalistasDoLugar: placar, placarEntreFinalistasDoBrasil: doBrasil, agregado: agregado.valor }),
      };
    },
  };
}

// O agregado é o do instante do build: o do dia, em Brasília, e o da noite depois do congelamento às 23h de 24/10.
// O deploy de cada atualização do pesquisas.csv e os deploys agendados no CI o mantêm em dia. Os testes fixam o
// relógio em APURADOR_AGORA.
const agora = process.env.APURADOR_AGORA ? new Date(process.env.APURADOR_AGORA) : new Date();
if (Number.isNaN(agora.getTime())) throw new Error(`APURADOR_AGORA não é um instante: ${process.env.APURADOR_AGORA}`);
const dia = diaDoAgregado(agora);
const doAgregado = pesquisasDoAgregado(PESQUISAS, TURNO_DE_2026);

/** As pesquisas da noite de 25/10, as da metodologia em qualquer build. */
export const PESQUISAS_DE_2026 = pesquisasDaNoite(TURNO_DE_2026, agregadoDePesquisas(doAgregado, dia), tendenciaDoAgregado(doAgregado, dia), {
  inicio: INICIO_DO_2O_TURNO,
  dia: DIA_DA_ELEICAO,
});

/** O dia seguinte ao 1º turno de 2022, que foi em 02/10: a tendência do painel de antes das 17h do ensaio começa nele. */
const INICIO_DO_2O_TURNO_DE_2022 = "2022-10-03";

/**
 * As pesquisas do painel de antes das 17h do ensaio geral: as finais do 2º turno de 2022, sem as retiradas por deploy (pelo registro,
 * em `ensaio/pesquisas-retiradas.json`), e o agregado delas congelado na véspera, o mesmo que o coletor do ensaio usa
 * (`--noite 2022-2`) enquanto ninguém retira nada. Uma retirada que não é pesquisa de 2022 quebra o build.
 */
export function pesquisasDoEnsaio(retiradas: readonly string[]): { pesquisas: PesquisaHistorica[]; noite: PesquisasDaNoite } {
  const turno = primeiroTurnoDe2022 as Turno;
  const de2022 = lerPesquisasHistoricas(historicasCsv).filter((p) => p.ano === 2022 && p.turno === 2);
  const desconhecidas = retiradas.filter((r) => !de2022.some((p) => p.registro === r));
  if (desconhecidas.length > 0) throw new Error(`ensaio/pesquisas-retiradas.json: ${desconhecidas.join(", ")} não é pesquisa do 2º turno de 2022`);
  const pesquisas = de2022.filter((p) => p.registro === null || !retiradas.includes(p.registro));
  const resultados = (resultadosHistoricos as { eleicoes: ResultadoHistorico[] }).eleicoes;
  const noite = { ano: 2022, turno: 2 };
  const doisFinalistas = finalistas(turno) as [number, number];
  // O agregado é o da mesma função que o coletor do ensaio usa; a tendência, a mesma regra dia a dia até ele.
  const agregado = agregadoDaNoite(pesquisas, resultados, noite, doisFinalistas);
  const { pesquisas: doAgregado, eleicao } = pesquisasDaNoitePassada(pesquisas, resultados, noite, doisFinalistas);
  const tendencia = tendenciaDoAgregado(doAgregado, eleicao.dia, eleicao, INICIO_DO_2O_TURNO_DE_2022);
  return { pesquisas, noite: pesquisasDaNoite(turno, agregado, tendencia, { inicio: INICIO_DO_2O_TURNO_DE_2022, dia: eleicao.dia }) };
}

const doEnsaio = ENSAIO ? pesquisasDoEnsaio(retiradasDoEnsaio) : undefined;
const daNoite = doEnsaio?.noite ?? PESQUISAS_DE_2026;

/** As pesquisas finais de 2022 que o painel de antes das 17h do ensaio lista no lugar da lista conferida no TSE; nenhuma fora do ensaio. */
export const PESQUISAS_DO_ENSAIO = doEnsaio?.pesquisas ?? [];

/** O 1º turno da noite do build: o de 2026 ou, no ensaio, o de 2022. */
export const TURNO = daNoite.turno;
/** O agregado de pesquisas da noite do build, ou `undefined` sem pesquisa na janela. */
export const AGREGADO = daNoite.agregado;
/** A tendência do agregado da noite do build, dia a dia. */
export const TENDENCIA = daNoite.tendencia;
/** O começo da tendência e o dia da eleição da noite do build. */
export const CALENDARIO = daNoite.calendario;
/** Os dois finalistas na ordem do agregado: o primeiro é aquele cujo % o agregado dá. */
export const FINALISTAS = daNoite.finalistas;
/** O placar entre finalistas do Brasil no 1º turno, em % do primeiro finalista: a base da mudança nacional. */
export const PLACAR_ENTRE_FINALISTAS_DO_BRASIL = daNoite.placarEntreFinalistasDoBrasil;
/** O % do primeiro finalista repartido entre os dois, na ordem da página. */
export const entreOsFinalistas = daNoite.entreOsFinalistas;
/** Quem ganhou terreno, no formato "LULA +1,8": a diferença no % do primeiro finalista, já com uma casa. */
export const quemGanhou = daNoite.quemGanhou;
/** Quem ganhou terreno de um % do primeiro finalista a outro, com os números como a página os mostra. */
export const quemGanhouEntre = daNoite.quemGanhouEntre;
/** A indicação das pesquisas de uma UF, do Exterior ou de um município, ou o motivo de não haver. */
export const indicacaoDoLugar = daNoite.indicacaoDoLugar;
