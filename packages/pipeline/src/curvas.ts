import { placarEntreFinalistas } from "@apurador/modelo";
import { compararIds, idDoMunicipio } from "./lugares.ts";
import type { Noite } from "./noite.ts";
import { PARTIDO_DE_BOLSONARO, PT } from "./partidos.ts";

// A curva de comparação (Telas da página de lugar, decisão 4): a curva real de um turno passado em cada lugar, que o
// visitante sobrepõe à curva real da noite, no mesmo eixo de % de seções totalizadas. Como a comparação de dois
// turnos, ela mostra só o PT e o partido de Bolsonaro, pela fatia do PT entre os dois, com a regra do placar entre
// finalistas da comparação (ticket 34): o partido de Bolsonaro arredondado a uma casa, e o PT com o que falta para
// 100,0. A noite reconstruída dá o estado de cada lugar a cada segundo, e a curva guarda o primeiro ponto, um por %
// inteiro de seções que o lugar alcança (o primeiro instante em que o alcança) e o último estado: no máximo ~102
// pontos por lugar e turno, que a página só baixa quando o visitante liga a curva.

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
  /** O partido de Bolsonaro no turno, como o TSE o escreve: o PSL em 2018 e o PL depois. */
  partidoDeBolsonaro: string;
  /** Pelo id do lugar no site: `BR`, a sigla da UF, `ZZ` ou o código do TSE do município, com 5 dígitos. */
  lugares: Record<string, CurvaDeComparacao>;
}

/** O que se acompanha de um lugar ao longo da noite. */
interface Acompanhamento {
  secoesTotais: number;
  totalizadas: number;
  votosDoPartido: number;
  votosDoPt: number;
  /** O % inteiro de seções do último ponto guardado. */
  alcancado: number;
  /** O estado mudou depois do último ponto guardado. */
  pendente: boolean;
  curva: CurvaDeComparacao;
}

/** Com uma casa, como o `umaCasa` da página (`lib/formato.ts`), que a comparação de dois turnos usa. */
const umaCasa = (n: number) => Number(n.toFixed(1));

/** As curvas de comparação de um turno, de cada lugar da noite reconstruída: o Brasil, as UFs, o Exterior e os municípios. */
export function curvasDoTurno(noite: Noite): CurvasDoTurno {
  // Os candidatos da noite vêm do mais ao menos votado: num 1º turno, os dois primeiros são os finalistas.
  const posicao = (partidos: string[]) => {
    const i = noite.candidatos.findIndex((c) => partidos.includes(c.partido));
    if (i < 0 || i > 1)
      throw new Error(
        `${noite.ano} ${noite.turno}º turno: o ${partidos.join(" ou ")} não está entre os dois mais votados, e a fatia não seria o placar entre finalistas`,
      );
    return i;
  };
  const [doPartido, doPt] = [posicao(PARTIDO_DE_BOLSONARO), posicao(PT)];

  const lugares = new Map<string, Acompanhamento>();
  const daZona = noite.zonas.map((z) =>
    ["BR", z.uf, idDoMunicipio(z.municipio)].map((id) => {
      let l = lugares.get(id);
      if (!l)
        lugares.set(
          id,
          (l = { secoesTotais: 0, totalizadas: 0, votosDoPartido: 0, votosDoPt: 0, alcancado: -1, pendente: false, curva: { secoes: [], pt: [] } }),
        );
      l.secoesTotais += z.secoes;
      return l;
    }),
  );

  const guardar = (l: Acompanhamento) => {
    l.curva.secoes.push(umaCasa((100 * l.totalizadas) / l.secoesTotais));
    l.curva.pt.push(umaCasa(100 - umaCasa(placarEntreFinalistas(l.votosDoPartido, l.votosDoPt)!)));
    l.alcancado = Math.floor((100 * l.totalizadas) / l.secoesTotais);
    l.pendente = false;
  };
  // O estado de um instante é o de depois de todas as chegadas dele, como no histórico oficial de totalização.
  const mudaram = new Set<Acompanhamento>();
  noite.chegadas.forEach((c, i) => {
    for (const l of daZona[c.zona]!) {
      l.totalizadas += c.secoes;
      l.votosDoPartido += c.votos[doPartido]!;
      l.votosDoPt += c.votos[doPt]!;
      mudaram.add(l);
    }
    if (noite.chegadas[i + 1]?.instante === c.instante) return;
    for (const l of mudaram) {
      if (l.votosDoPt + l.votosDoPartido === 0) continue;
      if (l.alcancado < 0 || Math.floor((100 * l.totalizadas) / l.secoesTotais) > l.alcancado) guardar(l);
      else l.pendente = true;
    }
    mudaram.clear();
  });
  for (const l of lugares.values()) if (l.pendente) guardar(l);

  return {
    ano: noite.ano,
    turno: noite.turno,
    partidoDeBolsonaro: noite.candidatos[doPartido]!.partido,
    lugares: Object.fromEntries([...lugares].filter(([, l]) => l.curva.secoes.length > 0).map(([id, l]) => [id, l.curva])),
  };
}

/**
 * As curvas como ficam no repositório: JSON com um lugar por linha, na ordem dos dados (o Brasil, as UFs e o Exterior,
 * e os municípios pelo código). A ordem vem daqui, e não do objeto, que põe antes as chaves numéricas, como "10006".
 */
export function gravarCurvas(curvas: CurvasDoTurno): string {
  const { lugares, ...cabecalho } = curvas;
  const linhas = Object.entries(lugares)
    .sort(([a], [b]) => compararIds(a, b))
    .map(([id, c]) => `${JSON.stringify(id)}:${JSON.stringify(c)}`);
  return `${JSON.stringify(cabecalho).slice(0, -1)},"lugares":{\n${linhas.join(",\n")}\n}}\n`;
}

/** Lê as curvas de um turno gravadas em `dados/curvas/`. */
export const lerCurvas = (texto: string): CurvasDoTurno => JSON.parse(texto) as CurvasDoTurno;
