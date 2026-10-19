import { gunzipSync, gzipSync } from "node:zlib";
import type { DetalheMunzona, DetalheSecao, LinhaDoHistorico, VotoCandidatoMunzona, VotoSecao } from "@apurador/tse";
import { doTurnoDePresidente } from "./presidente.ts";
import type { CandidatoDoTurno } from "./turno.ts";

// A noite de um turno reconstruída seção por seção: cada seção entra no placar parcial no instante da
// primeira totalização (`detalhe_votacao_secao`), com os votos do boletim de urna. As seções de uma zona
// totalizadas no mesmo segundo viram uma chegada, e a sequência das chegadas dá o estado da apuração em
// qualquer instante, por zona, município, UF e Brasil. O modelo, o TSE falso e o replay usam essa sequência.

/** Uma zona eleitoral de um município (ou um posto do Exterior), com o total de seções e de eleitores da noite. */
export interface ZonaDaNoite {
  uf: string;
  municipio: number;
  zona: number;
  /** Todas as seções, inclusive as não instaladas: é o denominador do % de seções totalizadas. */
  secoes: number;
  aptos: number;
}

/** O que se soma na apuração: seções, eleitores e votos. */
export interface Contagem {
  secoes: number;
  aptos: number;
  votantes: number;
  brancos: number;
  /** Inclui os nulos técnicos. */
  nulos: number;
  /** Votos válidos de cada candidato, na ordem de `Noite.candidatos`. */
  votos: number[];
}

/** As seções de uma zona totalizadas num mesmo segundo, somadas. */
export interface Chegada extends Contagem {
  /** Segundos desde 00:00 do dia da eleição, em hora de Brasília (passa de 86.400 depois da meia-noite). */
  instante: number;
  /** A posição da zona em `Noite.zonas`. */
  zona: number;
}

export interface Noite {
  ano: number;
  turno: number;
  cargo: "Presidente";
  /** A data da eleição, `AAAA-MM-DD`. Os instantes contam a partir de 00:00 dela. */
  dia: string;
  /** As datas de geração dos arquivos do TSE usados (`DT_GERACAO HH_GERACAO`). */
  geracao: string[];
  candidatos: CandidatoDoTurno[];
  /** Por UF, município e zona. */
  zonas: ZonaDaNoite[];
  /** Em ordem de instante. */
  chegadas: Chegada[];
}

const contagemVazia = (candidatos: number): Contagem => ({ secoes: 0, aptos: 0, votantes: 0, brancos: 0, nulos: 0, votos: Array<number>(candidatos).fill(0) });

function somar(a: Contagem, b: Contagem): void {
  a.secoes += b.secoes;
  a.aptos += b.aptos;
  a.votantes += b.votantes;
  a.brancos += b.brancos;
  a.nulos += b.nulos;
  b.votos.forEach((n, i) => (a.votos[i]! += n));
}

/** A chave de um recorte. As partes que faltam ficam vazias, para `{ uf, zona }` não se confundir com um município. */
const chave = (r: Recorte) => `${r.uf ?? ""}/${r.municipio ?? ""}/${r.zona ?? ""}`;
const chaveDaSecao = (s: { uf: string; municipio: number; zona: number; secao: number }) => `${chave(s)}/${s.secao}`;

