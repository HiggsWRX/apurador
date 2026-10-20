import type { Agregado } from "./agregado.ts";
import type { Constantes } from "./constantes.ts";
import { Z_95 } from "./normal.ts";
import { projetar, type Apuracao, type Modelo } from "./projecao.ts";

// O executor de noites: roda o modelo sobre uma noite reconstruída (a sequência de estados da apuração), numa das
// duas bases da projeção, e resume o erro, a cobertura e a chance honesta. Serve à calibração, ao histórico de acerto
// e a "Como a projeção se saiu". Cada base tem o próprio resumo, e as duas andam nos mesmos momentos: a noite momento
// a momento nas duas bases é uma linha de cada execução.

/** Uma noite reconstruída, no que o modelo usa (a `Noite` do `@apurador/pipeline` serve). */
export interface NoiteDoModelo {
  candidatos: { numero: number }[];
  /** As zonas (ou postos do Exterior) de cada município, com o total de seções e de eleitores da noite. */
  zonas: { uf: string; municipio: number; zona: number; secoes: number; aptos: number }[];
  /** As seções de uma zona totalizadas num mesmo instante, somadas, em ordem de instante. */
  chegadas: { instante: number; zona: number; secoes: number; aptos: number; votos: number[] }[];
}

export interface MomentoDaNoite {
  /** O instante da última chegada, em segundos desde 00:00 do dia da eleição. */
  instante: number;
  /** O % de seções totalizadas no Brasil. */
  secoes: number;
  /**
   * O ponto da fotografia, ou 100 no fim da noite. Os intervalos de % de seções comparam o ponto, porque a fotografia
   * alcança o número de seções arredondado e fica até meia seção abaixo dele (a de 0,1% de 2022 tem 0,09998%) ou passa
   * dele pela chegada que o alcança. Quando uma chegada alcança dois pontos, o momento é o do primeiro.
   */
  ponto: number;
  apuracao: Apuracao;
}

/**
 * As fotografias do protótipo do método: 0,1, 0,25, 0,5 e 0,75% das seções, cada ponto inteiro de 1 a 99%, 99,5
 * e 99,9%. Cada momento é a primeira chegada que alcança o ponto, e o último é o fim da noite.
 */
export const FOTOGRAFIAS = [0.1, 0.25, 0.5, 0.75, ...Array.from({ length: 99 }, (_, i) => i + 1), 99.5, 99.9];

/** A posição de cada zona da noite na base do modelo: a da parte dela, num município dividido em zonas, ou a do município. */
function posicaoDasZonas(modelo: Modelo, noite: NoiteDoModelo): number[] {
  const posicao = new Map(modelo.municipios.map((m, i) => [m.zona === undefined ? `${m.uf}/${m.municipio}` : `${m.uf}/${m.municipio}/${m.zona}`, i]));
  return noite.zonas.map((z) => {
    const m = posicao.get(`${z.uf}/${z.municipio}/${z.zona}`) ?? posicao.get(`${z.uf}/${z.municipio}`);
    if (m === undefined) throw new Error(`${z.uf}/${z.municipio} está na noite e não na base do modelo`);
    return m;
  });
}

/** A apuração antes da primeira seção: nada totalizado, com as seções e os eleitores de cada município na noite. */
export function apuracaoAntesDaPrimeiraSecao(modelo: Modelo, noite: NoiteDoModelo, posicao = posicaoDasZonas(modelo, noite)): Apuracao {
  const apuracao: Apuracao = modelo.municipios.map(() => ({ secoes: 0, secoesTotais: 0, aptos: 0, aptosTotais: 0, votos: modelo.finalistas.map(() => 0) }));
  noite.zonas.forEach((z, i) => {
    const a = apuracao[posicao[i]!]!;
    a.secoesTotais += z.secoes;
    a.aptosTotais += z.aptos;
  });
  return apuracao;
}

/** Os momentos da noite em que o % de seções totalizadas no Brasil alcança cada ponto, mais o fim da noite. */
export function* momentosDaNoite(modelo: Modelo, noite: NoiteDoModelo, pontos: number[] = FOTOGRAFIAS): Generator<MomentoDaNoite> {
  const finalistas = modelo.finalistas.map((numero) => {
    const i = noite.candidatos.findIndex((c) => c.numero === numero);
    if (i < 0) throw new Error(`o finalista ${numero} da base não é candidato na noite`);
    return i;
  });
  const municipioDaZona = posicaoDasZonas(modelo, noite);
  const apuracao = apuracaoAntesDaPrimeiraSecao(modelo, noite, municipioDaZona);
  const total = noite.zonas.reduce((s, z) => s + z.secoes, 0);
  const comHora = noite.chegadas.reduce((s, c) => s + c.secoes, 0);

  let proxima = 0;
  let secoes = 0;
  let ultima = 0;
  const ordenados = [...pontos].sort((a, b) => a - b);
  const alvos = [...ordenados.map((p) => ({ ponto: p, secoes: Math.min(comHora, Math.max(1, Math.round((p / 100) * total))) })), { ponto: 100, secoes: comHora }];
  for (const { ponto, secoes: alvo } of alvos) {
    for (; proxima < noite.chegadas.length && secoes < alvo; proxima++) {
      const c = noite.chegadas[proxima]!;
      const a = apuracao[municipioDaZona[c.zona]!]!;
      a.secoes += c.secoes;
      a.aptos += c.aptos;
      finalistas.forEach((j, i) => (a.votos[i]! += c.votos[j]!));
      secoes += c.secoes;
    }
    if (proxima === ultima) continue;
    ultima = proxima;
    yield { instante: noite.chegadas[proxima - 1]!.instante, secoes: (100 * secoes) / total, ponto, apuracao: apuracao.map((a) => ({ ...a, votos: [...a.votos] })) };
  }
}

