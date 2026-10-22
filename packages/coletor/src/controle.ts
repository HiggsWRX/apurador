import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lerChaves, lerControle, type Controle } from "./chaves.ts";

// O arquivo de controle (Operação na noite, decisão 5): o que o comando da noite grava e o coletor lê a cada rodada.
// Fica em `.cache/coletor/controle.json`, fora do Git, e sobrevive a um reinício do coletor: o estado que o dono deixou
// às 16h é o que vale depois de uma queda. Por isso ele também sobrevive de um ensaio para a noite: o roteiro confere
// o estado antes das 15h de 25/10 (`npm run noite`) e apaga o arquivo se ele for de outro dia. Sem o arquivo, o
// coletor parte das chaves do arquivo de chaves do site (`dados/chaves.json`, seção `noite`), que a página usa antes
// dele: um bloco desligado por deploy fica desligado quando o coletor sobe.

const RAIZ = new URL("../../../", import.meta.url);

/** O arquivo de controle padrão, na raiz do repositório. */
export const ARQUIVO_DE_CONTROLE = fileURLToPath(new URL(".cache/coletor/controle.json", RAIZ));

/** O arquivo de chaves do site, publicado com ele (ticket 04). */
export const ARQUIVO_DE_CHAVES_DO_SITE = fileURLToPath(new URL("dados/chaves.json", RAIZ));

/** O conteúdo do arquivo de controle: o controle e quando o comando o gravou (ISO). */
export interface ArquivoDeControle extends Controle {
  gravadoEm: string;
}

/** O controle de quem ainda não mandou nada: as chaves da seção `noite` do arquivo de chaves do site, sem aviso e no destino principal. */
export async function controleDoArquivoDeChaves(caminho = ARQUIVO_DE_CHAVES_DO_SITE): Promise<Controle> {
  const { noite } = JSON.parse(await readFile(caminho, "utf8")) as { noite?: unknown };
  return lerControle({ chaves: lerChaves(noite), aviso: null, planoB: false });
}

/** Lê o arquivo de controle, ou `null` se ele não existe. Um arquivo que não serve é um erro, e o coletor fica com o controle anterior. */
export async function lerArquivoDeControle(caminho: string): Promise<ArquivoDeControle | null> {
  let texto: string;
  try {
    texto = await readFile(caminho, "utf8");
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw erro;
  }
  const valor = JSON.parse(texto) as unknown;
  const controle = lerControle(valor);
  const gravadoEm = (valor as { gravadoEm?: unknown }).gravadoEm;
  if (typeof gravadoEm !== "string" || Number.isNaN(Date.parse(gravadoEm)))
    throw new Error(`gravadoEm deveria ser uma data ISO, não ${JSON.stringify(gravadoEm)}`);
  return { ...controle, gravadoEm };
}

/** Grava o arquivo de controle inteiro de uma vez (num arquivo ao lado, depois renomeado): o coletor nunca lê um arquivo pela metade. */
export async function gravarArquivoDeControle(caminho: string, controle: Controle, gravadoEm: Date): Promise<void> {
  const conteudo: ArquivoDeControle = { ...controle, gravadoEm: gravadoEm.toISOString() };
  await mkdir(dirname(caminho), { recursive: true });
  const provisorio = `${caminho}.tmp`;
  await writeFile(provisorio, `${JSON.stringify(conteudo, null, 2)}\n`);
  await rename(provisorio, caminho);
}
