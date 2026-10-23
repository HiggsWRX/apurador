import { createHash } from "node:crypto";
import { ordemDoMapa, type Lugar } from "@apurador/pipeline";
import {
  ArquivoDoTseInvalido,
  eleicaoDaConfiguracao,
  lerAcompanhamento,
  lerConfiguracaoDeMunicipios,
  lerResultado,
  urlDasEleicoes,
  urlsDaDivulgacao,
  type AbrangenciaDaDivulgacao,
  type AcompanhamentoDoTse,
  type EleicaoDaDivulgacao,
  type ResultadoDoTse,
} from "@apurador/tse";
import { LIMITES_DOS_ALERTAS } from "./alertas.ts";
import {
  arquivoDeRodada,
  arquivoDoLugar,
  arquivoDoMapa,
  emOrdem,
  pontoDaCurvaReal,
  type ArquivoDoMapa,
  type ArquivoDoSimuladorAoVivo,
  type BaseDaProjecao,
  type Fase,
  type PontoDaCurvaReal,
  type ProjecaoNaBase,
  type TabelaDeProjecoes,
} from "./arquivos.ts";
import { chavesEfetivas, CONTROLE_INICIAL, type Controle } from "./chaves.ts";
import { conexaoMudou, type BloqueioDoTse, type ConexaoDoComputador } from "./conexao.ts";
import { somaDoMes, TRAVA_DAS_GRAVACOES, type ContadorDeGravacoes, type GravacoesDoMes } from "./contador.ts";
import type { Destino } from "./destino.ts";
import { criarNarracao } from "./narracao.ts";
import { placarDoArquivoDoTse, type PlacarDoTse } from "./placar-conferido.ts";
import { criarProjecaoDaNoite, type EntradaDaProjecao, type ProjecaoDaRodada } from "./projecao.ts";
import type { RelogioDoColetor } from "./relogio.ts";
import { estadoGuardadoEmJson, type ArquivoDoTseGuardado, type EstadoDeRetomada, type EstadoGuardado, type Partida, type RodadaGuardada } from "./retomada.ts";

// O coletor da noite. A cada rodada ele lê os índices do TSE (`-ab.json` do Brasil e de cada UF), baixa o
// resultado de cada lugar cuja última totalização no índice é mais nova que a que ele tem, roda o modelo nas duas
// bases (`projecao.ts`), narra o que chegou (`narracao.ts`) e publica o que mudou.
// As URLs saem da configuração de municípios e zonas, e nada da eleição (candidatos, municípios) fica no código.
//
// O TSE guarda cada arquivo ~60 s no CDN: um mesmo arquivo de resultado é pedido no máximo uma vez por minuto,
// sempre com ETag. Os índices são lidos a cada rodada (29 pedidos). Todo pedido passa por uma fila com ritmo fixo,
// abaixo dos 50 por segundo que alertam o dono (o limite do TSE é 100 por IP, com 404 e 304 contando).

/** A função de rede, com a forma do `fetch`, injetável para o replay rodar sem rede. */
export type Buscar = (url: string, init?: RequestInit) => Promise<Response>;

/** O que o coletor recebe: a eleição, a rede, o relógio e o destino da publicação. */
export interface OpcoesDoColetor {
  /** A base do ambiente: `https://resultados.tse.jus.br/oficial`, ou a do TSE falso. */
  base: string;
  /** O código da eleição (`6258`, o 2º turno de 2026). */
  eleicao: string;
  /** Os lugares do site (`dados/lugares.json`), com os nomes que a narração escreve: os do TSE vêm em maiúsculas. */
  lugares: Lugar[];
  buscar: Buscar;
  relogio: RelogioDoColetor;
  /** O destino principal: o R2 de produção ou o do ensaio, ou a pasta local. */
  destino: Destino;
  /**
   * O destino do plano B, a republicação do Worker (Operação na noite, decisão 14). O coletor só grava nele depois do
   * comando do dono (`controle.planoB`) e, daí em diante, só nele, até o fim da noite.
   */
  planoB?: Destino;
  /** O contador das gravações nos buckets, que os destinos R2 alimentam: vai no registro de cada rodada. */
  contador?: ContadorDeGravacoes;
  /** O ritmo dos pedidos ao TSE. Padrão: 45 por segundo, que com a folga da fila não passa de 50 num segundo. */
  pedidosPorSegundo?: number;
  /** Segundos do começo de uma rodada ao da seguinte. Padrão: 20. */
  intervalo?: number;
  /**
   * Lê o arquivo de controle, no começo de cada rodada: os comandos do dono (chaves, aviso pronto, plano B). Se a
   * leitura falhar, a rodada fica com o controle anterior e registra a falha. Sem ele, vale o controle inicial.
   */
  controle?: () => Promise<Controle>;
  /** A base do modelo da noite, as constantes e o agregado congelado. Sem ela, o coletor publica só o núcleo mínimo. */
  projecao?: EntradaDaProjecao;
  /**
   * A conexão do computador agora (`conexao.ts`), lida no começo de cada rodada: parado no bloqueio do TSE, o coletor
   * retoma quando ela muda ou cai e volta. Sem ela, ele fica parado até o fim.
   */
  conexao?: () => ConexaoDoComputador;
  /**
   * O estado de que o coletor retoma (`escolherRetomada`): o do disco, com todos os arquivos do TSE, ou o do último
   * objeto da noite, com os da rodada dele; os outros ele baixa de novo. Sem ele, parte a frio e regrava tudo uma vez.
   */
  retomada?: { partida: Exclude<Partida, "a frio">; guardado: EstadoGuardado };
  /** Onde guardar o estado no fim de cada rodada, depois de publicar, em JSON (`EstadoGuardado`). */
  guardar?: {
    /** O objeto da noite (no R2): o estado de retomada e os arquivos do TSE que chegaram na rodada. Rejeita se falhar. */
    objetoDaNoite?(json: string, rodada: RodadaGuardada): Promise<void>;
    /** O estado em disco: o estado de retomada e todos os arquivos do TSE que o coletor tem. Rejeita se falhar. */
    disco?(json: string): Promise<void>;
  };
}

