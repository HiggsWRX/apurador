import type { DetalheMunzona, DetalheSecao, VotoCandidatoMunzona } from "@apurador/tse";
import { doTurnoDePresidente } from "./presidente.ts";
import type { CandidatoDoTurno } from "./turno.ts";

// A base do modelo para uma noite: o 1º turno de cada município, com os votos dos dois finalistas da noite,
// os válidos, os aptos, as seções e o perfil de chegada. O mesmo código serve a qualquer par de turnos: a
// noite de 2022 com o 1º turno de 2022, a de 25/10 com o 1º turno de 2026, e as noites da calibração.

/** O 1º turno de um município (ou de um posto do Exterior), como o modelo o usa. */
export interface BaseDoMunicipio {
  uf: string;
  municipio: number;
  /** Só num município dividido em zonas: a zona desta parte dele. */
  zona?: number;
  aptos: number;
  /**
   * As seções principais do município, inclusive as não instaladas, como no % de seções totalizadas (as
   * agregadas, que o `QT_TOTAL_SECOES` do TSE soma, não contam).
   */
  secoes: number;
  validos: number;
  /** Votos de cada finalista, na ordem de `BaseDoModelo.finalistas`. Os eliminados ficam com o resto dos válidos. */
  votos: number[];
  /**
   * O perfil de chegada em degraus `[x, seções]`: quando o país tinha x% das seções (x inteiro, de 1 a 100),
   * o município tinha `seções` totalizadas, até o degrau seguinte. Antes do primeiro, nenhuma.
   */
  degrausDeChegada: [number, number][];
}

export interface BaseDoModelo {
  /** A noite que a base serve. */
  noite: { ano: number; turno: number };
  /** O turno de onde vêm os números. */
  turnoDaBase: { ano: number; turno: number };
  /** As datas de geração dos arquivos do TSE usados (`DT_GERACAO HH_GERACAO`). */
  geracao: string[];
  /**
   * Os candidatos do turno da base com os números dos finalistas da noite. Numa noite de outro ano, são os
   * candidatos dos mesmos números naquele turno (o 22 de 2022 é Jair Bolsonaro).
   */
  finalistas: CandidatoDoTurno[];
  /** As seções do país no turno da base, o denominador do perfil de chegada. */
  secoes: number;
  /** Por UF e município. */
  municipios: BaseDoMunicipio[];
}

