import type { DetalheMunzona, ResultadoDoTse, VotoCandidatoMunzona } from "@apurador/tse";
import { idDoMunicipio } from "./lugares.ts";

// Os dados derivados de um turno: o resultado oficial de cada lugar, somado dos arquivos do TSE
// por município e zona. É o que o repositório guarda e o site lê na construção. Depois da noite, até
// esses arquivos saírem, o turno vem do último estado da noite, provisório.

/** Um candidato de um turno, como o TSE o publica. */
export interface CandidatoDoTurno {
  numero: number;
  nome: string;
  nomeUrna: string;
  partido: string;
}

/** O resultado oficial de um lugar num turno. */
export interface ResultadoOficialDoLugar {
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

/** Os dados derivados de um turno (`dados/turnos/`): os candidatos e o resultado de cada lugar. */
export interface Turno {
  ano: number;
  turno: number;
  cargo: "Presidente";
  /** As datas de geração dos arquivos do TSE usados (`DT_GERACAO HH_GERACAO`). */
  geracao: string[];
  /** Os candidatos, do mais ao menos votado no Brasil. */
  candidatos: CandidatoDoTurno[];
  /**
   * O resultado de cada lugar que votou no turno: o Brasil (`BR`, que inclui o Exterior), cada UF,
   * o Exterior (`ZZ`) e cada município, pelo id de `idDoMunicipio`.
   */
  lugares: Record<string, ResultadoOficialDoLugar>;
  /**
   * Só no turno que vem do último estado da noite (`turnoDoUltimoEstado`), até os arquivos oficiais do TSE por
   * município e zona: o site o mostra com o aviso de provisório.
   */
  provisorio?: true;
}

/** Os totais de um lugar, além dos votos por candidato. */
export const TOTAIS = ["aptos", "votantes", "abstencoes", "validos", "brancos", "nulos", "secoes"] as const;

const PRESIDENTE = 1;

/** Filtra as linhas dos arquivos do TSE de um turno de Presidente (os de 2018 e 2022 trazem os dois turnos). */
export const doTurno =
  (ano: number, turno: number) =>
  (linha: { ano: number; turno: number; cargo: number }): boolean =>
    linha.ano === ano && linha.turno === turno && linha.cargo === PRESIDENTE;

/** O id de um turno nos dados e no site: "2026-1". */
export const idDoTurno = (t: { ano: number; turno: number }) => `${t.ano}-${t.turno}`;

/** Os votos de cada candidato somados nas linhas do TSE dadas, pelo número do candidato. */
export function votosPorCandidato(votos: readonly VotoCandidatoMunzona[]): Map<number, { candidato: CandidatoDoTurno; votos: number }> {
  const porNumero = new Map<number, { candidato: CandidatoDoTurno; votos: number }>();
  for (const v of votos) {
    const c = porNumero.get(v.numero) ?? { candidato: { numero: v.numero, nome: v.nome, nomeUrna: v.nomeUrna, partido: v.partido }, votos: 0 };
    c.votos += v.votos;
    porNumero.set(v.numero, c);
  }
  return porNumero;
}

/** O turno somado dos arquivos do TSE por município e zona. */
export function resultadoDoTurno(entrada: { ano: number; turno: number; candidatos: VotoCandidatoMunzona[]; detalhes: DetalheMunzona[] }): Turno {
  const { ano, turno } = entrada;
  const votos = entrada.candidatos.filter(doTurno(ano, turno));
  const detalhes = entrada.detalhes.filter(doTurno(ano, turno));

  const ordenados = [...votosPorCandidato(votos).values()].sort((a, b) => b.votos - a.votos);
  const posicao = new Map(ordenados.map((c, i) => [c.candidato.numero, i]));

  // Cada linha do TSE (um município e zona) soma no Brasil, na UF (ou no Exterior) e no município.
  const lugares = new Map<string, ResultadoOficialDoLugar>();
  const lugaresDa = (linha: { uf: string; municipio: number }) =>
    ["BR", linha.uf, idDoMunicipio(linha.municipio)].map((id) => {
      let r = lugares.get(id);
      if (!r) lugares.set(id, (r = { aptos: 0, votantes: 0, abstencoes: 0, validos: 0, brancos: 0, nulos: 0, secoes: 0, votos: ordenados.map(() => 0) }));
      return r;
    });

  for (const d of detalhes) for (const r of lugaresDa(d)) for (const t of TOTAIS) r[t] += d[t];
  for (const v of votos) for (const r of lugaresDa(v)) r.votos[posicao.get(v.numero)!]! += v.votos;

  for (const [id, r] of lugares) conferirOsValidos({ ano, turno }, id, r);

  return {
    ano,
    turno,
    cargo: "Presidente",
    geracao: [...new Set([...votos, ...detalhes].map((l) => l.geracao))].sort(),
    candidatos: ordenados.map((c) => c.candidato),
    lugares: Object.fromEntries(lugares),
  };
}

function conferirOsValidos({ ano, turno }: { ano: number; turno: number }, id: string, r: ResultadoOficialDoLugar): void {
  const somaDosCandidatos = r.votos.reduce((s, n) => s + n, 0);
  if (somaDosCandidatos !== r.validos) {
    throw new Error(`${ano} ${turno}º turno, lugar ${id}: a soma dos candidatos (${somaDosCandidatos}) não bate com os válidos do TSE (${r.validos})`);
  }
}

/** O id de um lugar do turno pela abrangência do arquivo ao vivo, ou `null` numa zona, que não é lugar do turno. */
function idDaAbrangencia({ tipo, codigo }: ResultadoDoTse["abrangencia"]): string | null {
  if (tipo === "br") return "BR";
  if (tipo === "uf") return codigo.toUpperCase();
  if (tipo === "mu") return idDoMunicipio(Number(codigo));
  return null;
}

/**
 * O turno do último estado da noite: o resultado de cada lugar no próprio arquivo ao vivo do TSE (EA20), com a
 * totalização final do Brasil. Os totais são os dos arquivos oficiais por município e zona, menos as seções, que o
 * arquivo ao vivo conta sem as agregadas. É provisório até os oficiais saírem, e a geração é a hora da totalização final.
 */
export function turnoDoUltimoEstado(entrada: { ano: number; turno: number; resultados: readonly ResultadoDoTse[] }): Turno {
  const { ano, turno } = entrada;
  const brasil = entrada.resultados.find((r) => r.abrangencia.tipo === "br");
  if (!brasil?.totalizacaoFinal || brasil.ultimaTotalizacao === null) {
    throw new Error(`${ano} ${turno}º turno: o último estado da noite está sem a totalização final do Brasil`);
  }

  const ordenados = [...brasil.candidatos].sort((a, b) => b.votos - a.votos);
  const lugares: Record<string, ResultadoOficialDoLugar> = {};
  for (const r of entrada.resultados) {
    const id = idDaAbrangencia(r.abrangencia);
    if (id === null) continue;
    const votos = new Map(r.candidatos.map((c) => [c.numero, c.votos]));
    lugares[id] = {
      aptos: r.eleitorado.total,
      votantes: r.eleitorado.comparecimento,
      abstencoes: r.eleitorado.abstencao,
      validos: r.votos.validos,
      brancos: r.votos.brancos,
      nulos: r.votos.nulos,
      secoes: r.secoes.total,
      votos: ordenados.map((c) => votos.get(c.numero) ?? 0),
    };
    conferirOsValidos({ ano, turno }, id, lugares[id]);
  }

  // "2026-10-25 23:26:38" como o TSE escreve a geração: "25/10/2026 23:26:38".
  const [data, hora] = brasil.ultimaTotalizacao.split(" ") as [string, string];
  return {
    ano,
    turno,
    cargo: "Presidente",
    geracao: [`${data.split("-").reverse().join("/")} ${hora}`],
    candidatos: ordenados.map(({ numero, nome, nomeUrna, partido }) => ({ numero, nome, nomeUrna, partido })),
    lugares,
    provisorio: true,
  };
}
