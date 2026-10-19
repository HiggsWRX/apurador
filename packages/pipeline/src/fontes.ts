import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { lerMembroRemoto } from "@apurador/tse";

// Os arquivos do TSE baixados ficam num cache fora do Git (`.cache/` na raiz). O repositório
// guarda só os dados derivados, e o manifesto diz de onde cada um veio.

export const RAIZ = new URL("../../../", import.meta.url);
const CACHE = new URL(".cache/tse/", RAIZ);

export interface FonteBaixada {
  url: string;
  membro: string;
  /** Hash do membro extraído (o CSV), não do zip inteiro, que nunca é baixado. */
  sha256: string;
  bytes: number;
  baixadoEm: string;
  dados: Uint8Array;
}

/** O membro de Presidente de um zip do TSE, do cache ou, se não estiver lá (ou com `atualizar`), da rede. */
export async function membroDePresidenteComCache(url: string, opcoes: { atualizar: boolean }): Promise<FonteBaixada> {
  const base = url.split("/").pop()!.replace(/\.zip$/, "");
  return membroComCache(url, `${base}_BR.csv`, opcoes);
}

/**
 * O membro `nome` de um zip do TSE, do cache ou, se não estiver lá (ou com `atualizar`), da rede. Quando o
 * nome do membro não se sabe antes (`casa`), `nome` é só o do arquivo no cache.
 */
export async function membroComCache(url: string, nome: string, opcoes: { atualizar: boolean; casa?: (membro: string) => boolean }): Promise<FonteBaixada> {
  const arquivo = new URL(nome, CACHE);
  const meta = new URL(`${nome.replace(/\.csv$/, "")}.json`, CACHE);

  if (opcoes.atualizar || !existsSync(arquivo) || !existsSync(meta)) {
    const membro = await lerMembroRemoto({ url, membro: opcoes.casa ?? ((n) => n === nome) });
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(arquivo, membro.dados);
    writeFileSync(meta, JSON.stringify({ url, membro: membro.nome, baixadoEm: new Date().toISOString() }, null, 2));
  }

  // Uma vista sobre o mesmo buffer, sem cópia: os arquivos por seção têm centenas de MB.
  const lido = readFileSync(arquivo);
  const dados = new Uint8Array(lido.buffer, lido.byteOffset, lido.byteLength);
  const { membro, baixadoEm } = JSON.parse(readFileSync(meta, "utf8")) as { membro: string; baixadoEm: string };
  return { url, membro, sha256: createHash("sha256").update(dados).digest("hex"), bytes: dados.length, baixadoEm, dados };
}
