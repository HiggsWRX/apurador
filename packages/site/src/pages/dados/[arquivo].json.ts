import type { APIRoute, GetStaticPaths } from "astro";
import { arquivoDoSimulador, CAMINHO_DO_ARQUIVO, SIMULADOR_ANTES_DAS_17H } from "../../lib/simulador-antes-das-17h";

// O arquivo do simulador "e se" antes das 17h (`/dados/simulador.json`), gerado no build só com o simulador no ar: com a
// chave desligada, ele nem existe. A página de lugar nunca o pede; só a tela do simulador, ao abrir.
export const getStaticPaths = (() =>
  SIMULADOR_ANTES_DAS_17H ? [{ params: { arquivo: CAMINHO_DO_ARQUIVO.replace(/^\/dados\/|\.json$/g, "") } }] : []) satisfies GetStaticPaths;

/** O arquivo do simulador, em JSON. */
export const GET: APIRoute = () => new Response(JSON.stringify(arquivoDoSimulador()), { headers: { "Content-Type": "application/json; charset=utf-8" } });