/** O que uma rodada fez: uma linha do registro do coletor (`.cache/coletor/rodadas-*.jsonl`). */
export interface RegistroDaRodada {
  numero: number;
  /** ISO, pelo relógio do coletor. */
  inicio: string;
  /** Milissegundos, pelo relógio do coletor. */
  duracao: number;
  /**
   * Milissegundos pelo relógio do computador, sempre real. No replay, em que o relógio do coletor não espera, é
   * o custo de calcular a rodada, que a duração não mostra.
   */
  processamento: number;
  fase: Fase | null;
  pedidos: number;
  /** Quantas respostas de cada status HTTP. */
  respostas: Record<number, number>;
  /** Os resultados novos baixados na rodada. */
  baixados: { brasil: number; ufs: number; municipios: number; zonas: number };
  gravacoes: number;
  falhas: string[];
  /** O controle que valeu na rodada, com as chaves como valem (o simulador só com a projeção). */
  controle: Controle;
  /** Onde a rodada gravou: no principal ou no plano B, depois do comando (ou desde a primeira rodada, sem domínio). */
  destinoAtivo: "principal" | "plano B";
  /** As gravações do mês nos buckets do R2, no fim da rodada, ou `null` sem contador. */
  gravacoesDoMes: GravacoesDoMes | null;
  /**
   * O placar do último arquivo do Brasil que o coletor aceitou, lido dos bytes sem o leitor do TSE: o painel do coletor
   * o confere com o publicado (`placar-conferido.ts`). `null` antes do primeiro.
   */
  placarDoTse: PlacarDoTse | null;
  /** A última totalização do Brasil e quando o coletor a viu (ISO, pelo relógio do coletor), como no arquivo de rodada. */
  novidade: { totalizacao: string | null; vista: string | null };
  /** O maior número de pedidos ao TSE num mesmo segundo da rodada, contra o limite de 100 por IP. */
  picoDePedidos: number;
  /**
   * O relógio do coletor menos o `Date` do TSE, em ms, o menor da rodada: o `Date` corta os milissegundos e chega
   * depois da latência, e o menor é o mais perto do desvio. `null` sem resposta com `Date`.
   */
  desvioDoRelogio: number | null;
  /** Os arquivos do TSE que o leitor não entendeu na rodada, com o tipo do lugar: fica o último bom de cada um. */
  ilegiveis: { tipo: TipoDoArquivoDoTse; url: string }[];
  /** A projeção do Brasil da rodada, com as chaves ou sem elas, ou `null` sem projeção. */
  projecaoDoBrasil: ProjecaoDoBrasilNaRodada | null;
  /** No fim da rodada, o coletor parado no bloqueio do TSE: desde quando (ISO) e o status; `null` se pede ao TSE. */
  bloqueio: { desde: string; status: number } | null;
  /**
   * Depois da volta de um bloqueio, a rodada a cada 40 s: até quando (ISO), ou `null` até o fim da noite, com o pico de
   * pedidos acima do limite. `null` fora dela.
   */
  rodadaDe40s: { ate: string | null } | null;
  /** No fim da rodada, a trava de 90% das gravações do mês ligada (Volume de gravações na noite, decisão 5). */
  gravacoesTravadas: boolean;
  /** Os arquivos ao vivo por gravar que o teto de gravações deixou para a rodada seguinte. */
  adiadas: number;
  /** Na fase encerrada, quando o coletor para sozinho (ISO), 30 min depois da primeira rodada nela; `null` antes. */
  encerraEm: string | null;
  /** O objeto da noite da rodada: gravado, no disco enquanto a conexão for o celular, ou falhou; `null` sem objeto da noite. */
  objetoDaNoite: "gravado" | "no disco" | "falhou" | null;
}

/** De que é um arquivo do TSE: o resultado ou o índice de um lugar, ou a configuração da eleição. */
export type TipoDoArquivoDoTse = TipoDoAcompanhado | "configuracao";

/** A projeção do Brasil numa rodada, em % do 1º candidato do arquivo de rodada, como os arquivos a mostram. */
export interface ProjecaoDoBrasilNaRodada {
  /** O número do 1º candidato do arquivo de rodada, de quem são os %. */
  candidato: number;
  /** O peso das pesquisas na base com pesquisas, em %, inteiro. */
  pesoDasPesquisas: number;
  soApuracao: Pick<ProjecaoNaBase, "projecao" | "margem" | "chance">;
  comPesquisas: Pick<ProjecaoNaBase, "projecao" | "margem" | "chance">;
}

/** O coletor de uma eleição: as rodadas e o último resultado bom de cada lugar. */
export interface Coletor {
  rodada(): Promise<RegistroDaRodada>;
  /**
   * Roda uma rodada a cada intervalo (20 s, ou 40 s depois de um bloqueio), até `ate()` dar verdadeiro ou o fim da noite:
   * 30 min depois da primeira rodada na fase encerrada, ele para sozinho.
   */
  rodar(opcoes: { ate: () => boolean; aoRodar?: (registro: RegistroDaRodada) => void }): Promise<void>;
  /**
   * O último resultado bom de um lugar ou zona, como o TSE o publicou. É por aqui que a projeção (ticket 17) e o
   * objeto da noite (ticket 22) leem o que o coletor guarda, inclusive as zonas, que não são publicadas.
   */
  resultado(abrangencia: AbrangenciaDaDivulgacao): ResultadoDoTse | undefined;
}

type TipoDoAcompanhado = "brasil" | "uf" | "municipio" | "zona";

/** Para cada tipo de arquivo acompanhado: a vez dele na rodada e o contador do registro. */
const TIPOS = {
  brasil: { ordem: 0, contador: "brasil" },
  uf: { ordem: 1, contador: "ufs" },
  municipio: { ordem: 2, contador: "municipios" },
  zona: { ordem: 3, contador: "zonas" },
} as const satisfies Record<TipoDoAcompanhado, { ordem: number; contador: keyof RegistroDaRodada["baixados"] }>;

/** Um arquivo de resultado do TSE que o coletor acompanha: um lugar publicado ou uma zona, que ele só guarda. */
interface Acompanhado {
  /** O id do lugar no site; as zonas não têm. */
  id: string | null;
  tipo: TipoDoAcompanhado;
  abrangencia: AbrangenciaDaDivulgacao;
  url: string;
  /** Onde a última totalização do lugar aparece nos índices; as zonas não aparecem. */
  chaveNoIndice: string | null;
  /** No município com mais de uma zona, as zonas. */
  zonas: Acompanhado[];
}

/** A chave de um lugar nos índices: `br`, `uf/sp` ou `mu/71072`, como os índices escrevem o código. */
const chaveDoIndice = (tipo: "br" | "uf" | "mu", codigo: string) => (tipo === "br" ? "br" : `${tipo}/${codigo}`);

/** A eleição, as URLs e os arquivos acompanhados, lidos na primeira rodada. */
interface Divulgacao {
  eleicao: EleicaoDaDivulgacao;
  urls: ReturnType<typeof urlsDaDivulgacao>;
  /** As siglas das UFs, com `ZZ`, na ordem da configuração. */
  ufs: string[];
  /** O Brasil primeiro, e cada UF seguida dos seus municípios. */
  acompanhados: Acompanhado[];
  /** Os lugares do site na ordem do `mapa.json`, cada um com o arquivo que o coletor acompanha, ou nenhum se o TSE não o tem. */
  doMapa: (Acompanhado | undefined)[];
  /** O Brasil, as UFs e os municípios, pelo id do lugar. */
  lugares: Map<string, Acompanhado>;
}

const UM_MINUTO = 60_000;
/** O tempo de pedidos de uma rodada: abaixo dos 15 s que alertam o dono, com a latência do TSE por cima. */
const TEMPO_DE_PEDIDOS = 14_000;
/** O TSE responde em 0,3 a 0,5 s: a 45 pedidos por segundo, ficam ~20 em voo. */
const MAXIMO_EM_VOO = 40;
/**
 * As gravações dos lugares ao mesmo tempo. No R2, cada uma leva ~0,1 s de ida e volta: uma por vez, as ~700 do pico de
 * uma rodada levariam 70 s, e as ~5.900 da partida a frio, 10 min; 32 em voo as põem em 2 e 20 s.
 */
const GRAVACOES_EM_VOO = 32;
/**
 * Depois de um bloqueio do TSE, o coletor retoma com uma rodada a cada 40 s por 15 min (Operação na noite, decisão 12),
 * e até o fim da noite se alguma rodada passou do pico de pedidos que alerta o dono.
 */
const RODADA_DEPOIS_DO_BLOQUEIO = 40_000;
const DEPOIS_DA_VOLTA = 15 * UM_MINUTO;
/** Na totalização final do Brasil, o coletor roda mais isso e para sozinho (Operação na noite, decisão 21). */
const DEPOIS_DA_FINAL = 30 * UM_MINUTO;

/** Roda as tarefas na ordem, com no máximo `limite` ao mesmo tempo. */
async function emParalelo(tarefas: (() => Promise<void>)[], limite: number) {
  let proxima = 0;
  const trabalhar = async () => {
    while (proxima < tarefas.length) await tarefas[proxima++]!();
  };
  await Promise.all(Array.from({ length: Math.min(limite, tarefas.length) }, trabalhar));
}
/**
 * Quantos pedidos atrasados a fila recupera de uma vez. O timer do Windows acorda ~20% atrasado (50 ms viram
 * ~60 ms), e sem recuperar o atraso o ritmo cai; com a folga pequena, nunca há rajada: num segundo qualquer, cabem
 * o ritmo, a folga e mais um pedido, 50 no ritmo padrão.
 */
