import { compararIds, idDoMunicipio } from "./lugares.ts";
import type { Noite } from "./noite.ts";

// A curva de comparação (Telas da página de lugar, decisão 4): a curva real de um turno passado em cada lugar, que o
// visitante sobrepõe à curva real da noite, no mesmo eixo de % de seções totalizadas. Como a comparação de dois
// turnos, ela mostra só o PT e o partido de Bolsonaro (PSL em 2018, PL depois), pela fatia do PT entre os dois: num 2º
// turno, é o % de votos válidos; num 1º, o placar entre finalistas. A noite reconstruída dá o estado de cada lugar a
// cada segundo, e a curva guarda o primeiro ponto, um por % inteiro de seções que o lugar alcança (o primeiro instante
// em que o alcança) e o último estado: no máximo ~102 pontos por lugar e turno, que a página só baixa quando o
// visitante liga a curva. Os números são cálculo do Apurador, com uma casa.

/** O PT e o partido de Bolsonaro, como o TSE os escreve: os mesmos que a página colore (`lib/identidade.ts` do site). */
const PT = ["PT"];
const PARTIDO_DE_BOLSONARO = ["PSL", "PL"];

/** A curva de comparação de um lugar num turno: um ponto por instante guardado, nas duas listas. */
export interface CurvaDeComparacao {
  /** O % de seções totalizadas do lugar, com uma casa. */
  secoes: number[];
  /** A fatia do PT entre o PT e o partido de Bolsonaro, em %, com uma casa. */
  pt: number[];
}

/** As curvas de comparação de um turno passado (`dados/curvas/`), de cada lugar em que os dois partidos tiveram voto. */
export interface CurvasDoTurno {
  ano: number;
  turno: number;
  /** O partido de Bolsonaro e o PT, como o TSE os escreve: `["PSL", "PT"]` em 2018. */
  partidos: [string, string];
  /** Pelo id do lugar no site: `BR`, a sigla da UF, `ZZ` ou o código do TSE do município, com 5 dígitos. */
  lugares: Record<string, CurvaDeComparacao>;
}

/** O que se acompanha de um lugar ao longo da noite. */
interface Acompanhamento {
  total: number;
  secoes: number;
  bolsonaro: number;
  pt: number;
  /** O % inteiro de seções do último ponto guardado. */
  alcancado: number;
  /** O estado mudou depois do último ponto guardado. */
  pendente: boolean;
  curva: CurvaDeComparacao;
}

/** parte ÷ todo em %, com uma casa, arredondado uma vez só. */
const pctComUmaCasa = (parte: number, todo: number) => Math.round((1000 * parte) / todo) / 10;

/** As curvas de comparação de um turno, de cada lugar da noite reconstruída: o Brasil, as UFs, o Exterior e os municípios. */
export function curvasDoTurno(noite: Noite): CurvasDoTurno {
  // Os candidatos da noite vêm do mais ao menos votado: num 1º turno, os dois primeiros são os finalistas.
  const posicao = (partidos: string[]) => {
    const i = noite.candidatos.findIndex((c) => partidos.includes(c.partido));
    if (i < 0 || i > 1) throw new Error(`${noite.ano} ${noite.turno}º turno: o ${partidos.join(" ou ")} não está entre os dois mais votados, e a fatia não seria o placar entre finalistas`);
    return i;
  };
  const [bolsonaro, pt] = [posicao(PARTIDO_DE_BOLSONARO), posicao(PT)];

  const lugares = new Map<string, Acompanhamento>();
  const daZona = noite.zonas.map((z) =>
    ["BR", z.uf, idDoMunicipio(z.municipio)].map((id) => {
      let l = lugares.get(id);
      if (!l) lugares.set(id, (l = { total: 0, secoes: 0, bolsonaro: 0, pt: 0, alcancado: -1, pendente: false, curva: { secoes: [], pt: [] } }));
      l.total += z.secoes;
      return l;
    }),
  );

  const guardar = (l: Acompanhamento) => {
    l.curva.secoes.push(pctComUmaCasa(l.secoes, l.total));
    l.curva.pt.push(pctComUmaCasa(l.pt, l.pt + l.bolsonaro));
    l.alcancado = Math.floor((100 * l.secoes) / l.total);
    l.pendente = false;
  };
  // O estado de um instante é o de depois de todas as chegadas dele, como no histórico oficial de totalização.
  const mudaram = new Set<Acompanhamento>();
  noite.chegadas.forEach((c, i) => {
    for (const l of daZona[c.zona]!) {
      l.secoes += c.secoes;
      l.bolsonaro += c.votos[bolsonaro]!;
      l.pt += c.votos[pt]!;
      mudaram.add(l);
    }
    if (noite.chegadas[i + 1]?.instante === c.instante) return;
    for (const l of mudaram) {
      if (l.pt + l.bolsonaro === 0) continue;
      if (l.alcancado < 0 || Math.floor((100 * l.secoes) / l.total) > l.alcancado) guardar(l);
      else l.pendente = true;
    }
    mudaram.clear();
  });
  for (const l of lugares.values()) if (l.pendente) guardar(l);

  return {
    ano: noite.ano,
    turno: noite.turno,
    partidos: [noite.candidatos[bolsonaro]!.partido, noite.candidatos[pt]!.partido],
    lugares: Object.fromEntries(
      [...lugares]
        .filter(([, l]) => l.curva.secoes.length > 0)
        .sort(([a], [b]) => compararIds(a, b))
        .map(([id, l]) => [id, l.curva]),
    ),
  };
}

/** As curvas como ficam no repositório: JSON com um lugar por linha. */
export function gravarCurvas(curvas: CurvasDoTurno): string {
  const { lugares, ...cabecalho } = curvas;
  const linhas = Object.entries(lugares).map(([id, c]) => `${JSON.stringify(id)}:${JSON.stringify(c)}`);
  return `${JSON.stringify(cabecalho).slice(0, -1)},"lugares":{\n${linhas.join(",\n")}\n}}\n`;
}

/** Lê as curvas de um turno gravadas em `dados/curvas/`. */
export const lerCurvas = (texto: string): CurvasDoTurno => JSON.parse(texto) as CurvasDoTurno;
