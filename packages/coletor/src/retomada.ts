import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { lerResultado, type AbrangenciaDaDivulgacao, type ResultadoDoTse } from "@apurador/tse";
import { emOrdem, type PontoDaCurvaReal } from "./arquivos.ts";
import type { Controle } from "./chaves.ts";
import type { GravacoesDoMes } from "./contador.ts";
import type { EstadoDaNarracao } from "./narracao.ts";
import { criarProjecaoDaNoite, type EntradaDaProjecao, type ProjecaoDaRodada } from "./projecao.ts";

// A retomada (Operação na noite, decisões 4 e 15; Volume de gravações na noite, decisão 3; Narração da noite, decisão
// 11). A cada rodada, o coletor guarda o estado de retomada (a narração, os hashes, as curvas, as chaves e o contador de
// gravações) em dois lugares: no disco, com todos os arquivos do TSE que tem, e no objeto da noite, no R2, com os que
// chegaram na rodada. Derrubado, ele volta pelo supervisor e retoma do disco sem pedir nada de novo ao TSE; sem disco,
// numa outra máquina, retoma do último objeto da noite e baixa de novo o que falta. Sem estado nenhum, parte a frio e
// regrava tudo uma vez. Um estado de outra noite (mais de 6 h, como a pasta do plano B) ou de outra eleição não serve.
//
// Os objetos da noite, em ordem, são também a noite inteira: os arquivos do TSE de cada rodada, de que a projeção é
// uma função. Rodar o modelo de novo sobre eles (`reproduzirAProjecao`) dá os números publicados.

const RAIZ = new URL("../../../", import.meta.url);

/** O arquivo do estado em disco de cada destino, ao lado do arquivo de controle: o ensaio nunca retoma da pasta local. */
export const arquivoDoEstado = (destino: string) => fileURLToPath(new URL(`.cache/coletor/estado-${destino}.json`, RAIZ));

/** Um estado mais velho que isso é de outra noite (um ensaio, o 24/10), e a pasta do plano B também (`plano-b.ts`). */
export const OUTRA_NOITE = 6 * 3_600_000;

/** Um arquivo de resultado do TSE como chegou, com a ETag e o lugar dele. */
export interface ArquivoDoTseGuardado {
  abrangencia: AbrangenciaDaDivulgacao;
  etag: string | null;
  /** Os bytes, em texto: o TSE grava JSON em UTF-8. */
  corpo: string;
}

/** O que o coletor guarda para continuar a noite sem repetir nem inventar nada, fora os arquivos do TSE. */
export interface EstadoDeRetomada {
  versao: 1;
  /** O código da eleição: o estado de outra eleição não serve. */
  eleicao: string;
  /** A rodada que o guardou. */
  numero: number;
  /** Quando ela o guardou, ISO, pelo relógio do coletor. */
  quando: string;
  narracao: EstadoDaNarracao;
  /** O hash de cada arquivo publicado, pelo caminho: com eles, a retomada não regrava o que não mudou. */
  hashes: Record<string, string>;
  /** A curva real publicada de cada lugar. */
  curvas: Record<string, PontoDaCurvaReal[]>;
  /** Os lugares que mudaram e ainda não foram gravados: os do plano zero, os de uma gravação que falhou. */
  sujos: string[];
  /** O controle da rodada, com as chaves. */
  controle: Controle;
  /** As gravações do mês nos buckets, ou `null` sem contador. */
  gravacoesDoMes: GravacoesDoMes | null;
  /** A última totalização do Brasil (`AAAA-MM-DD HH:MM:SS`, em Brasília) e quando o coletor a viu (ms do relógio do coletor). */
  novidade: { totalizacao: string | null; vista: number | null };
  /** A maior hora do cabeçalho `Date` do TSE, em ms, que muda a fase. */
  horaDoTse: number | null;
  /** As zonas a pedir de novo, pela URL, com a hora (ms do relógio do coletor) em que o município mudou. */
  zonasPendentes: Record<string, number>;
  /** A hora do índice (`AAAA-MM-DD HH:MM:SS`, em Brasília) com que cada município marcou as zonas dele, pela URL dele. */
  zonasMarcadas: Record<string, string | null>;
  /** Os arquivos pedidos ao TSE no último minuto, pela URL, com a hora do pedido em ms: a retomada não os pede de novo antes do minuto. */
  pedidosRecentes: Record<string, number>;
}

/** De onde o coletor partiu. */
export type Partida = "a frio" | "disco" | "objeto da noite";

