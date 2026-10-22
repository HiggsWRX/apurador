import type { APIRoute, GetStaticPaths } from "astro";
import { lugar } from "../../lib/lugares";
import { arquivoDaTabelaDeLugares, COM_TABELA_DE_LUGARES } from "../../lib/tabelas-do-build";

// A tabela de lugares do Brasil, de cada UF e do Exterior (`/tabela-de-lugares/<id>.json`), gerada no build: o cartão do
// mapa a baixa quando entra na tela. A página de um município usa a da UF dele.
export const getStaticPaths = (() => COM_TABELA_DE_LUGARES.map((l) => ({ params: { lugar: l.id } }))) satisfies GetStaticPaths;

/** A tabela de lugares do lugar, em JSON. */
export const GET: APIRoute = ({ params }) =>
  new Response(JSON.stringify(arquivoDaTabelaDeLugares(lugar(params.lugar!))), { headers: { "Content-Type": "application/json; charset=utf-8" } });
