// O formato dos CSVs do portal de dados abertos do TSE e a conversão dos campos (inteiros, datas, datas e horas), com
// um erro que nomeia a coluna quando um valor não tem a forma esperada. Os arquivos por seção vão por `csv-em-fluxo.ts`.

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

/**
 * Acesso às colunas pelo nome, que falha cedo, com o nome da coluna, se o TSE mudar o formato. Os nomes do
 * cabeçalho valem sem espaços: o boletim de urna de 2018 traz a coluna de UF como `SG_ UF`.
 */
export function colunas<N extends string>(cabecalho: string[], nomes: readonly N[]): Record<N, number> {
  const semEspacos = cabecalho.map((c) => c.replaceAll(" ", ""));
  const indices = {} as Record<N, number>;
  for (const nome of nomes) {
    const i = semEspacos.indexOf(nome);
    if (i < 0) throw new Error(`Coluna ${nome} não encontrada no arquivo do TSE`);
    indices[nome] = i;
  }
  return indices;
}

/** O inteiro de um campo do CSV do TSE, que falha com o nome da coluna se o campo não é um. */
export function inteiro(valor: string | undefined, coluna: string): number {
  const n = Number(valor);
  if (valor === undefined || valor === "" || !Number.isInteger(n)) throw new Error(`Valor inválido na coluna ${coluna}: ${valor}`);
  return n;
}

/**
 * Data e hora do TSE, `DD/MM/AAAA HH:MM:SS` (ou já `AAAA-MM-DD HH:MM:SS`, como no `bweb` de 2026), como
 * `AAAA-MM-DD HH:MM:SS`. `null` quando o campo vem vazio (`#NULO#`).
 */
export function dataHora(valor: string | undefined, coluna: string): string | null {
  if (valor === "" || valor === "#NULO#" || valor === "#NULO") return null;
  const br = /^(\d\d)\/(\d\d)\/(\d{4}) (\d\d:\d\d:\d\d)$/.exec(valor ?? "");
  if (br) return `${br[3]}-${br[2]}-${br[1]} ${br[4]}`;
  if (valor !== undefined && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(valor)) return valor;
  throw new Error(`Data e hora inválidas na coluna ${coluna}: ${valor}`);
}

/** Data do TSE, `DD/MM/AAAA`, como `AAAA-MM-DD`. */
export function data(valor: string | undefined, coluna: string): string {
  const br = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(valor ?? "");
  if (!br) throw new Error(`Data inválida na coluna ${coluna}: ${valor}`);
  return `${br[3]}-${br[2]}-${br[1]}`;
}
