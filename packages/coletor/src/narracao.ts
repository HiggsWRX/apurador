import { REGIOES, regiaoDe, type SinalDeVirada } from "@apurador/modelo";
import type { Lugar } from "@apurador/pipeline";
import type { CandidatoDoResultado, ResultadoDoTse } from "@apurador/tse";
import { emOrdem, type BaseDaProjecao, type NumerosDaProjecao, type PontoDaCurvaReal } from "./arquivos.ts";

// A narração da noite (Narração da noite, decisões 1 a 3 e 5 a 11): o coletor a gera a cada rodada, a partir dos
// resultados novos do TSE e da projeção da rodada, e a publica pronta, igual para todos. Cada lugar tem a sua. A hora de
// um evento é o `ht` do arquivo do TSE em que ele foi visto, e os números são os do TSE, com as duas casas. Os eventos
// preditivos e a linha da projeção nos marcos ficam atrás da chave dos textos preditivos (decisões 5 e 6): as travas
// deles andam sempre, mas a narração só os guarda com a chave ligada, nas bases da projeção no ar, e os esquece quando a
// chave desliga. A página importa daqui os tipos, a ordem e os nomes curtos, por `@apurador/coletor/narracao`: nada aqui
// usa o Node.

/**
 * O tipo de um evento. A totalização final é o fim do Brasil; nos outros lugares, o fim é "terminou a totalização".
 * "pesquisas" é "as pesquisas deixaram de pesar", só no Brasil. "sinal-de-virada" e "chance" são os preditivos.
 */
export type TipoDeEvento = "comeco" | "marco" | "fim" | "virada" | "indicacao" | "totalizacao-final" | "pesquisas" | "sinal-de-virada" | "chance";

/** Os tipos dos eventos preditivos, que começam com "Projeção do Apurador:" e só vão ao ar com a chave deles ligada. */
export const TIPOS_PREDITIVOS: readonly TipoDeEvento[] = ["sinal-de-virada", "chance"];

/** Se um evento é preditivo: pelo tipo ou pela base da projeção de que ele fala. A página e a conferência usam a mesma regra. */
export const ehPreditivo = (evento: Pick<EventoDaNarracao, "tipo" | "base">) => evento.base !== undefined || TIPOS_PREDITIVOS.includes(evento.tipo);

/** O começo de todo texto preditivo da narração (decisão 7), que o separa do que aconteceu. */
const PROJECAO_DO_APURADOR = "Projeção do Apurador:";

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
  /** Num evento preditivo, a base da projeção de que ele fala: a página mostra os da base escolhida. Ele não tem número. */
  base?: BaseDaProjecao;
  /**
   * Num marco do próprio lugar, com os textos preditivos no ar desde antes dele: a linha da projeção do lugar naquele
   * momento, em cada base, que a página junta ao texto na base escolhida.
   */
  linhaDaProjecao?: Partial<Record<BaseDaProjecao, string>>;
}

/**
 * A ordem dos eventos vistos no mesmo arquivo (decisão 10): virada; indicação do TSE ou totalização final; preditivo;
 * marco; "as pesquisas deixaram de pesar". O começo e o fim de um lugar contam como marcos. Menor vem antes.
 */
const PRIORIDADE: Record<TipoDeEvento, number> = {
  virada: 0,
  indicacao: 1,
  "totalizacao-final": 1,
  "sinal-de-virada": 2,
  chance: 2,
  comeco: 3,
  marco: 3,
  fim: 3,
  pesquisas: 4,
};

/** A ordem da narração na página: o evento mais novo primeiro e, no mesmo instante, o de maior prioridade. */
export const antesNaNarracao = (a: EventoDaNarracao, b: EventoDaNarracao) => b.quando.localeCompare(a.quando) || PRIORIDADE[a.tipo] - PRIORIDADE[b.tipo];

/** Uma hora do TSE (`AAAA-MM-DD HH:MM:SS`, em Brasília), a de um evento ou a de uma totalização, em ms. */
export const instanteDoTse = (dataHora: string) => Date.parse(`${dataHora.replace(" ", "T")}-03:00`);

