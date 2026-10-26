import {
  criarColetor,
  lerEstadoGuardado,
  relogioSemEspera,
  type ArquivoDoLugar,
  type Buscar,
  type ConexaoDoComputador,
  type Controle,
  type EventoDaNarracao,
  type OpcoesDoColetor,
  type RegistroDaRodada,
} from "@apurador/coletor";
import { buscarNoTseFalso, criarTseFalso, relogioDoReplay } from "../src/index.ts";
import { cadastro, instante, lugaresDoSite, noite, projecaoDe2022 } from "./noite-2022.ts";

// A noite com quedas: o coletor da noite de 2022 é derrubado em rodadas escolhidas e volta, como pelo supervisor,
// retomando do estado em disco ou, sem disco, do último objeto da noite. Como no ensaio geral, o relógio do coletor
// anda em 2026 e o do TSE falso na noite de 2022: o estado guarda horas dos dois. Os testes ficam em `retomada*.test.ts`,
// um arquivo por trecho da noite: cada noite guarda os objetos de todas as rodadas, e juntas num processo só elas
// passavam da memória do vitest.

const BASE = "http://tse-falso.local/oficial";
/** Uma data e hora de Brasília, `AAAA-MM-DD HH:MM:SS`, em milissegundos. */
export const ms = (dataHora: string) => Date.parse(`${dataHora.replace(" ", "T")}-03:00`);
/** O relógio do coletor quando a noite começa, como no ensaio geral de 2026. */
const COLETOR_NO_INICIO = ms("2026-10-25 19:00:00");
/** O instante do relógio do coletor de uma hora da noite de 2022, numa noite que começa em `de`. */
export const noColetor = (de: string, dataHora: string) => COLETOR_NO_INICIO + ms(dataHora) - ms(de);

/** Uma gravação no destino da noite com quedas: o arquivo ao vivo, o conteúdo lido de volta e quando. */
export interface Gravacao {
  caminho: string;
  conteudo: unknown;
  /** O relógio do coletor, em ms. */
  quando: number;
}

/** Uma queda: o coletor cai depois da última rodada antes de `em` (hora da noite) e volta `fora` segundos depois da seguinte. */
interface Queda {
  em: string;
  de: "disco" | "objeto da noite";
  fora?: number;
}

/** O que mais acontece na noite com quedas, pelo relógio do coletor: os comandos do dono, o TSE falso respondendo 403 e a conexão. */
interface OpcoesDaNoiteComQuedas {
  /** O arquivo de controle, lido no começo de cada rodada. */
  controle?: (quando: number) => Controle;
  /** O TSE falso responde 403 a todos por `segundos`, a partir do primeiro pedido feito em `em` (hora da noite) ou depois. */
  bloquearOTse?: { em: string; segundos: number };
  conexao?: (quando: number) => ConexaoDoComputador;
}

/** A noite de `de` a `ate` (horas da noite de 2022), com as quedas e as opções. */
export async function noiteComQuedas(de: string, ate: string, quedas: Queda[] = [], opcoes: OpcoesDaNoiteComQuedas = {}) {
  const { controle } = opcoes;
  const relogio = relogioSemEspera(COLETOR_NO_INICIO);
  const tse = criarTseFalso({ noite, cadastro, relogio: relogioDoReplay(instante(de), relogio.agora) });
  const doTse = buscarNoTseFalso(tse);
  let bloquear = opcoes.bloquearOTse;
  const buscar: Buscar = async (url, init) => {
    if (bloquear && relogio.agora() >= noColetor(de, bloquear.em)) {
      tse.bloquear(bloquear.segundos);
      bloquear = undefined;
    }
    return doTse(url, init);
  };
  const lerConexao = opcoes.conexao;
  const gravacoes: Gravacao[] = [];
  /** O objeto da noite de cada rodada, com quantas gravações tinham sido feitas até ele. */
  const objetos: { json: string; numero: number; gravacoes: number }[] = [];
  let disco: string | undefined;
  const rodadas: RegistroDaRodada[] = [];
  /** Onde cada retomada começa: a primeira gravação e a primeira rodada depois da volta. */
  const voltas: { gravacao: number; rodada: number }[] = [];
  let retomada: OpcoesDoColetor["retomada"];
  for (const [i, ateAQueda] of [...quedas.map((q) => q.em), ate].entries()) {
    const coletor = criarColetor({
      base: BASE,
      eleicao: "6258",
      lugares: lugaresDoSite,
      relogio,
      buscar,
      projecao: projecaoDe2022,
      destino: {
        async gravar(caminho, bytes) {
          gravacoes.push({ caminho, conteudo: JSON.parse(new TextDecoder().decode(bytes)), quando: relogio.agora() });
        },
      },
      retomada,
      ...(controle && { controle: async () => controle(relogio.agora()) }),
      ...(lerConexao && { conexao: () => lerConexao(relogio.agora()) }),
      guardar: {
        async objetoDaNoite(json, { numero }) {
          objetos.push({ json, numero, gravacoes: gravacoes.length });
        },
        async disco(json) {
          disco = json;
        },
      },
    });
    await coletor.rodar({ ate: () => relogio.agora() >= noColetor(de, ateAQueda), aoRodar: (r) => rodadas.push(r) });
    const queda = quedas[i];
    if (!queda) break;
    await relogio.esperar((queda.fora ?? 0) * 1000);
    retomada = { partida: queda.de, guardado: lerEstadoGuardado(queda.de === "disco" ? disco! : objetos.at(-1)!.json) };
    voltas.push({ gravacao: gravacoes.length, rodada: rodadas.length });
  }
  const lugares = (de = 0, ate = gravacoes.length) =>
    gravacoes.slice(de, ate).filter((g) => g.caminho.startsWith("lugares/")) as (Gravacao & { conteudo: ArquivoDoLugar })[];
  /** O último JSON publicado de um lugar até a gravação `ate`. */
  const publicado = (id: string, ate = gravacoes.length) => lugares(0, ate).findLast((g) => g.caminho === `lugares/${id}.json`)?.conteudo;
  /** As gravações da rodada de número dado, entre o objeto da noite da anterior e o dela. */
  const daRodada = (numero: number) => {
    const i = objetos.findIndex((o) => o.numero === numero);
    return gravacoes.slice(i === 0 ? 0 : objetos[i - 1]!.gravacoes, objetos[i]!.gravacoes);
  };
  return { gravacoes, objetos, rodadas, voltas, lugares, publicado, daRodada, noColetor: (dataHora: string) => noColetor(de, dataHora) };
}

