// Os números, as datas e o JSON como o TSE os escreve nos arquivos da divulgação. Tudo vai como texto, com
// vírgula decimal. As regras foram conferidas campo a campo nos arquivos reais das eleições 6257 e 6258.

/**
 * Um percentual com duas casas. O TSE arredonda, mas nunca escreve 0,00 para uma parte maior que zero nem
 * 100,00 para uma parte menor que o todo (no Brasil de 2026, 423 eleitores em 158 milhões dão 0,01).
 */
export function percentual(parte: number, todo: number): string {
  if (todo === 0) return "0,00";
  let centesimos = Math.round((parte * 10_000) / todo);
  if (parte > 0 && centesimos === 0) centesimos = 1;
  if (parte < todo && centesimos === 10_000) centesimos = 9_999;
  return `${Math.floor(centesimos / 100)},${String(centesimos % 100).padStart(2, "0")}`;
}

/**
 * O mesmo percentual com nove casas (os campos terminados em `n`). Zero e o todo vão sem casas ("0" e "100");
 * o resto, sempre com as nove, mesmo que terminem em zero ("20,000000000"). Sem todo, vale `semTodo`: "0" nas
 * seções e no eleitorado, e "0,00" nos votos de um arquivo ainda sem nenhum voto.
 */
export function percentualPreciso(parte: number, todo: number, semTodo = "0"): string {
  if (todo === 0) return semTodo;
  if (parte === 0) return "0";
  if (parte === todo) return "100";
  // A divisão longa, três casas por vez, fica exata com inteiros de até 15 dígitos, sem BigInt.
  let inteiro = Math.floor((parte * 100) / todo);
  let resto = parte * 100 - inteiro * todo;
  let casas = 0;
  for (let i = 0; i < 3; i++) {
    const x = resto * 1000;
    const digitos = Math.floor(x / todo);
    resto = x - digitos * todo;
    casas = casas * 1000 + digitos;
  }
  if (2 * resto >= todo && ++casas === 1e9) {
    casas = 0;
    inteiro++;
  }
  return `${inteiro},${String(casas).padStart(9, "0")}`;
}

/** `AAAA-MM-DD HH:MM:SS` como o par do TSE, `DD/MM/AAAA` e `HH:MM:SS`. */
export function dataEHora(dataHora: string): { data: string; hora: string } {
  return { data: `${dataHora.slice(8, 10)}/${dataHora.slice(5, 7)}/${dataHora.slice(0, 4)}`, hora: dataHora.slice(11, 19) };
}

/** `AAAA-MM-DD HH:MM:SS` de Brasília como data HTTP (`Sun, 30 Oct 2022 21:44:04 GMT`). */
export const dataHttp = (dataHora: string) => new Date(`${dataHora.replace(" ", "T")}-03:00`).toUTCString();

/** Um objeto já escrito no formato do TSE, que `escreverComoTse` copia como está. */
export class JaEscrito {
  constructor(readonly texto: string) {}
}

const eObjeto = (v: unknown): v is Record<string, unknown> | JaEscrito => typeof v === "object" && v !== null && !Array.isArray(v);

function escrever(v: unknown): string {
  if (v instanceof JaEscrito) return v.texto;
  if (Array.isArray(v)) return `[ ${v.map((x) => (eObjeto(x) ? `\n${escrever(x)}` : escrever(x))).join(", ")} ]`;
  if (eObjeto(v)) return `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)} : ${eObjeto(x) ? "\n" : ""}${escrever(x)}`).join(", ")} }`;
  return JSON.stringify(v);
}

/** O JSON com o espaçamento do TSE: espaços em volta dos dois-pontos e uma quebra de linha antes de cada objeto. */
export const escreverComoTse = (documento: unknown) => `\n${escrever(documento)}`;

/** Um objeto escrito uma vez, para entrar em vários documentos sem ser escrito de novo. */
export const jaEscrito = (objeto: object) => new JaEscrito(escrever(objeto));
