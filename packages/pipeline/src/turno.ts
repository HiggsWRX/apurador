import type { DetalheMunzona, VotoCandidatoMunzona } from "@apurador/tse";

// Os dados derivados de um turno: o resultado oficial de cada lugar, somado dos arquivos do TSE
// por município e zona. É o que o repositório guarda e o site lê na construção.

export interface CandidatoDoTurno {
  numero: number;
  nome: string;
  nomeUrna: string;
  partido: string;
}

export interface ResultadoDoLugar {
  aptos: number;
  votantes: number;
  abstencoes: number;
  validos: number;
  brancos: number;
  /** Inclui os nulos técnicos. */
  nulos: number;
  secoes: number;
  /** Votos válidos de cada candidato, na ordem de `candidatos`. */
  votos: number[];
}

export interface Turno {
  ano: number;
  turno: number;
  cargo: "Presidente";
  /** As datas de geração dos arquivos do TSE usados (`DT_GERACAO HH_GERACAO`). */
  geracao: string[];
  /** Os candidatos, do mais ao menos votado no Brasil. */
  candidatos: CandidatoDoTurno[];
  /** Por enquanto só o Brasil (`BR`), que inclui o Exterior. */
  lugares: Record<string, ResultadoDoLugar>;
}

const PRESIDENTE = 1;

export function resultadoDoTurno(entrada: { ano: number; turno: number; candidatos: VotoCandidatoMunzona[]; detalhes: DetalheMunzona[] }): Turno {
  const { ano, turno } = entrada;
  const doTurno = <T extends { ano: number; turno: number; cargo: number }>(l: T) => l.ano === ano && l.turno === turno && l.cargo === PRESIDENTE;
  const votos = entrada.candidatos.filter(doTurno);
  const detalhes = entrada.detalhes.filter(doTurno);

  const porNumero = new Map<number, { candidato: CandidatoDoTurno; votos: number }>();
  for (const v of votos) {
    const c = porNumero.get(v.numero) ?? { candidato: { numero: v.numero, nome: v.nome, nomeUrna: v.nomeUrna, partido: v.partido }, votos: 0 };
    c.votos += v.votos;
    porNumero.set(v.numero, c);
  }
  const ordenados = [...porNumero.values()].sort((a, b) => b.votos - a.votos);

  const brasil: ResultadoDoLugar = { aptos: 0, votantes: 0, abstencoes: 0, validos: 0, brancos: 0, nulos: 0, secoes: 0, votos: ordenados.map((c) => c.votos) };
  for (const d of detalhes) {
    brasil.aptos += d.aptos;
    brasil.votantes += d.votantes;
    brasil.abstencoes += d.abstencoes;
    brasil.validos += d.validos;
    brasil.brancos += d.brancos;
    brasil.nulos += d.nulos;
    brasil.secoes += d.secoes;
  }

  const somaDosCandidatos = brasil.votos.reduce((s, n) => s + n, 0);
  if (somaDosCandidatos !== brasil.validos) {
    throw new Error(`${ano} ${turno}º turno: a soma dos candidatos (${somaDosCandidatos}) não bate com os válidos do TSE (${brasil.validos})`);
  }

  return {
    ano,
    turno,
    cargo: "Presidente",
    geracao: [...new Set([...votos, ...detalhes].map((l) => l.geracao))].sort(),
    candidatos: ordenados.map((c) => c.candidato),
    lugares: { BR: brasil },
  };
}
