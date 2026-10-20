import type { Lugar } from "@apurador/pipeline";
import type { CandidatoDoResultado, ResultadoDoTse } from "@apurador/tse";
import { emOrdem, type PontoDaCurvaReal } from "./arquivos.ts";

// A narração factual da noite (Narração da noite, decisões 1 a 3, 7, 8, 10 e 11): o coletor a gera a cada rodada, a
// partir dos resultados novos do TSE, e a publica pronta, igual para todos. Cada lugar tem a sua. A hora de um evento
// é o `ht` do arquivo do TSE em que ele foi visto, e os números são os do TSE, com as duas casas.

/** O tipo de um evento factual. A totalização final é o fim do Brasil; nos outros lugares, o fim é "terminou a totalização". */
export type TipoDeEvento = "comeco" | "marco" | "fim" | "virada" | "indicacao" | "totalizacao-final";

/** Um evento da narração, como vai nos arquivos ao vivo. */
export interface EventoDaNarracao {
  /** O id do lugar do evento: `BR`, a sigla da UF, `ZZ` ou o código do município. */
  lugar: string;
  tipo: TipoDeEvento;
  /** A última totalização do arquivo do TSE em que o evento foi visto: `AAAA-MM-DD HH:MM:SS`, em Brasília. */
  quando: string;
  texto: string;
  /** No marco, o % de seções dele. */
  marco?: number;
  /**
   * O número do evento na curva do próprio lugar, que bate com o da lista, e o ponto da curva real em que ele foi
   * visto. Os eventos de outro lugar na narração (as UFs no Brasil, o Brasil nas outras páginas) não têm.
   */
  numero?: number;
  ponto?: PontoDaCurvaReal;
}

/**
 * A ordem dos eventos vistos no mesmo arquivo (decisão 10): virada; indicação do TSE ou totalização final; preditivo;
 * marco; "as pesquisas deixaram de pesar". O começo e o fim de um lugar contam como marcos. Menor vem antes.
 */
export const PRIORIDADE: Record<TipoDeEvento, number> = { virada: 0, indicacao: 1, "totalizacao-final": 1, comeco: 3, marco: 3, fim: 3 };

/** A ordem da narração na página: o evento mais novo primeiro e, no mesmo instante, o de maior prioridade. */
export const antesNaNarracao = (a: EventoDaNarracao, b: EventoDaNarracao) => b.quando.localeCompare(a.quando) || PRIORIDADE[a.tipo] - PRIORIDADE[b.tipo];

/** A narração de todos os lugares de uma noite. */
export interface Narracao {
  /** Uma rodada: os resultados que o coletor baixou nela, pelo id do lugar. Devolve os lugares cuja narração mudou. */
  narrar(novos: ReadonlyMap<string, ResultadoDoTse>): Set<string>;
  /** A narração de um lugar, do evento mais novo ao mais antigo. No Brasil, com os eventos das UFs que entram nela. */
  doLugar(id: string): EventoDaNarracao[];
  /** Os eventos do Brasil que entram, intercalados, nas narrações das UFs, do Exterior e dos municípios. */
  doBrasil(): EventoDaNarracao[];
}

/** Os marcos do Brasil, das UFs e do Exterior; nos municípios, só 50% (decisão 2). */
const MARCOS = [10, 25, 50, 75, 90, 95, 99];
const MARCOS_DO_MUNICIPIO = [50];
/** O nível do começo e o do fim, abaixo e acima de todo marco: num lugar, só o nível mais alto da rodada vira evento. */
const COMECO = 0;
const FIM = 100;
/** Até esse % das seções do lugar, uma troca de líder não é virada: o placar ainda pula demais (o corte da escala da curva). */
const COMECO_INSTAVEL = 3;
/** Trocas de líder dentro desse tempo depois da primeira atualizam o mesmo evento de virada (decisão 2). */
const JANELA_DA_VIRADA = 10 * 60_000;
/** Os 8 maiores eleitorados, cujos 50% entram na narração do Brasil (decisão 3). */
const GRANDES_ELEITORADOS = ["SP", "MG", "RJ", "BA", "RS", "PR", "PE", "CE"];
/** Os eventos do Brasil que entram nas outras páginas (decisão 1); "as pesquisas deixaram de pesar" chega com a projeção. */
const DO_BRASIL_NAS_OUTRAS: TipoDeEvento[] = ["virada", "indicacao", "totalizacao-final"];