export function reconstruirNoite(entrada: { ano: number; turno: number; candidatos: CandidatoDoTurno[]; secoes: Iterable<DetalheSecao>; votos: Iterable<VotoSecao> }): Noite {
  const { ano, turno, candidatos } = entrada;
  const doTurno = doTurnoDePresidente(entrada);
  const posicaoDoCandidato = new Map(candidatos.map((c, i) => [c.numero, i]));
  const geracao = new Set<string>();

  // Os votos de cada seção no boletim de urna. Um voto nominal em quem não é candidato válido do turno é nulo técnico.
  const votosDaSecao = new Map<string, Contagem>();
  for (const v of entrada.votos) {
    if (!doTurno(v)) continue;
    geracao.add(v.geracao);
    const k = chaveDaSecao(v);
    let s = votosDaSecao.get(k);
    if (!s) votosDaSecao.set(k, (s = contagemVazia(candidatos.length)));
    const candidato = v.tipo === "nominal" ? posicaoDoCandidato.get(v.numero) : undefined;
    if (candidato !== undefined) s.votos[candidato]! += v.votos;
    else if (v.tipo === "branco") s.brancos += v.votos;
    else if (v.tipo === "nulo" || v.tipo === "nominal") s.nulos += v.votos;
    else throw new Error(`${k}: voto de legenda para Presidente`);
  }

  const zonas = new Map<string, ZonaDaNoite>();
  const totalizadas: { instante: number; zona: string; dataHora: string; secao: Contagem }[] = [];
  let dia: string | undefined;
  for (const s of entrada.secoes) {
    if (!doTurno(s)) continue;
    geracao.add(s.geracao);
    dia ??= s.dataDaEleicao;
    const k = chave(s);
    let z = zonas.get(k);
    if (!z) zonas.set(k, (z = { uf: s.uf, municipio: s.municipio, zona: s.zona, secoes: 0, aptos: 0 }));
    z.secoes++;
    z.aptos += s.aptos;

    // Os dois arquivos do TSE precisam contar os mesmos eleitores: cada votante deu um voto para Presidente.
    const secao = votosDaSecao.get(chaveDaSecao(s)) ?? contagemVazia(candidatos.length);
    votosDaSecao.delete(chaveDaSecao(s));
    const noBoletim = secao.brancos + secao.nulos + secao.votos.reduce((a, n) => a + n, 0);
    if (noBoletim !== s.votantes) throw new Error(`${chaveDaSecao(s)}: o boletim de urna tem ${noBoletim} votos, e o detalhe, ${s.votantes} votantes`);
    Object.assign(secao, { secoes: 1, aptos: s.aptos, votantes: s.votantes });
    if (s.primeiraTotalizacao !== null) totalizadas.push({ instante: 0, zona: k, dataHora: s.primeiraTotalizacao, secao });
  }
  if (dia === undefined) throw new Error(`${ano} ${turno}º turno: nenhuma seção de Presidente no detalhe`);
  const sobras = [...votosDaSecao.keys()];
  if (sobras.length > 0) throw new Error(`${sobras.length} seção(ões) do boletim de urna sem detalhe, como ${sobras.slice(0, 3).join(", ")}`);
  for (const t of totalizadas) t.instante = segundosDesde(dia, t.dataHora);

  const listaDeZonas = [...zonas.values()].sort((a, b) => a.uf.localeCompare(b.uf) || a.municipio - b.municipio || a.zona - b.zona);
  const posicaoDaZona = new Map(listaDeZonas.map((z, i) => [chave(z), i]));
  totalizadas.sort((a, b) => a.instante - b.instante || posicaoDaZona.get(a.zona)! - posicaoDaZona.get(b.zona)!);

  const chegadas: Chegada[] = [];
  for (const { instante, zona, secao } of totalizadas) {
    const z = posicaoDaZona.get(zona)!;
    let c = chegadas.at(-1);
    if (!c || c.instante !== instante || c.zona !== z) chegadas.push((c = { instante, zona: z, ...contagemVazia(candidatos.length) }));
    somar(c, secao);
  }

  return { ano, turno, cargo: "Presidente", dia, geracao: [...geracao].sort(), candidatos, zonas: listaDeZonas, chegadas };
}

/**
 * A noite como fica no repositório: JSON em colunas, com gzip. Os instantes das chegadas vão como os segundos
 * depois da chegada anterior (quase sempre 0 ou poucos), o que deixa a noite de 2022 com pouco mais de 1 MB.
 */