const FOLGA_DA_FILA = 4;

/** No máximo isso de gravações de arquivos ao vivo numa rodada, para ela caber nos 20 s (Volume de gravações na noite, decisão 5). */
const TETO_DE_GRAVACOES = 1_500;
/** Com a trava de 90%, cada município e o mapa.json vão no máximo uma vez nesse tempo. */
const INTERVALO_NA_TRAVA = 5 * UM_MINUTO;

/** Um arquivo ao vivo que pode ir na rodada, se mudou e cabe no teto. */
interface ArquivoAoVivo {
  caminho: string;
  conteudo: () => object;
  /** O lugar que ele deixa de ter por gravar, quando vai ou não mudou. */
  lugar?: string;
  /** Com a trava de 90%, vai no máximo a cada 5 min: os municípios, o mapa.json e o arquivo do simulador. */
  aCadaCincoMinutos?: boolean;
}

/** Um arquivo ao vivo que mudou: os bytes e o hash deles. */
interface ArquivoPorGravar {
  caminho: string;
  bytes: Uint8Array;
  hash: string;
}

/** O coletor de uma eleição, com a rede, o relógio e o destino injetados. */
export function criarColetor(opcoes: OpcoesDoColetor): Coletor {
  const { base, buscar, relogio } = opcoes;
  const pedidosPorSegundo = opcoes.pedidosPorSegundo ?? 45;
  const intervalo = (opcoes.intervalo ?? 20) * 1000;

  let divulgacao: Divulgacao | undefined;
  /** O estado de que o coletor retoma, se retoma. */
  const estadoRetomado: EstadoDeRetomada | undefined = opcoes.retomada?.guardado.estado;

  // O que o coletor sabe do TSE.
  const etags = new Map<string, string>();
  const pedidoEm = new Map<string, number>(Object.entries(estadoRetomado?.pedidosRecentes ?? {}));
  const resultados = new Map<string, ResultadoDoTse>();
  const indices = new Map<string, AcompanhamentoDoTse>();
  /** A última totalização de cada lugar nos índices, pela chave do índice. */
  const horasNosIndices = new Map<string, string | null>();
  /**
   * As zonas a pedir de novo porque o município mudou, com a hora em que o coletor viu a mudança. Uma zona sai
   * daqui só com um pedido feito um minuto depois disso: antes, o CDN pode ainda ter a cópia velha dela, e a zona
   * não aparece em índice nenhum.
   */
  const zonasPendentes = new Map<string, number>(Object.entries(estadoRetomado?.zonasPendentes ?? {}));
  /** A hora do índice com que as zonas de cada município foram marcadas, para marcar uma vez por mudança. */
  const zonasMarcadas = new Map<string, string | null>(Object.entries(estadoRetomado?.zonasMarcadas ?? {}));
  /** A maior hora do cabeçalho `Date` do TSE, em ms: o relógio da fonte, que muda a fase. */
  let horaDoTse = estadoRetomado?.horaDoTse ?? -Infinity;
  /** Os arquivos de resultado que o coletor tem, como o TSE os mandou: vão inteiros para o estado em disco. */
  const arquivosDoTse = new Map<string, ArquivoDoTseGuardado>();
  /** Os dois arquivos de configuração (a eleição e os municípios), como chegaram: vão também para o estado em disco. */
  let configuracaoDoTse = opcoes.retomada?.guardado.configuracao;
  /** Os arquivos de resultado da retomada, postos de volta quando a configuração da eleição der as URLs deles. */
  let arquivosDaRetomada = opcoes.retomada?.guardado.arquivos;
  /**
   * Na retomada sem todos os arquivos do TSE (a do objeto da noite, ou a do disco de um coletor que caiu antes de baixá-los
   * de novo), os lugares que o coletor ainda não pediu de novo. Até ele pedir todos (um pedido que falha conta, para um
   * arquivo estragado não segurar o resto), o mapa.json e as tabelas de projeções não são gravados: sairiam com buracos
   * no lugar do que já estava publicado. O Brasil e as UFs são gravados, com o placar novo e sem a projeção, que o modelo
   * segura enquanto faltam municípios: o núcleo mínimo vem antes, e falta não é número errado.
   */
  let aPedirDeNovo: Set<string> | undefined;

  // O que o coletor publicou.
  /** Os lugares do site na ordem do `mapa.json`, que a página também conhece, e a assinatura dela. */
  const doMapa = ordemDoMapa(opcoes.lugares);
  const hashes = new Map<string, string>(Object.entries(estadoRetomado?.hashes ?? {}));
  const curvas = new Map<string, PontoDaCurvaReal[]>(Object.entries(estadoRetomado?.curvas ?? {}));
  /** Os lugares cujo resultado ou narração mudou e ainda não foram gravados. */
  const sujos = new Set<string>(estadoRetomado?.sujos);
  const narracao = criarNarracao(opcoes.lugares, estadoRetomado?.narracao);
  /** Os lugares com resultado novo que a narração ainda não viu. */
  const porNarrar = new Set<string>();
  const projecaoDaNoite = opcoes.projecao && criarProjecaoDaNoite(opcoes.projecao);
  /** A projeção da última rodada com resultado novo; a seguinte só projeta de novo se chegar outro. */
  let projecao: ProjecaoDaRodada | undefined;
  let projetarDeNovo = true;
  let novidade: { totalizacao: string | null; vista: number | null } = estadoRetomado?.novidade ?? { totalizacao: null, vista: null };
  let numero = estadoRetomado?.numero ?? 0;
  /** O que o dono mandou: lido no começo de cada rodada e aplicado nela inteira. */
  let controle: Controle = estadoRetomado?.controle ?? CONTROLE_INICIAL;
  /** Os arquivos que chegaram e ainda não foram para um objeto da noite: os da rodada e os de uma gravação que falhou. */
  let porGuardarNaNoite: ArquivoDoTseGuardado[] = opcoes.retomada?.guardado.pendentes ?? [];
  /** De onde o coletor partiu, até o primeiro objeto da noite gravado o dizer. */
  let partida: Partida | undefined = opcoes.retomada?.partida ?? "a frio";
  /** Onde o coletor grava: o principal até o comando do plano B, e o plano B depois dele. */
  let destino = opcoes.destino;
  /** Na passagem ao plano B, até a primeira rodada que coube no teto: o Worker ainda não tem todos os arquivos. */
  let planoBPorCompletar = false;

  // As proteções do coletor, as únicas ações automáticas dele (Operação na noite, decisões 12 e 21; Volume de gravações
  // na noite, decisão 5). O estado delas vai no estado de retomada: o coletor que volta de uma queda segue com elas.
  /** Parado no bloqueio do TSE: nenhum pedido até a conexão mudar, ou cair e voltar. */
  let bloqueio: BloqueioDoTse | null = estadoRetomado?.bloqueio ?? null;
  /** Quando o coletor voltou a pedir depois do último bloqueio (ms), ou `null`. */
  let retomouEm: number | null = estadoRetomado?.retomouEm ?? null;
  /** Alguma rodada da noite passou do pico de pedidos que alerta o dono. */
  let picoAcimaDoLimite = estadoRetomado?.picoAcimaDoLimite ?? false;
  /**
   * As gravações do mês, contadas nos buckets do R2, chegaram à trava. Sem contador, nunca. O objeto da noite segue um por
   * rodada com ela: sem ele, a retomada numa outra máquina voltaria ao último objeto antes da trava.
   */
  const gravacoesTravadas = () => opcoes.contador !== undefined && somaDoMes(opcoes.contador.doMes()) >= TRAVA_DAS_GRAVACOES;
  /** Com a trava, quando cada município e o mapa.json foram gravados pela última vez (ms), pelo caminho. */
  const gravadoNaTrava = new Map<string, number>(Object.entries(estadoRetomado?.gravadoNaTrava ?? {}));
  /** O começo da primeira rodada na fase encerrada (ms), de que contam os 30 min até o coletor parar sozinho. */
  let encerradaEm: number | null = estadoRetomado?.encerradaEm ?? null;
  /** Os 30 min depois da totalização final passaram: o coletor para sozinho, também o que volta depois deles. */
  const noiteEncerrada = () => encerradaEm !== null && relogio.agora() >= encerradaEm + DEPOIS_DA_FINAL;

  // O que o painel do coletor lê da rodada, além do que ela fez.
  /** Os bytes do último arquivo do Brasil que o leitor aceitou: o placar conferido os lê sem o leitor. */
  let brasilEmBytes: Uint8Array | undefined;
  /** O instante de cada pedido da rodada, pelo relógio do coletor. */
  let pedidosDaRodada: number[] = [];
  let menorDesvio = Infinity;

  // A fila dos pedidos, com o ritmo fixo.
  const intervaloEntrePedidos = 1000 / pedidosPorSegundo;
  let proximoPedido = -Infinity;
  async function esperarAVez() {
    const agora = relogio.agora();
    proximoPedido = Math.max(proximoPedido, agora - FOLGA_DA_FILA * intervaloEntrePedidos);
    if (proximoPedido > agora) await relogio.esperar(proximoPedido - agora);
    proximoPedido += intervaloEntrePedidos;
  }
  /** Pede cada item na vez dele, até `MAXIMO_EM_VOO` ao mesmo tempo, e para no bloqueio: só os que estão no ar terminam. */
  async function emFila<T>(itens: T[], pedir: (item: T) => Promise<void>) {
    const emVoo = new Set<Promise<void>>();
    for (const item of itens) {
      await esperarAVez();
      while (emVoo.size >= MAXIMO_EM_VOO) await Promise.race(emVoo);
      if (bloqueio) break;
      const pedido: Promise<void> = pedir(item).finally(() => emVoo.delete(pedido));
      emVoo.add(pedido);
    }
    await Promise.all(emVoo);
  }

  /** O registro da rodada em andamento. */
  let registro: RegistroDaRodada;

  /**
   * Um GET ao TSE, com a ETag que o coletor tem. `null` se o pedido falhou, ou se o coletor está parado no bloqueio: no
   * primeiro 403 ou 429 ele para de pedir, porque insistir renova o bloqueio (Operação na noite, decisão 12).
   */
  async function pedir(url: string): Promise<{ status: 200; corpo: Uint8Array; etag: string | null } | { status: 304 } | null> {
    if (bloqueio) return null;
    pedidoEm.set(url, relogio.agora());
    pedidosDaRodada.push(relogio.agora());
    registro.pedidos++;
    const etag = etags.get(url);
    let resposta: Response;
    try {
      resposta = await buscar(url, { headers: etag ? { "if-none-match": etag } : {} });
    } catch (erro) {
      registro.falhas.push(`${url}: ${(erro as Error).message}`);
      return null;
    }
    registro.respostas[resposta.status] = (registro.respostas[resposta.status] ?? 0) + 1;
    const data = Date.parse(resposta.headers.get("date") ?? "");
    if (!Number.isNaN(data)) {
      horaDoTse = Math.max(horaDoTse, data);
      menorDesvio = Math.min(menorDesvio, relogio.agora() - data);
    }
    if (resposta.status === 200) return { status: 200, corpo: new Uint8Array(await resposta.arrayBuffer()), etag: resposta.headers.get("etag") };
    await resposta.body?.cancel();
    if (resposta.status === 304) return { status: 304 };
    registro.falhas.push(`${url}: HTTP ${resposta.status}`);
    if ((resposta.status === 403 || resposta.status === 429) && !bloqueio)
      bloqueio = { desde: relogio.agora(), status: resposta.status, conexao: opcoes.conexao?.() ?? null };
    return null;
  }

  /**
   * Pede um arquivo e o lê: `lido` num 200, só o status num 304 e `null` se falhou. A ETag só fica quando o
   * arquivo é bom, para um arquivo ruim ser pedido de novo.
   */
  async function pedirELer<T>(
    url: string,
    ler: (bytes: Uint8Array) => T,
  ): Promise<{ status: 200; lido: T; corpo: Uint8Array; etag: string | null } | { status: 304 } | null> {
    const r = await pedir(url);
    if (r === null || r.status === 304) return r;
    try {
      const lido = ler(r.corpo);
      if (r.etag) etags.set(url, r.etag);
      return { status: 200, lido, corpo: r.corpo, etag: r.etag };
    } catch (erro) {
      registro.falhas.push(`${url}: ${(erro as Error).message}`);
      registro.ilegiveis.push({ tipo: tipoDoArquivo(url), url });
      return null;
    }
  }

  /** De que é um arquivo do TSE pela URL: antes da configuração lida, só pode ser ela. */
  function tipoDoArquivo(url: string): TipoDoArquivoDoTse {
    const d = divulgacao;
    if (!d) return "configuracao";
    if (url === d.urls.acompanhamento(null)) return "brasil";
    if (d.ufs.some((uf) => url === d.urls.acompanhamento(uf))) return "uf";
    for (const a of d.acompanhados) {
      if (a.url === url) return a.tipo;
      if (a.zonas.some((z) => z.url === url)) return "zona";
    }
    return "configuracao";
  }

  /**
   * O conteúdo e o texto de um arquivo de configuração que o coletor ainda não tem, ou `null`. O guardado no disco vale
   * sem pedido: a retomada do disco não pede nada que já tinha, nem empurra os pedidos da rodada.
   */
  async function primeiraLeitura<T>(url: string, guardado: string | undefined, ler: (bytes: Uint8Array) => T): Promise<{ lido: T; texto: string } | null> {
    if (guardado !== undefined) {
      try {
        return { lido: ler(new TextEncoder().encode(guardado)), texto: guardado };
      } catch (erro) {
        registro.falhas.push(`retomada: ${url}: ${(erro as Error).message}`);
      }
    }
    await esperarAVez();
    const r = await pedirELer(url, ler);
    return r?.status === 200 ? { lido: r.lido, texto: new TextDecoder().decode(r.corpo) } : null;
  }

  async function configurar(): Promise<Divulgacao | undefined> {
    const guardada = configuracaoDoTse;
    const eleicao = await primeiraLeitura(urlDasEleicoes(base), guardada?.eleicoes, (bytes) => eleicaoDaConfiguracao(bytes, opcoes.eleicao));
    if (!eleicao) return undefined;
    const urls = urlsDaDivulgacao(base, eleicao.lido);
    const municipios = await primeiraLeitura(urls.municipios, guardada?.municipios, lerConfiguracaoDeMunicipios);
    if (!municipios) return undefined;
    configuracaoDoTse = { eleicoes: eleicao.texto, municipios: municipios.texto };
    const configuracao = municipios.lido;

    const acompanhado = (a: Omit<Acompanhado, "url" | "zonas">, zonas: Acompanhado[] = []): Acompanhado => ({
      ...a,
      url: urls.resultado(a.abrangencia),
      zonas,
    });
    const acompanhados = [acompanhado({ id: "BR", tipo: "brasil", abrangencia: {}, chaveNoIndice: chaveDoIndice("br", "br") })];
    for (const uf of configuracao.ufs) {
      acompanhados.push(acompanhado({ id: uf.sigla, tipo: "uf", abrangencia: { uf: uf.sigla }, chaveNoIndice: chaveDoIndice("uf", uf.sigla.toLowerCase()) }));
      for (const m of uf.municipios) {
        const codigo = String(m.codigo).padStart(5, "0");
        const zonas =
          m.zonas.length > 1
            ? m.zonas.map((zona) => acompanhado({ id: null, tipo: "zona", abrangencia: { uf: uf.sigla, municipio: m.codigo, zona }, chaveNoIndice: null }))
            : [];
        acompanhados.push(
          acompanhado({ id: codigo, tipo: "municipio", abrangencia: { uf: uf.sigla, municipio: m.codigo }, chaveNoIndice: chaveDoIndice("mu", codigo) }, zonas),
        );
      }
    }
    const lugares = new Map(acompanhados.map((a) => [a.id!, a]));
    return {
      eleicao: eleicao.lido,
      urls,
      ufs: configuracao.ufs.map((uf) => uf.sigla),
      acompanhados,
      doMapa: doMapa.lugares.map((l) => lugares.get(l.id)),
      lugares,
    };
  }

  const brasil = (d: Divulgacao) => resultados.get(d.urls.resultado({}));

  async function lerIndices(d: Divulgacao) {
    await emFila([null, ...d.ufs], async (uf) => {
      const url = d.urls.acompanhamento(uf);
      const indice = await pedirELer(url, lerAcompanhamento);
      if (indice?.status === 200) indices.set(url, indice.lido);
    });
    horasNosIndices.clear();
    for (const indice of indices.values())
      for (const item of indice.itens) horasNosIndices.set(chaveDoIndice(item.abrangencia.tipo, item.abrangencia.codigo), item.ultimaTotalizacao);
  }

  /** A última totalização do lugar no índice, ou `null` se ele ainda não tem nenhuma ou não aparece nos índices. */
  const horaNoIndice = (a: Acompanhado) => (a.chaveNoIndice === null ? null : (horasNosIndices.get(a.chaveNoIndice) ?? null));

  /** Por que o resultado que o coletor tem está atrás do TSE, ou `null` se não está. */
  function atraso(a: Acompanhado, final: boolean): "sem resultado" | "totalização final" | "índice" | null {
    const tido = resultados.get(a.url);
    if (!tido) return "sem resultado";
    if (final && !tido.totalizacaoFinal) return "totalização final";
    const noIndice = horaNoIndice(a);
    return noIndice !== null && (tido.ultimaTotalizacao === null || noIndice > tido.ultimaTotalizacao) ? "índice" : null;
  }

  /** Lê o resultado e confere que os candidatos são os do Brasil: fora eles, o arquivo não serve. */
  function lerResultadoDaEleicao(d: Divulgacao) {
    return (bytes: Uint8Array) => {
      const resultado = lerResultado(bytes);
      const doBrasil = brasil(d)
        ?.candidatos.map((c) => c.numero)
        .sort((x, y) => x - y);
      const aqui = resultado.candidatos.map((c) => c.numero).sort((x, y) => x - y);
      if (doBrasil && doBrasil.join() !== aqui.join())
        throw new ArquivoDoTseInvalido(`Arquivo do TSE: os candidatos (${aqui.join(", ")}) não são os do Brasil (${doBrasil.join(", ")})`);
      return resultado;
    };
  }

  /**
   * Baixa os resultados atrasados, no máximo o que cabe no tempo de pedidos da rodada: o resto fica para a rodada
   * seguinte, e a rodada fica abaixo dos 15 s nem na partida a frio nem na varredura do fim.
   */
  async function baixarResultados(d: Divulgacao) {
    const final = brasil(d)?.totalizacaoFinal ?? false;
    const agora = relogio.agora();
    const podePedir = (url: string) => agora - (pedidoEm.get(url) ?? -Infinity) >= UM_MINUTO;
    const atrasados: Acompanhado[] = [];
    for (const a of d.acompanhados) {
      const motivo = atraso(a, final);
      if (motivo === "índice" && zonasMarcadas.get(a.url) !== horaNoIndice(a)) {
        zonasMarcadas.set(a.url, horaNoIndice(a));
        for (const z of a.zonas) zonasPendentes.set(z.url, agora);
      }
      if (motivo !== null && podePedir(a.url)) atrasados.push(a);
      for (const z of a.zonas) if ((zonasPendentes.has(z.url) || atraso(z, final) !== null) && podePedir(z.url)) atrasados.push(z);
    }
    atrasados.sort((a, b) => TIPOS[a.tipo].ordem - TIPOS[b.tipo].ordem || (horaNoIndice(a) ?? "").localeCompare(horaNoIndice(b) ?? ""));
    const vagas = Math.max(10, Math.floor((pedidosPorSegundo * TEMPO_DE_PEDIDOS) / 1000) - registro.pedidos);

    const ler = lerResultadoDaEleicao(d);
    const lerOBrasil = (bytes: Uint8Array) => {
      const lido = ler(bytes);
      brasilEmBytes = bytes;
      return lido;
    };
    await emFila(atrasados.slice(0, vagas), async (a) => {
      const pedidoNo = relogio.agora();
      const resposta = await pedirELer(a.url, a.tipo === "brasil" ? lerOBrasil : ler);
      aPedirDeNovo?.delete(a.url);
      const pendenteDesde = zonasPendentes.get(a.url);
      if (resposta !== null && pendenteDesde !== undefined && pedidoNo - pendenteDesde >= UM_MINUTO) zonasPendentes.delete(a.url);
      if (resposta?.status !== 200) return;
      resultados.set(a.url, resposta.lido);
      const arquivo: ArquivoDoTseGuardado = { abrangencia: a.abrangencia, etag: resposta.etag, corpo: new TextDecoder().decode(resposta.corpo) };
      arquivosDoTse.set(a.url, arquivo);
      porGuardarNaNoite.push(arquivo);
      projetarDeNovo = true;
      registro.baixados[TIPOS[a.tipo].contador]++;
      if (a.id === null) return;
      sujos.add(a.id);
      porNarrar.add(a.id);
    });
  }

  /**
   * Roda o modelo quando chegou resultado novo e marca para gravar o Brasil, as UFs e o Exterior, que levam a projeção:
   * só os bytes que mudaram vão ao destino, e assim uma chave ligada ou desligada também chega a eles. Uma projeção que
   * falha vira falha da rodada, e o núcleo mínimo sai sem ela.
   */
  function projetar(d: Divulgacao) {
    const doBrasil = brasil(d);
    if (!projecaoDaNoite || !doBrasil) return;
    if (projetarDeNovo) {
      projetarDeNovo = false;
      try {
        const ordem = emOrdem(doBrasil.candidatos).map((c) => c.numero);
        projecao = projecaoDaNoite.projetar((abrangencia) => resultados.get(d.urls.resultado(abrangencia)), ordem);
      } catch (erro) {
        projecao = undefined;
        registro.falhas.push(`projeção: ${(erro as Error).message}`);
      }
    }
    for (const a of d.acompanhados) if ((a.tipo === "brasil" || a.tipo === "uf") && resultados.has(a.url)) sujos.add(a.id!);
  }

  /**
   * A projeção da rodada, ou `undefined` com a chave da projeção desligada ou antes das 17h: até lá, a projeção que vai
   * ao ar é a do painel, atrás das chaves de antes das 17h, que o coletor não lê.
   */
  const projecaoNoAr = (d: Divulgacao) => (projecaoPodeIrAoAr(d) ? projecao : undefined);
  /** A projeção vai ao ar com a chave dela ligada e depois das 17h, quando houver uma. */
  const projecaoPodeIrAoAr = (d: Divulgacao) => controle.chaves.projecao && fase(d) !== "antes-das-17h";
  /** A base com pesquisas no ar: as duas chaves dela ligadas. */
  const comPesquisasNoAr = () => controle.chaves.projecao && controle.chaves.baseComPesquisas;
  /** As bases da projeção no ar na rodada, com ou sem a projeção calculada: as dos textos preditivos, com a chave deles. */
  const basesNoAr = (d: Divulgacao): BaseDaProjecao[] =>
    projecaoPodeIrAoAr(d) ? ["soApuracao", ...(comPesquisasNoAr() ? (["comPesquisas"] as const) : [])] : [];

  /**
   * Passa à narração os resultados novos da rodada, na ordem dos lugares, e a projeção dela, e marca para gravar os
   * lugares cuja narração mudou: o Brasil muda também com os eventos das UFs que entram nele. "As pesquisas deixaram de
   * pesar" fala das duas bases, e só conta com elas no ar. Os preditivos andam com a projeção da rodada, no ar ou não,
   * e entram só com a chave dos textos preditivos ligada, nas bases no ar (Narração da noite, decisão 6).
   */
  function narrar(d: Divulgacao) {
    const novos = new Map<string, ResultadoDoTse>();
    for (const a of d.acompanhados) if (a.id !== null && porNarrar.has(a.id)) novos.set(a.id, resultados.get(a.url)!);
    porNarrar.clear();
    // A função que a narração chama lê a projeção desta rodada, e não a variável, que a próxima rodada troca.
    const daRodada = projecao;
    const mudaram = narracao.narrar(novos, {
      coincidemNoBrasil: comPesquisasNoAr() && (daRodada?.coincidemNoBrasil ?? false),
      numeros: daRodada && ((id, base) => daRodada.numeros(id, base)),
      textosPreditivos: controle.chaves.textosPreditivos,
      basesNoAr: basesNoAr(d),
    });
    for (const id of mudaram) sujos.add(id);
  }

  function fase(d: Divulgacao): Fase {
    if (brasil(d)?.totalizacaoFinal) return "encerrada";
    return horaDoTse >= Date.parse(`${d.eleicao.dia}T17:00:00-03:00`) ? "ao-vivo" : "antes-das-17h";
  }

  /** Os bytes e o hash de um arquivo ao vivo, ou `null` se ele não mudou desde a última gravação. */
  function seMudou(caminho: string, conteudo: object): ArquivoPorGravar | null {
    const bytes = new TextEncoder().encode(JSON.stringify(conteudo));
    // 96 bits do SHA-256 bastam para saber se o arquivo mudou, e os ~5.850 hashes vão em todo objeto da noite.
    const hash = createHash("sha256").update(bytes).digest("base64url").slice(0, 16);
    return hashes.get(caminho) === hash ? null : { caminho, bytes, hash };
  }

  /** Grava um arquivo ao vivo no destino ativo; `false` se falhou. */
  async function gravar({ caminho, bytes, hash }: ArquivoPorGravar): Promise<boolean> {
    try {
      await destino.gravar(caminho, bytes);
    } catch (erro) {
      registro.falhas.push(`gravar ${caminho}: ${(erro as Error).message}`);
      return false;
    }
    hashes.set(caminho, hash);
    registro.gravacoes++;
    return true;
  }

  /**
   * Grava o que mudou, no teto de gravações por rodada e, com a trava de 90%, cada município, o mapa.json e o arquivo do
   * simulador no máximo a cada 5 min (Volume de gravações na noite, decisão 5). O excedente fica para a rodada seguinte,
   * nesta ordem: o arquivo de rodada, o Brasil, as UFs e o Exterior, as tabelas de projeções com os municípios delas, o
   * mapa.json, o arquivo do simulador e os municípios, os que esperam há mais tempo primeiro (a ordem em que ficaram por
   * gravar). O mapa.json, o arquivo do simulador e os municípios das tabelas, que a decisão não diz, vão com o que é de
   * todo lugar: os dois primeiros são um arquivo só cada, e sem os municípios das tabelas a página do município fica sem
   * a projeção.
   */
  async function publicar(d: Divulgacao) {
    const doBrasil = brasil(d);
    if (!doBrasil) return;
    const candidatos = emOrdem(doBrasil.candidatos);
    const ordem = candidatos.map((c) => c.numero);
    const agora = relogio.agora();
    if (doBrasil.ultimaTotalizacao !== novidade.totalizacao) novidade = { totalizacao: doBrasil.ultimaTotalizacao, vista: agora };

    // A hora da rodada é a da publicação: é ela que a página compara com o `Date` da CDN.
    const noAr = projecaoNoAr(d);
    const peso = comPesquisasNoAr() ? (noAr?.pesoDasPesquisas ?? null) : null;
    const daRodada = seMudou("rodada.json", arquivoDeRodada(agora, fase(d), novidade, candidatos, controle, peso, narracao.doBrasil()));
    if (daRodada) await gravar(daRodada);
    let tentativas = daRodada ? 1 : 0;

    // A curva real de um lugar anda com cada resultado novo dele, gravado ou não. Na retomada do objeto da noite, um lugar
    // que estava por gravar espera o coletor baixá-lo de novo.
    const lugares: Acompanhado[] = [];
    for (const id of sujos) {
      const a = d.lugares.get(id);
      const resultado = a && resultados.get(a.url);
      if (!resultado) continue;
      const curva = curvas.get(id) ?? [];
      const ponto = pontoDaCurvaReal(resultado, ordem);
      if (resultado.secoes.totalizadas > 0 && JSON.stringify(ponto) !== JSON.stringify(curva.at(-1))) curva.push(ponto);
      curvas.set(id, curva);
      lugares.push(a);
    }
    // No plano zero (o núcleo mínimo desligado), nenhum dado ao vivo vai ao ar: os lugares ficam sujos e a curva segue
    // andando por dentro, para o bloco voltar inteiro quando a chave religar.
    if (aPedirDeNovo?.size === 0) aPedirDeNovo = undefined;
    if (!controle.chaves.nucleoMinimo) return;

    const aoVivoDoLugar = (a: Acompanhado): ArquivoAoVivo => ({
      caminho: `lugares/${a.id}.json`,
      lugar: a.id!,
      aCadaCincoMinutos: a.tipo === "municipio",
      conteudo: () =>
        arquivoDoLugar(
          a.id!,
          resultados.get(a.url)!,
          ordem,
          curvas.get(a.id!)!,
          narracao.doLugar(a.id!),
          noAr?.doLugar(a.id!, controle.chaves.baseComPesquisas),
        ),
    });
    const arquivos = lugares
      .filter((a) => a.tipo !== "municipio")
      .sort((a, b) => TIPOS[a.tipo].ordem - TIPOS[b.tipo].ordem)
      .map(aoVivoDoLugar);
    // A tabela de projeções de cada UF e do Exterior, o mapa.json e o arquivo do simulador são montados a cada rodada, e só
    // os bytes que mudam vão ao destino. Sem a projeção no ar, a tabela vai vazia, e o arquivo do simulador, só com a
    // assinatura. Os municípios da tabela, com as comparações, não mudam na noite: com a projeção no ar, são gravados uma
    // vez. Na retomada do objeto da noite, nada disso até o coletor pedir de novo todos os lugares.
    if (!aPedirDeNovo) {
      const comPesquisas = controle.chaves.baseComPesquisas;
      for (const uf of d.ufs) {
        arquivos.push({
          caminho: `tabelas/${uf}.json`,
          conteudo: (): TabelaDeProjecoes => {
            const projecao = noAr?.dosMunicipios(uf, comPesquisas);
            return { uf, ...(projecao ? { projecao } : {}) };
          },
        });
        const municipios = noAr?.municipiosDaTabela(uf);
        if (municipios) arquivos.push({ caminho: `tabelas/${uf}-municipios.json`, conteudo: () => municipios });
      }
      arquivos.push({
        caminho: "mapa.json",
        aCadaCincoMinutos: true,
        conteudo: () =>
          arquivoDoMapa(
            doMapa.assinatura,
            d.doMapa.map((a) => a && resultados.get(a.url)),
            ordem,
            noAr && projecaoDasUfs(d, noAr, comPesquisas),
          ),
      });
      if (projecaoDaNoite) {
        // O simulador vai ao ar com a projeção, depois das 17h, e com a chave dele, que só vale com a da projeção.
        const doSimulador = controle.chaves.simulador ? noAr : undefined;
        const agregado = doSimulador && comPesquisasNoAr() ? opcoes.projecao!.agregado : undefined;
        arquivos.push({
          caminho: "simulador.json",
          aCadaCincoMinutos: true,
          conteudo: (): ArquivoDoSimuladorAoVivo => ({
            assinatura: projecaoDaNoite.assinatura,
            ...(doSimulador ? { apuracao: doSimulador.apuracao } : {}),
            ...(agregado ? { agregado: { valor: agregado.valor, incerteza: agregado.incerteza } } : {}),
          }),
        });
      }
    }
    arquivos.push(...lugares.filter((a) => a.tipo === "municipio").map(aoVivoDoLugar));

    const travadas = gravacoesTravadas();
    const gravacoes: (() => Promise<void>)[] = [];
    for (const arquivo of arquivos) {
      if (travadas && arquivo.aCadaCincoMinutos && agora - (gravadoNaTrava.get(arquivo.caminho) ?? -Infinity) < INTERVALO_NA_TRAVA) continue;
      const porGravar = seMudou(arquivo.caminho, arquivo.conteudo());
      if (!porGravar) {
        if (arquivo.lugar) sujos.delete(arquivo.lugar);
        continue;
      }
      if (tentativas >= TETO_DE_GRAVACOES) {
        registro.adiadas++;
        continue;
      }
      tentativas++;
      gravacoes.push(async () => {
        if (!(await gravar(porGravar))) return;
        if (arquivo.lugar) sujos.delete(arquivo.lugar);
        if (travadas && arquivo.aCadaCincoMinutos) gravadoNaTrava.set(arquivo.caminho, agora);
      });
    }
    await emParalelo(gravacoes, GRAVACOES_EM_VOO);
  }

  /** A projeção de cada UF e do Exterior, para o mapa.json: só o resultado final estimado, nas bases no ar, e o 1º turno com que ela se compara. */
  function projecaoDasUfs(d: Divulgacao, noAr: ProjecaoDaRodada, comPesquisas: boolean): ArquivoDoMapa["projecao"] {
    const naBase = (qual: "soApuracao" | "comPesquisas") =>
      Object.fromEntries(
        d.ufs.flatMap((uf) => {
          const p = noAr.doLugar(uf, comPesquisas)?.[qual];
          return p ? [[uf, p.projecao]] : [];
        }),
      );
    const primeiroTurno = Object.fromEntries(
      d.ufs.flatMap((uf) => {
        const p = noAr.doLugar(uf, comPesquisas);
        return p ? [[uf, p.comparacoes.primeiroTurno]] : [];
      }),
    );
    return { soApuracao: naBase("soApuracao"), ...(comPesquisas ? { comPesquisas: naBase("comPesquisas") } : {}), primeiroTurno };
  }

  /** Lê o controle do dono para esta rodada. Uma leitura que falha não derruba nada: fica o controle anterior. */
  async function lerControleDaRodada() {
    if (!opcoes.controle) return;
    try {
      const lido = await opcoes.controle();
      controle = { chaves: chavesEfetivas(lido.chaves), aviso: lido.aviso, planoB: lido.planoB };
    } catch (erro) {
      registro.falhas.push(`controle: ${(erro as Error).message}`);
    }
    registro.controle = controle;
  }

  /**
   * Passa ao plano B na primeira rodada que lê o comando, e não volta (Operação na noite, decisão 14). O destino novo
   * não tem nada do que o principal tem: os hashes são esquecidos, também o que a trava segura, e todo lugar com resultado
   * é gravado de novo, em 4 rodadas no teto. A primeira versão do Worker sai depois delas, com todos os arquivos.
   */
  function passarAoPlanoB(d: Divulgacao | undefined) {
    if (!controle.planoB || destino === opcoes.planoB) return;
    if (!opcoes.planoB) {
      registro.falhas.push("plano B: o coletor roda sem destino de plano B");
      return;
    }
    destino = opcoes.planoB;
    hashes.clear();
    gravadoNaTrava.clear();
    planoBPorCompletar = true;
    for (const a of d?.acompanhados ?? []) if (a.id !== null && resultados.has(a.url)) sujos.add(a.id);
  }

  /**
   * Põe de volta os arquivos do TSE da retomada, como se o coletor os tivesse baixado, com a ETag: ele só pede de novo o
   * que mudou. Eles já passaram pela narração antes da queda. Na retomada do objeto da noite, que traz só os da rodada
   * dele, os outros lugares ficam para baixar de novo.
   */
  function restaurar(d: Divulgacao, arquivos: ArquivoDoTseGuardado[]) {
    for (const arquivo of arquivos) {
      const url = d.urls.resultado(arquivo.abrangencia);
      const bytes = new TextEncoder().encode(arquivo.corpo);
      try {
        resultados.set(url, lerResultado(bytes));
      } catch (erro) {
        registro.falhas.push(`retomada: ${url}: ${(erro as Error).message}`);
        continue;
      }
      if (arquivo.etag) etags.set(url, arquivo.etag);
      arquivosDoTse.set(url, arquivo);
      if (url === d.urls.resultado({})) brasilEmBytes = bytes;
    }
    aPedirDeNovo = new Set(d.acompanhados.filter((a) => a.id !== null && !resultados.has(a.url)).map((a) => a.url));
  }

  /** O estado de retomada, no fim da rodada. */
  function estadoDeRetomada(quando: string): EstadoDeRetomada {
    return {
      versao: 1,
      eleicao: opcoes.eleicao,
      numero,
      quando,
      narracao: narracao.estado(),
      hashes: Object.fromEntries(hashes),
      curvas: Object.fromEntries(curvas),
      sujos: [...sujos],
      controle,
      gravacoesDoMes: opcoes.contador?.doMes() ?? null,
      novidade,
      horaDoTse: Number.isFinite(horaDoTse) ? horaDoTse : null,
      zonasPendentes: Object.fromEntries(zonasPendentes),
      zonasMarcadas: Object.fromEntries(zonasMarcadas),
      pedidosRecentes: Object.fromEntries([...pedidoEm].filter(([, em]) => relogio.agora() - em < UM_MINUTO)),
      bloqueio,
      retomouEm,
      picoAcimaDoLimite,
      gravadoNaTrava: Object.fromEntries(gravadoNaTrava),
      encerradaEm,
    };
  }

  /** Parado no bloqueio, o coletor volta a pedir na rodada em que a conexão mudou, ou caiu e voltou. */
  function retomarSeAConexaoMudou() {
    if (!bloqueio || !opcoes.conexao || !conexaoMudou(bloqueio, opcoes.conexao())) return;
    bloqueio = null;
    retomouEm = relogio.agora();
  }

  /** A rodada de 40 s depois de um bloqueio: até 15 min depois da volta (ms), ou até o fim com o pico acima do limite. */
  const rodadaDe40sAte = () => (retomouEm === null ? null : picoAcimaDoLimite ? Infinity : retomouEm + DEPOIS_DA_VOLTA);
  /** Do começo de uma rodada ao da seguinte. */
  const intervaloDepoisDe = (inicio: number) => (inicio < (rodadaDe40sAte() ?? -Infinity) ? RODADA_DEPOIS_DO_BLOQUEIO : intervalo);

  /**
   * Guarda o estado da rodada (Operação na noite, decisão 4; Volume de gravações na noite, decisão 3): o objeto da noite,
   * com os arquivos que chegaram, e depois o disco, com todos. O estado vai a JSON uma vez para os dois. Um objeto da
   * noite que falha deixa os arquivos dele para o da rodada seguinte, e o disco os guarda até lá. Antes de a
   * configuração da eleição chegar, os arquivos do disco são os da retomada.
   *
   * Enquanto a conexão for o celular, o objeto da noite fica no disco do mesmo jeito (Volume de gravações na noite,
   * decisão 8: o estado inteiro em todo objeto passa de 1 MB por rodada). O primeiro no cabo leva os arquivos que
   * esperavam, e a última rodada da noite grava um mesmo pelo celular, para a noite ficar inteira no R2.
   */
  async function guardarEstado(ultimaDaNoite: boolean) {
    const { guardar } = opcoes;
    if (!guardar?.objetoDaNoite) porGuardarNaNoite = [];
    if (!guardar) return;
    const quando = new Date(relogio.agora()).toISOString();
    const estado = JSON.stringify(estadoDeRetomada(quando));
    if (guardar.objetoDaNoite && opcoes.conexao?.().via === "celular" && !ultimaDaNoite) registro.objetoDaNoite = "no disco";
    else if (guardar.objetoDaNoite) {
      try {
        await guardar.objetoDaNoite(estadoGuardadoEmJson(estado, porGuardarNaNoite, { partida }), { numero, quando });
        porGuardarNaNoite = [];
        partida = undefined;
        registro.objetoDaNoite = "gravado";
      } catch (erro) {
        registro.falhas.push(`objeto da noite: ${(erro as Error).message}`);
        registro.objetoDaNoite = "falhou";
      }
    }
    if (guardar.disco) {
      try {
        const arquivos = arquivosDaRetomada ?? [...arquivosDoTse.values()];
        await guardar.disco(estadoGuardadoEmJson(estado, arquivos, { pendentes: porGuardarNaNoite, configuracao: configuracaoDoTse }));
      } catch (erro) {
        registro.falhas.push(`estado em disco: ${(erro as Error).message}`);
      }
    }
  }

  /**
   * O que o painel do coletor lê da rodada além do que ela fez: o placar do Brasil como o TSE o escreveu, a novidade, o
   * pico de pedidos, o desvio do relógio e a projeção do Brasil, com as chaves ou sem elas (o painel mostra a de dentro).
   */
  function paraOPainelDoColetor(d: Divulgacao | undefined) {
    if (brasilEmBytes) {
      try {
        registro.placarDoTse = placarDoArquivoDoTse(brasilEmBytes);
      } catch (erro) {
        registro.falhas.push(`placar conferido: ${(erro as Error).message}`);
      }
    }
    registro.novidade = { totalizacao: novidade.totalizacao, vista: novidade.vista === null ? null : new Date(novidade.vista).toISOString() };
    let inicio = 0;
    for (let fim = 0; fim < pedidosDaRodada.length; fim++) {
      while (pedidosDaRodada[fim]! - pedidosDaRodada[inicio]! >= 1000) inicio++;
      registro.picoDePedidos = Math.max(registro.picoDePedidos, fim - inicio + 1);
    }
    registro.desvioDoRelogio = Number.isFinite(menorDesvio) ? Math.round(menorDesvio) : null;
    const doBrasil = d && brasil(d);
    const noBrasil = doBrasil && projecao?.doLugar("BR", true);
    if (doBrasil && projecao && noBrasil?.comPesquisas) {
      const numeros = ({ projecao, margem, chance }: ProjecaoNaBase) => ({ projecao, margem, chance });
      registro.projecaoDoBrasil = {
        candidato: emOrdem(doBrasil.candidatos)[0]!.numero,
        pesoDasPesquisas: Math.round(100 * projecao.pesoDasPesquisas),
        soApuracao: numeros(noBrasil.soApuracao),
        comPesquisas: numeros(noBrasil.comPesquisas),
      };
    }
  }

  async function rodada(): Promise<RegistroDaRodada> {
    const inicio = relogio.agora();
    const inicioReal = performance.now();
    registro = {
      numero: ++numero,
      inicio: new Date(inicio).toISOString(),
      duracao: 0,
      processamento: 0,
      fase: null,
      pedidos: 0,
      respostas: {},
      baixados: { brasil: 0, ufs: 0, municipios: 0, zonas: 0 },
      gravacoes: 0,
      falhas: [],
      controle,
      destinoAtivo: "principal",
      gravacoesDoMes: null,
      placarDoTse: null,
      novidade: { totalizacao: null, vista: null },
      picoDePedidos: 0,
      desvioDoRelogio: null,
      ilegiveis: [],
      projecaoDoBrasil: null,
      bloqueio: null,
      rodadaDe40s: null,
      gravacoesTravadas: false,
      adiadas: 0,
      encerraEm: null,
      objetoDaNoite: null,
    };
    pedidosDaRodada = [];
    menorDesvio = Infinity;
    // Um erro que escapou vira falha da rodada: o coletor nunca cai por um arquivo, e a rodada seguinte tenta de novo.
    try {
      retomarSeAConexaoMudou();
      await lerControleDaRodada();
      divulgacao ??= await configurar();
      if (divulgacao && arquivosDaRetomada) {
        restaurar(divulgacao, arquivosDaRetomada);
        arquivosDaRetomada = undefined;
      }
      passarAoPlanoB(divulgacao);
      if (divulgacao) {
        await lerIndices(divulgacao);
        await baixarResultados(divulgacao);
        projetar(divulgacao);
        narrar(divulgacao);
        await publicar(divulgacao);
        if (brasil(divulgacao)) registro.fase = fase(divulgacao);
        if (registro.fase === "encerrada") encerradaEm ??= inicio;
      }
      // Na passagem ao plano B, o destino que publica em lote (o Worker) só publica quando o teto não deixou nada para a
      // rodada seguinte: a primeira versão do Worker sai com todos os arquivos. Depois dela, publica toda rodada.
      if (planoBPorCompletar && registro.adiadas === 0) planoBPorCompletar = false;
      if (!planoBPorCompletar) registro.falhas.push(...((await destino.fimDaRodada?.()) ?? []));
    } catch (erro) {
      registro.falhas.push(`rodada: ${(erro as Error).message}`);
    }
    paraOPainelDoColetor(divulgacao);
    if (registro.picoDePedidos > LIMITES_DOS_ALERTAS.picoDePedidos) picoAcimaDoLimite = true;
    registro.bloqueio = bloqueio && { desde: new Date(bloqueio.desde).toISOString(), status: bloqueio.status };
    const ate = rodadaDe40sAte();
    if (ate !== null && inicio < ate) registro.rodadaDe40s = { ate: Number.isFinite(ate) ? new Date(ate).toISOString() : null };
    registro.encerraEm = encerradaEm === null ? null : new Date(encerradaEm + DEPOIS_DA_FINAL).toISOString();
    // A última rodada da noite é a que termina depois dos 30 min da final: a seguinte não começa, nem a que passou da hora.
    await guardarEstado(encerradaEm !== null && Math.max(inicio + intervaloDepoisDe(inicio), relogio.agora()) >= encerradaEm + DEPOIS_DA_FINAL);
    registro.destinoAtivo = destino === opcoes.planoB ? "plano B" : "principal";
    registro.gravacoesDoMes = opcoes.contador?.doMes() ?? null;
    registro.gravacoesTravadas = gravacoesTravadas();
    registro.duracao = Math.round(relogio.agora() - inicio);
    registro.processamento = Math.round(performance.now() - inicioReal);
    return registro;
  }

  return {
    rodada,
    async rodar({ ate, aoRodar }) {
      let proxima = relogio.agora();
      for (;;) {
        const agora = relogio.agora();
        if (proxima > agora) await relogio.esperar(proxima - agora);
        if (ate() || noiteEncerrada()) return;
        const inicio = relogio.agora();
        // Fora do `aoRodar?.(...)`: sem ele, o encadeamento opcional pularia a rodada.
        const registro = await rodada();
        proxima = inicio + intervaloDepoisDe(inicio);
        aoRodar?.(registro);
      }
    },
    resultado: (abrangencia) => (divulgacao ? resultados.get(divulgacao.urls.resultado(abrangencia)) : undefined),
  };
}