export function baseDoModelo(entrada: {
  noite: { ano: number; turno: number };
  turnoDaBase: { ano: number; turno: number };
  /** Os números dos dois finalistas da noite, na ordem em que a base os guarda. */
  finalistas: number[];
  candidatos: VotoCandidatoMunzona[];
  detalhes: DetalheMunzona[];
  secoes: Iterable<DetalheSecao>;
  /**
   * Os municípios da noite, quando ela tem outra geografia que o turno da base. Os que não votaram no turno
   * da base entram zerados, e os que a noite não tem ficam de fora. Sem eles, vale a geografia da base.
   */
  municipios?: { uf: string; municipio: number }[];
  /**
   * As zonas da noite, para o teste da zona (Ensaio geral, decisão 16). Com elas, o município com mais de uma zona na
   * noite e as mesmas no turno da base entra dividido em zonas, cada uma com o seu 1º turno e o seu perfil de chegada.
   * O que mudou de zonas fica inteiro. Sem `municipios`, elas dão também a geografia da noite.
   */
  zonas?: { uf: string; municipio: number; zona: number }[];
}): BaseDoModelo {
  const { ano, turno } = entrada.turnoDaBase;
  const doTurno = doTurnoDePresidente(entrada.turnoDaBase);
  const doMunicipioDe = (l: { uf: string; municipio: number }) => `${l.uf}/${l.municipio}`;
  const zonasPorMunicipio = (lista: { uf: string; municipio: number; zona: number }[]) => {
    const zonas = new Map<string, Set<number>>();
    for (const l of lista) zonas.set(doMunicipioDe(l), (zonas.get(doMunicipioDe(l)) ?? new Set()).add(l.zona));
    return zonas;
  };
  const daNoite = entrada.zonas && zonasPorMunicipio(entrada.zonas);
  const doTurnoDaBase = zonasPorMunicipio(entrada.detalhes.filter(doTurno));
  const mesmas = (a: Set<number>, b: Set<number> | undefined) => b !== undefined && a.size === b.size && [...a].every((z) => b.has(z));
  const divididos = new Map([...(daNoite ?? [])].filter(([m, zonas]) => zonas.size > 1 && mesmas(zonas, doTurnoDaBase.get(m))));
  const chave = (l: { uf: string; municipio: number; zona?: number }) => (divididos.has(doMunicipioDe(l)) ? `${doMunicipioDe(l)}/${l.zona}` : doMunicipioDe(l));
  const zerado = (l: { uf: string; municipio: number; zona?: number }): BaseDoMunicipio => ({
    uf: l.uf,
    municipio: l.municipio,
    ...(divididos.has(doMunicipioDe(l)) ? { zona: l.zona! } : {}),
    aptos: 0,
    secoes: 0,
    validos: 0,
    votos: entrada.finalistas.map(() => 0),
    degrausDeChegada: [],
  });
  const geracao = new Set<string>();
  const municipios = new Map<string, BaseDoMunicipio>();
  const doMunicipio = (l: { uf: string; municipio: number; zona?: number }) => {
    let m = municipios.get(chave(l));
    if (!m) municipios.set(chave(l), (m = zerado(l)));
    return m;
  };

  for (const d of entrada.detalhes.filter(doTurno)) {
    geracao.add(d.geracao);
    const m = doMunicipio(d);
    m.aptos += d.aptos;
    m.validos += d.validos;
  }

  const finalistas: (CandidatoDoTurno | undefined)[] = entrada.finalistas.map(() => undefined);
  for (const v of entrada.candidatos.filter(doTurno)) {
    geracao.add(v.geracao);
    const i = entrada.finalistas.indexOf(v.numero);
    if (i < 0) continue;
    finalistas[i] ??= { numero: v.numero, nome: v.nome, nomeUrna: v.nomeUrna, partido: v.partido };
    doMunicipio(v).votos[i]! += v.votos;
  }
  const ausentes = entrada.finalistas.filter((_, i) => !finalistas[i]);
  if (ausentes.length > 0) throw new Error(`${ano} ${turno}º turno: os finalistas ${ausentes.join(", ")} não têm votos no turno da base`);

  // A ordem de chegada no turno da base: pela primeira totalização, e as seções do mesmo segundo pela chave.
  const secoes = [...entrada.secoes].filter(doTurno);
  for (const s of secoes) {
    geracao.add(s.geracao);
    doMunicipio(s).secoes++;
  }
  const totalizadas = secoes
    .filter((s) => s.primeiraTotalizacao !== null)
    .sort((a, b) => cmp(a.primeiraTotalizacao!, b.primeiraTotalizacao!) || cmp(a.uf, b.uf) || a.municipio - b.municipio || a.zona - b.zona || a.secao - b.secao);
  const n = secoes.length;

  // A j-ésima seção a chegar (de 1 a n) já tinha chegado quando o país tinha x% das seções se 100·j ≤ x·n.
  totalizadas.forEach((s, i) => {
    const x = Math.ceil((100 * (i + 1)) / n);
    const degraus = municipios.get(chave(s))!.degrausDeChegada;
    const ultimo = degraus.at(-1);
    if (ultimo?.[0] === x) ultimo[1]++;
    else degraus.push([x, (ultimo?.[1] ?? 0) + 1]);
  });

  // A geografia da noite, com as partes de cada município dividido em zonas.
  const geografia = entrada.municipios ?? (daNoite && [...daNoite.keys()].map((m) => entrada.zonas!.find((z) => doMunicipioDe(z) === m)!));
  const partes = (m: { uf: string; municipio: number }) => [...(divididos.get(doMunicipioDe(m)) ?? [undefined])].map((zona) => ({ ...m, zona }));
  const daGeografia = geografia?.flatMap(partes).map((m) => municipios.get(chave(m)) ?? zerado(m)) ?? [...municipios.values()];
  return {
    noite: entrada.noite,
    turnoDaBase: entrada.turnoDaBase,
    geracao: [...geracao].sort(),
    finalistas: finalistas as CandidatoDoTurno[],
    secoes: n,
    municipios: daGeografia.sort((a, b) => cmp(a.uf, b.uf) || a.municipio - b.municipio || (a.zona ?? 0) - (b.zona ?? 0)),
  };
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** JSON estável e legível no diff: um município por linha. */
export function gravarBase(base: BaseDoModelo): string {
  const { municipios, ...cabecalho } = base;
  return [
    "{",
    ...Object.entries(cabecalho).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`),
    `  "municipios": [`,
    municipios.map((m) => `    ${JSON.stringify(m)}`).join(",\n"),
    "  ]",
    "}",
    "",
  ].join("\n");
}

/** As frações que o modelo usa, a partir da base de um município. `null` onde não há votos válidos. */
export function indicadoresDaBase(m: BaseDoMunicipio): {
  /** A fatia de cada finalista sobre a soma dos dois. */
  placarEntreFinalistas: number[] | null;
  /** A fatia dos válidos que foi para os candidatos eliminados. */
  fatiaDosEliminados: number | null;
  validosPorApto: number;
  /** A fração das seções do município que tinha chegado com cada % das seções do país, de 0 a 100. */
  perfilDeChegada: number[];
} {
  const dosFinalistas = m.votos.reduce((a, v) => a + v, 0);
  const perfilDeChegada = Array<number>(101).fill(0);
  for (const [x, secoes] of m.degrausDeChegada) perfilDeChegada.fill(secoes / m.secoes, x);
  return {
    placarEntreFinalistas: dosFinalistas > 0 ? m.votos.map((v) => v / dosFinalistas) : null,
    fatiaDosEliminados: m.validos > 0 ? (m.validos - dosFinalistas) / m.validos : null,
    validosPorApto: m.aptos > 0 ? m.validos / m.aptos : 0,
    perfilDeChegada,
  };
}
