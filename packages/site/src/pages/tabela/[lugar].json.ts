import type { APIRoute, GetStaticPaths } from "astro";
import { lugar } from "../../lib/lugares";
import { arquivoDaTabela, COM_TABELA } from "../../lib/tabelas-do-build";

// A tabela de lugares do Brasil, de cada UF e do Exterior (`/tabela/<id>.json`), gerada no build: o cartão do mapa a baixa
// quando entra na tela. A página de um município usa a da UF dele.
export const getStaticPaths = (() => COM_TABELA.map((l) => ({ params: { lugar: l.id } }))) satisfies GetStaticPaths;

/** A tabela do lugar, em JSON. */
export const GET: APIRoute = ({ params }) =>
  new Response(JSON.stringify(arquivoDaTabela(lugar(params.lugar!))), { headers: { "Content-Type": "application/json; charset=utf-8" } });
