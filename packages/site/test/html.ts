import { existsSync, readFileSync } from "node:fs";

// Leitura do que o build gerou (a fronteira do site), sem navegador: o HTML de cada página e os
// trechos dele que os testes conferem.

export const DIST = new URL("../dist/", import.meta.url);

/** O build do mesmo código com o arquivo de chaves de `test/chaves-desligadas/`, que desliga todas as chaves. */
export const DIST_CHAVES_DESLIGADAS = new URL("../dist-chaves-desligadas/", import.meta.url);

/** O build com o arquivo de chaves de `test/projecao-desligada/`: o agregado ligado e a projeção de antes das 17h desligada. */
export const DIST_PROJECAO_DESLIGADA = new URL("../dist-projecao-desligada/", import.meta.url);

/** O relógio dos builds dos testes, nunca o real: o agregado da página é o deste instante. */
export const AGORA = "2026-10-19T12:00:00-03:00";

export const existe = (caminho: string) => existsSync(new URL(`.${caminho}`, DIST));

/** O HTML da página no caminho do site ("/", "/sp/", "/sp/campinas/"). */
export const pagina = (caminho: string) => readFileSync(new URL(`.${caminho}index.html`, DIST), "utf8");

const ENTIDADES: Record<string, string> = { "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&amp;": "&" };

/** O texto visível de um trecho de HTML, com os espaços reduzidos e as entidades de "<1%" e ">99%" desfeitas. */
export const texto = (html: string) =>
  html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|\s+/g, " ")
    .replace(/&(lt|gt|quot|#39|amp);/g, (e) => ENTIDADES[e]!)
    .trim();

/** Os elementos cuja tag de abertura casa com o padrão, cada um inteiro, até a tag que o fecha. */
export function elementos(html: string, abertura: RegExp): string[] {
  const achados: string[] = [];
  const padrao = new RegExp(abertura.source, "g");
  for (const m of html.matchAll(padrao)) {
    const nome = /^<([a-z0-9]+)/i.exec(m[0])?.[1];
    if (!nome) throw new Error(`O padrão ${abertura} não começa numa tag`);
    const tags = new RegExp(`<(/?)${nome}\\b[^>]*>`, "gi");
    tags.lastIndex = m.index;
    let profundidade = 0;
    for (const t of html.matchAll(tags)) {
      if (t.index < m.index) continue;
      profundidade += t[1] ? -1 : 1;
      if (profundidade === 0) {
        achados.push(html.slice(m.index, t.index + t[0].length));
        break;
      }
    }
  }
  return achados;
}

export function elemento(html: string, abertura: RegExp): string {
  const [primeiro] = elementos(html, abertura);
  if (primeiro === undefined) throw new Error(`Nenhum elemento casa com ${abertura}`);
  return primeiro;
}
