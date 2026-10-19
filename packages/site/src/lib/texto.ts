/** O texto sem acentos e em minúsculas, para comparar nomes ("São Paulo" → "sao paulo"). */
export const semAcentos = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
