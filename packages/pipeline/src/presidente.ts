// Os arquivos do TSE trazem todos os cargos, e o Apurador só acompanha Presidente.

export const PRESIDENTE = 1;

/** As linhas de Presidente de um turno. */
export const doTurnoDePresidente =
  (t: { ano: number; turno: number }) =>
  (l: { ano: number; turno: number; cargo: number }): boolean =>
    l.ano === t.ano && l.turno === t.turno && l.cargo === PRESIDENTE;
