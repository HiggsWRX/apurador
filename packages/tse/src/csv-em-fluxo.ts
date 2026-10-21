import { colunas } from "./csv.ts";

// Os CSVs por seção do TSE têm centenas de MB e não cabem na memória como texto: este leitor anda sobre os bytes, com
// as mesmas regras de formato de `csv.ts`, e decodifica só as colunas pedidas.

const ASPAS = 0x22;
const PONTO_E_VIRGULA = 0x3b;
const LF = 0x0a;
const CR = 0x0d;

/**
 * Percorre um CSV grande do TSE (Latin-1, `;`, textos entre aspas) linha a linha, direto sobre os bytes,
 * e decodifica só as colunas pedidas. Os arquivos por seção têm centenas de MB: ler tudo como texto e
 * dividir em campos, como faz `lerCsvTse`, não cabe na memória.
 */
export function* percorrerCsvTse<N extends string>(bytes: Uint8Array, nomes: readonly N[]): Generator<Record<N, string>> {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const cabecalho: string[] = [];
  let i = lerLinha(b, 0, (_, valor) => cabecalho.push(valor));
  if (cabecalho.length === 0) throw new Error("CSV do TSE vazio");

  // A coluna de cada campo da linha no registro devolvido (ou nenhuma, para os campos não pedidos).
  const indices = colunas(cabecalho, nomes);
  const nomeDoCampo: (N | undefined)[] = cabecalho.map(() => undefined);
  for (const nome of nomes) nomeDoCampo[indices[nome]] = nome;

  while (i < b.length) {
    const registro = {} as Record<N, string>;
    let campos = 0;
    i = lerLinha(b, i, (campo, valor) => {
      campos++;
      const nome = nomeDoCampo[campo];
      if (nome !== undefined) registro[nome] = valor;
    }, nomeDoCampo);
    if (campos > 1) yield registro;
  }
}

/**
 * Lê uma linha a partir de `i` e chama `campo` com cada valor, sem as aspas. Com `pedidos`, só decodifica os
 * campos que têm nome ali. Devolve a posição do começo da linha seguinte.
 */
function lerLinha(b: Buffer, i: number, campo: (indice: number, valor: string) => void, pedidos?: readonly unknown[]): number {
  let indice = 0;
  while (true) {
    let inicio = i;
    let fim: number;
    let aspasDobradas = false;
    if (b[i] === ASPAS) {
      inicio = ++i;
      while (i < b.length) {
        if (b[i] === ASPAS) {
          if (b[i + 1] !== ASPAS) break;
          aspasDobradas = true;
          i++;
        }
        i++;
      }
      fim = i++;
      while (i < b.length && b[i] !== PONTO_E_VIRGULA && b[i] !== LF && b[i] !== CR) i++;
    } else {
      while (i < b.length && b[i] !== PONTO_E_VIRGULA && b[i] !== LF && b[i] !== CR) i++;
      fim = i;
    }
    if (pedidos === undefined || pedidos[indice] !== undefined) {
      const valor = b.toString("latin1", inicio, fim);
      campo(indice, aspasDobradas ? valor.replaceAll('""', '"') : valor);
    } else campo(indice, "");
    indice++;
    if (b[i] === PONTO_E_VIRGULA) {
      i++;
      continue;
    }
    if (b[i] === CR) i++;
    if (b[i] === LF) i++;
    return i;
  }
}
