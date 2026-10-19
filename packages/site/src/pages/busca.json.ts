import { nomeCompleto } from "@apurador/pipeline";
import type { APIRoute } from "astro";
import type { ItemDaBusca } from "../lib/busca";
import { caminhoDe, LUGARES } from "../lib/lugares";

// O índice da busca do cabeçalho, do maior para o menor eleitorado.
export const GET: APIRoute = () => {
  const itens: ItemDaBusca[] = [...LUGARES].sort((a, b) => b.aptos - a.aptos).map((l) => [nomeCompleto(l), caminhoDe(l), l.nome]);
  return new Response(JSON.stringify(itens), { headers: { "Content-Type": "application/json" } });
};
