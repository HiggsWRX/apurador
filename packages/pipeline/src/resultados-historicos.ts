import type { VotoCandidatoMunzona } from "@apurador/tse";
import { doTurno, votosPorCandidato, type CandidatoDoTurno } from "./turno.ts";

// O resultado nacional das eleições com que o histórico das pesquisas é medido (`dados/resultados-historicos.json`):
// os dois finalistas e os votos válidos no Brasil, somados do `votacao_candidato_munzona` do TSE, e a conferência
// do que o repositório guarda contra esse arquivo, refeita no CI.

export type FinalistaDoResultado = CandidatoDoTurno & { votos: number };

export interface ResultadoHistorico {
  ano: number;
  turno: number;
  /** O dia da eleição, `aaaa-mm-dd`, do próprio arquivo do TSE. */
  dia: string;
  /** As datas de geração do TSE nas linhas do turno (`DT_GERACAO HH_GERACAO`). */
  geracao: string[];
  /** Os dois finalistas, o mais votado no 1º turno primeiro, com os votos válidos no Brasil (com o Exterior) no turno. */
  finalistas: [FinalistaDoResultado, FinalistaDoResultado];
  /** Os votos válidos de todos os candidatos no Brasil, no turno. */
  validos: number;
}

/**
 * O resultado nacional de um turno de Presidente nas linhas do TSE. Num 2º turno, os finalistas são os dois
 * candidatos dele, na ordem do 1º turno; num 1º turno, os dois mais votados.
 */
export function resultadoHistorico(candidatos: readonly VotoCandidatoMunzona[], eleicao: { ano: number; turno: number }): ResultadoHistorico {
  const { ano, turno } = eleicao;
  const doTurnoPedido = candidatos.filter(doTurno(ano, turno));
  if (doTurnoPedido.length === 0) throw new Error(`O arquivo do TSE não tem o ${turno}º turno de ${ano} para Presidente`);

  const noTurno = votosPorCandidato(doTurnoPedido);
  const noPrimeiroTurno = votosPorCandidato(candidatos.filter(doTurno(ano, 1)));
  const ordem = (n: number) => -(noPrimeiroTurno.get(n)?.votos ?? 0);
  const [primeiro, segundo] = [...noTurno.keys()].sort((a, b) => ordem(a) - ordem(b));
  if (segundo === undefined) throw new Error(`${ano}, ${turno}º turno: menos de dois candidatos com voto`);
  const finalista = (n: number): FinalistaDoResultado => {
    const { candidato, votos } = noTurno.get(n)!;
    return { ...candidato, votos };
  };

  return {
    ano,
    turno,
    dia: unico(doTurnoPedido.map((v) => v.dia), `${ano}, ${turno}º turno: mais de um dia da eleição`),
    geracao: [...new Set(doTurnoPedido.map((v) => v.geracao))].sort(),
    finalistas: [finalista(primeiro!), finalista(segundo)],
    validos: doTurnoPedido.reduce((s, v) => s + v.votos, 0),
  };
}

/**
 * O que o repositório guarda contra o arquivo do TSE de cada ano, lido agora: os finalistas (número, nome e partido)
 * e os votos deles, os válidos e o dia. A data de geração não conta, porque o TSE regera os arquivos sem mudar os votos.
 */
export function conferirResultadosHistoricos(repositorio: readonly ResultadoHistorico[], candidatosPorAno: ReadonlyMap<number, readonly VotoCandidatoMunzona[]>): string[] {
  return repositorio.flatMap((r) => {
    const rotulo = `${r.ano}, ${r.turno}º turno`;
    const candidatos = candidatosPorAno.get(r.ano);
    if (!candidatos) return [`${rotulo}: o arquivo do TSE de ${r.ano} não foi lido`];
    const tse = resultadoHistorico(candidatos, r);
    const divergencias: string[] = [];
    if (tse.dia !== r.dia) divergencias.push(`${rotulo}: o dia é ${r.dia} no repositório e ${tse.dia} no TSE`);
    r.finalistas.forEach((f, i) => {
      const doTse = tse.finalistas[i]!;
      const quem = (c: FinalistaDoResultado) => `${c.nomeUrna} (${c.partido})`;
      if (doTse.numero !== f.numero) divergencias.push(`${rotulo}: o ${i + 1}º finalista é o ${f.numero} no repositório e o ${doTse.numero} no TSE`);
      else if (doTse.nome !== f.nome || quem(doTse) !== quem(f)) {
        divergencias.push(`${rotulo}: o ${i + 1}º finalista (${f.numero}) é ${quem(f)} no repositório e ${quem(doTse)} no TSE`);
      } else if (doTse.votos !== f.votos) divergencias.push(`${rotulo}: ${f.nomeUrna} (${f.numero}) tem ${f.votos} votos no repositório e ${doTse.votos} no TSE`);
    });
    if (tse.validos !== r.validos) divergencias.push(`${rotulo}: os válidos são ${r.validos} no repositório e ${tse.validos} no TSE`);
    return divergencias;
  });
}

function unico<T>(valores: readonly T[], erro: string): T {
  const distintos = [...new Set(valores)];
  if (distintos.length !== 1) throw new Error(erro);
  return distintos[0]!;
}
