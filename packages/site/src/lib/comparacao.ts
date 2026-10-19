import { finalistas, type Lugar, type Turno } from "@apurador/pipeline";
import { corDoPartido, type Cor } from "./identidade";
import { lugaresAbaixo } from "./lugares";

// A comparação de dois turnos no histórico (Telas da página de lugar, decisão 14): só entre o PT e o partido de
// Bolsonaro (PSL em 2018, PL depois), rotulados pelo partido. Nos 2º turnos, o % de cada um é o dos votos válidos, o
// número do TSE, com duas casas. Nos 1º turnos, é o placar entre finalistas, um cálculo do Apurador, com uma casa.

const PT = ["PT"];
const PARTIDO_DE_BOLSONARO = ["PSL", "PL"];

/** Um dos dois lados da comparação: o partido de Bolsonaro ou o PT. */
export interface Lado {
  /** O partido, ou os dois quando o partido de Bolsonaro mudou entre os turnos ("PSL/PL"). */
  partido: string;
  cor: Cor;
  /** O nome de urna do candidato do partido em cada turno, do mais antigo ao mais recente. */
  candidatos: [string, string];
  /** O % em cada turno, como a página o mostra: com duas casas no 2º turno e com uma no 1º. */
  pct: [number, number];
  /** A mudança do turno mais antigo ao mais recente, em pontos, com uma casa, a partir dos % como a página os mostra. */
  mudanca: number;
}

/** A comparação, ou o turno em que o lugar não votou ou em que nenhum dos dois partidos teve voto. */
export type Comparacao = { antes: Turno; depois: Turno } & (
  | { tipo: "comparacao"; lados: [Lado, Lado] }
  | { tipo: "sem-votacao"; turno: Turno }
  | { tipo: "sem-votos"; turno: Turno }
);

/** As casas do % de um turno: duas no 2º turno, como o TSE publica, e uma no placar entre finalistas do 1º. */
export const casasDoTurno = (t: Turno): 1 | 2 => (t.turno === 2 ? 2 : 1);

/** O candidato do partido no turno. No 1º turno, ele tem de ser um dos finalistas: só assim a conta é o placar entre finalistas. */
const candidatoDo = (t: Turno, partidos: string[]) => {
  const i = t.candidatos.findIndex((c) => partidos.includes(c.partido));
  if (i < 0) throw new Error(`${t.ano} ${t.turno}º turno: nenhum candidato de ${partidos.join(" ou ")}`);
  if (t.turno === 1 && !finalistas(t).includes(t.candidatos[i]!.numero)) {
    throw new Error(`${t.ano} 1º turno: ${t.candidatos[i]!.partido} não foi ao 2º turno, e a comparação não seria o placar entre finalistas`);
  }
  return i;
};

/** Os votos do partido de Bolsonaro e do PT num lugar, ou nada se o lugar não votou no turno. */
function votosDosLados(t: Turno, id: string): [number, number] | undefined {
  const votos = t.lugares[id]?.votos;
  return votos && [votos[candidatoDo(t, PARTIDO_DE_BOLSONARO)]!, votos[candidatoDo(t, PT)]!];
}

/** O % de cada lado entre os votos dos dois num lugar, com as casas do turno. */
function pctDosLados(t: Turno, id: string): [number, number] | "sem-votacao" | "sem-votos" {
  const votos = votosDosLados(t, id);
  if (!votos) return "sem-votacao";
  const total = votos[0] + votos[1];
  if (total === 0) return "sem-votos";
  const casas = casasDoTurno(t);
  return [Number(((100 * votos[0]) / total).toFixed(casas)), Number(((100 * votos[1]) / total).toFixed(casas))];
}

/** depois − antes, com uma casa (metade para longe do zero), contado em centésimos para não herdar o erro do ponto flutuante. */
function mudancaComUmaCasa(antes: number, depois: number): number {
  const centesimos = Math.round(100 * depois) - Math.round(100 * antes);
  const decimos = Math.round(Math.abs(centesimos) / 10);
  return decimos === 0 ? 0 : (Math.sign(centesimos) * decimos) / 10;
}

const ordem = (t: Turno) => 10 * t.ano + t.turno;

/** A comparação de dois turnos num lugar, do mais antigo ao mais recente, em qualquer ordem que o visitante os escolha. */
export function compararTurnos(lugar: Lugar, um: Turno, outro: Turno): Comparacao {
  const [antes, depois] = ordem(um) < ordem(outro) ? [um, outro] : [outro, um];
  const pctAntes = pctDosLados(antes, lugar.id);
  if (typeof pctAntes === "string") return { tipo: pctAntes, antes, depois, turno: antes };
  const pctDepois = pctDosLados(depois, lugar.id);
  if (typeof pctDepois === "string") return { tipo: pctDepois, antes, depois, turno: depois };
  const lado = (i: 0 | 1, partidos: string[]): Lado => {
    const [a, b] = [antes.candidatos[candidatoDo(antes, partidos)]!, depois.candidatos[candidatoDo(depois, partidos)]!];
    return {
      partido: a.partido === b.partido ? a.partido : `${a.partido}/${b.partido}`,
      cor: corDoPartido(b.partido),
      candidatos: [a.nomeUrna, b.nomeUrna],
      pct: [pctAntes[i], pctDepois[i]],
      mudanca: mudancaComUmaCasa(pctAntes[i], pctDepois[i]),
    };
  };
  return { tipo: "comparacao", antes, depois, lados: [lado(0, PARTIDO_DE_BOLSONARO), lado(1, PT)] };
}

/** "Onde mais mudou" só conta os lugares com pelo menos estes votos nos dois partidos em cada turno, como no protótipo:
 * nos menores, poucos votos mudam muitos pontos (no Exterior, há cidades com 5). */
export const MINIMO_DE_VOTOS = 3000;
const NA_LISTA = 5;

export interface MudancaNoLugar {
  lugar: Lugar;
  /** O lado que ganhou terreno, com a mudança, ou nenhum se o % não mudou. */
  ganhou: Lado | undefined;
}

/**
 * Os 5 lugares logo abaixo deste (as UFs e o Exterior no Brasil, os municípios numa UF ou no Exterior) em que o % mais
 * mudou entre os dois turnos. Fica vazio onde não há ao menos dois para ordenar, como num município.
 */
export function ondeMaisMudou(lugar: Lugar, um: Turno, outro: Turno): MudancaNoLugar[] {
  const temVotos = (l: Lugar) =>
    [um, outro].every((t) => {
      const votos = votosDosLados(t, l.id);
      return votos !== undefined && votos[0] + votos[1] >= MINIMO_DE_VOTOS;
    });
  const mudancas = lugaresAbaixo(lugar)
    .filter(temVotos)
    .flatMap((l) => {
      const comparacao = compararTurnos(l, um, outro);
      return comparacao.tipo === "comparacao" ? [{ lugar: l, ganhou: comparacao.lados.find((lado) => lado.mudanca > 0) }] : [];
    });
  if (mudancas.length < 2) return [];
  const pontos = (m: MudancaNoLugar) => m.ganhou?.mudanca ?? 0;
  return mudancas.sort((a, b) => pontos(b) - pontos(a) || a.lugar.nome.localeCompare(b.lugar.nome, "pt-BR")).slice(0, NA_LISTA);
}