/**
 * Até esse % das seções de um lugar, o placar ainda pula demais: uma troca de líder não é virada (decisão 2), e a
 * escala da curva real o ignora (Telas da página de lugar, decisão 4). É o mesmo corte nos dois.
 */
export const COMECO_INSTAVEL = 3;

/** O que a narração sabe da rodada, além dos resultados novos dela. */
export interface RodadaDaNarracao {
  /** Se as duas bases da projeção coincidem no Brasil, pela projeção da rodada. */
  coincidemNoBrasil?: boolean;
  /** Os números da projeção da rodada de cada lugar (o Brasil, as UFs, o Exterior e os municípios) em cada base. Sem eles, os preditivos esperam. */
  numeros?: (id: string, base: BaseDaProjecao) => NumerosDaProjecao | undefined;
  /**
   * A chave dos textos preditivos (decisão 6): desligada, a narração esquece todos os preditivos e as linhas dos marcos,
   * inclusive os passados; ligada no meio da noite, guarda só os que surgem dali em diante.
   */
  textosPreditivos?: boolean;
  /**
   * As bases da projeção no ar na rodada. Os preditivos de uma base fora do ar (a projeção ou a base com pesquisas
   * desligada) ficam guardados e fora dos arquivos, e voltam com ela; os que surgem nela enquanto isso não entram.
   */
  basesNoAr?: readonly BaseDaProjecao[];
}