/** O estado em disco e o objeto da noite: o estado de retomada e arquivos do TSE. */
export interface EstadoGuardado {
  estado: EstadoDeRetomada;
  /** No disco, todos os que o coletor tem; no objeto da noite, os que chegaram na rodada. */
  arquivos: ArquivoDoTseGuardado[];
  /** No objeto da primeira rodada de um coletor, de onde ele partiu: a reprodução refaz os resultados como ele. */
  partida?: Partida;
  /** No disco, os arquivos que ainda não foram para um objeto da noite, porque a gravação dele falhou. */
  pendentes?: ArquivoDoTseGuardado[];
  /** No disco, os dois arquivos de configuração do TSE (a eleição e os municípios), em texto: a retomada não os pede de novo. */
  configuracao?: { eleicoes: string; municipios: string };
}

/** A rodada que guardou um estado: o número e a hora (ISO, pelo relógio do coletor), que dão o nome do objeto da noite. */
export type RodadaGuardada = Pick<EstadoDeRetomada, "numero" | "quando">;

/** Onde ficam os objetos da noite (`objetosDaNoiteNoR2`). */
export interface ObjetosDaNoite {
  /** Grava, comprimido com gzip, o objeto da noite de uma rodada (`EstadoGuardado` em JSON). Rejeita se falhar. */
  gravar(json: string, rodada: RodadaGuardada): Promise<void>;
  /** O último objeto da noite gravado desde `desde` (ms, pelo relógio do coletor), ou `null`. */
  ultimo(desde: number): Promise<EstadoGuardado | null>;
}

/** A hora no nome de um objeto da noite: ISO, sem os dois-pontos que o Windows não aceita. A ordem dos nomes é a das horas. */
const horaNoNome = (quando: string) => quando.replace(/:/g, "-");

/** O nome do objeto da noite de uma rodada: a hora e o número dela. */
export const nomeDoObjetoDaNoite = (rodada: RodadaGuardada) => `${horaNoNome(rodada.quando)}-r${String(rodada.numero).padStart(5, "0")}.json.gz`;

/** O nome antes do qual ficam os objetos da noite gravados antes de `desde` (ms). */
export const antesDosObjetos = (desde: number) => horaNoNome(new Date(desde).toISOString());

/** O estado guardado em JSON, com o estado já serializado: o do disco e o do objeto da noite levam o mesmo. */
export function estadoGuardadoEmJson(
  estado: string,
  arquivos: ArquivoDoTseGuardado[],
  extra: Pick<EstadoGuardado, "partida" | "pendentes" | "configuracao"> = {},
): string {
  const opcionais = [
    extra.partida && `"partida":${JSON.stringify(extra.partida)}`,
    extra.pendentes?.length && `"pendentes":${JSON.stringify(extra.pendentes)}`,
    extra.configuracao && `"configuracao":${JSON.stringify(extra.configuracao)}`,
  ].filter(Boolean);
  return `{"estado":${estado},"arquivos":${JSON.stringify(arquivos)}${opcionais.map((o) => `,${o}`).join("")}}`;
}

/** Lê um objeto da noite, comprimido com gzip. */
export const lerObjetoDaNoite = (bytes: Uint8Array) => lerEstadoGuardado(gunzipSync(bytes).toString("utf8"));

/** Lê um estado guardado em JSON. Um estado de outra versão não serve. */
export function lerEstadoGuardado(texto: string): EstadoGuardado {
  const guardado = JSON.parse(texto) as EstadoGuardado;
  if (guardado?.estado?.versao !== 1 || !Array.isArray(guardado.arquivos)) throw new Error("O estado guardado não é da versão 1");
  return guardado;
}

/** O estado em disco, ou `null` se não há arquivo. */
export async function lerEstadoDoDisco(caminho: string): Promise<EstadoGuardado | null> {
  let texto: string;
  try {
    texto = await readFile(caminho, "utf8");
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw erro;
  }
  return lerEstadoGuardado(texto);
}

/**
 * Grava o estado em disco inteiro de uma vez, num arquivo ao lado depois renomeado: uma queda no meio deixa o anterior.
 * Se o Windows segurar o arquivo (um antivírus lendo), grava por cima.
 */
export async function gravarEstadoNoDisco(caminho: string, json: string): Promise<void> {
  await mkdir(dirname(caminho), { recursive: true });
  const provisorio = `${caminho}.tmp`;
  await writeFile(provisorio, json);
  await rename(provisorio, caminho).catch(() => writeFile(caminho, json));
}

