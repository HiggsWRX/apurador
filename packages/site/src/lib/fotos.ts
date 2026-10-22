// As fotos oficiais dos candidatos (`dados/fotos/<sequencial>.jpeg`, copiadas do TSE sem alteração por `npm run fotos`),
// servidas pelo próprio site com nome de cache longo. A ilha do bloco ao vivo acha a de cada candidato pelo sequencial
// do arquivo de rodada.

const arquivos = import.meta.glob<string>("../../../../dados/fotos/*.jpeg", { eager: true, import: "default", query: "?url" });

/** A URL de cada foto no site, pelo sequencial do candidato no TSE. */
export const FOTOS: Record<string, string> = Object.fromEntries(
  Object.entries(arquivos).map(([caminho, url]) => [
    caminho
      .split("/")
      .pop()!
      .replace(/\.jpeg$/, ""),
    url,
  ]),
);
