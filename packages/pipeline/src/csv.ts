// Os CSVs que o repositório guarda e edita à mão: UTF-8, separados por vírgula, com aspas em volta do texto que
// tem vírgula, aspas ou quebra de linha (aspas dobradas dentro dele). Diferem dos do TSE, que são Latin-1 com `;`.

export function lerCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let entreAspas = false;

  const fecharLinha = () => {
    linha.push(campo);
    if (linha.length > 1 || linha[0] !== "") linhas.push(linha);
    linha = [];
    campo = "";
  };
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreAspas) {
      if (c !== '"') campo += c;
      else if (texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else entreAspas = false;
    } else if (c === '"') entreAspas = true;
    else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") fecharLinha();
    else if (c !== "\r") campo += c;
  }
  if (campo !== "" || linha.length > 0) fecharLinha();
  return linhas;
}

export const naoVazio = (v: string) => v.trim() !== "";
export const ehDecimal = (v: string) => /^\d+(\.\d+)?$/.test(v);
export const ehData = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** As linhas de um CSV do repositório, com cada valor conferido na leitura, para o erro apontar a linha e a coluna. */
export function lerTabela<C extends string>(texto: string, arquivo: string, colunas: readonly C[], extra?: RegExp) {
  const [cabecalho = [], ...linhas] = lerCsv(texto);
  const faltando = colunas.filter((c) => !cabecalho.includes(c));
  const desconhecidas = cabecalho.filter((c) => !colunas.includes(c as C) && !extra?.test(c));
  if (faltando.length > 0 || desconhecidas.length > 0) {
    throw new Error(`${arquivo}: colunas faltando (${faltando.join(", ")}) ou desconhecidas (${desconhecidas.join(", ")})`);
  }
  const extras = cabecalho.filter((c) => !colunas.includes(c as C));
  return linhas.map((linha, i) => ({
    extras,
    valor<T>(coluna: string, valido: (v: string) => boolean, converter: (v: string) => T): T {
      const v = linha[cabecalho.indexOf(coluna)] ?? "";
      if (!valido(v)) throw new Error(`${arquivo}, linha ${i + 2}: ${coluna} inválido: ${v}`);
      return converter(v);
    },
  }));
}

export function escreverCsv(linhas: readonly (readonly (string | number)[])[]): string {
  const campo = (valor: string | number) => {
    const texto = String(valor);
    return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  return linhas.map((l) => `${l.map(campo).join(",")}\n`).join("");
}
