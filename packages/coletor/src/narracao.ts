import { REGIOES, regiaoDe } from "@apurador/modelo";
import type { Lugar } from "@apurador/pipeline";
import type { CandidatoDoResultado, ResultadoDoTse } from "@apurador/tse";
import { emOrdem, type PontoDaCurvaReal } from "./arquivos.ts";

// A narração factual da noite (Narração da noite, decisões 1 a 3, 7, 8, 10 e 11): o coletor a gera a cada rodada, a
// partir dos resultados novos do TSE, e a publica pronta, igual para todos. Cada lugar tem a sua. A hora de um evento
// é o `ht` do arquivo do TSE em que ele foi visto, e os números são os do TSE, com as duas casas. A página importa
// daqui os tipos, a ordem e os nomes curtos, por `@apurador/coletor/narracao`: nada aqui usa o Node.

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
   * Na virada, quantas trocas de líder ela junta (as da janela de 10 min): num número par, a liderança voltou a quem
   * estava à frente antes dela.
   */
  trocas?: number;
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
const PRIORIDADE: Record<TipoDeEvento, number> = { virada: 0, indicacao: 1, "totalizacao-final": 1, comeco: 3, marco: 3, fim: 3 };

/** A ordem da narração na página: o evento mais novo primeiro e, no mesmo instante, o de maior prioridade. */
export const antesNaNarracao = (a: EventoDaNarracao, b: EventoDaNarracao) => b.quando.localeCompare(a.quando) || PRIORIDADE[a.tipo] - PRIORIDADE[b.tipo];

/** Uma hora do TSE (`AAAA-MM-DD HH:MM:SS`, em Brasília), a de um evento ou a de uma totalização, em ms. */
export const instanteDoTse = (dataHora: string) => Date.parse(`${dataHora.replace(" ", "T")}-03:00`);

/**
 * Até esse % das seções de um lugar, o placar ainda pula demais: uma troca de líder não é virada (decisão 2), e a
 * escala da curva real o ignora (Telas da página de lugar, decisão 4). É o mesmo corte nos dois.
 */
export const COMECO_INSTAVEL = 3;

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
/** O nível antes da primeira seção, o do começo e o do fim, abaixo e acima de todo marco: só o nível mais alto da rodada vira evento. */
const SEM_SECOES = -1;
const COMECO = 0;
const FIM = 100;
/** Trocas de líder dentro desse tempo depois da primeira entram no mesmo evento de virada (decisão 2). */
const JANELA_DA_VIRADA = 10 * 60_000;
/** Os 8 maiores eleitorados, cujos 50% entram na narração do Brasil (decisão 3). */
const GRANDES_ELEITORADOS = ["SP", "MG", "RJ", "BA", "RS", "PR", "PE", "CE"];
/** Os eventos do Brasil que entram nas outras páginas (decisão 1); "as pesquisas deixaram de pesar" chega com a projeção. */
const DO_BRASIL_NAS_OUTRAS: TipoDeEvento[] = ["virada", "indicacao", "totalizacao-final"];

// O nome curto dos finalistas nos textos ("Flávio 50,43%, Lula 49,57%"), pelo nome de urna, que o TSE escreve em
// maiúsculas e sem acento. O 2º turno de 2022 entra porque o TSE falso o serve no replay e no ensaio geral.
const NOMES_CURTOS: Record<string, string> = { "FLAVIO BOLSONARO": "Flávio", LULA: "Lula", "JAIR BOLSONARO": "Bolsonaro" };

/** "FLAVIO BOLSONARO" → "Flávio". Um nome de urna sem nome curto fica como o TSE o escreve. */
export const nomeCurto = (nomeUrna: string) => NOMES_CURTOS[nomeUrna] ?? nomeUrna;

