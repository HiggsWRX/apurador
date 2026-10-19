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

export function escreverCsv(linhas: readonly (readonly (string | number)[])[]): string {
  const campo = (valor: string | number) => {
    const texto = String(valor);
    return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  return linhas.map((l) => `${l.map(campo).join(",")}\n`).join("");
}
