// Os tipos da base "Apuração + pesquisas" do protótipo da página de metodologia, só no que os testes do porte fiel
// usam. A fatia é a de Lula nos votos dos dois finalistas, e o desvio `s` também.

import type { FotoDoPrototipo, ProjecaoDoPrototipo } from "./projecao.js";

export declare function comPesquisas(
  P: unknown,
  E: FotoDoPrototipo,
  pr: ProjecaoDoPrototipo,
  A: number,
  K: number,
  PRM: { k: number },
): { peso: number; P: number; s: number };
