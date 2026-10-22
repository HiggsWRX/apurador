import { ordemDoMapa, type Lugar } from "@apurador/pipeline";
import { candidatosDosLados, doPartidoDeBolsonaro } from "./comparacao";
import { caminhoDe, LUGARES, lugaresAbaixo, TURNOS } from "./lugares";
import type { ArquivoDaTabelaDeLugares } from "./tabela-dos-lugares";

// A tabela de lugares no build (`/tabela-de-lugares/<id>.json`, do Brasil, de cada UF e do Exterior): os lugares logo
// abaixo, com o nome, o caminho, a posição no mapa.json e o placar entre finalistas do 1º turno de 2026. Fica fora da
// ilha do cartão, que a baixa quando entra na tela: assim os ~5.800 lugares não vão no JavaScript de cada página.

/** Os lugares na ordem do mapa.json, a mesma com que o coletor o escreve, e a assinatura dela. */
const DO_MAPA = ordemDoMapa(LUGARES);
const POSICAO_NO_MAPA = new Map(DO_MAPA.lugares.map((l, i) => [l.id, i]));

const PRIMEIRO_TURNO = TURNOS.find((t) => t.ano === 2026 && t.turno === 1)!;

/** Os lugares que têm tabela de lugares: o Brasil, as UFs e o Exterior. */
export const COM_TABELA_DE_LUGARES = LUGARES.filter((l) => l.tipo !== "municipio");

/** A tabela de lugares de um lugar que tem uma. */
export function arquivoDaTabelaDeLugares(lugar: Lugar): ArquivoDaTabelaDeLugares {
  return {
    lugar: lugar.id,
    assinatura: DO_MAPA.assinatura,
    candidatos: candidatosDosLados(PRIMEIRO_TURNO).map((c) => ({ nome: c.nomeUrna, partido: c.partido })),
    linhas: lugaresAbaixo(lugar).map((l) => ({
      id: l.id,
      nome: l.nome,
      caminho: caminhoDe(l),
      indice: POSICAO_NO_MAPA.get(l.id)!,
      primeiroTurno: doPartidoDeBolsonaro(PRIMEIRO_TURNO, l.id),
    })),
  };
}
