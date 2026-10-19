import { existsSync, readFileSync } from "node:fs";

// Leitura do que o build gerou (a fronteira do site), sem navegador: o HTML de cada página e os
// trechos dele que os testes conferem.

export const DIST = new URL("../dist/", import.meta.url);

export const existe = (caminho: string) => existsSync(new URL(`.${caminho}`, DIST));

/** O HTML da página no caminho do site ("/", "/sp/", "/sp/campinas/"). */
export const pagina = (caminho: string) => readFileSync(new URL(`.${caminho}index.html`, DIST), "utf8");

/** O texto visível de um trecho de HTML, com os espaços reduzidos. */
export const texto = (html: string) =>
  html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|\s+/g, " ")
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
