/**
 * Lê um CSV do portal de dados abertos do TSE: Latin-1, separado por `;`, com os textos entre aspas
 * (aspas dobradas dentro do texto) e os números sem aspas. Devolve o cabeçalho e as linhas como listas.
 */
export function lerCsvTse(bytes: Uint8Array): { cabecalho: string[]; linhas: string[][] } {
  const texto = new TextDecoder("latin1").decode(bytes);
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let entreAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else entreAspas = false;
      } else campo += c;
    } else if (c === '"') entreAspas = true;
    else if (c === ";") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo);
      if (linha.length > 1 || linha[0] !== "") linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  const [cabecalho, ...resto] = linhas;
  if (!cabecalho) throw new Error("CSV do TSE vazio");
  return { cabecalho, linhas: resto };
}

/** Acesso às colunas pelo nome, que falha cedo, com o nome da coluna, se o TSE mudar o formato. */
export function colunas<N extends string>(cabecalho: string[], nomes: readonly N[]): Record<N, number> {
  const indices = {} as Record<N, number>;
  for (const nome of nomes) {
    const i = cabecalho.indexOf(nome);
    if (i < 0) throw new Error(`Coluna ${nome} não encontrada no arquivo do TSE`);
    indices[nome] = i;
  }
  return indices;
}

export function inteiro(valor: string | undefined, coluna: string): number {
  const n = Number(valor);
  if (valor === undefined || valor === "" || !Number.isInteger(n)) throw new Error(`Valor inválido na coluna ${coluna}: ${valor}`);
  return n;
}
