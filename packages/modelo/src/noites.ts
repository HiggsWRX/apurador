import type { Constantes } from "./constantes.ts";
import { Z_95 } from "./normal.ts";
import { projetar, type Apuracao, type Modelo } from "./projecao.ts";

// O executor de noites: roda o modelo sobre uma noite reconstruída (a sequência de estados da apuração) e
// resume o erro, a cobertura e a chance honesta. Serve à calibração, ao histórico de acerto e a "Como a
// projeção se saiu".

/** Uma noite reconstruída, no que o modelo usa (a `Noite` do `@apurador/pipeline` serve). */
export interface NoiteDoModelo {
  candidatos: { numero: number }[];
  /** As zonas (ou postos do Exterior) de cada município, com o total de seções e de eleitores da noite. */
  zonas: { uf: string; municipio: number; secoes: number; aptos: number }[];
  /** As seções de uma zona totalizadas num mesmo instante, somadas, em ordem de instante. */
  chegadas: { instante: number; zona: number; secoes: number; aptos: number; votos: number[] }[];
}

export interface MomentoDaNoite {
  /** O instante da última chegada, em segundos desde 00:00 do dia da eleição. */
  instante: number;
  /** O % de seções totalizadas no Brasil. */
  secoes: number;
  apuracao: Apuracao;
}

/**
 * As fotografias do protótipo do método: 0,1, 0,25, 0,5 e 0,75% das seções, cada ponto inteiro de 1 a 99%, 99,5
 * e 99,9%. Cada momento é a primeira chegada que alcança o ponto, e o último é o fim da noite.
 */
export const FOTOGRAFIAS = [0.1, 0.25, 0.5, 0.75, ...Array.from({ length: 99 }, (_, i) => i + 1), 99.5, 99.9];

/** Os momentos da noite em que o % de seções totalizadas no Brasil alcança cada ponto, mais o fim da noite. */
export function* momentosDaNoite(modelo: Modelo, noite: NoiteDoModelo, pontos: number[] = FOTOGRAFIAS): Generator<MomentoDaNoite> {
  const posicao = new Map(modelo.municipios.map((m, i) => [`${m.uf}/${m.municipio}`, i]));
  const finalistas = modelo.finalistas.map((numero) => {
    const i = noite.candidatos.findIndex((c) => c.numero === numero);
    if (i < 0) throw new Error(`o finalista ${numero} da base não é candidato na noite`);
    return i;
  });
  const municipioDaZona = noite.zonas.map((z) => {
    const m = posicao.get(`${z.uf}/${z.municipio}`);
    if (m === undefined) throw new Error(`${z.uf}/${z.municipio} está na noite e não na base do modelo`);
    return m;
  });

  const apuracao: Apuracao = modelo.municipios.map(() => ({ secoes: 0, secoesTotais: 0, aptos: 0, aptosTotais: 0, votos: finalistas.map(() => 0) }));
  noite.zonas.forEach((z, i) => {
    const a = apuracao[municipioDaZona[i]!]!;
    a.secoesTotais += z.secoes;
    a.aptosTotais += z.aptos;
  });
  const total = noite.zonas.reduce((s, z) => s + z.secoes, 0);
  const comHora = noite.chegadas.reduce((s, c) => s + c.secoes, 0);

  let proxima = 0;
  let secoes = 0;
  let ultima = 0;
  const alvos = [...pontos].sort((a, b) => a - b).map((p) => Math.min(comHora, Math.max(1, Math.round((p / 100) * total))));
  for (const alvo of [...alvos, comHora]) {
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
    yield { instante: noite.chegadas[proxima - 1]!.instante, secoes: (100 * secoes) / total, apuracao: apuracao.map((a) => ({ ...a, votos: [...a.votos] })) };
  }
}

/** Um momento da noite no Brasil. As fatias são do 1º finalista da base. */
export interface LinhaDaNoite {
  instante: number;
  /** O % de seções totalizadas. */
  secoes: number;
  placar: number | null;
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
  /** O erro, em pontos percentuais, no primeiro momento com 5, 25 e 50% das seções. */
  erroCom5: number | null;
  erroCom25: number | null;
  erroCom50: number | null;
  /** A fração dos momentos com o resultado final dentro da margem de 95%. */
  cobertura: number;
  /** O % de seções desde o qual a projeção aponta o vencedor até o fim da noite. */
  acertaDesde: number | null;
  /** O % de seções desde o qual o vencedor tem 95% de chance ou mais até o fim da noite. */
  chance95Desde: number | null;
  /** O escore de Brier da chance de vitória: a média de (chance − 1)² do vencedor. Quanto menor, mais honesta e firme. */
  brier: number;
}

/** Roda o modelo em cada momento da noite e resume o erro, a cobertura e a chance honesta no Brasil. */
export function executarNoite(modelo: Modelo, noite: NoiteDoModelo, constantes: Constantes, pontos: number[] = FOTOGRAFIAS): ResultadoDaNoite {
  const lista = [...momentosDaNoite(modelo, noite, pontos)];
  const fim = lista.at(-1)!.apuracao;
  const votos1 = fim.reduce((s, a) => s + a.votos[0]!, 0);
  const final = votos1 / fim.reduce((s, a) => s + a.votos[0]! + a.votos[1]!, 0);
  const vence = final > 0.5;

  const momentos = lista.map(({ instante, secoes, apuracao }): LinhaDaNoite => {
    const { placar, projecao, desvio, chance } = projetar(modelo, apuracao, constantes).brasil;
    return { instante, secoes, placar, projecao, desvio, chance, erro: 100 * Math.abs(projecao - final) };
  });
  const erroCom = (secoes: number) => momentos.find((m) => m.secoes >= secoes)?.erro ?? null;
  /** O % de seções desde o qual a condição vale em todos os momentos até o fim. */
  const desde = (vale: (m: LinhaDaNoite) => boolean) => {
    let inicio: number | null = null;
    for (const m of momentos) inicio = vale(m) ? (inicio ?? m.secoes) : null;
    return inicio;
  };
  const chanceDoVencedor = (m: LinhaDaNoite) => (vence ? m.chance : 1 - m.chance);
  return {
    final,
    momentos,
    erroCom5: erroCom(5),
    erroCom25: erroCom(25),
    erroCom50: erroCom(50),
    cobertura: momentos.filter((m) => Math.abs(m.projecao - final) <= Z_95 * m.desvio).length / momentos.length,
    acertaDesde: desde((m) => m.projecao > 0.5 === vence),
    chance95Desde: desde((m) => chanceDoVencedor(m) >= 0.95),
    brier: momentos.reduce((s, m) => s + (chanceDoVencedor(m) - 1) ** 2, 0) / momentos.length,
  };
}
