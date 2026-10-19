import type { Lugar, Turno } from "@apurador/pipeline";
import indice from "../../../../dados/lugares.json";
import { semAcentos } from "./texto";

// Os lugares do site e os seus caminhos: "/" (Brasil), "/sp/" (UF), "/exterior/", "/sp/campinas/"
// (município) e "/exterior/lisboa/" (cidade do exterior). O build lê só o repositório.

export const LUGARES = indice as Lugar[];

const porId = new Map(LUGARES.map((l) => [l.id, l]));

export function lugar(id: string): Lugar {
  const l = porId.get(id);
  if (!l) throw new Error(`Lugar ${id} não está em dados/lugares.json`);
  return l;
}

/** O nome no caminho da página: "Olho d'Água das Flores" → "olho-d-agua-das-flores". */
const slug = (nome: string) =>
  semAcentos(nome)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** O lugar acima deste: a UF (ou o Exterior) de um município, o Brasil de uma UF. */
export function lugarAcima(l: Lugar): Lugar | undefined {
  if (l.tipo === "brasil") return undefined;
  if (l.tipo === "municipio") return lugar(l.uf!);
  return lugar("BR");
}

const abaixo = Map.groupBy(
  LUGARES.filter((l) => l.tipo !== "brasil"),
  (l) => (l.tipo === "municipio" ? l.uf! : "BR"),
);

/** Os lugares logo abaixo deste: as UFs e o Exterior no Brasil, os municípios numa UF e as cidades no Exterior. */
export const lugaresAbaixo = (l: Lugar): Lugar[] => abaixo.get(l.id) ?? [];

export function caminhoDe(l: Lugar): string {
  if (l.tipo === "brasil") return "/";
  if (l.tipo === "exterior") return "/exterior/";
  if (l.tipo === "uf") return `/${l.id.toLowerCase()}/`;
  return `${caminhoDe(lugarAcima(l)!)}${slug(l.nome)}/`;
}

/** Do Brasil até o lugar: Brasil › UF › município. */
export function trilhaDe(l: Lugar): Lugar[] {
  const acima = lugarAcima(l);
  return acima ? [...trilhaDe(acima), l] : [l];
}

/** Os turnos do histórico, do mais recente ao mais antigo, como estão em `dados/turnos/`. */
export const TURNOS: Turno[] = Object.values(import.meta.glob<Turno>("../../../../dados/turnos/*.json", { eager: true, import: "default" })).sort(
  (a, b) => b.ano - a.ano || b.turno - a.turno,
);
