// A busca de município ou estado do cabeçalho. O índice vem do build (`/busca.json`), já do maior
// para o menor eleitorado, e a busca roda no navegador.

/** O nome sem ambiguidade ("São Paulo (SP)", "Estado de São Paulo"), o caminho da página e o nome curto. */
export type ItemDaBusca = [rotulo: string, caminho: string, nome: string];

import { semAcentos } from "./texto";

const LIMITE = 8;

const palavras = (texto: string) =>
  semAcentos(texto)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/**
 * Os lugares em que cada palavra da consulta começa uma palavra do nome, com o nome exato primeiro.
 * No resto, vale a ordem do índice, que é a do eleitorado.
 */
export function buscarLugares(indice: readonly ItemDaBusca[], consulta: string): ItemDaBusca[] {
  const termos = palavras(consulta);
  if (termos.join("").length < 2) return [];
  const exata = termos.join(" ");

  const exatos: ItemDaBusca[] = [];
  const outros: ItemDaBusca[] = [];
  for (const item of indice) {
    const doRotulo = palavras(item[0]);
    if (!termos.every((t) => doRotulo.some((p) => p.startsWith(t)))) continue;
    (palavras(item[2]).join(" ") === exata ? exatos : outros).push(item);
  }
  return [...exatos, ...outros].slice(0, LIMITE);
}
