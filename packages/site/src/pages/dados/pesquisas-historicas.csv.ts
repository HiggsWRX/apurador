import type { APIRoute } from "astro";
import historicas from "../../../../../dados/pesquisas-historicas.csv?raw";

// O `pesquisas-historicas.csv` do repositório, para baixar na página de metodologia (Página de metodologia, decisão 6):
// as pesquisas finais dos 2º turnos de 2002 a 2022 e as do 1º turno de 2026, gerado no build como
// `/dados/pesquisas-historicas.csv`.
/** O histórico das pesquisas, em CSV, como está no repositório. */
export const GET: APIRoute = () => new Response(historicas, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