/** A narração de todos os lugares de uma noite. */
export interface Narracao {
  /** Uma rodada: os resultados que o coletor baixou nela, pelo id do lugar, e o que vem da projeção dela. Devolve os lugares cuja narração mudou. */
  narrar(novos: ReadonlyMap<string, ResultadoDoTse>, rodada?: RodadaDaNarracao): Set<string>;
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
/** Os quatro eventos do Brasil que entram nas outras páginas (decisão 1). */
const DO_BRASIL_NAS_OUTRAS: TipoDeEvento[] = ["virada", "pesquisas", "indicacao", "totalizacao-final"];
const BASES: readonly BaseDaProjecao[] = ["soApuracao", "comPesquisas"];
/** Por quantas rodadas seguidas um sinal de virada novo dura antes de entrar (decisão 5): ~1 min. */
const DURACAO_DO_SINAL = 3;
/** Os limiares da chance de vitória (decisão 5): cada um entra ao ser passado, e só de novo depois de a chance cair abaixo da volta. */
const LIMIARES_DA_CHANCE = [
  { passa: 90, volta: 80 },
  { passa: 99, volta: 95 },
];

// O nome curto dos finalistas nos textos ("Flávio 50,43%, Lula 49,57%"), pelo nome de urna, que o TSE escreve em
// maiúsculas e sem acento. O 2º turno de 2022 entra porque o TSE falso o serve no replay e no ensaio geral.
const NOMES_CURTOS: Record<string, string> = { "FLAVIO BOLSONARO": "Flávio", LULA: "Lula", "JAIR BOLSONARO": "Bolsonaro" };

/** "FLAVIO BOLSONARO" → "Flávio". Um nome de urna sem nome curto fica como o TSE o escreve. */
export const nomeCurto = (nomeUrna: string) => NOMES_CURTOS[nomeUrna] ?? nomeUrna;

const PCT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const UMA_CASA = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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

/** O ponto da curva real de um resultado, com os candidatos na ordem do site. */
const pontoNaCurva = (r: ResultadoDoTse): PontoDaCurvaReal => [r.secoes.percentual, ...emOrdem(r.candidatos).map((c) => c.percentual)];

/** Quem lidera o placar parcial, pelos votos, ou `undefined` num empate ou sem votos. */
function lider(r: ResultadoDoTse): CandidatoDoResultado | undefined {
  const [primeiro, segundo] = [...r.candidatos].sort((a, b) => b.votos - a.votos);
  return primeiro && primeiro.votos > (segundo?.votos ?? 0) ? primeiro : undefined;
}

/**
 * A linha da projeção de um marco (decisão 8): "Projeção do Apurador: Flávio 49,1% ± 0,6, Lula 50,9% ± 0,6.", com os
 * candidatos na ordem do site e o % do 2º como o que falta para 100,0, contado em décimos, como a página o mostra.
 */
function linhaDaProjecao(r: ResultadoDoTse, numeros: NumerosDaProjecao): string {
  const [primeiro, segundo] = emOrdem(r.candidatos);
  const margem = UMA_CASA.format(numeros.margem);
  const doSegundo = (1000 - Math.round(10 * numeros.projecao)) / 10;
  return `${PROJECAO_DO_APURADOR} ${nomeCurto(primeiro!.nomeUrna)} ${UMA_CASA.format(numeros.projecao)}% ± ${margem}, ${nomeCurto(segundo!.nomeUrna)} ${UMA_CASA.format(doSegundo)}% ± ${margem}.`;
}

/** A chance de vitória ou de virada como a página a mostra: inteira, com "<1%" e ">99%" nas pontas. */
const chanceNoTexto = (chance: number) => (chance <= 0 ? "<1%" : chance >= 100 ? ">99%" : `${chance}%`);

/**
 * As travas dos preditivos de um lugar numa base (decisão 5), que andam a cada rodada com projeção, com a chave dos textos
 * preditivos ligada ou não: ligada no meio da noite, ela não solta de uma vez o que mudou antes.
 */
interface Travas {
  /** O sinal de virada que vale para a narração: o primeiro, que não é mudança, ou o último que durou as 3 rodadas. */
  sinal: SinalDeVirada | null;
  /** Um sinal diferente dele, e por quantas rodadas seguidas ele dura. */
  durando: { sinal: SinalDeVirada; rodadas: number } | null;
  /** Para cada limiar da chance de vitória, o candidato que o passou (pelo número), até a chance dele cair abaixo da volta. */
  acima: (number | null)[];
}

/** O que a narração guarda de cada lugar. */
interface LugarNarrado {
  /** O nível mais alto já narrado: o começo, um marco ou o fim. */
  nivel: number;
  /** A última totalização do arquivo mais novo visto. */
  visto: string | null;
  /** O arquivo mais novo visto: o placar parcial de que os preditivos falam. */
  ultimo: ResultadoDoTse | null;
  /** As travas dos preditivos em cada base, a partir da primeira rodada com projeção: antes do começo do lugar, só andam. */
  travas: Partial<Record<BaseDaProjecao, Travas>>;
  /** Os eventos preditivos que entraram com a chave ligada e a base deles no ar, na ordem em que entraram. Sem número na curva. */
  preditivos: EventoDaNarracao[];
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
  /** O último arquivo do Brasil que a narração viu: a hora e o ponto de "as pesquisas deixaram de pesar" numa rodada sem ele. */
  let ultimoDoBrasil: ResultadoDoTse | null = null;
  /** "As pesquisas deixaram de pesar" entra uma vez na noite (decisão 2), mesmo que as bases deixem de coincidir e voltem. */
  let pesquisasNarradas = false;
  /**
   * A última totalização mais nova de todos os arquivos vistos: a hora de um preditivo numa rodada sem arquivo novo do
   * lugar, quando o que o mudou foi a projeção, que chega dos outros lugares.
   */
  let maisNovo: string | null = null;
  /** Os lugares com arquivo novo na rodada: um preditivo deles leva a hora desse arquivo, a dos factuais da mesma rodada. */
  const vistosNaRodada = new Set<string>();
  /** As bases cujos preditivos vão ao ar, pela última rodada: nenhuma com a chave desligada. */
  let visiveis: readonly BaseDaProjecao[] = [];
  /** A linha da projeção de cada marco que entrou com a chave ligada, nas bases que estavam no ar. */
  const linhas = new Map<EventoDaNarracao, Partial<Record<BaseDaProjecao, string>>>();

  /** "As pesquisas deixaram de pesar", na hora e com o % de seções do arquivo do Brasil. */
  const eventoDasPesquisas = (r: ResultadoDoTse): EventoDaNarracao => ({
    lugar: "BR",
    tipo: "pesquisas",
    quando: r.ultimaTotalizacao!,
    texto: `As pesquisas deixaram de pesar na projeção: com ${pct(r.secoes.percentual)} das seções totalizadas no Brasil, as duas bases coincidem.`,
  });

