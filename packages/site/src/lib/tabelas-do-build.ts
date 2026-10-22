import { assinaturaDosLugares, type Lugar } from "@apurador/pipeline";
import { candidatosDosLados, doPartidoDeBolsonaro } from "./comparacao";
import { caminhoDe, LUGARES, lugaresAbaixo, TURNOS } from "./lugares";
import type { ArquivoDaTabela } from "./tabela-dos-lugares";

// A tabela de lugares no build (`/tabela/<id>.json`, do Brasil, de cada UF e do Exterior): os lugares logo abaixo, com o
// nome, o caminho, a posição no mapa.json e o placar entre finalistas do 1º turno de 2026. Fica fora da ilha do cartão,
// que a baixa quando entra na tela: assim os ~5.800 lugares não vão no JavaScript de cada página.

/** Os lugares do site na ordem do mapa.json, a mesma que o coletor recebe: `dados/lugares.json`, sem o Brasil. */
const DO_MAPA = LUGARES.filter((l) => l.tipo !== "brasil");
const POSICAO_NO_MAPA = new Map(DO_MAPA.map((l, i) => [l.id, i]));
/** A assinatura com que o coletor escreve o mapa.json desses lugares. */
export const ASSINATURA_DOS_LUGARES = assinaturaDosLugares(DO_MAPA.map((l) => l.id));

const PRIMEIRO_TURNO = TURNOS.find((t) => t.ano === 2026 && t.turno === 1)!;

/** Os lugares que têm tabela: o Brasil, as UFs e o Exterior. */
export const COM_TABELA = LUGARES.filter((l) => l.tipo !== "municipio");

/** A tabela de lugares de um lugar com tabela. */
export function arquivoDaTabela(lugar: Lugar): ArquivoDaTabela {
  return {
    lugar: lugar.id,
    assinatura: ASSINATURA_DOS_LUGARES,
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
