import type { IdDaBase } from "./bases-da-projecao";
import { oQueFaltaPara100 } from "./formato";
import { corDoPartido, type Cor } from "./identidade";
import type { QuadroAoVivo } from "./leitor-ao-vivo";
import { decimosEntre, mudancaEntre } from "./projecao-ao-vivo";
import { tabelaDosLugares, type ArquivoDaTabelaDeLugares, type ConteudoDaTabela, type LinhaDaTabela } from "./tabela-dos-lugares";

// O que o mapa do cartão pinta num quadro (Telas da página de lugar, decisão 8; ticket 26), a partir da tabela de
// lugares do mesmo quadro, que já escolhe os números de cada fase: antes das 17h (e no plano zero, ou enquanto o mapa.json
// não chega), o placar entre finalistas do 1º turno de 2026; na noite, o % de seções e o placar do TSE e, com a chave
// dela, a projeção da base escolhida. A cor é a de quem lidera, mais forte com vantagem maior e mais transparente com
// menos seções; cinza sem seções. No modo "Mudança desde o 1º turno", a cor é a de quem ganhou terreno, com a conta de
// "A projeção, comparada" da caixa: o 1º turno com que o coletor compara cada lugar (o do mapa.json, para as UFs, e o da
// tabela de projeções, para os municípios de uma UF), contra a projeção enquanto a noite corre (num lugar que terminou,
// ela já é o resultado) e contra o resultado depois do fim.

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
const SEM_SECOES: Pintura = { cor: null, forca: 0, opacidade: 1 };

/** O mapa dos lugares de uma tabela de lugares no quadro, na base escolhida e no modo pedido, se ele está disponível. */
export function mapaDosLugares({
  arquivo,
  quadro,
  base,
  modo,
}: {
  arquivo: ArquivoDaTabelaDeLugares;
  quadro: QuadroAoVivo;
  base: IdDaBase;
  modo: ModoDoMapa;
}): ConteudoDoMapa {
  const tabela = tabelaDosLugares({ arquivo, quadro, base });
  const { candidatos } = tabela;
  /** A cor de quem está à frente em dois %, mais forte com mais vantagem. */
  const aFrente = ([a, b]: [number, number], opacidade: number): Pintura => {
    if (a === b) return { cor: "empate", forca: 0, opacidade };
    return { cor: corDoPartido(candidatos[a > b ? 0 : 1]!.partido), forca: forca(Math.abs(a - b), PASSOS_DA_VANTAGEM), opacidade };
  };

  if (tabela.colunas.includes("primeiroTurno")) {
    const lugares = tabela.linhas.map((l) => {
      const pt = l.primeiroTurno;
      return { ...l, mudanca: null, pintura: pt === null ? SEM_SECOES : aFrente([pt, oQueFaltaPara100(pt)], 1) };
    });
    return { mostra: "primeiroTurno", modos: [], candidatos, lugares };
  }

  const encerrada = quadro.fase === "encerrada";
  const doPrimeiroTurno = primeiroTurnoDoColetor(arquivo, quadro);
  // A mudança precisa do 1º turno do coletor e, enquanto a noite corre, da projeção; depois do fim, do resultado.
  const modos: ModoDoMapa[] = doPrimeiroTurno && (encerrada || tabela.colunas.includes("projecao")) ? ["placar", "mudanca"] : [];
  const mostra = modos.includes(modo) ? modo : "placar";

  const lugares = tabela.linhas.map((l): LugarDoMapa => {
    const opacidade = 0.4 + (0.6 * (l.secoes ?? 0)) / 100;
    if (!l.secoes || !l.placar) return { ...l, mudanca: null, pintura: SEM_SECOES };
    if (mostra === "placar") return { ...l, mudanca: null, pintura: aFrente(l.placar, opacidade) };
    const de = doPrimeiroTurno!.get(l.id);
    const para = encerrada ? l.placar[0] : l.projecao;
    if (de === undefined || para === null) return { ...l, mudanca: null, pintura: SEM_SECOES };
    const decimos = decimosEntre(de, para);
    const pintura: Pintura =
      decimos === 0
        ? { cor: "empate", forca: 0, opacidade }
        : { cor: corDoPartido(candidatos[decimos > 0 ? 0 : 1]!.partido), forca: forca(Math.abs(decimos) / 10, PASSOS_DA_MUDANCA), opacidade };
    return { ...l, mudanca: mudancaEntre(candidatos, de, para), pintura };
  });
  return { mostra, modos, candidatos, lugares };
}

/**
 * O 1º turno com que o coletor compara cada lugar da tabela, em % do 1º candidato da rodada com uma casa: no Brasil, o
 * das UFs e do Exterior no mapa.json; numa UF, o dos municípios na tabela de projeções dela. O Brasil por municípios não
 * tem: precisaria das 28 tabelas de projeções.
 */
function primeiroTurnoDoColetor(arquivo: ArquivoDaTabelaDeLugares, quadro: QuadroAoVivo): Map<string, number> | null {
  if (arquivo.lugar === "BR") {
    const mapa = quadro.mapa?.assinatura === arquivo.assinatura ? quadro.mapa : null;
    // Um mapa.json de um coletor de antes do ticket 26 não traz o 1º turno: o modo fica de fora, e o mapa segue.
    return mapa?.projecao?.primeiroTurno ? new Map(Object.entries(mapa.projecao.primeiroTurno)) : null;
  }
  const tabela = quadro.tabelaDeProjecoes?.uf === arquivo.lugar ? quadro.tabelaDeProjecoes : null;
  return tabela && new Map(tabela.municipios.map((id, i) => [id, tabela.comparacoes.primeiroTurno[i]!]));
}
