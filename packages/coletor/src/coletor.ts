import { createHash } from "node:crypto";
import {
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
import { arquivoDaRodada, arquivoDoLugar, emOrdem, pontoDaCurva, type Fase, type PontoDaCurva } from "./arquivos.ts";
import type { Destino } from "./destino.ts";
import type { RelogioDoColetor } from "./relogio.ts";

// O coletor da noite. A cada rodada ele lê os índices do TSE (`-ab.json` do Brasil e de cada UF), baixa o
// resultado de cada lugar cuja última totalização no índice é mais nova que a que ele tem, e publica o que mudou.
// As URLs saem da configuração de municípios e zonas, e nada da eleição (candidatos, municípios) fica no código.
//
// O TSE guarda cada arquivo ~60 s no CDN: um mesmo arquivo de resultado é pedido no máximo uma vez por minuto,
// sempre com ETag. Os índices são lidos a cada rodada (~30 pedidos). Todo pedido passa por uma fila com ritmo
// fixo, bem abaixo do limite de 100 por segundo por IP (404 e 304 contam).

export type Buscar = (url: string, init?: RequestInit) => Promise<Response>;

export interface OpcoesDoColetor {
  /** A base do ambiente: `https://resultados.tse.jus.br/oficial`, ou a do TSE falso. */
  base: string;
  /** O código da eleição (`6258`, o 2º turno de 2026). */
  eleicao: string;
  buscar: Buscar;
  relogio: RelogioDoColetor;
  destino: Destino;
  /** O ritmo dos pedidos ao TSE. Padrão: 50 por segundo, metade do limite. */
  pedidosPorSegundo?: number;
  /** Segundos do começo de uma rodada ao da seguinte. Padrão: 20. */
  intervalo?: number;
}

export interface RegistroDaRodada {
  numero: number;
  /** ISO, pelo relógio do coletor. */
  inicio: string;
  /** Milissegundos, pelo relógio do coletor. */
  duracao: number;
  fase: Fase | null;
  pedidos: number;
  /** Quantas respostas de cada status HTTP. */
  respostas: Record<number, number>;
  /** Os resultados novos baixados na rodada. */
  baixados: { brasil: number; ufs: number; municipios: number; zonas: number };
  gravacoes: number;
  falhas: string[];
}

export interface Coletor {
  rodada(): Promise<RegistroDaRodada>;
  /** Roda uma rodada a cada intervalo, até `ate()` dar verdadeiro. */
  rodar(opcoes: { ate: () => boolean; aoRodar?: (registro: RegistroDaRodada) => void }): Promise<void>;
  /** O último resultado bom de um lugar ou zona, como o TSE o publicou. */
  resultado(abrangencia: AbrangenciaDaDivulgacao): ResultadoDoTse | undefined;
}

/** Um lugar publicado (Brasil, UF, Exterior, município) ou uma zona, que o coletor só guarda. */
interface Recorte {
  /** O id do lugar no site; as zonas não têm. */
  id: string | null;
  tipo: "brasil" | "uf" | "municipio" | "zona";
  abrangencia: AbrangenciaDaDivulgacao;
  url: string;
  /** Onde a última totalização do lugar aparece nos índices. */
  chaveNoIndice: string | null;
  /** No município com mais de uma zona, as zonas. */
  zonas: Recorte[];
}

const UM_MINUTO = 60_000;
/** O TSE responde em 0,3 a 0,5 s: a 50 pedidos por segundo, ficam ~25 em voo. */
const MAXIMO_EM_VOO = 40;
/**
 * Quantos pedidos atrasados a fila recupera de uma vez. O timer do Windows acorda ~20% atrasado (50 ms viram
 * ~60 ms), e sem recuperar o atraso o ritmo cai; com a folga pequena, nunca há rajada: num segundo qualquer, no
 * máximo o ritmo mais 5 pedidos.
 */
const FOLGA_DA_FILA = 5;

export function criarColetor(opcoes: OpcoesDoColetor): Coletor {
  const { base, buscar, relogio, destino } = opcoes;
  const pedidosPorSegundo = opcoes.pedidosPorSegundo ?? 50;
  const intervalo = (opcoes.intervalo ?? 20) * 1000;

  // A configuração da eleição, lida na primeira rodada.
  let eleicao: EleicaoDaDivulgacao | undefined;
  let urls: ReturnType<typeof urlsDaDivulgacao> | undefined;
  let recortes: Recorte[] = [];
  const porUrl = new Map<string, Recorte>();

  // O que o coletor sabe do TSE.
  const etags = new Map<string, string>();
  const pedidoEm = new Map<string, number>();
  const resultados = new Map<string, ResultadoDoTse>();
  const indices = new Map<string, AcompanhamentoDoTse>();
  /** A última totalização de cada lugar nos índices, pela chave do recorte. */
  const horasNosIndices = new Map<string, string | null>();
  /** As zonas a pedir de novo porque o município mudou. */
  const zonasPendentes = new Set<string>();
  /** A maior hora do cabeçalho `Date` do TSE, em ms: o relógio da fonte, que muda a fase. */
  let horaDoTse = -Infinity;

  // O que o coletor publicou.
  const hashes = new Map<string, string>();
  const curvas = new Map<string, PontoDaCurva[]>();
  /** Os lugares cujo resultado mudou e ainda não foram gravados. */
  const sujos = new Set<string>();
  let novidade: { totalizacao: string | null; vista: number | null } = { totalizacao: null, vista: null };
  let numero = 0;

  // A fila dos pedidos, com o ritmo fixo.
  const espaco = 1000 / pedidosPorSegundo;
  let proximoPedido = -Infinity;
  async function vez() {
    const agora = relogio.agora();
    proximoPedido = Math.max(proximoPedido, agora - FOLGA_DA_FILA * espaco);
    if (proximoPedido > agora) await relogio.esperar(proximoPedido - agora);
    proximoPedido += espaco;
  }
  async function emFila<T>(itens: T[], pedir: (item: T) => Promise<void>) {
    const emVoo = new Set<Promise<void>>();
    for (const item of itens) {
      await vez();
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
    await vez();
    const r = await pedirELer(url, ler);
    return r?.status === 200 ? r.lido : null;
  }

  async function configurar(): Promise<boolean> {
    eleicao = (await primeiraLeitura(urlDasEleicoes(base), (bytes) => eleicaoDaConfiguracao(bytes, opcoes.eleicao))) ?? undefined;
    if (!eleicao) return false;
    const u = urlsDaDivulgacao(base, eleicao);
    const configuracao = await primeiraLeitura(u.municipios, lerConfiguracaoDeMunicipios);
    if (configuracao === null) return false;
    urls = u;

    const recorte = (r: Omit<Recorte, "url" | "zonas">, zonas: Recorte[] = []): Recorte => ({ ...r, url: u.resultado(r.abrangencia), zonas });
    recortes = [recorte({ id: "BR", tipo: "brasil", abrangencia: {}, chaveNoIndice: "br" })];
    for (const uf of configuracao.ufs) {
      recortes.push(recorte({ id: uf.sigla, tipo: "uf", abrangencia: { uf: uf.sigla }, chaveNoIndice: `uf/${uf.sigla.toLowerCase()}` }));
      for (const m of uf.municipios) {
        const codigo = String(m.codigo).padStart(5, "0");
        const zonas =
          m.zonas.length > 1 ? m.zonas.map((zona) => recorte({ id: null, tipo: "zona", abrangencia: { uf: uf.sigla, municipio: m.codigo, zona }, chaveNoIndice: null })) : [];
        recortes.push(recorte({ id: codigo, tipo: "municipio", abrangencia: { uf: uf.sigla, municipio: m.codigo }, chaveNoIndice: `mu/${codigo}` }, zonas));
      }
    }
    for (const r of recortes) for (const x of [r, ...r.zonas]) porUrl.set(x.url, x);
    return true;
  }

  async function lerIndices() {
    const u = urls!;
    const ufs = recortes.filter((r) => r.tipo === "uf").map((r) => r.abrangencia.uf!);
    await emFila([null, ...ufs], async (uf) => {
      const url = u.acompanhamento(uf);
      const indice = await pedirELer(url, lerAcompanhamento);
      if (indice?.status === 200) indices.set(url, indice.lido);
    });
    horasNosIndices.clear();
    for (const indice of indices.values())
      for (const item of indice.itens) {
        const { tipo, codigo } = item.abrangencia;
        horasNosIndices.set(tipo === "br" ? "br" : `${tipo}/${codigo}`, item.ultimaTotalizacao);
      }
  }

  /** Se o resultado que o coletor tem de um recorte está atrás do TSE. */
  function atrasado(r: Recorte, final: boolean): boolean {
    const tido = resultados.get(r.url);
    if (!tido) return true;
    if (final && !tido.totalizacaoFinal) return true;
    const noIndice = r.chaveNoIndice === null ? null : (horasNosIndices.get(r.chaveNoIndice) ?? null);
    return noIndice !== null && (tido.ultimaTotalizacao === null || noIndice > tido.ultimaTotalizacao);
  }

  /** A hora em que o lugar mudou no índice, para baixar primeiro o que mudou há mais tempo. */
  const horaNoIndice = (r: Recorte) => (r.chaveNoIndice === null ? null : (horasNosIndices.get(r.chaveNoIndice) ?? null));

  /**
   * Baixa os resultados atrasados, no máximo o que cabe no intervalo da rodada no ritmo dos pedidos: o resto fica
   * para a rodada seguinte, e a rodada não passa de ~20 s nem na partida a frio nem na varredura do fim.
   */
  async function baixarResultados() {
    const final = resultados.get(urls!.resultado({}))?.totalizacaoFinal ?? false;
    const agora = relogio.agora();
    const podePedir = (url: string) => agora - (pedidoEm.get(url) ?? -Infinity) >= UM_MINUTO;
    const atrasados: Recorte[] = [];
    for (const r of recortes) {
      if (atrasado(r, final)) {
        for (const z of r.zonas) zonasPendentes.add(z.url);
        if (podePedir(r.url)) atrasados.push(r);
      }
      for (const z of r.zonas) if ((zonasPendentes.has(z.url) || atrasado(z, final)) && podePedir(z.url)) atrasados.push(z);
    }
    const ORDEM = { brasil: 0, uf: 1, municipio: 2, zona: 3 };
    atrasados.sort((a, b) => ORDEM[a.tipo] - ORDEM[b.tipo] || (horaNoIndice(a) ?? "").localeCompare(horaNoIndice(b) ?? ""));
    const vagas = Math.max(10, Math.floor((pedidosPorSegundo * intervalo) / 1000) - registro.pedidos);

    await emFila(atrasados.slice(0, vagas), async (r) => {
      const resposta = await pedirELer(r.url, lerResultado);
      if (r.tipo === "zona" && resposta !== null) zonasPendentes.delete(r.url);
      if (resposta?.status !== 200) return;
      resultados.set(r.url, resposta.lido);
      registro.baixados[({ brasil: "brasil", uf: "ufs", municipio: "municipios", zona: "zonas" } as const)[r.tipo]]++;
      if (r.id !== null) sujos.add(r.id);
    });
  }

  function fase(): Fase {
    if (resultados.get(urls!.resultado({}))?.totalizacaoFinal) return "encerrada";
    return horaDoTse >= Date.parse(`${eleicao!.dia}T17:00:00-03:00`) ? "ao-vivo" : "antes-das-17h";
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

  async function publicar() {
    const brasil = resultados.get(urls!.resultado({}));
    if (!brasil) return;
    const candidatos = emOrdem(brasil.candidatos);
    const ordem = candidatos.map((c) => c.numero);
    if (brasil.ultimaTotalizacao !== novidade.totalizacao) novidade = { totalizacao: brasil.ultimaTotalizacao, vista: relogio.agora() };

    // A hora da rodada é a da publicação: é ela que a página compara com o `Date` da CDN.
    await gravarSeMudou("rodada.json", arquivoDaRodada(relogio.agora(), fase(), novidade, candidatos));
    for (const r of recortes) {
      if (r.id === null || !sujos.has(r.id)) continue;
      const resultado = resultados.get(r.url)!;
      const curva = curvas.get(r.id) ?? [];
      const ponto = pontoDaCurva(resultado, ordem);
      if (resultado.secoes.totalizadas > 0 && JSON.stringify(ponto) !== JSON.stringify(curva.at(-1))) curva.push(ponto);
      curvas.set(r.id, curva);
      if (await gravarSeMudou(`lugares/${r.id}.json`, arquivoDoLugar(r.id, resultado, ordem, curva))) sujos.delete(r.id);
    }
  }

  async function rodada(): Promise<RegistroDaRodada> {
    const inicio = relogio.agora();
    registro = {
      numero: ++numero,
      inicio: new Date(inicio).toISOString(),
      duracao: 0,
      fase: null,
      pedidos: 0,
      respostas: {},
      baixados: { brasil: 0, ufs: 0, municipios: 0, zonas: 0 },
      gravacoes: 0,
      falhas: [],
    };
    if (urls || (await configurar())) {
      await lerIndices();
      await baixarResultados();
      await publicar();
      registro.fase = resultados.has(urls!.resultado({})) ? fase() : null;
    }
    registro.duracao = relogio.agora() - inicio;
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
    resultado: (abrangencia) => (urls ? resultados.get(urls.resultado(abrangencia)) : undefined),
  };
}
