import { corDoPartido, PARTIDO_DE_BOLSONARO, type Cor } from "./identidade";
import type { QuadroAoVivo } from "./leitor-ao-vivo";
import { mudancaEntre } from "./projecao-ao-vivo";
import type { ConteudoDaTabela, LinhaDaTabela } from "./tabela-dos-lugares";

// O que o mapa do cartão pinta num quadro (Telas da página de lugar, decisão 8; ticket 26), a partir da tabela de
// lugares do mesmo quadro, que já escolhe os números de cada fase: antes das 17h (e no plano zero, ou enquanto o mapa.json
// não chega), o placar entre finalistas do 1º turno de 2026; na noite, o % de seções e o placar do TSE e, com a chave
// dela, a projeção da base escolhida. A cor é a de quem lidera, mais forte com vantagem maior e mais transparente com
// menos seções; cinza sem seções. No modo "Mudança desde o 1º turno", a cor é a de quem ganhou terreno desde o 1º turno,
// com a conta de "A projeção, comparada" da caixa: a projeção enquanto o lugar apura, o resultado quando ele termina.

/** O que o visitante escolhe ver na noite: o placar ou a mudança desde o 1º turno. */
export type ModoDoMapa = "placar" | "mudanca";

/** A cor de um lugar no mapa. */
export interface Pintura {
  /** A de quem lidera (ou ganhou terreno); `empate` sem ninguém à frente; `null`, o cinza de quando não há seções. */
  cor: Cor | "empate" | null;
  /** De 0 a 5: quanto mais vantagem (ou mudança), mais forte. */
  forca: number;
  /** De 0,4 a 1: quanto menos seções totalizadas, mais transparente. */
  opacidade: number;
}

/** Um lugar do mapa: os números da tabela, a mudança desde o 1º turno no texto da caixa e a cor. */
export interface LugarDoMapa extends LinhaDaTabela {
  /** "LULA +1,8", "sem mudança", ou `null` fora do modo de mudança (e sem seções). */
  mudanca: string | null;
  pintura: Pintura;
}

/** O que o mapa mostra num quadro. */
export interface ConteudoDoMapa {
  mostra: "primeiroTurno" | ModoDoMapa;
  /** Os modos que o visitante pode escolher: os dois na noite, com a projeção no ar ou depois do fim; nenhum, sem escolha. */
  modos: ModoDoMapa[];
  /** Os candidatos dos números, como na tabela. */
  candidatos: ConteudoDaTabela["candidatos"];
  /** Os lugares, na ordem da tabela. */
  lugares: LugarDoMapa[];
}

/** A partir de quantos pontos entre os dois a cor fica mais forte, um passo de cada vez. */
const PASSOS_DA_VANTAGEM = [5, 10, 20, 30, 40];
/** A partir de quantos pontos de mudança desde o 1º turno a cor fica mais forte. */
const PASSOS_DA_MUDANCA = [0.5, 1, 2, 4, 8];
const forca = (pontos: number, passos: number[]) => passos.filter((p) => pontos >= p).length;
const CINZA: Pintura = { cor: null, forca: 0, opacidade: 1 };

/** O mapa dos lugares da tabela no quadro, no modo pedido, se ele está disponível. */
export function mapaDosLugares({ tabela, quadro, modo }: { tabela: ConteudoDaTabela; quadro: QuadroAoVivo; modo: ModoDoMapa }): ConteudoDoMapa {
  const { candidatos } = tabela;
  /** A cor de quem está à frente em dois %, mais forte com mais vantagem. */
  const aFrente = ([a, b]: [number, number], opacidade: number): Pintura => {
    if (a === b) return { cor: "empate", forca: 0, opacidade };
    return { cor: corDoPartido(candidatos[a > b ? 0 : 1]!.partido), forca: forca(Math.abs(a - b), PASSOS_DA_VANTAGEM), opacidade };
  };

  if (tabela.colunas.includes("primeiroTurno")) {
    const lugares = tabela.linhas.map((l) => {
      const pt = l.primeiroTurno;
      return { ...l, mudanca: null, pintura: pt === null ? CINZA : aFrente([pt, Math.round(10 * (100 - pt)) / 10], 1) };
    });
    return { mostra: "primeiroTurno", modos: [], candidatos, lugares };
  }

  // A mudança precisa da projeção enquanto os lugares apuram; depois do fim da noite, todos têm o resultado.
  const modos: ModoDoMapa[] = tabela.colunas.includes("projecao") || quadro.fase === "encerrada" ? ["placar", "mudanca"] : [];
  const mostra = modos.includes(modo) ? modo : "placar";
  // O 1º turno da tabela é o % do partido de Bolsonaro; a mudança, como a caixa, conta no do 1º candidato da rodada.
  const doPrimeiro = (pt: number) => (PARTIDO_DE_BOLSONARO.includes(candidatos[0]!.partido) ? pt : Math.round(10 * (100 - pt)) / 10);

  const lugares = tabela.linhas.map((l): LugarDoMapa => {
    const opacidade = 0.4 + (0.6 * (l.secoes ?? 0)) / 100;
    if (!l.secoes || !l.placar) return { ...l, mudanca: null, pintura: CINZA };
    if (mostra === "placar") return { ...l, mudanca: null, pintura: aFrente(l.placar, opacidade) };
    const para = l.secoes === 100 ? l.placar[0] : l.projecao;
    if (para === null || l.primeiroTurno === null) return { ...l, mudanca: null, pintura: CINZA };
    const de = doPrimeiro(l.primeiroTurno);
    const decimos = Math.round(10 * para) - Math.round(10 * de);
    const pintura: Pintura =
      decimos === 0
        ? { cor: "empate", forca: 0, opacidade }
        : { cor: corDoPartido(candidatos[decimos > 0 ? 0 : 1]!.partido), forca: forca(Math.abs(decimos) / 10, PASSOS_DA_MUDANCA), opacidade };
    return { ...l, mudanca: mudancaEntre(candidatos, de, para), pintura };
  });
  return { mostra, modos, candidatos, lugares };
}