/** O que a noite com quedas dá: as gravações, os objetos da noite, as rodadas, as voltas e as leituras delas. */
export type NoiteComQuedas = Awaited<ReturnType<typeof noiteComQuedas>>;

/** Os arquivos do TSE que chegaram nas rodadas: os que vão para os objetos da noite. */
export const chegaram = (rodadas: RegistroDaRodada[]) =>
  rodadas.reduce((soma, x) => soma + x.baixados.brasil + x.baixados.ufs + x.baixados.municipios + x.baixados.zonas, 0);

/** Os lugares que o TSE falso de 2022 tem: o Brasil, as UFs, o Exterior e os municípios do cadastro. */
export const LUGARES_DO_TSE = 1 + cadastro.ufs.reduce((soma, uf) => soma + 1 + uf.municipios.length, 0);
/**
 * Os arquivos ao vivo: os lugares, as 28 tabelas de projeções e os municípios delas, o mapa.json, o arquivo do simulador
 * e o arquivo de rodada.
 */
export const ARQUIVOS_AO_VIVO = LUGARES_DO_TSE + 2 * cadastro.ufs.length + 3;

/** Os eventos de um lugar numa narração. */
export const eventosDoLugar = (id: string, eventos: EventoDaNarracao[]) => eventos.filter((e) => e.lugar === id);

/**
 * O que a retomada não pode fazer com a narração de nenhum lugar, em nenhuma gravação: perder um evento já publicado,
 * repetir um evento (um marco, o começo, o fim) ou publicar um evento com hora mais velha que um já publicado. Só a
 * virada aberta muda de texto, quando outra troca entra na janela dela.
 */
export function conferirNarracao(r: NoiteComQuedas): string[] {
  const problemas: string[] = [];
  const antes = new Map<string, EventoDaNarracao[]>();
  for (const g of r.lugares()) {
    const id = g.conteudo.lugar;
    const eventos = eventosDoLugar(id, g.conteudo.narracao).sort((a, b) => a.numero! - b.numero!);
    const anteriores = antes.get(id) ?? [];
    for (const e of anteriores) {
      const agora = eventos.find((x) => x.numero === e.numero);
      if (!agora || agora.tipo !== e.tipo || agora.quando !== e.quando || (e.tipo !== "virada" && agora.texto !== e.texto))
        problemas.push(`${id}: o evento ${e.numero} (${e.tipo} ${e.quando}) mudou ou sumiu às ${new Date(g.quando).toISOString()}`);
    }
    const vistos = new Set<string>();
    eventos.forEach((e, i) => {
      if (e.numero !== i + 1) problemas.push(`${id}: o evento ${i + 1} tem o número ${e.numero}`);
      const chave = `${e.tipo} ${e.marco ?? ""}`;
      if (e.tipo !== "virada" && vistos.has(chave)) problemas.push(`${id}: ${chave} repetido`);
      vistos.add(chave);
      if (i > 0 && e.quando < eventos[i - 1]!.quando) problemas.push(`${id}: ${e.tipo} ${e.quando} depois de um evento das ${eventos[i - 1]!.quando}`);
    });
    antes.set(id, eventos);
  }
  return problemas;
}