const PCT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${PCT.format(n)}%`;
const hora = (dataHora: string) => dataHora.slice(11, 16);

/** Os candidatos na ordem fixa do site, alfabética pelo nome de urna, com o % de cada um: "Flávio 50,43%, Lula 49,57%". */
const placar = (candidatos: CandidatoDoResultado[]) =>
  emOrdem(candidatos)
    .map((c) => `${nomeCurto(c.nomeUrna)} ${pct(c.percentual)}`)
    .join(", ");

/** Uma UF ou o Exterior: os lugares com marcos, que entram na conta das regiões e na narração do Brasil. */
const daUf = (lugar: Lugar) => lugar.tipo === "uf" || lugar.tipo === "exterior";

/** Como o texto se refere ao lugar: o sujeito ("o estado de São Paulo", "Salvador (BA)") e onde ("no estado de São Paulo"). */
interface NomeNoTexto {
  sujeito: string;
  em: string;
}

function nomeNoTexto(lugar: Lugar): NomeNoTexto {
  // O município com a UF, como `nomeCompleto` do pipeline, que esta parte sem Node não importa.
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
interface LugarNarrado {
  /** O nível mais alto já narrado: o começo, um marco ou o fim. */
  nivel: number;
  /** A última totalização do arquivo mais novo visto. */
  visto: string | null;
  /** Se a indicação do TSE já entrou (só no Brasil). */
  indicacao: boolean;
  /** Quem liderava pelos votos da última vez que alguém liderava (um empate não troca o líder), pelo número. */
  lider: number | null;
  /** A última virada: as trocas dentro da janela, contada da hora dela, entram nela. */
  virada: EventoDaNarracao | null;
  /** O último número de evento na curva do lugar. */
  numero: number;
  /** Na ordem em que entraram. */
  eventos: EventoDaNarracao[];
}

/** A narração de uma noite, com os nomes dos lugares do site. */
export function criarNarracao(lugares: Lugar[]): Narracao {
  const porId = new Map(lugares.map((l) => [l.id, l]));
  const narrados = new Map<string, LugarNarrado>();
  /** As seções que faltam em cada UF e no Exterior, pelo último resultado visto. */
  const faltam = new Map<string, number>();
  /** Os eventos do próprio Brasil e os das UFs que entram na narração dele, na ordem em que entraram. */
  const noBrasil: EventoDaNarracao[] = [];
  /** A hora da totalização final do Brasil, depois da qual a narração não cresce mais (decisão 11). */
  let totalizacaoFinal: string | null = null;

  /** Se um evento de UF ou do Exterior entra na narração do Brasil: virada, fim e os 50% dos grandes eleitorados. */
  const entraNoBrasil = (lugar: Lugar, e: EventoDaNarracao) =>
    daUf(lugar) && (e.tipo === "virada" || e.tipo === "fim" || (e.tipo === "marco" && e.marco === 50 && GRANDES_ELEITORADOS.includes(lugar.id)));

  const lugarDe = (id: string): Lugar => porId.get(id) ?? { id, tipo: id === "BR" ? "brasil" : id.length === 2 ? "uf" : "municipio", nome: id, aptos: 0 };

  /** "Das seções que faltam, 51% são do Sudeste e 30% do Nordeste.", pela mesma regra em todo marco (decisão 2). */
  function ondeFalta(): string {
    const total = [...faltam.values()].reduce((a, b) => a + b, 0);
    if (total === 0) return "";
    const porRegiao = new Map(REGIOES.map((regiao) => [regiao, 0]));
    for (const [uf, secoes] of faltam) {
      const regiao = regiaoDe(uf);
      if (regiao !== null) porRegiao.set(regiao, porRegiao.get(regiao)! + secoes);
    }
    // Em empate, fica a ordem das regiões: a regra nunca olha o candidato.
    const [primeira, segunda] = [...porRegiao].sort((a, b) => b[1] - a[1]);
    const fatia = (secoes: number) => `${Math.round((100 * secoes) / total)}%`;
    return ` Das seções que faltam, ${fatia(primeira![1])} são do ${primeira![0]} e ${fatia(segunda![1])} do ${segunda![0]}.`;
  }

  function nivelDe(lugar: Lugar, r: ResultadoDoTse): number {
    const { totalizadas, total } = r.secoes;
    if (totalizadas === 0) return SEM_SECOES;
    if (lugar.tipo === "brasil" ? r.totalizacaoFinal : totalizadas >= total) return FIM;
    const marcos = lugar.tipo === "municipio" ? MARCOS_DO_MUNICIPIO : MARCOS;
    return marcos.filter((m) => totalizadas * 100 >= m * total).at(-1) ?? COMECO;
  }

  /** O evento do nível que o lugar acaba de passar: o começo, um marco, "terminou" ou, no Brasil, a totalização final. */
  function eventoDoNivel(lugar: Lugar, nivel: number, r: ResultadoDoTse, quando: string): EventoDaNarracao {
    const nome = nomeNoTexto(lugar);
    const secoes = pct(r.secoes.percentual);
    const evento = (tipo: TipoDeEvento, texto: string): EventoDaNarracao => ({ lugar: lugar.id, tipo, quando, texto });
    if (nivel === COMECO) {
      return evento(
        "comeco",
        lugar.tipo === "brasil"
          ? `Começa a divulgação: ${secoes} das seções totalizadas no Brasil.`
          : `Começa a totalização: ${secoes} das seções totalizadas ${nome.em}.`,
      );
    }
    if (nivel === FIM && lugar.tipo === "brasil") {
      const eleito = lider(r);
      return evento(
        "totalizacao-final",
        `Totalização final: ${eleito ? `${nomeCurto(eleito.nomeUrna)} eleito com ${pct(eleito.percentual)} dos votos válidos` : placar(r.candidatos)}.`,
      );
    }
    if (nivel === FIM) return evento("fim", `${maiuscula(nome.sujeito)} terminou a totalização. ${placar(r.candidatos)}.`);
    const texto = `Passa de ${nivel}% das seções totalizadas ${nome.em}: ${secoes}. ${placar(r.candidatos)}.${lugar.tipo === "brasil" ? ondeFalta() : ""}`;
    return { ...evento("marco", texto), marco: nivel };
  }

  /** Narra o resultado novo de um lugar. Devolve os eventos que entraram ou mudaram de texto. */
  function observar(id: string, r: ResultadoDoTse): EventoDaNarracao[] {
    const lugar = lugarDe(id);
    const narrado: LugarNarrado = narrados.get(id) ?? { nivel: SEM_SECOES, visto: null, indicacao: false, lider: null, virada: null, numero: 0, eventos: [] };
    narrados.set(id, narrado);
    const quando = r.ultimaTotalizacao;
    // Uma cópia velha de um arquivo, que a CDN ainda pode entregar, não conta: voltaria o líder de antes. Depois da
    // totalização final, a narração fica como registro.
    if (quando === null || (narrado.visto !== null && quando < narrado.visto) || (totalizacaoFinal !== null && quando > totalizacaoFinal)) return [];
    narrado.visto = quando;
    if (daUf(lugar)) faltam.set(id, r.secoes.total - r.secoes.totalizadas);
    if (lugar.tipo === "brasil" && r.totalizacaoFinal) totalizacaoFinal = quando;

    // Os eventos de um mesmo arquivo entram do de menor prioridade ao de maior.
    const novos: EventoDaNarracao[] = [];
    const nivel = nivelDe(lugar, r);
    if (nivel > narrado.nivel) {
      narrado.nivel = nivel;
      novos.push(eventoDoNivel(lugar, nivel, r, quando));
    }
    const eleito = lider(r);
    if (lugar.tipo === "brasil" && r.indicacao && !narrado.indicacao && eleito) {
      narrado.indicacao = true;
      const texto = `O TSE indica ${nomeCurto(eleito.nomeUrna)} eleito: eleição matematicamente definida, com ${pct(r.secoes.percentual)} das seções totalizadas.`;
      novos.push({ lugar: id, tipo: "indicacao", quando, texto });
    }
    let viradaReescrita: EventoDaNarracao | undefined;
    if (eleito && eleito.numero !== narrado.lider) {
      const trocou = narrado.lider !== null;
      narrado.lider = eleito.numero;
      if (trocou && r.secoes.totalizadas * 100 > COMECO_INSTAVEL * r.secoes.total) viradaReescrita = virar(lugar, narrado, r, quando, eleito, novos);
    }
    // O número de cada evento é a ordem dele no lugar: o de maior prioridade, o último a entrar, fica com o maior.
    const ponto: PontoDaCurvaReal = [r.secoes.percentual, ...emOrdem(r.candidatos).map((c) => c.percentual)];
    for (const evento of novos) Object.assign(evento, { numero: ++narrado.numero, ponto });
    narrado.eventos.push(...novos);
    for (const evento of novos) if (lugar.tipo === "brasil" || entraNoBrasil(lugar, evento)) noBrasil.push(evento);
    return viradaReescrita ? [...novos, viradaReescrita] : novos;
  }

  /**
   * Uma troca de líder depois do começo instável: um evento novo ou, dentro da janela, o último reescrito, que fica na
   * hora e no ponto da primeira troca. Devolve o evento reescrito.
   */
  function virar(lugar: Lugar, narrado: LugarNarrado, r: ResultadoDoTse, quando: string, novoLider: CandidatoDoResultado, novos: EventoDaNarracao[]) {
    const { em } = nomeNoTexto(lugar);
    const comSecoes = `no placar parcial, com ${pct(r.secoes.percentual)} das seções totalizadas.`;
    const aberta = narrado.virada;
    if (aberta && instanteDoTse(quando) - instanteDoTse(aberta.quando) < JANELA_DA_VIRADA) {
      aberta.trocas = (aberta.trocas ?? 1) + 1;
      aberta.texto = `Virada ${em}: a liderança trocou ${aberta.trocas} vezes entre ${hora(aberta.quando)} e ${hora(quando)}; ${nomeCurto(novoLider.nomeUrna)} à frente ${comSecoes}`;
      return aberta;
    }
    const evento: EventoDaNarracao = {
      lugar: lugar.id,
      tipo: "virada",
      quando,
      texto: `Virada ${em}: ${nomeCurto(novoLider.nomeUrna)} passa à frente ${comSecoes}`,
      trocas: 1,
    };
    narrado.virada = evento;
    novos.push(evento);
    return undefined;
  }

  return {
    narrar(novos) {
      // As UFs primeiro: os marcos do Brasil dizem onde faltam seções pelo que chegou na mesma rodada.
      const emOrdemDeNarrar = [...novos].sort(([a], [b]) => Number(!daUf(lugarDe(a))) - Number(!daUf(lugarDe(b))));
      const mudaram = new Set<string>();
      for (const [id, r] of emOrdemDeNarrar) {
        const eventos = observar(id, r);
        if (eventos.length > 0) mudaram.add(id);
        if (eventos.some((e) => entraNoBrasil(lugarDe(id), e))) mudaram.add("BR");
      }
      return mudaram;
    },
    doLugar: (id) => (id === "BR" ? doMaisNovo(noBrasil).map((e) => (e.lugar === "BR" ? e : deOutroLugar(e))) : doMaisNovo(narrados.get(id)?.eventos ?? [])),
    doBrasil: () => doMaisNovo(noBrasil.filter((e) => e.lugar === "BR" && DO_BRASIL_NAS_OUTRAS.includes(e.tipo))).map(deOutroLugar),
  };
}
