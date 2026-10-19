import { agregadoDePesquisas, diaDoAgregado, indicacaoDasPesquisas, placarEntreFinalistas, tendenciaDoAgregado } from "@apurador/modelo";
import { finalistas, listaDasPesquisas, pesquisasDoAgregado, type CandidatoDoTurno, type ExtratoDoTse, type Turno } from "@apurador/pipeline";
import institutos from "../../../../dados/pesquisas-institutos.csv?raw";
import extrato from "../../../../dados/pesquisas-tse.json";
import verificacoes from "../../../../dados/pesquisas-verificacoes.csv?raw";
import pesquisasCsv from "../../../../dados/pesquisas.csv?raw";
import primeiroTurno from "../../../../dados/turnos/2026-1.json";

// As pesquisas no build: a lista conferida no TSE, o agregado de pesquisas, a tendência e a indicação das pesquisas
// de cada lugar, todos do módulo `modelo` sobre o mesmo pesquisas.csv.

export const TURNO = primeiroTurno as Turno;
export const EXTRATO = extrato as ExtratoDoTse;

/** A lista das pesquisas. Uma linha do pesquisas.csv que não bata com o extrato do TSE quebra o build: nunca vai ao ar. */
export const PESQUISAS = listaDasPesquisas({ pesquisas: pesquisasCsv, institutos, extrato: EXTRATO, verificacoes, turno: TURNO });

// O agregado é o do instante do build: o do dia, em Brasília, e o da noite depois do congelamento às 23h de 24/10.
// O deploy de cada atualização do pesquisas.csv e os deploys agendados no CI o mantêm em dia. Os testes fixam o
// relógio em APURADOR_AGORA.
const agora = process.env.APURADOR_AGORA ? new Date(process.env.APURADOR_AGORA) : new Date();
if (Number.isNaN(agora.getTime())) throw new Error(`APURADOR_AGORA não é um instante: ${process.env.APURADOR_AGORA}`);
const dia = diaDoAgregado(agora);
const doAgregado = pesquisasDoAgregado(PESQUISAS, TURNO);
export const AGREGADO = agregadoDePesquisas(doAgregado, dia);
export const TENDENCIA = tendenciaDoAgregado(doAgregado, dia);

const [primeiro, segundo] = finalistas(TURNO).map((n) => TURNO.candidatos.findIndex((c) => c.numero === n)) as [number, number];
/** Os dois finalistas na ordem do agregado: o primeiro é aquele cujo % o agregado dá. */
export const FINALISTAS = [TURNO.candidatos[primeiro]!, TURNO.candidatos[segundo]!] as const;

/** Um valor do primeiro finalista (em %) repartido entre os dois, na ordem alfabética, a mesma de toda a página. */
export interface PctDoCandidato {
  candidato: CandidatoDoTurno;
  pct: number;
}
export function entreOsFinalistas(doPrimeiro: number): PctDoCandidato[] {
  return [
    { candidato: FINALISTAS[0], pct: doPrimeiro },
    { candidato: FINALISTAS[1], pct: 100 - doPrimeiro },
  ].sort((a, b) => a.candidato.nomeUrna.localeCompare(b.candidato.nomeUrna));
}

/** Quem ganhou terreno, no formato "LULA +1,8": a diferença no % do primeiro finalista, já com uma casa. */
export function quemGanhou(diferenca: number): { candidato: CandidatoDoTurno; pontos: number } | undefined {
  if (diferenca === 0) return undefined;
  return { candidato: FINALISTAS[diferenca > 0 ? 0 : 1], pontos: Math.abs(diferenca) };
}

const placarEntreFinalistasDoLugar = (id: string): number | undefined => {
  const votos = TURNO.lugares[id]?.votos;
  return votos && placarEntreFinalistas(votos[primeiro]!, votos[segundo]!);
};

/** O placar entre finalistas do Brasil no 1º turno, em % do primeiro finalista: a base da mudança nacional. */
export const PLACAR_ENTRE_FINALISTAS_DO_BRASIL = placarEntreFinalistasDoLugar("BR")!;

export type IndicacaoDoLugar =
  | { tipo: "indicacao"; placarEntreFinalistas: number; indicacao: number }
  | { tipo: "sem-votacao" }
  | { tipo: "sem-voto-nos-finalistas" };

/** A indicação das pesquisas de uma UF, do Exterior ou de um município, ou o motivo de não haver. */
export function indicacaoDoLugar(id: string): IndicacaoDoLugar | undefined {
  if (!AGREGADO) return undefined;
  if (!TURNO.lugares[id]) return { tipo: "sem-votacao" };
  const placar = placarEntreFinalistasDoLugar(id);
  if (placar === undefined) return { tipo: "sem-voto-nos-finalistas" };
  return {
    tipo: "indicacao",
    placarEntreFinalistas: placar,
    indicacao: indicacaoDasPesquisas({
      placarEntreFinalistasDoLugar: placar,
      placarEntreFinalistasDoBrasil: PLACAR_ENTRE_FINALISTAS_DO_BRASIL,
      agregado: AGREGADO.valor,
    }),
  };
}
