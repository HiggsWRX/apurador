import {
  agregadoDePesquisas,
  diaDoAgregado,
  indicacaoDasPesquisas,
  placarEntreFinalistas,
  tendenciaDoAgregado,
  type PesquisaDoAgregado,
} from "@apurador/modelo";
import { finalistas, listaDasPesquisas, type CandidatoDoTurno, type ExtratoDoTse, type Turno } from "@apurador/pipeline";
import { umaCasa } from "./formato";
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
// Um deploy por dia, o da atualização do pesquisas.csv, o mantém em dia. Os testes fixam o relógio em APURADOR_AGORA.
const agora = process.env.APURADOR_AGORA ? new Date(process.env.APURADOR_AGORA) : new Date();
if (Number.isNaN(agora.getTime())) throw new Error(`APURADOR_AGORA não é um instante: ${process.env.APURADOR_AGORA}`);
export const DIA_DO_AGREGADO = diaDoAgregado(agora);

// O agregado é o % do primeiro finalista (o mais votado no 1º turno, Flávio) nos votos válidos.
const [primeiro, segundo] = finalistas(TURNO) as [number, number];
const doAgregado: PesquisaDoAgregado[] = PESQUISAS.map((p) => ({
  registro: p.registro,
  instituto: p.institutoDaLista,
  campoFim: p.campoFim,
  divulgacao: p.divulgacao,
  votos: [p.votos.get(primeiro)!, p.votos.get(segundo)!],
}));
export const AGREGADO = agregadoDePesquisas(doAgregado, DIA_DO_AGREGADO);
export const TENDENCIA = tendenciaDoAgregado(doAgregado, DIA_DO_AGREGADO);

const candidato = (numero: number) => TURNO.candidatos.find((c) => c.numero === numero)!;
/** Os dois finalistas na ordem do agregado: o primeiro é aquele cujo % o agregado dá. */
export const FINALISTAS = [candidato(primeiro), candidato(segundo)] as const;

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

const indice = (numero: number) => TURNO.candidatos.findIndex((c) => c.numero === numero);
const placarDoLugar = (id: string): number | undefined => {
  const votos = TURNO.lugares[id]?.votos;
  return votos && placarEntreFinalistas(votos[indice(primeiro)]!, votos[indice(segundo)]!);
};

/** O placar entre finalistas do Brasil no 1º turno, em % do primeiro finalista: a base da mudança nacional. */
export const PLACAR_DO_BRASIL = placarDoLugar("BR")!;

/**
 * A mudança nacional desde o 1º turno como a página a mostra: a diferença entre o agregado e o placar entre finalistas
 * do Brasil, os dois já com uma casa, para que a conta feche na página ("51,0%, desde então +0,1": 51,1%).
 */
export const MUDANCA_MOSTRADA = AGREGADO && umaCasa(umaCasa(AGREGADO.valor) - umaCasa(PLACAR_DO_BRASIL));

export type IndicacaoDoLugar = { tipo: "indicacao"; placar: number; indicacao: number; limitada: boolean } | { tipo: "sem-votacao" } | { tipo: "sem-voto-nos-finalistas" };

/** A indicação das pesquisas de uma UF, do Exterior ou de um município, ou o motivo de não haver. */
export function indicacaoDoLugar(id: string): IndicacaoDoLugar | undefined {
  if (!AGREGADO) return undefined;
  if (!TURNO.lugares[id]) return { tipo: "sem-votacao" };
  const placar = placarDoLugar(id);
  if (placar === undefined) return { tipo: "sem-voto-nos-finalistas" };
  const semLimite = placar + AGREGADO.valor - PLACAR_DO_BRASIL;
  return {
    tipo: "indicacao",
    placar,
    indicacao: indicacaoDasPesquisas({ placarDoLugar: placar, placarDoBrasil: PLACAR_DO_BRASIL, agregado: AGREGADO.valor }),
    limitada: semLimite < 0 || semLimite > 100,
  };
}
