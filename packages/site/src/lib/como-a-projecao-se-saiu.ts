import noitePublicadaCsv from "../../../../docs/noite/2026-10-25.csv?raw";
import { finalistaPassado, lerNoiteReproduzida, type FinalistaPassado, type NoiteReproduzida } from "./metodologia";
import { PESQUISAS_DE_2026 } from "./pesquisas";

// "Como a projeção se saiu" (Telas da página de lugar, decisão 13; Plano de lançamento em fases, decisão 8): a noite de
// 25/10 como o coletor a publicou, medida pelo mesmo código da seção 6 da metodologia. O CSV é o do registro das
// rodadas (`npm run noite-publicada`), que tem só o Brasil: os objetos da noite, de onde sairiam as UFs e os
// municípios, não foram gravados (docs/noite/2026-10-25.md).

/** A noite do 2º turno de 2026 publicada, no Brasil, em % de Flávio, o 1º finalista do 1º turno. */
export const NOITE_PUBLICADA: NoiteReproduzida = lerNoiteReproduzida(
  2026,
  noitePublicadaCsv,
  PESQUISAS_DE_2026.finalistas.map(finalistaPassado) as [FinalistaPassado, FinalistaPassado],
);
