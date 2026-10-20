import type { APIRoute, GetStaticPaths } from "astro";
import { PARA_BAIXAR } from "../../lib/metodologia";

// Os CSVs para baixar na página de metodologia (Página de metodologia, decisão 6): os mesmos arquivos do repositório,
// gerados no build como `/dados/<arquivo>.csv`. A lista é a `PARA_BAIXAR`, a mesma que a página mostra.
export const getStaticPaths = (() => PARA_BAIXAR.map((a) => ({ params: { arquivo: a.nome.replace(/\.csv$/, "") }, props: { texto: a.texto } }))) satisfies GetStaticPaths;

/** Um CSV do repositório, como está nele. */
export const GET: APIRoute = ({ props }) => new Response((props as { texto: string }).texto, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
