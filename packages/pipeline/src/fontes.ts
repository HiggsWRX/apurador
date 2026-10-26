import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { lerMembroRemoto, lerResultado, type ResultadoDoTse } from "@apurador/tse";

// Os arquivos do TSE baixados ficam num cache fora do Git (`.cache/tse/` na raiz do checkout principal). O
// repositório guarda só os dados derivados, e o manifesto diz de onde cada um veio.

export const RAIZ = new URL("../../../", import.meta.url);

/**
 * O cache dos arquivos do TSE: `.cache/tse/` na raiz do checkout principal. Os worktrees de cada ticket o dividem,
 * porque as noites leem gigabytes do TSE. Num worktree, o `.git` é um arquivo que aponta para
 * `<principal>/.git/worktrees/<nome>`.
 */
export function cacheDoTse(raiz: URL): URL {
  const git = new URL(".git", raiz);
  const gitdir = existsSync(git) && statSync(git).isFile() ? /^gitdir: (.+)$/m.exec(readFileSync(git, "utf8"))?.[1]?.trim() : undefined;
  const principal = gitdir ? new URL("../../../", new URL(`file:///${gitdir.replace(/^\/+/, "")}/`)) : raiz;
  return new URL(".cache/tse/", principal);
}

const CACHE = cacheDoTse(RAIZ);

/** O cache da malha do IBGE (`.cache/ibge/`), ao lado do do TSE, dividido pelos worktrees do mesmo jeito. */
export const CACHE_DO_IBGE = new URL("../ibge/", CACHE);

/**
 * O estado em disco do coletor da produção (`.cache/coletor/`, ao lado do cache do TSE): o último estado da noite, com
 * o arquivo ao vivo de cada lugar como chegou do TSE (o `EstadoGuardado` de `packages/coletor/src/retomada.ts`).
 */
const ESTADO_DA_NOITE = new URL("../coletor/estado-producao.json", CACHE);

/** Os arquivos ao vivo do último estado da noite, lidos, e a origem deles para o manifesto. */
export function ultimoEstadoDaNoite(ano: number): { resultados: ResultadoDoTse[]; fonte: Omit<FonteBaixada, "dados"> } {
  if (!existsSync(ESTADO_DA_NOITE)) throw new Error(`Os arquivos oficiais não têm o turno da noite, e não há o último estado dela em ${ESTADO_DA_NOITE.href}`);
  const bytes = readFileSync(ESTADO_DA_NOITE);
  const { estado, arquivos } = JSON.parse(bytes.toString("utf8")) as {
    estado: { eleicao: string; numero: number; quando: string };
    arquivos: { corpo: string }[];
  };
  const utf8 = new TextEncoder();
  return {
    resultados: arquivos.map((a) => lerResultado(utf8.encode(a.corpo))),
    fonte: {
      url: `https://resultados.tse.jus.br/oficial/ele${ano}/${estado.eleicao}/dados/`,
      membro: `estado-producao.json, rodada ${estado.numero}`,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
      baixadoEm: estado.quando,
    },
  };
}

/** Um arquivo do TSE (ou do IBGE) baixado, ou lido do cache, com a origem para o manifesto. */
export interface FonteBaixada {
  url: string;
  membro: string;
  /** Hash do membro extraído (o CSV, ou o .shp da malha), não do zip inteiro, que nunca é baixado. */
  sha256: string;
  bytes: number;
  baixadoEm: string;
  dados: Uint8Array;
}

/** O membro de Presidente de um zip do TSE, do cache ou, se não estiver lá (ou com `atualizar`), da rede. */
export async function membroDePresidenteComCache(url: string, opcoes: { atualizar: boolean }): Promise<FonteBaixada> {
  const base = url
    .split("/")
    .pop()!
    .replace(/\.zip$/, "");
  return membroComCache(url, `${base}_BR.csv`, opcoes);
}

/**
 * O membro `nome` de um zip, do cache ou, se não estiver lá (ou com `atualizar`), da rede. Quando o nome do membro não
 * se sabe antes (`casa`), `nome` é só o do arquivo no cache. O cache é o do TSE, ou outro (`cache`, como o do IBGE).
 */
export async function membroComCache(
  url: string,
  nome: string,
  opcoes: { atualizar: boolean; casa?: (membro: string) => boolean; cache?: URL },
): Promise<FonteBaixada> {
  const pasta = opcoes.cache ?? CACHE;
  const arquivo = new URL(nome, pasta);
  const meta = new URL(`${nome.replace(/\.csv$/, "")}.json`, pasta);

  if (opcoes.atualizar || !existsSync(arquivo) || !existsSync(meta)) {
    const membro = await lerMembroRemoto({ url, membro: opcoes.casa ?? ((n) => n === nome) });
    mkdirSync(pasta, { recursive: true });
    writeFileSync(arquivo, membro.dados);
    writeFileSync(meta, JSON.stringify({ url, membro: membro.nome, baixadoEm: new Date().toISOString() }, null, 2));
  }

  return doCache(url, arquivo, meta);
}

/** Um arquivo do TSE que não vem num zip (como a configuração de municípios da divulgação), do cache ou da rede. */
export async function arquivoComCache(url: string, opcoes: { atualizar: boolean }): Promise<FonteBaixada> {
  const nome = url.split("/").pop()!;
  const arquivo = new URL(nome, CACHE);
  // O arquivo já é um .json: o registro da origem leva .meta.json, para não ter o mesmo nome dele.
  const meta = new URL(`${nome.replace(/\.[^.]+$/, "")}.meta.json`, CACHE);

  if (opcoes.atualizar || !existsSync(arquivo) || !existsSync(meta)) {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`${url}: HTTP ${resposta.status}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(arquivo, new Uint8Array(await resposta.arrayBuffer()));
    writeFileSync(meta, JSON.stringify({ url, membro: nome, baixadoEm: new Date().toISOString() }, null, 2));
  }
  return doCache(url, arquivo, meta);
}

function doCache(url: string, arquivo: URL, meta: URL): FonteBaixada {
  // Uma vista sobre o mesmo buffer, sem cópia: os arquivos por seção têm centenas de MB.
  const lido = readFileSync(arquivo);
  const dados = new Uint8Array(lido.buffer, lido.byteOffset, lido.byteLength);
  const { membro, baixadoEm } = JSON.parse(readFileSync(meta, "utf8")) as { membro: string; baixadoEm: string };
  return { url, membro, sha256: createHash("sha256").update(dados).digest("hex"), bytes: dados.length, baixadoEm, dados };
}
