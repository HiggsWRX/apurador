import { Marked, type Token, type TokensList } from "marked";

// O roteiro da noite em HTML, para imprimir ao lado do computador e salvar no celular (Operação na noite, decisão 22):
// com o computador travado, o dono não lê o roteiro na tela. A fonte é o Markdown de `docs/roteiro-da-noite.md`, e aqui
// ele vira uma página só, sem nada de fora, que o Chrome imprime em A4 e o celular abre sem internet. Cada título de
// terceiro nível abre uma `<section>` que a impressão não parte: um cartão de falha nunca começa numa folha e termina
// na outra. Os ids dos títulos são os que o GitHub dá, para os links internos (`#f-placar-divergente`) valerem nos dois.

/** O id que o GitHub dá a um título: em minúsculas, sem pontuação, com um hífen no lugar de cada espaço. */
export const idDoTitulo = (titulo: string) =>
  titulo
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");

const ESTILO = `
:root { color-scheme: light; --texto: #1a1a1a; --fraco: #5c5c5c; --linha: #d0d0d0; --fundo-do-codigo: #f2f2f2; }
@media screen and (prefers-color-scheme: dark) {
  :root { color-scheme: dark; --texto: #e8e8e8; --fraco: #a8a8a8; --linha: #444; --fundo-do-codigo: #262626; }
  body { background: #121212; }
}
* { box-sizing: border-box; }
body { margin: 0 auto; max-width: 46rem; padding: 1rem; font: 16px/1.45 system-ui, sans-serif; color: var(--texto); }
h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
h2 { font-size: 1.25rem; margin: 1.75rem 0 0.5rem; padding-top: 0.5rem; border-top: 2px solid var(--texto); }
h3 { font-size: 1.05rem; margin: 1.25rem 0 0.25rem; }
h2, h3 { break-after: avoid; }
section.bloco { break-inside: avoid; }
p, ul, ol { margin: 0.4rem 0; }
li { margin: 0.15rem 0; }
code { font: 0.9em/1.35 ui-monospace, Consolas, monospace; background: var(--fundo-do-codigo); padding: 0 0.2em; border-radius: 3px; overflow-wrap: anywhere; }
pre { background: var(--fundo-do-codigo); padding: 0.5rem 0.6rem; border-radius: 4px; white-space: pre-wrap; overflow-wrap: anywhere; break-inside: avoid; }
pre code { padding: 0; background: none; }
table { border-collapse: collapse; margin: 0.5rem 0; font-size: 0.92em; }
th, td { border: 1px solid var(--linha); padding: 0.25rem 0.4rem; text-align: left; vertical-align: top; }
tr { break-inside: avoid; }
input[type="checkbox"] { width: 1.1em; height: 1.1em; margin: 0 0.3em 0 0; vertical-align: -0.15em; }
li:has(> input[type="checkbox"]) { list-style: none; margin-left: -1.3em; }
a { color: inherit; }
.versao { color: var(--fraco); font-size: 0.85em; }
@media screen and (max-width: 40rem) { table { display: block; overflow-x: auto; } }
@page { size: A4; margin: 14mm 12mm; }
@media print { body { max-width: none; padding: 0; font-size: 10.5pt; } a { text-decoration: none; } }
`;

/** Os tokens do roteiro em blocos: um a cada título de segundo ou terceiro nível, e o que vem antes do primeiro. */
function emBlocos(tokens: TokensList): { nivel: number; tokens: Token[] }[] {
  const blocos: { nivel: number; tokens: Token[] }[] = [{ nivel: 1, tokens: [] }];
  for (const token of tokens) {
    if (token.type === "heading" && (token.depth === 2 || token.depth === 3)) blocos.push({ nivel: token.depth, tokens: [] });
    blocos.at(-1)!.tokens.push(token);
  }
  return blocos.filter((bloco) => bloco.tokens.length > 0);
}

/**
 * O roteiro em HTML: uma página só, com o estilo de impressão e de celular embutido. A `versao` (o commit e a hora em
 * que foi gerado) vai logo abaixo do título, para conferir que a folha impressa é a última.
 */
export function roteiroEmHtml(markdown: string, versao: string): string {
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth, text }) {
        return `<h${depth} id="${idDoTitulo(text)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
    },
  });
  const tokens = marked.lexer(markdown);
  const titulo =
    tokens.find((token): token is Extract<Token, { type: "heading" }> => token.type === "heading" && token.depth === 1)?.text ?? "Roteiro da noite";
  const corpo = emBlocos(tokens)
    .map(({ nivel, tokens }) => {
      const html = marked.parser(tokens);
      if (nivel === 1) return html.replace(/(<\/h1>\n)/, `$1<p class="versao">${versao}</p>\n`);
      return nivel === 3 ? `<section class="bloco">\n${html}</section>\n` : `<section>\n${html}</section>\n`;
    })
    .join("");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<style>${ESTILO}</style>
</head>
<body>
${corpo}</body>
</html>
`;
}