export function gravarNoite(noite: Noite): Uint8Array {
  const { zonas, chegadas, ...cabecalho } = noite;
  const coluna = <T>(itens: T[], valor: (item: T, i: number) => number | string) => JSON.stringify(itens.map((item, i) => valor(item, i)));
  const linhas = [
    ...Object.entries(cabecalho).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`),
    `"zonas":{${(["uf", "municipio", "zona", "secoes", "aptos"] as const).map((k) => `\n${JSON.stringify(k)}:${coluna(zonas, (z) => z[k])}`).join(",")}}`,
    `"chegadas":{${[
      `\n"segundosDepois":${coluna(chegadas, (c, i) => c.instante - (chegadas[i - 1]?.instante ?? 0))}`,
      ...(["zona", "secoes", "aptos", "votantes", "brancos", "nulos"] as const).map((k) => `\n${JSON.stringify(k)}:${coluna(chegadas, (c) => c[k])}`),
      `\n"votos":[${noite.candidatos.map((_, j) => `\n${coluna(chegadas, (c) => c.votos[j]!)}`).join(",")}]`,
    ].join(",")}}`,
  ];
  return new Uint8Array(gzipSync(`{${linhas.join(",\n")}}\n`, { level: 9 }));
}

export function lerNoite(bytes: Uint8Array): Noite {
  const { zonas: z, chegadas: c, ...cabecalho } = JSON.parse(gunzipSync(bytes).toString("utf8")) as Omit<Noite, "zonas" | "chegadas"> & {
    zonas: { uf: string[]; municipio: number[]; zona: number[]; secoes: number[]; aptos: number[] };
    chegadas: Record<"segundosDepois" | "zona" | "secoes" | "aptos" | "votantes" | "brancos" | "nulos", number[]> & { votos: number[][] };
  };
  let instante = 0;
  return {
    ...cabecalho,
    zonas: z.uf.map((uf, i) => ({ uf, municipio: z.municipio[i]!, zona: z.zona[i]!, secoes: z.secoes[i]!, aptos: z.aptos[i]! })),
    chegadas: c.segundosDepois.map((d, i) => ({
      instante: (instante += d),
      zona: c.zona[i]!,
      secoes: c.secoes[i]!,
      aptos: c.aptos[i]!,
      votantes: c.votantes[i]!,
      brancos: c.brancos[i]!,
      nulos: c.nulos[i]!,
      votos: c.votos.map((v) => v[i]!),
    })),
  };
}

/** Segundos de `AAAA-MM-DD HH:MM:SS` desde 00:00 de `dia`. */
function segundosDesde(dia: string, dataHora: string): number {
  const dias = (Date.parse(`${dataHora.slice(0, 10)}T00:00:00Z`) - Date.parse(`${dia}T00:00:00Z`)) / 86_400_000;
  const [h, m, s] = dataHora.slice(11).split(":").map(Number) as [number, number, number];
  return dias * 86_400 + h * 3600 + m * 60 + s;
}

/** O instante da noite (segundos desde 00:00 do dia da eleição) de uma data e hora `AAAA-MM-DD HH:MM:SS` de Brasília. */
export const instanteDaNoite = (noite: Pick<Noite, "dia">, dataHora: string) => segundosDesde(noite.dia, dataHora);

/** A data e hora `AAAA-MM-DD HH:MM:SS` de Brasília de um instante da noite. */
export function dataHoraDoInstante(noite: Pick<Noite, "dia">, instante: number): string {
  return new Date(Date.parse(`${noite.dia}T00:00:00Z`) + instante * 1000).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Confere a noite com o histórico oficial de totalização do Brasil (só existe para 2022): os mesmos instantes
 * e, em cada um, o mesmo acumulado. Devolve as diferenças, vazio se a noite repete o histórico.
 */
export function divergenciasDoHistorico(noite: Noite, historico: LinhaDoHistorico[]): string[] {
  const divergencias: string[] = [];
  const r = reproduzir(noite);
  const instantes = new Set<number>();
  for (const l of [...historico].sort((a, b) => a.totalizacao.localeCompare(b.totalizacao))) {
    const instante = instanteDaNoite(noite, l.totalizacao);
    instantes.add(instante);
    r.avancarAte(instante);
    const a = r.apurado();
    const comparar = (nome: string, naNoite: number, noHistorico: number | undefined) => {
      if (naNoite !== noHistorico) divergencias.push(`${l.totalizacao}: ${nome} tem ${naNoite} na noite e ${noHistorico} no histórico`);
    };
    comparar("o total de seções", r.total().secoes, l.totalDeSecoes);
    comparar("seções", a.secoes, l.secoes);
    comparar("aptos", a.aptos, l.aptos);
    comparar("votos", a.votantes, l.votos);
    comparar("válidos", a.votos.reduce((s, v) => s + v, 0), l.validos);
    comparar("brancos", a.brancos, l.brancos);
    comparar("nulos", a.nulos, l.nulos);
    noite.candidatos.forEach((c, i) => comparar(c.nomeUrna, a.votos[i]!, l.candidatos[c.nomeUrna]));
  }
  const daNoite = new Set(noite.chegadas.map((c) => c.instante));
  for (const i of daNoite) if (!instantes.has(i)) divergencias.push(`a noite tem uma chegada às ${dataHoraDoInstante(noite, i)}, que não está no histórico`);
  for (const i of instantes) if (!daNoite.has(i)) divergencias.push(`o histórico tem uma totalização às ${dataHoraDoInstante(noite, i)}, sem chegada na noite`);
  return divergencias;
}

/** Confere o fim da noite, zona a zona, com o resultado oficial por município e zona. Devolve as diferenças. */
export function divergenciasDoResultado(noite: Noite, oficial: { candidatos: VotoCandidatoMunzona[]; detalhes: DetalheMunzona[] }): string[] {
  const doTurno = doTurnoDePresidente(noite);
  const resultado = new Map<string, DetalheMunzona & { porNumero: Map<number, number> }>();
  for (const d of oficial.detalhes.filter(doTurno)) resultado.set(chave(d), { ...d, porNumero: new Map() });
  for (const v of oficial.candidatos.filter(doTurno)) {
    const z = resultado.get(chave(v));
    if (z) z.porNumero.set(v.numero, (z.porNumero.get(v.numero) ?? 0) + v.votos);
  }

  const divergencias: string[] = [];
  const r = reproduzir(noite);
  r.avancarAte(Infinity);
  for (const zona of noite.zonas) {
    const k = chave(zona);
    const o = resultado.get(k);
    resultado.delete(k);
    if (!o) {
      divergencias.push(`${k}: está na noite e não no resultado oficial`);
      continue;
    }
    const a = r.apurado(zona);
    const comparar = (nome: string, naNoite: number, noOficial: number) => {
      if (naNoite !== noOficial) divergencias.push(`${k}: ${nome} ${naNoite} na noite e ${noOficial} no resultado oficial`);
    };
    comparar("aptos", r.total(zona).aptos, o.aptos);
    comparar("votantes", a.votantes, o.votantes);
    comparar("válidos", a.votos.reduce((s, v) => s + v, 0), o.validos);
    comparar("brancos", a.brancos, o.brancos);
    comparar("nulos", a.nulos, o.nulos);
    noite.candidatos.forEach((c, i) => comparar(c.nomeUrna, a.votos[i]!, o.porNumero.get(c.numero) ?? 0));
  }
  for (const k of resultado.keys()) divergencias.push(`${k}: está no resultado oficial e não na noite`);
  return divergencias;
}

/** O acumulado de um recorte da apuração. */
export interface Totais extends Contagem {
  /** O instante da última chegada no recorte, ou `null` antes da primeira. */
  ultimaTotalizacao: number | null;
}

/** Brasil (`{}`), UF (`{ uf }`, com `ZZ` para o Exterior), município (`{ uf, municipio }`) ou zona. */
export interface Recorte {
  uf?: string;
  municipio?: number;
  zona?: number;
}

export interface Reproducao {
  /** Aplica as chegadas até o instante, inclusive. Só anda para a frente. */
  avancarAte(instante: number): void;
  /** O acumulado do recorte até agora. Falha com um recorte que não existe na noite. */
  apurado(recorte?: Recorte): Totais;
  /** As seções e os eleitores do recorte na noite toda. Falha com um recorte que não existe na noite. */
  total(recorte?: Recorte): { secoes: number; aptos: number };
}

/** Reproduz a noite chegada a chegada, com o acumulado de cada zona, município, UF e do Brasil. */
export function reproduzir(noite: Noite): Reproducao {
  const recortesDaZona = noite.zonas.map((z) => [{}, { uf: z.uf }, { uf: z.uf, municipio: z.municipio }, z].map(chave));
  const totais = new Map<string, { secoes: number; aptos: number }>();
  const acumulados = new Map<string, Totais>();
  noite.zonas.forEach((z, i) => {
    for (const k of recortesDaZona[i]!) {
      const t = totais.get(k) ?? { secoes: 0, aptos: 0 };
      t.secoes += z.secoes;
      t.aptos += z.aptos;
      totais.set(k, t);
      acumulados.set(k, { ...contagemVazia(noite.candidatos.length), ultimaTotalizacao: null });
    }
  });
  const doRecorte = <T>(mapa: Map<string, T>, recorte: Recorte) => {
    const t = mapa.get(chave(recorte));
    if (t === undefined) throw new Error(`O recorte ${chave(recorte)} não existe na noite`);
    return t;
  };
  let proxima = 0;

  return {
    avancarAte(instante) {
      for (; proxima < noite.chegadas.length && noite.chegadas[proxima]!.instante <= instante; proxima++) {
        const c = noite.chegadas[proxima]!;
        for (const k of recortesDaZona[c.zona]!) {
          const t = acumulados.get(k)!;
          somar(t, c);
          t.ultimaTotalizacao = c.instante;
        }
      }
    },
    apurado(recorte = {}) {
      const t = doRecorte(acumulados, recorte);
      return { ...t, votos: [...t.votos] };
    },
    total(recorte = {}) {
      return { ...doRecorte(totais, recorte) };
    },
  };
}