/** A chave de um lugar ou zona, nos arquivos do TSE guardados. */
const chaveDaAbrangencia = ({ uf, municipio, zona }: AbrangenciaDaDivulgacao) => `${uf ?? "br"}/${municipio ?? ""}/${zona ?? ""}`;

/** De onde o coletor retoma: a partida e o estado, sem estado na partida a frio. */
export type Retomada = { partida: "a frio"; guardado: null } | { partida: Exclude<Partida, "a frio">; guardado: EstadoGuardado };

/**
 * De onde o coletor retoma: do estado mais novo entre o do disco e o do último objeto da noite, desde que seja desta
 * eleição e desta noite. No empate, do disco, que tem todos os arquivos do TSE. O objeto da noite é gravado antes do
 * disco, então o coletor que cai entre os dois deixa o objeto uma rodada à frente: aí valem o estado do objeto e os
 * arquivos do disco, com os da rodada do objeto por cima, que são todos os que o coletor tinha. Mais à frente que isso,
 * outra máquina seguiu a noite, e vale o objeto. Sem nenhum, parte a frio.
 */
export function escolherRetomada(opcoes: {
  disco: EstadoGuardado | null;
  objetoDaNoite: EstadoGuardado | null;
  eleicao: string;
  /** A hora em ms, pelo relógio do coletor. */
  agora: number;
}): Retomada {
  const serve = (g: EstadoGuardado | null) => g !== null && g.estado.eleicao === opcoes.eleicao && opcoes.agora - Date.parse(g.estado.quando) < OUTRA_NOITE;
  const disco = serve(opcoes.disco) ? opcoes.disco : null;
  const objeto = serve(opcoes.objetoDaNoite) ? opcoes.objetoDaNoite : null;
  if (objeto && disco && objeto.estado.numero === disco.estado.numero + 1 && Date.parse(objeto.estado.quando) > Date.parse(disco.estado.quando)) {
    const arquivos = new Map([...disco.arquivos, ...objeto.arquivos].map((a) => [chaveDaAbrangencia(a.abrangencia), a]));
    return { partida: "disco", guardado: { estado: objeto.estado, arquivos: [...arquivos.values()], configuracao: disco.configuracao } };
  }
  if (objeto && (!disco || Date.parse(objeto.estado.quando) > Date.parse(disco.estado.quando))) return { partida: "objeto da noite", guardado: objeto };
  if (disco) return { partida: "disco", guardado: disco };
  return { partida: "a frio", guardado: null };
}

/**
 * Roda o modelo de novo sobre os objetos da noite, em ordem, e dá a projeção de cada rodada, como o coletor a calculou:
 * com os mesmos arquivos do TSE, a mesma função dá os mesmos números. Os resultados seguem os do coletor: a partida a
 * frio começa sem nenhum, e a retomada do objeto da noite, só com os do objeto de que ela retomou. A projeção de uma
 * rodada sem arquivo novo é a da anterior; `undefined` antes da primeira, ou enquanto faltam municípios.
 */
export function* reproduzirAProjecao(
  objetos: Iterable<EstadoGuardado>,
  entrada: EntradaDaProjecao,
): Generator<{ numero: number; projecao: ProjecaoDaRodada | undefined }> {
  const projecaoDaNoite = criarProjecaoDaNoite(entrada);
  let resultados = new Map<string, ResultadoDoTse>();
  let anteriores: ArquivoDoTseGuardado[] = [];
  let projecao: ProjecaoDaRodada | undefined;
  const ler = (arquivos: ArquivoDoTseGuardado[]) => {
    for (const a of arquivos) resultados.set(chaveDaAbrangencia(a.abrangencia), lerResultado(new TextEncoder().encode(a.corpo)));
  };
  for (const { estado, arquivos, partida } of objetos) {
    if (partida === "a frio" || partida === "objeto da noite") {
      resultados = new Map();
      if (partida === "objeto da noite") ler(anteriores);
    }
    ler(arquivos);
    const brasil = resultados.get(chaveDaAbrangencia({}));
    // O coletor projeta de novo quando chega arquivo, e também ao partir, com os que tem.
    if (brasil && (arquivos.length > 0 || partida !== undefined)) {
      try {
        projecao = projecaoDaNoite.projetar(
          (abrangencia) => resultados.get(chaveDaAbrangencia(abrangencia)),
          emOrdem(brasil.candidatos).map((c) => c.numero),
        );
      } catch {
        projecao = undefined;
      }
    }
    anteriores = arquivos;
    yield { numero: estado.numero, projecao };
  }
}