/** Um momento da noite no Brasil. As fatias são do 1º finalista da base do modelo. */
export interface LinhaDaNoite {
  instante: number;
  /** O % de seções totalizadas. */
  secoes: number;
  /** O ponto da fotografia, como no `MomentoDaNoite`. */
  ponto: number;
  placar: number | null;
  /** O peso das pesquisas na base "Apuração + pesquisas", 0 na "Só apuração". */
  pesoDasPesquisas: number;
  projecao: number;
  desvio: number;
  chance: number;
  /** A distância entre a projeção e o resultado final, em pontos percentuais. */
  erro: number;
}

export interface ResultadoDaNoite {
  /** O resultado final no Brasil: a fatia do 1º finalista no fim da noite. */
  final: number;
  momentos: LinhaDaNoite[];
  /** O erro, em pontos percentuais, nas fotografias de 5, 25 e 50% das seções. */
  erroCom5: number | null;
  erroCom25: number | null;
  erroCom50: number | null;
  /** A fração dos momentos com o resultado final dentro da margem de 95%. */
  cobertura: number;
  /** A mesma fração, só nos momentos depois da fotografia de 1% das seções. */
  coberturaDepoisDe1: number;
  /** O % de seções desde o qual a projeção aponta o vencedor até o fim da noite. */
  acertaDesde: number | null;
  /** O % de seções desde o qual o vencedor tem 95% de chance ou mais até o fim da noite. */
  chance95Desde: number | null;
  /** O escore de Brier da chance de vitória: a média de (chance − 1)² do vencedor. Quanto menor, mais honesta e firme. */
  brier: number;
}

/**
 * Roda o modelo em cada momento da noite e resume o erro, a cobertura e a chance honesta no Brasil: na base "Só
 * apuração" ou, com o agregado de pesquisas da noite (no 1º finalista da base do modelo), na "Apuração + pesquisas".
 */
export function executarNoite(
  modelo: Modelo,
  noite: NoiteDoModelo,
  constantes: Constantes,
  { agregado, pontos = FOTOGRAFIAS }: { agregado?: Pick<Agregado, "valor" | "incerteza">; pontos?: number[] } = {},
): ResultadoDaNoite {
  const lista = [...momentosDaNoite(modelo, noite, pontos)];
  const fim = lista.at(-1)!.apuracao;
  const votos1 = fim.reduce((s, a) => s + a.votos[0]!, 0);
  const final = votos1 / fim.reduce((s, a) => s + a.votos[0]! + a.votos[1]!, 0);
  const vence = final > 0.5;

  const momentos = lista.map(({ instante, secoes, ponto, apuracao }): LinhaDaNoite => {
    const { pesoDasPesquisas, brasil } = projetar(modelo, apuracao, constantes, agregado);
    const { placar, projecao, desvio, chance } = brasil;
    return { instante, secoes, ponto, placar, pesoDasPesquisas, projecao, desvio, chance, erro: 100 * Math.abs(projecao - final) };
  });
  const erroCom = (ponto: number) => momentos.find((m) => m.ponto >= ponto)?.erro ?? null;
  /** O % de seções desde o qual a condição vale em todos os momentos até o fim. */
  const desde = (vale: (m: LinhaDaNoite) => boolean) => {
    let inicio: number | null = null;
    for (const m of momentos) inicio = vale(m) ? (inicio ?? m.secoes) : null;
    return inicio;
  };
  const chanceDoVencedor = (m: LinhaDaNoite) => (vence ? m.chance : 1 - m.chance);
  const cobertura = (lista: LinhaDaNoite[]) => lista.filter((m) => Math.abs(m.projecao - final) <= Z_95 * m.desvio).length / lista.length;
  return {
    final,
    momentos,
    erroCom5: erroCom(5),
    erroCom25: erroCom(25),
    erroCom50: erroCom(50),
    cobertura: cobertura(momentos),
    coberturaDepoisDe1: cobertura(momentos.filter((m) => m.ponto > 1)),
    acertaDesde: desde((m) => m.projecao > 0.5 === vence),
    chance95Desde: desde((m) => chanceDoVencedor(m) >= 0.95),
    brier: momentos.reduce((s, m) => s + (chanceDoVencedor(m) - 1) ** 2, 0) / momentos.length,
  };
}
