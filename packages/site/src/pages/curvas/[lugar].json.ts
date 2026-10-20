import type { APIRoute, GetStaticPaths } from "astro";
import type { CurvasDoLugar } from "../../lib/curva-de-comparacao";
import { curvasDoLugar } from "../../lib/curvas-passadas";
import { LUGARES } from "../../lib/lugares";

// As curvas de comparação de cada lugar (Telas da página de lugar, decisão 4), geradas no build como `/curvas/<id>.json`:
// os turnos passados num arquivo só, que a página baixa quando o visitante liga a primeira curva. Um lugar sem voto no
// PT nem no partido de Bolsonaro em nenhum turno passado (40 cidades do Exterior) não tem arquivo, nem botão.
export const getStaticPaths = (() =>
  LUGARES.flatMap((l) => {
    const curvas = curvasDoLugar(l.id);
    return Object.keys(curvas).length > 0 ? [{ params: { lugar: l.id }, props: { curvas } }] : [];
  })) satisfies GetStaticPaths;

/** As curvas do lugar, em JSON. */
export const GET: APIRoute = ({ props }) => new Response(JSON.stringify((props as { curvas: CurvasDoLugar }).curvas), { headers: { "Content-Type": "application/json" } });
