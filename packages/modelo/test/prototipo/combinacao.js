// A base "Apuração + pesquisas" do protótipo da página de metodologia, copiada como referência dos testes do porte fiel.
// Origem: branch `prototipo/pagina-metodologia`, commit 816bdc7, prototipos/pagina-metodologia/serie2022.js, linhas 22
// e 23 (o placar entre finalistas do Brasil), 26 a 30 (a fatia dos eliminados por UF) e 46 a 69 (a conta de um
// agregado num momento da noite). Só muda o embrulho: o script lia os arquivos e rodava a noite inteira; aqui, a
// mesma conta é uma função de um momento, com o agregado (`A`, a fatia de Lula) e o K como parâmetros, e guarda a
// fatia de cada município (`shat`), como o `Projecao.projetar` do protótipo do método.
// Não é código de produção: só os testes a importam.

import { Projecao } from "./projecao.js";

export function comPesquisas(P, E, pr, A, K, PRM) {
  const sq = (x) => x * x;
  let L1 = 0,
    B1 = 0;
  for (let m = 0; m < P.n; m++) {
    L1 += P.mun.L1[m];
    B1 += P.mun.B1[m];
  }
  const FIN1 = L1 / (L1 + B1);

  // fatia dos eliminados por UF, para a incerteza local da UF (0,13 × fatia)
  const nU = P.ufs.length;
  const oUF = new Float64Array(nU),
    tUF = new Float64Array(nU);
  for (let m = 0; m < P.n; m++) {
    const T1 = P.mun.L1[m] + P.mun.B1[m] + P.mun.O1[m];
    oUF[P.mun.uf[m]] += P.mun.O1[m];
    tUF[P.mun.uf[m]] += T1;
  }
  for (let u = 0; u < nU; u++) oUF[u] = tUF[u] > 0 ? oUF[u] / tUF[u] : 0;

  const pl = Projecao.placar(P, E);
  const peso = K / (K + pl.pct);
  const DELTA = A - FIN1;
  let Ladd = 0,
    Rtot = 0,
    vPes = 0;
  const RU = new Float64Array(nU),
    shat = new Float64Array(P.n);
  for (let m = 0; m < P.n; m++) {
    const Rm = pr.R[m];
    if (Rm <= 0) continue;
    const u = P.mun.uf[m],
      e = pr.ref[u];
    const nm = E.L[m] + E.B[m];
    const w = nm > 0 ? nm / (nm + PRM.k) : 0;
    const baseA = P.l[m] + e.par * P.o[m];
    const ind = P.b[m] + DELTA;
    const base = peso * ind + (1 - peso) * baseA;
    const s = Math.min(0.99, Math.max(0.01, nm > 0 ? base + w * (E.L[m] / nm - base) : base));
    Ladd += Rm * s;
    Rtot += Rm;
    RU[u] += Rm;
    shat[m] = s;
    vPes += sq(Rm * (1 - w) * 0.15 * P.o[m]);
  }
  for (let u = 0; u < nU; u++) vPes += sq(RU[u] * 0.13 * oUF[u]);
  vPes += sq(Rtot * 0.015);
  const Vp = pl.V + Rtot;
  const Pp = (pl.L + Ladd) / Vp;
  const sPes = Math.sqrt(vPes) / Vp;
  return { peso, P: Pp, s: Math.sqrt(sq(peso * sPes) + sq((1 - peso) * pr.sigma)), shat };
}
