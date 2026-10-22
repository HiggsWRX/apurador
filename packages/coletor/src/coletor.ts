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
import {
  arquivoDeRodada,
  arquivoDoLugar,
  arquivoDoMapa,
  emOrdem,
  pontoDaCurvaReal,
  type ArquivoDoMapa,
  type BaseDaProjecao,
  type Fase,
  type PontoDaCurvaReal,
  type TabelaDeProjecoes,
} from "./arquivos.ts";
import { chavesEfetivas, CONTROLE_INICIAL, type Controle } from "./chaves.ts";
import type { ContadorDeGravacoes, GravacoesDoMes } from "./contador.ts";
import type { Destino } from "./destino.ts";
import { criarNarracao } from "./narracao.ts";
import { criarProjecaoDaNoite, type EntradaDaProjecao, type ProjecaoDaRodada } from "./projecao.ts";
import type { RelogioDoColetor } from "./relogio.ts";

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
}

/** O coletor de uma eleição: as rodadas e o último resultado bom de cada lugar. */
export interface Coletor {
  rodada(): Promise<RegistroDaRodada>;
  /** Roda uma rodada a cada intervalo, até `ate()` dar verdadeiro. */
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

/** O coletor de uma eleição, com a rede, o relógio e o destino injetados. */
export function criarColetor(opcoes: OpcoesDoColetor): Coletor {
  const { base, buscar, relogio } = opcoes;
  const pedidosPorSegundo = opcoes.pedidosPorSegundo ?? 45;
  const intervalo = (opcoes.intervalo ?? 20) * 1000;

  let divulgacao: Divulgacao | undefined;

  // O que o coletor sabe do TSE.
  const etags = new Map<string, string>();
  const pedidoEm = new Map<string, number>();
  const resultados = new Map<string, ResultadoDoTse>();
  const indices = new Map<string, AcompanhamentoDoTse>();
  /** A última totalização de cada lugar nos índices, pela chave do índice. */
  const horasNosIndices = new Map<string, string | null>();
  /**
   * As zonas a pedir de novo porque o município mudou, com a hora em que o coletor viu a mudança. Uma zona sai
   * daqui só com um pedido feito um minuto depois disso: antes, o CDN pode ainda ter a cópia velha dela, e a zona
   * não aparece em índice nenhum.
   */
  const zonasPendentes = new Map<string, number>();
  /** A hora do índice com que as zonas de cada município foram marcadas, para marcar uma vez por mudança. */
  const zonasMarcadas = new Map<string, string | null>();
  /** A maior hora do cabeçalho `Date` do TSE, em ms: o relógio da fonte, que muda a fase. */
  let horaDoTse = -Infinity;

  // O que o coletor publicou.
  /** Os lugares do site na ordem do `mapa.json`, que a página também conhece, e a assinatura dela. */
  const doMapa = ordemDoMapa(opcoes.lugares);
  const hashes = new Map<string, string>();
  const curvas = new Map<string, PontoDaCurvaReal[]>();
  /** Os lugares cujo resultado ou narração mudou e ainda não foram gravados. */
  const sujos = new Set<string>();
  const narracao = criarNarracao(opcoes.lugares);
  /** Os lugares com resultado novo que a narração ainda não viu. */
  const porNarrar = new Set<string>();
  const projecaoDaNoite = opcoes.projecao && criarProjecaoDaNoite(opcoes.projecao);
  /** A projeção da última rodada com resultado novo; a seguinte só projeta de novo se chegar outro. */
  let projecao: ProjecaoDaRodada | undefined;
  let projetarDeNovo = true;
  let novidade: { totalizacao: string | null; vista: number | null } = { totalizacao: null, vista: null };
  let numero = 0;
  /** O que o dono mandou: lido no começo de cada rodada e aplicado nela inteira. */
  let controle: Controle = CONTROLE_INICIAL;
  /** Onde o coletor grava: o principal até o comando do plano B, e o plano B depois dele. */
  let destino = opcoes.destino;

  // A fila dos pedidos, com o ritmo fixo.
  const intervaloEntrePedidos = 1000 / pedidosPorSegundo;
  let proximoPedido = -Infinity;
  async function esperarAVez() {
    const agora = relogio.agora();
    proximoPedido = Math.max(proximoPedido, agora - FOLGA_DA_FILA * intervaloEntrePedidos);
    if (proximoPedido > agora) await relogio.esperar(proximoPedido - agora);
    proximoPedido += intervaloEntrePedidos;
  }
  async function emFila<T>(itens: T[], pedir: (item: T) => Promise<void>) {
    const emVoo = new Set<Promise<void>>();
    for (const item of itens) {
      await esperarAVez();
      while (emVoo.size >= MAXIMO_EM_VOO) await Promise.race(emVoo);
      const pedido: Promise<void> = pedir(item).finally(() => emVoo.delete(pedido));
      emVoo.add(pedido);
    }
    await Promise.all(emVoo);
  }

  /** O registro da rodada em andamento. */
  let registro: RegistroDaRodada;

  /** Um GET ao TSE, com a ETag que o coletor tem. `null` se o pedido falhou. */
  async function pedir(url: string): Promise<{ status: 200; corpo: Uint8Array; etag: string | null } | { status: 304 } | null> {
    pedidoEm.set(url, relogio.agora());
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
    if (!Number.isNaN(data)) horaDoTse = Math.max(horaDoTse, data);
    if (resposta.status === 200) return { status: 200, corpo: new Uint8Array(await resposta.arrayBuffer()), etag: resposta.headers.get("etag") };
    await resposta.body?.cancel();
    if (resposta.status === 304) return { status: 304 };
    registro.falhas.push(`${url}: HTTP ${resposta.status}`);
    return null;
  }

  /**
   * Pede um arquivo e o lê: `lido` num 200, só o status num 304 e `null` se falhou. A ETag só fica quando o
   * arquivo é bom, para um arquivo ruim ser pedido de novo.
   */
  async function pedirELer<T>(url: string, ler: (bytes: Uint8Array) => T): Promise<{ status: 200; lido: T } | { status: 304 } | null> {
    const r = await pedir(url);
    if (r === null || r.status === 304) return r;
    try {
      const lido = ler(r.corpo);
      if (r.etag) etags.set(url, r.etag);
      return { status: 200, lido };
    } catch (erro) {
      registro.falhas.push(`${url}: ${(erro as Error).message}`);
      return null;
    }
  }

  /** O conteúdo de um arquivo que o coletor ainda não tem, ou `null`. */
  async function primeiraLeitura<T>(url: string, ler: (bytes: Uint8Array) => T): Promise<T | null> {
    await esperarAVez();
    const r = await pedirELer(url, ler);
    return r?.status === 200 ? r.lido : null;
  }

  async function configurar(): Promise<Divulgacao | undefined> {
    const eleicao = await primeiraLeitura(urlDasEleicoes(base), (bytes) => eleicaoDaConfiguracao(bytes, opcoes.eleicao));
    if (!eleicao) return undefined;
    const urls = urlsDaDivulgacao(base, eleicao);
    const configuracao = await primeiraLeitura(urls.municipios, lerConfiguracaoDeMunicipios);
    if (!configuracao) return undefined;

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
    const porId = new Map(acompanhados.map((a) => [a.id, a]));
    return { eleicao, urls, ufs: configuracao.ufs.map((uf) => uf.sigla), acompanhados, doMapa: doMapa.lugares.map((l) => porId.get(l.id)) };
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
    await emFila(atrasados.slice(0, vagas), async (a) => {
      const pedidoNo = relogio.agora();
      const resposta = await pedirELer(a.url, ler);
      const pendenteDesde = zonasPendentes.get(a.url);
      if (resposta !== null && pendenteDesde !== undefined && pedidoNo - pendenteDesde >= UM_MINUTO) zonasPendentes.delete(a.url);
      if (resposta?.status !== 200) return;
      resultados.set(a.url, resposta.lido);
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

  async function gravarSeMudou(caminho: string, conteudo: object): Promise<boolean> {
    const bytes = new TextEncoder().encode(JSON.stringify(conteudo));
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hashes.get(caminho) === hash) return true;
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

  async function publicar(d: Divulgacao) {
    const doBrasil = brasil(d);
    if (!doBrasil) return;
    const candidatos = emOrdem(doBrasil.candidatos);
    const ordem = candidatos.map((c) => c.numero);
    if (doBrasil.ultimaTotalizacao !== novidade.totalizacao) novidade = { totalizacao: doBrasil.ultimaTotalizacao, vista: relogio.agora() };

    // A hora da rodada é a da publicação: é ela que a página compara com o `Date` da CDN.
    const noAr = projecaoNoAr(d);
    const peso = comPesquisasNoAr() ? (noAr?.pesoDasPesquisas ?? null) : null;
    await gravarSeMudou("rodada.json", arquivoDeRodada(relogio.agora(), fase(d), novidade, candidatos, controle, peso, narracao.doBrasil()));
    const gravacoes: (() => Promise<void>)[] = [];
    for (const a of d.acompanhados) {
      if (a.id === null || !sujos.has(a.id)) continue;
      const resultado = resultados.get(a.url)!;
      const curva = curvas.get(a.id) ?? [];
      const ponto = pontoDaCurvaReal(resultado, ordem);
      if (resultado.secoes.totalizadas > 0 && JSON.stringify(ponto) !== JSON.stringify(curva.at(-1))) curva.push(ponto);
      curvas.set(a.id, curva);
      // No plano zero (o núcleo mínimo desligado), nenhum dado ao vivo vai ao ar: o lugar fica sujo e a curva segue
      // andando por dentro, para o bloco voltar inteiro quando a chave religar.
      if (!controle.chaves.nucleoMinimo) continue;
      const id = a.id;
      const arquivo = arquivoDoLugar(a.id, resultado, ordem, curva, narracao.doLugar(a.id), noAr?.doLugar(a.id, controle.chaves.baseComPesquisas));
      gravacoes.push(async () => {
        if (await gravarSeMudou(`lugares/${id}.json`, arquivo)) sujos.delete(id);
      });
    }
    // A tabela de projeções de cada UF e do Exterior e o mapa.json são montados a cada rodada, e só os bytes que mudam vão
    // ao destino. Sem a projeção no ar, a tabela vai vazia. Os municípios da tabela, com as comparações, não mudam na
    // noite: com a projeção no ar, são gravados uma vez. No plano zero, nada disso.
    if (controle.chaves.nucleoMinimo) {
      const comPesquisas = controle.chaves.baseComPesquisas;
      for (const uf of d.ufs) {
        const projecao = noAr?.dosMunicipios(uf, comPesquisas);
        const tabela: TabelaDeProjecoes = { uf, ...(projecao ? { projecao } : {}) };
        gravacoes.push(async () => void (await gravarSeMudou(`tabelas/${uf}.json`, tabela)));
        const municipios = noAr?.municipiosDaTabela(uf);
        if (municipios) gravacoes.push(async () => void (await gravarSeMudou(`tabelas/${uf}-municipios.json`, municipios)));
      }
      const mapa = arquivoDoMapa(
        doMapa.assinatura,
        d.doMapa.map((a) => a && resultados.get(a.url)),
        ordem,
        noAr && projecaoDasUfs(d, noAr, comPesquisas),
      );
      gravacoes.push(async () => void (await gravarSeMudou("mapa.json", mapa)));
    }
    await emParalelo(gravacoes, GRAVACOES_EM_VOO);
  }

  /** A projeção de cada UF e do Exterior, para o mapa.json: só o resultado final estimado, nas bases no ar. */
  function projecaoDasUfs(d: Divulgacao, noAr: ProjecaoDaRodada, comPesquisas: boolean): ArquivoDoMapa["projecao"] {
    const naBase = (qual: "soApuracao" | "comPesquisas") =>
      Object.fromEntries(
        d.ufs.flatMap((uf) => {
          const p = noAr.doLugar(uf, comPesquisas)?.[qual];
          return p ? [[uf, p.projecao]] : [];
        }),
      );
    return { soApuracao: naBase("soApuracao"), ...(comPesquisas ? { comPesquisas: naBase("comPesquisas") } : {}) };
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
   * não tem nada do que o principal tem: os hashes são esquecidos, e todo lugar com resultado é gravado de novo nesta
   * mesma rodada, para a primeira versão do Worker já sair com todos os arquivos.
   */
  function passarAoPlanoB(d: Divulgacao | undefined) {
    if (!controle.planoB || destino === opcoes.planoB) return;
    if (!opcoes.planoB) {
      registro.falhas.push("plano B: o coletor roda sem destino de plano B");
      return;
    }
    destino = opcoes.planoB;
    hashes.clear();
    for (const a of d?.acompanhados ?? []) if (a.id !== null && resultados.has(a.url)) sujos.add(a.id);
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
    };
    // Um erro que escapou vira falha da rodada: o coletor nunca cai por um arquivo, e a rodada seguinte tenta de novo.
    try {
      await lerControleDaRodada();
      divulgacao ??= await configurar();
      passarAoPlanoB(divulgacao);
      if (divulgacao) {
        await lerIndices(divulgacao);
        await baixarResultados(divulgacao);
        projetar(divulgacao);
        narrar(divulgacao);
        await publicar(divulgacao);
        if (brasil(divulgacao)) registro.fase = fase(divulgacao);
      }
      registro.falhas.push(...((await destino.fimDaRodada?.()) ?? []));
    } catch (erro) {
      registro.falhas.push(`rodada: ${(erro as Error).message}`);
    }
    registro.destinoAtivo = destino === opcoes.planoB ? "plano B" : "principal";
    registro.gravacoesDoMes = opcoes.contador?.doMes() ?? null;
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
        if (ate()) return;
        proxima = relogio.agora() + intervalo;
        // Fora do `aoRodar?.(...)`: sem ele, o encadeamento opcional pularia a rodada.
        const registro = await rodada();
        aoRodar?.(registro);
      }
    },
    resultado: (abrangencia) => (divulgacao ? resultados.get(divulgacao.urls.resultado(abrangencia)) : undefined),
  };
}