  /** Se um evento de UF ou do Exterior entra na narração do Brasil: virada, fim e os 50% dos grandes eleitorados. */
  const entraNoBrasil = (lugar: Lugar, e: EventoDaNarracao) =>
    daUf(lugar) && (e.tipo === "virada" || e.tipo === "fim" || (e.tipo === "marco" && e.marco === 50 && GRANDES_ELEITORADOS.includes(lugar.id)));

  /**
   * Guarda os eventos novos de um lugar, na ordem em que entraram, e os que entram na narração do Brasil. O número de
   * cada um é a ordem dele no lugar, e o ponto é o da curva real em que foram vistos.
   */
  function guardar(lugar: Lugar, narrado: LugarNarrado, novos: EventoDaNarracao[], ponto: PontoDaCurvaReal) {
    for (const evento of novos) Object.assign(evento, { numero: ++narrado.numero, ponto });
    narrado.eventos.push(...novos);
    for (const evento of novos) if (lugar.tipo === "brasil" || entraNoBrasil(lugar, evento)) noBrasil.push(evento);
  }

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
  function observar(id: string, r: ResultadoDoTse, rodada: RodadaDaNarracao): EventoDaNarracao[] {
    const lugar = lugarDe(id);
    const narrado: LugarNarrado = narrados.get(id) ?? {
      nivel: SEM_SECOES,
      visto: null,
      ultimo: null,
      travas: {},
      preditivos: [],
      indicacao: false,
      lider: null,
      virada: null,
      numero: 0,
      eventos: [],
    };
    narrados.set(id, narrado);
    const quando = r.ultimaTotalizacao;
    // Uma cópia velha de um arquivo, que a CDN ainda pode entregar, não conta: voltaria o líder de antes. Depois da
    // totalização final, a narração fica como registro.
    if (quando === null || (narrado.visto !== null && quando < narrado.visto) || (totalizacaoFinal !== null && quando > totalizacaoFinal)) return [];
    narrado.visto = quando;
    narrado.ultimo = r;
    vistosNaRodada.add(id);
    if (maisNovo === null || quando > maisNovo) maisNovo = quando;
    if (daUf(lugar)) faltam.set(id, r.secoes.total - r.secoes.totalizadas);
    if (lugar.tipo === "brasil" && r.totalizacaoFinal) totalizacaoFinal = quando;

    // Os eventos de um mesmo arquivo entram do de menor prioridade ao de maior.
    const novos: EventoDaNarracao[] = [];
    if (lugar.tipo === "brasil") {
      ultimoDoBrasil = r;
      if (rodada.coincidemNoBrasil && !pesquisasNarradas) {
        pesquisasNarradas = true;
        novos.push(eventoDasPesquisas(r));
      }
    }
    const nivel = nivelDe(lugar, r);
    if (nivel > narrado.nivel) {
      narrado.nivel = nivel;
      const evento = eventoDoNivel(lugar, nivel, r, quando);
      novos.push(evento);
      if (evento.tipo === "marco") guardarLinha(evento, r, rodada.numeros);
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
    // O de maior prioridade, o último a entrar, fica com o maior número.
    guardar(lugar, narrado, novos, pontoNaCurva(r));
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

  /** Guarda a linha da projeção de um marco que acaba de entrar, nas bases com os preditivos no ar e com projeção. */
  function guardarLinha(marco: EventoDaNarracao, r: ResultadoDoTse, daRodada: RodadaDaNarracao["numeros"]) {
    const porBase: Partial<Record<BaseDaProjecao, string>> = {};
    for (const base of visiveis) {
      const numeros = daRodada?.(marco.lugar, base);
      if (numeros) porBase[base] = linhaDaProjecao(r, numeros);
    }
    if (Object.keys(porBase).length > 0) linhas.set(marco, porBase);
  }

  /**
   * O sinal de virada de um lugar numa base, na rodada: o primeiro só arma a trava, e um diferente entra depois de durar
   * as 3 rodadas. Devolve o texto do evento, ou `undefined`.
   */
  function sinalDeVirada(narrado: LugarNarrado, travas: Travas, numeros: NumerosDaProjecao): string | undefined {
    const { sinalDeVirada: sinal, chanceDeVirada } = numeros;
    if (sinal === null || sinal === travas.sinal) {
      travas.durando = null;
      return undefined;
    }
    if (travas.sinal === null) {
      travas.sinal = sinal;
      return undefined;
    }
    travas.durando = { sinal, rodadas: travas.durando?.sinal === sinal ? travas.durando.rodadas + 1 : 1 };
    if (travas.durando.rodadas < DURACAO_DO_SINAL) return undefined;
    travas.sinal = sinal;
    travas.durando = null;
    const frente = narrado.ultimo && lider(narrado.ultimo);
    const atras = narrado.ultimo?.candidatos.find((c) => c !== frente);
    if (!frente || !atras || chanceDeVirada === null) return undefined;
    return `${PROJECAO_DO_APURADOR} ${sinal}. ${nomeCurto(frente.nomeUrna)} à frente no placar parcial; chance de virada de ${nomeCurto(atras.nomeUrna)} ${chanceNoTexto(chanceDeVirada)}.`;
  }

  /**
   * A chance de vitória de um lugar numa base, na rodada: cada limiar passado arma a trava dele, que solta quando a chance
   * de quem o passou cai abaixo da volta. Na primeira rodada, só arma; com os dois passados na mesma rodada, o texto é o
   * do mais alto. Devolve o texto do evento, ou `undefined`.
   */
  function chanceDeVitoria(daNoite: CandidatoDoResultado[], travas: Travas, numeros: NumerosDaProjecao, primeira: boolean): string | undefined {
    // A chance do arquivo é a do 1º candidato na ordem do site; a do outro, o que falta para 100.
    const candidatos = emOrdem(daNoite).map((c, i) => ({ c, chance: i === 0 ? numeros.chance : 100 - numeros.chance }));
    let passou: { nome: string; limiar: number } | undefined;
    LIMIARES_DA_CHANCE.forEach(({ passa, volta }, i) => {
      const armada = candidatos.find(({ c }) => c.numero === travas.acima[i]);
      if (armada && armada.chance < volta) travas.acima[i] = null;
      if (travas.acima[i] !== null) return;
      const acima = candidatos.find(({ chance }) => chance > passa);
      if (!acima) return;
      travas.acima[i] = acima.c.numero;
      passou = { nome: nomeCurto(acima.c.nomeUrna), limiar: passa };
    });
    if (!passou || primeira) return undefined;
    return `${PROJECAO_DO_APURADOR} chance de vitória de ${passou.nome} passa de ${passou.limiar}%.`;
  }

  /**
   * O que vai ao ar dos preditivos nesta rodada (decisão 6). Desligada a chave dos textos preditivos, a narração os esquece
   * todos, inclusive os passados e as linhas dos marcos, e religada guarda só os que surgem dali em diante. Uma base que
   * sai do ar só esconde os dela, que voltam com ela. Marca os lugares cujos arquivos mudam.
   */
  function porNoAr({ textosPreditivos = false, basesNoAr = [] }: RodadaDaNarracao, mudaram: Set<string>) {
    if (!textosPreditivos) {
      for (const [id, narrado] of narrados) {
        if (narrado.preditivos.length === 0) continue;
        narrado.preditivos = [];
        mudaram.add(id);
      }
      for (const marco of linhas.keys()) mudaram.add(marco.lugar);
      linhas.clear();
    }
    const agora = textosPreditivos ? basesNoAr : [];
    const mudou = BASES.filter((base) => visiveis.includes(base) !== agora.includes(base));
    if (mudou.length > 0) {
      for (const [id, narrado] of narrados) if (narrado.preditivos.some((e) => mudou.includes(e.base!))) mudaram.add(id);
      for (const [marco, porBase] of linhas) if (mudou.some((base) => porBase[base] !== undefined)) mudaram.add(marco.lugar);
    }
    visiveis = agora;
  }

  /**
   * Os preditivos da rodada (decisão 5), pela projeção dela, em todo lugar que ainda não terminou. As travas andam em toda
   * base, inclusive antes do começo do lugar; os eventos entram depois dele, e só nas bases visíveis. Com a indicação do
   * TSE, a eleição está definida: o sinal de virada para em todo lugar (Sinal de virada, decisão 3), e a chance do Brasil
   * não diz mais nada. Um preditivo leva a hora do arquivo novo do lugar na rodada, a dos factuais dela, que a prioridade
   * ordena (decisão 10); sem ele, a do arquivo mais novo da noite.
   */
  function preditivosDaRodada(daRodada: RodadaDaNarracao["numeros"], mudaram: Set<string>) {
    if (!daRodada || totalizacaoFinal !== null) return;
    const comIndicacao = narrados.get("BR")?.indicacao ?? false;
    for (const [id, narrado] of narrados) {
      // Antes do arquivo com hora do lugar, os candidatos são os do Brasil, os mesmos em todo arquivo que o coletor aceita.
      const candidatos = (narrado.ultimo ?? ultimoDoBrasil)?.candidatos;
      if (narrado.nivel === FIM || !candidatos) continue;
      for (const base of BASES) {
        const numeros = daRodada(id, base);
        if (!numeros) continue;
        const primeira = narrado.travas[base] === undefined;
        const travas = (narrado.travas[base] ??= { sinal: null, durando: null, acima: LIMIARES_DA_CHANCE.map(() => null) });
        const entram = [
          ["sinal-de-virada", comIndicacao ? undefined : sinalDeVirada(narrado, travas, numeros)],
          ["chance", comIndicacao && id === "BR" ? undefined : chanceDeVitoria(candidatos, travas, numeros, primeira)],
        ] as const;
        if (narrado.nivel < COMECO || !visiveis.includes(base)) continue;
        const quando = vistosNaRodada.has(id) ? narrado.visto! : maisNovo!;
        for (const [tipo, texto] of entram) {
          if (texto === undefined) continue;
          narrado.preditivos.push({ lugar: id, tipo, base, quando, texto });
          mudaram.add(id);
        }
      }
    }
  }

  return {
    narrar(novos, rodada = {}) {
      const coincidemNoBrasil = rodada.coincidemNoBrasil ?? false;
      // As UFs primeiro: os marcos do Brasil dizem onde faltam seções pelo que chegou na mesma rodada.
      const emOrdemDeNarrar = [...novos].sort(([a], [b]) => Number(!daUf(lugarDe(a))) - Number(!daUf(lugarDe(b))));
      const mudaram = new Set<string>();
      porNoAr(rodada, mudaram);
      vistosNaRodada.clear();
      for (const [id, r] of emOrdemDeNarrar) {
        const eventos = observar(id, r, rodada);
        if (eventos.length > 0) mudaram.add(id);
        if (eventos.some((e) => entraNoBrasil(lugarDe(id), e))) mudaram.add("BR");
      }
      // As bases podem passar a coincidir pelos municípios, numa rodada sem arquivo novo do Brasil.
      if (coincidemNoBrasil && !pesquisasNarradas && ultimoDoBrasil && totalizacaoFinal === null) {
        pesquisasNarradas = true;
        guardar(lugarDe("BR"), narrados.get("BR")!, [eventoDasPesquisas(ultimoDoBrasil)], pontoNaCurva(ultimoDoBrasil));
        mudaram.add("BR");
      }
      preditivosDaRodada(rodada.numeros, mudaram);
      return mudaram;
    },
    doLugar(id) {
      const preditivos = (narrados.get(id)?.preditivos ?? []).filter((e) => visiveis.includes(e.base!));
      const comLinha = (e: EventoDaNarracao) => {
        const porBase = linhas.get(e);
        const noAr = porBase && visiveis.flatMap((base) => (porBase[base] === undefined ? [] : [[base, porBase[base]] as const]));
        return noAr?.length ? { ...e, linhaDaProjecao: Object.fromEntries(noAr) } : e;
      };
      if (id === "BR") return doMaisNovo([...noBrasil, ...preditivos]).map((e) => (e.lugar === "BR" ? comLinha(e) : deOutroLugar(e)));
      return doMaisNovo([...(narrados.get(id)?.eventos ?? []), ...preditivos]).map(comLinha);
    },
    doBrasil: () => doMaisNovo(noBrasil.filter((e) => e.lugar === "BR" && DO_BRASIL_NAS_OUTRAS.includes(e.tipo))).map(deOutroLugar),
  };
}
