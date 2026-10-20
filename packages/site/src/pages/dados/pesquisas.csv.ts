import type { APIRoute } from "astro";
import pesquisas from "../../../../../dados/pesquisas.csv?raw";

// O `pesquisas.csv` do repositório, para baixar na página de metodologia (Página de metodologia, decisão 6): o mesmo
// arquivo de que saem a lista das pesquisas e o agregado, gerado no build como `/dados/pesquisas.csv`.
/** As pesquisas da lista, em CSV, como estão no repositório. */
export const GET: APIRoute = () => new Response(pesquisas, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
