import type { APIRoute, GetStaticPaths } from "astro";
import municipios from "../../../../../dados/malha/municipios.json?raw";
import ufs from "../../../../../dados/malha/ufs.json?raw";
import { LUGARES, lugar, lugaresAbaixo } from "../../lib/lugares";
import { recortarMalha, type MalhaDosMunicipios } from "../../lib/malha";

// A malha do mapa (`/malha/<nome>.json`, ticket 26), que o cartão do mapa baixa quando entra na tela: a das UFs e a dos
// municípios do Brasil, como o pipeline as grava, e a de cada UF, com só os municípios dela, para as páginas da UF e dos
// municípios dela não baixarem a do Brasil inteiro.
export const getStaticPaths = (() =>
  ["ufs", "municipios", ...LUGARES.filter((l) => l.tipo === "uf").map((l) => l.id)].map((nome) => ({ params: { nome } }))) satisfies GetStaticPaths;

const DO_BRASIL = JSON.parse(municipios) as MalhaDosMunicipios;

/** O TopoJSON de uma malha: as do Brasil byte a byte como o pipeline as gravou; a de uma UF, recortada da dos municípios. */
function malha(nome: string): string {
  if (nome === "ufs") return ufs;
  if (nome === "municipios") return municipios;
  return JSON.stringify(recortarMalha(DO_BRASIL, new Set(lugaresAbaixo(lugar(nome)).map((l) => l.id))));
}

/** A resposta de `/malha/<nome>.json`. */
export const GET: APIRoute = ({ params }) => new Response(malha(params.nome!), { headers: { "Content-Type": "application/json; charset=utf-8" } });