/** A região de cada UF, para dizer onde estão as seções que faltam. O Exterior não tem região. */
const REGIOES: [string, string[]][] = [
  ["Norte", ["AC", "AM", "AP", "PA", "RO", "RR", "TO"]],
  ["Nordeste", ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"]],
  ["Centro-Oeste", ["DF", "GO", "MS", "MT"]],
  ["Sudeste", ["ES", "MG", "RJ", "SP"]],
  ["Sul", ["PR", "RS", "SC"]],
];

// O nome curto dos finalistas nos textos ("Flávio 50,43%, Lula 49,57%"), pelo nome de urna, que o TSE escreve em
// maiúsculas e sem acento. O 2º turno de 2022 entra porque o TSE falso o serve no replay e no ensaio geral.
const NOMES_CURTOS: Record<string, string> = { "FLAVIO BOLSONARO": "Flávio", LULA: "Lula", "JAIR BOLSONARO": "Bolsonaro" };

/** "FLAVIO BOLSONARO" → "Flávio". Um nome de urna sem nome curto fica como o TSE o escreve. */
export const nomeCurto = (nomeUrna: string) => NOMES_CURTOS[nomeUrna] ?? nomeUrna;

const PCT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${PCT.format(n)}%`;

/** Os candidatos na ordem fixa do site, alfabética pelo nome de urna, com o % de cada um: "Flávio 50,43%, Lula 49,57%". */
const placar = (candidatos: CandidatoDoResultado[]) =>
  emOrdem(candidatos)
    .map((c) => `${nomeCurto(c.nomeUrna)} ${pct(c.percentual)}`)
    .join(", ");

/** `AAAA-MM-DD HH:MM:SS`, em Brasília → ms. */
const instante = (quando: string) => Date.parse(`${quando.replace(" ", "T")}-03:00`);
const hora = (quando: string) => quando.slice(11, 16);

/** Como o texto se refere ao lugar: o sujeito ("o estado de São Paulo", "Salvador (BA)") e onde ("no estado de São Paulo"). */
interface NomeNoTexto {
  sujeito: string;
  em: string;
}

function nomeNoTexto(lugar: Lugar): NomeNoTexto {
  if (lugar.tipo === "municipio") {
    const nome = `${lugar.nome} (${lugar.uf === "ZZ" ? "Exterior" : lugar.uf})`;
    return { sujeito: nome, em: `em ${nome}` };
  }
  // O estado sempre com "estado", para não se confundir com a capital (decisão 7); o Distrito Federal não é estado.
  const nome = lugar.tipo === "uf" && lugar.uf !== "DF" ? `estado ${lugar.artigo ? `d${lugar.artigo}` : "de"} ${lugar.nome}` : lugar.nome;
  return { sujeito: `o ${nome}`, em: `no ${nome}` };
}

const maiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** O evento sem o número e o ponto na curva: como ele entra na narração de outro lugar. */
const deOutroLugar = ({ numero: _numero, ponto: _ponto, ...evento }: EventoDaNarracao): EventoDaNarracao => evento;
/** Do mais novo ao mais antigo, a partir da ordem em que entraram: a ordenação é estável, e no mesmo instante e prioridade fica o que entrou depois. */
const doMaisNovo = (eventos: EventoDaNarracao[]) => [...eventos].reverse().sort(antesNaNarracao);

/** Quem lidera o placar parcial, pelos votos, ou `undefined` num empate ou sem votos. */
function lider(r: ResultadoDoTse): CandidatoDoResultado | undefined {
  const [primeiro, segundo] = [...r.candidatos].sort((a, b) => b.votos - a.votos);
  return primeiro && primeiro.votos > (segundo?.votos ?? 0) ? primeiro : undefined;
}

/** O que a narração guarda de cada lugar. */
interface EstadoDoLugar {
  /** O nível mais alto já narrado: o começo, um marco ou o fim; `-1` antes da primeira seção. */
  nivel: number;
  /** A última totalização do arquivo mais novo visto. */
  visto: string | null;
  /** Se a indicação do TSE já entrou (só no Brasil). */
  indicacao: boolean;
  /** Quem liderava pelos votos da última vez que alguém liderava (um empate não troca o líder), pelo número. */
  lider: number | null;
  /** A última virada, enquanto as trocas seguintes ainda a atualizam: o evento, a hora da primeira troca e quantas houve. */
  virada: { evento: EventoDaNarracao; desde: string; trocas: number } | null;
  /** O último número de evento na curva do lugar. */
  numero: number;
  /** Na ordem em que entraram. */
  eventos: EventoDaNarracao[];
}

/** A narração de uma noite, com os nomes dos lugares do site. */
export function criarNarracao(lugares: Lugar[]): Narracao {
  const porId = new Map(lugares.map((l) => [l.id, l]));
  const estados = new Map<string, EstadoDoLugar>();
  /** As seções que faltam em cada UF e no Exterior, pelo último resultado visto. */
  const faltam = new Map<string, number>();
  /** Os eventos do próprio Brasil e os das UFs que entram na narração dele, na ordem em que entraram. */
  const noBrasil: EventoDaNarracao[] = [];

  /** Se um evento de UF ou do Exterior entra na narração do Brasil: virada, fim e os 50% dos grandes eleitorados. */
  const entraNoBrasil = (lugar: Lugar, e: EventoDaNarracao) =>
    (lugar.tipo === "uf" || lugar.tipo === "exterior") && (e.tipo === "virada" || e.tipo === "fim" || (e.tipo === "marco" && e.marco === 50 && GRANDES_ELEITORADOS.includes(lugar.id)));

  const lugarDe = (id: string): Lugar => porId.get(id) ?? { id, tipo: id === "BR" ? "brasil" : id.length === 2 ? "uf" : "municipio", nome: id, aptos: 0 };

  /** "Das seções que faltam, 51% são do Sudeste e 30% do Nordeste.", pela mesma regra em todo marco (decisão 2). */
  function ondeFalta(): string {
    const total = [...faltam.values()].reduce((a, b) => a + b, 0);
    if (total === 0) return "";
    // Em empate, fica a ordem das regiões: a regra nunca olha o candidato.
    const [primeira, segunda] = REGIOES.map(([regiao, ufs]) => ({ regiao, secoes: ufs.reduce((n, uf) => n + (faltam.get(uf) ?? 0), 0) })).sort((a, b) => b.secoes - a.secoes);
    const fatia = (secoes: number) => `${Math.round((100 * secoes) / total)}%`;
    return ` Das seções que faltam, ${fatia(primeira!.secoes)} são do ${primeira!.regiao} e ${fatia(segunda!.secoes)} do ${segunda!.regiao}.`;
  }

  function nivelDe(lugar: Lugar, r: ResultadoDoTse): number {
    const { totalizadas, total } = r.secoes;
    if (totalizadas === 0) return -1;
    if (lugar.tipo === "brasil" ? r.totalizacaoFinal : totalizadas >= total) return FIM;
    const marcos = lugar.tipo === "municipio" ? MARCOS_DO_MUNICIPIO : MARCOS;
    return marcos.filter((m) => totalizadas * 100 >= m * total).at(-1) ?? COMECO;
  }

  function textoDoNivel(lugar: Lugar, nivel: number, r: ResultadoDoTse): string {
    const nome = nomeNoTexto(lugar);
    const secoes = pct(r.secoes.percentual);
    if (nivel === COMECO) return lugar.tipo === "brasil" ? `Começa a divulgação: ${secoes} das seções totalizadas no Brasil.` : `Começa a totalização: ${secoes} das seções totalizadas ${nome.em}.`;
    if (nivel === FIM) {
      const eleito = lider(r);
      if (lugar.tipo === "brasil") return `Totalização final: ${eleito ? `${nomeCurto(eleito.nomeUrna)} eleito com ${pct(eleito.percentual)} dos votos válidos` : placar(r.candidatos)}.`;
      return `${maiuscula(nome.sujeito)} terminou a totalização. ${placar(r.candidatos)}.`;
    }
    return `Passa de ${nivel}% das seções totalizadas ${nome.em}: ${secoes}. ${placar(r.candidatos)}.${lugar.tipo === "brasil" ? ondeFalta() : ""}`;
  }

  /** Narra o resultado novo de um lugar. Devolve os eventos que entraram ou mudaram. */
  function observar(id: string, r: ResultadoDoTse): EventoDaNarracao[] {
    const lugar = lugarDe(id);
    const estado: EstadoDoLugar = estados.get(id) ?? { nivel: -1, visto: null, indicacao: false, lider: null, virada: null, numero: 0, eventos: [] };
    estados.set(id, estado);
    const quando = r.ultimaTotalizacao;
    // Uma cópia velha de um arquivo, que a CDN ainda pode entregar, não conta: voltaria o líder de antes.
    if (quando === null || (estado.visto !== null && quando < estado.visto)) return [];
    estado.visto = quando;
    // Os eventos de um mesmo arquivo entram do de menor prioridade ao de maior.
    const novos: EventoDaNarracao[] = [];
    const nivel = nivelDe(lugar, r);
    if (nivel > estado.nivel) {
      estado.nivel = nivel;
      const tipo = nivel === COMECO ? "comeco" : nivel === FIM ? (lugar.tipo === "brasil" ? "totalizacao-final" : "fim") : "marco";
      novos.push({ lugar: id, tipo, quando, texto: textoDoNivel(lugar, nivel, r), ...(tipo === "marco" ? { marco: nivel } : {}) });
    }
    const eleito = lider(r);
    if (lugar.tipo === "brasil" && r.indicacao && !estado.indicacao && eleito) {
      estado.indicacao = true;
      const texto = `O TSE indica ${nomeCurto(eleito.nomeUrna)} eleito: eleição matematicamente definida, com ${pct(r.secoes.percentual)} das seções totalizadas.`;
      novos.push({ lugar: id, tipo: "indicacao", quando, texto });
    }
    let atualizada: EventoDaNarracao | undefined;
    if (eleito && eleito.numero !== estado.lider) {
      const trocou = estado.lider !== null;
      estado.lider = eleito.numero;
      if (trocou && r.secoes.totalizadas * 100 > COMECO_INSTAVEL * r.secoes.total) atualizada = virar(lugar, estado, r, quando, eleito, novos);
    }
    // O número de cada evento é a ordem dele no lugar: o de maior prioridade, o último a entrar, fica com o maior.
    const ponto: PontoDaCurvaReal = [r.secoes.percentual, ...emOrdem(r.candidatos).map((c) => c.percentual)];
    for (const evento of novos) Object.assign(evento, { numero: ++estado.numero, ponto });
    estado.eventos.push(...novos);
    for (const evento of novos) if (lugar.tipo === "brasil" || entraNoBrasil(lugar, evento)) noBrasil.push(evento);
    return atualizada ? [...novos, atualizada] : novos;
  }

  /**
   * Uma troca de líder depois do começo instável: um evento novo ou, dentro da janela, a atualização do último, que
   * fica na hora e no ponto da primeira troca. Devolve o evento atualizado.
   */
  function virar(lugar: Lugar, estado: EstadoDoLugar, r: ResultadoDoTse, quando: string, novoLider: CandidatoDoResultado, novos: EventoDaNarracao[]) {
    const { em } = nomeNoTexto(lugar);
    const comSecoes = `no placar parcial, com ${pct(r.secoes.percentual)} das seções totalizadas.`;
    const aberta = estado.virada;
    if (aberta && instante(quando) - instante(aberta.desde) < JANELA_DA_VIRADA) {
      aberta.trocas++;
      aberta.evento.texto = `Virada ${em}: a liderança trocou ${aberta.trocas} vezes entre ${hora(aberta.desde)} e ${hora(quando)}; ${nomeCurto(novoLider.nomeUrna)} à frente ${comSecoes}`;
      return aberta.evento;
    }
    const evento: EventoDaNarracao = { lugar: lugar.id, tipo: "virada", quando, texto: `Virada ${em}: ${nomeCurto(novoLider.nomeUrna)} passa à frente ${comSecoes}` };
    estado.virada = { evento, desde: quando, trocas: 1 };
    novos.push(evento);
    return undefined;
  }

  return {
    narrar(novos) {
      // As UFs primeiro: os marcos do Brasil dizem onde faltam seções pelo que chegou na mesma rodada.
      for (const [id, r] of novos) if (lugarDe(id).tipo === "uf" || lugarDe(id).tipo === "exterior") faltam.set(id, r.secoes.total - r.secoes.totalizadas);
      const mudaram = new Set<string>();
      for (const [id, r] of novos) {
        const eventos = observar(id, r);
        if (eventos.length > 0) mudaram.add(id);
        if (eventos.some((e) => entraNoBrasil(lugarDe(id), e))) mudaram.add("BR");
      }
      return mudaram;
    },
    doLugar: (id) => (id === "BR" ? doMaisNovo(noBrasil).map((e) => (e.lugar === "BR" ? e : deOutroLugar(e))) : doMaisNovo(estados.get(id)?.eventos ?? [])),
    doBrasil: () => doMaisNovo(noBrasil.filter((e) => e.lugar === "BR" && DO_BRASIL_NAS_OUTRAS.includes(e.tipo))).map(deOutroLugar),
  };
}
