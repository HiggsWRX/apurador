import type { APIRoute, GetStaticPaths } from "astro";
import { arquivoDoSimulador, CAMINHO_DO_ARQUIVO } from "../../lib/simulador-antes-das-17h";

// O arquivo do simulador "e se" do build (`/dados/simulador.json`), gerado com qualquer chave: antes das 17h, a tela do
// simulador projeta sobre ele, com a chave de antes das 17h ligada; na noite, junta a ele o arquivo do coletor. A página
// de lugar nunca o pede; só a tela do simulador, ao abrir.
export const getStaticPaths = (() => [{ params: { arquivo: CAMINHO_DO_ARQUIVO.replace(/^\/dados\/|\.json$/g, "") } }]) satisfies GetStaticPaths;

/** O arquivo do simulador, em JSON. */
export const GET: APIRoute = () => new Response(JSON.stringify(arquivoDoSimulador()), { headers: { "Content-Type": "application/json; charset=utf-8" } });
