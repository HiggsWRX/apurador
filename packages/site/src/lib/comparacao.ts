import { placarEntreFinalistas } from "@apurador/modelo";
import { finalistas, type Lugar, type Turno } from "@apurador/pipeline";
import { duasCasas, umaCasa } from "./formato";
import { corDoPartido, PARTIDO_DE_BOLSONARO, PT, type Cor } from "./identidade";
import { lugaresAbaixo } from "./lugares";

// A comparação de dois turnos no histórico (Telas da página de lugar, decisão 14): só entre o PT e o partido de
// Bolsonaro (PSL em 2018, PL depois), rotulados pelo partido. Nos 2º turnos, o % de cada um é o dos votos válidos, o
// número do TSE, com duas casas. Nos 1º turnos, é o placar entre finalistas, um cálculo do Apurador, com uma casa: o do
// partido de Bolsonaro arredondado, e o do PT o que falta para 100,0, como na indicação das pesquisas.

/** Um dos dois lados da comparação: o partido de Bolsonaro ou o PT. */
export interface Lado {
  /** O partido, ou os dois quando o partido de Bolsonaro mudou entre os turnos ("PSL/PL"). */
  partido: string;
  cor: Cor;
  /** O nome de urna do candidato do partido em cada turno, do mais antigo ao mais recente. */
  candidatos: [string, string];
  /** O % em cada turno, como a página o mostra: com duas casas no 2º turno e com uma no 1º. */
  pct: [number, number];
  /**
   * A mudança do turno mais antigo ao mais recente, em pontos, com uma casa. A do partido de Bolsonaro sai dos % como a
   * página os mostra, e a do PT é a mesma com o sinal trocado: o que um ganha, o outro perde.
   */
  mudanca: number;
}

/** A comparação, ou os turnos em que o lugar não votou ou em que nenhum dos dois partidos teve voto. */
export type Comparacao = { antes: Turno; depois: Turno } & (
  | {
      tipo: "comparacao";
      lados: [Lado, Lado];
      /** Os votos dos dois partidos somados em cada turno: a base dos %. */
      votos: [number, number];
    }
  | { tipo: "sem-votacao" | "sem-votos"; turnos: Turno[] }
);

/** As casas do % de um turno: duas no 2º turno, como o TSE publica, e uma no placar entre finalistas do 1º. */
export const casasDoTurno = (t: Turno): 1 | 2 => (t.turno === 2 ? 2 : 1);

const indices = new Map<Turno, [number, number]>();

/**
 * Onde estão, entre os candidatos do turno, o do partido de Bolsonaro e o do PT. No 1º turno, os dois têm de ser os
 * finalistas: só assim a conta é o placar entre finalistas.
 */
function indicesDosLados(t: Turno): [number, number] {
  const guardados = indices.get(t);
  if (guardados) return guardados;
  const indice = (partidos: string[]) => {
    const i = t.candidatos.findIndex((c) => partidos.includes(c.partido));
    if (i < 0) throw new Error(`${t.ano} ${t.turno}º turno: nenhum candidato de ${partidos.join(" ou ")}`);
    if (t.turno === 1 && !finalistas(t).includes(t.candidatos[i]!.numero)) {
      throw new Error(`${t.ano} 1º turno: ${t.candidatos[i]!.partido} não foi ao 2º turno, e a comparação não seria o placar entre finalistas`);
    }
    return i;
  };
  const calculados: [number, number] = [indice(PARTIDO_DE_BOLSONARO), indice(PT)];
  indices.set(t, calculados);
  return calculados;
}

/** O % de cada lado num lugar, como a página o mostra, e os votos dos dois somados. */
function noTurno(t: Turno, id: string): { pct: [number, number]; votos: number } | "sem-votacao" | "sem-votos" {
  const votos = t.lugares[id]?.votos;
  if (!votos) return "sem-votacao";
  const [i, j] = indicesDosLados(t);
  const [bolsonaro, pt] = [votos[i]!, votos[j]!];
  const placar = placarEntreFinalistas(bolsonaro, pt);
  if (placar === undefined) return "sem-votos";
  // No 2º turno, cada % é o do TSE, arredondado à parte, como nas barras do turno.
  const pct: [number, number] =
    casasDoTurno(t) === 2 ? [duasCasas(placar), duasCasas(placarEntreFinalistas(pt, bolsonaro)!)] : [umaCasa(placar), umaCasa(100 - umaCasa(placar))];
  return { pct, votos: bolsonaro + pt };
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
  const [a, b] = [noTurno(antes, lugar.id), noTurno(depois, lugar.id)];
  if (typeof a === "string" || typeof b === "string") {
    const tipo = a === "sem-votacao" || b === "sem-votacao" ? "sem-votacao" : "sem-votos";
    return { tipo, antes, depois, turnos: [antes, depois].filter((_, i) => [a, b][i] === tipo) };
  }
  const mudanca = mudancaComUmaCasa(a.pct[0], b.pct[0]);
  const lado = (i: 0 | 1): Lado => {
    const deAntes = antes.candidatos[indicesDosLados(antes)[i]]!;
    const deDepois = depois.candidatos[indicesDosLados(depois)[i]]!;
    return {
      partido: deAntes.partido === deDepois.partido ? deAntes.partido : `${deAntes.partido}/${deDepois.partido}`,
      cor: corDoPartido(deDepois.partido),
      candidatos: [deAntes.nomeUrna, deDepois.nomeUrna],
      pct: [a.pct[i], b.pct[i]],
      mudanca: i === 0 ? mudanca : -mudanca || 0,
    };
  };
  return { tipo: "comparacao", antes, depois, lados: [lado(0), lado(1)], votos: [a.votos, b.votos] };
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
  const mudancas = lugaresAbaixo(lugar).flatMap((l) => {
    const comparacao = compararTurnos(l, um, outro);
    return comparacao.tipo === "comparacao" && Math.min(...comparacao.votos) >= MINIMO_DE_VOTOS
      ? [{ lugar: l, ganhou: comparacao.lados.find((lado) => lado.mudanca > 0) }]
      : [];
  });
  if (mudancas.length < 2) return [];
  const pontos = (m: MudancaNoLugar) => m.ganhou?.mudanca ?? 0;
  return mudancas.sort((a, b) => pontos(b) - pontos(a) || a.lugar.nome.localeCompare(b.lugar.nome, "pt-BR")).slice(0, NA_LISTA);
}
