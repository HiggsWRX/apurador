// O módulo `Projecao` do protótipo do método, copiado sem mudança como referência dos testes do porte fiel.
// Origem: branch `prototipo/metodo-projecao`, commit 405cb3f, prototipos/metodo-projecao/template.html, linhas 133 a 373.
// Não é código de produção: só os testes o importam, para rodar o protótipo sobre os mesmos dados que o modelo.

// ============================================================================
// Módulo de projeção: funções puras sobre dados simples. Não toca no DOM.
// É a parte que pode ser levada para o código real.
// ============================================================================
const Projecao = (() => {
  const MIN_PAI = 2000; // votos válidos apurados mínimos para um nível (UF, região) servir de referência
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sq = (x) => x * x;

  // Φ, função de distribuição da normal padrão
  function phi(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  // Derivados do 1º turno, por município.
  function preparar(D) {
    const n = D.mun.uf.length,
      M = D.mun;
    const b = new Float64Array(n),
      l = new Float64Array(n),
      o = new Float64Array(n),
      r1 = new Float64Array(n);
    for (let m = 0; m < n; m++) {
      const T1 = M.L1[m] + M.B1[m] + M.O1[m];
      b[m] = M.L1[m] + M.B1[m] > 0 ? M.L1[m] / (M.L1[m] + M.B1[m]) : 0.5; // fatia de Lula entre os dois, no 1T
      l[m] = T1 > 0 ? M.L1[m] / T1 : 0.5; // fatia de Lula nos válidos do 1T
      o[m] = T1 > 0 ? M.O1[m] / T1 : 0; // fatia dos outros candidatos no 1T
      r1[m] = M.aptos1[m] > 0 ? T1 / M.aptos1[m] : 0.8; // válidos por eleitor apto no 1T
    }
    return { ...D, n, b, l, o, r1 };
  }

  // Apuração acumulada até a fotografia k (k = -1: nada apurado).
  function apuracaoNaFoto(P, k) {
    const E = { k, sec: new Float64Array(P.n), aptos: new Float64Array(P.n), L: new Float64Array(P.n), B: new Float64Array(P.n) };
    for (let j = 0; j <= k; j++) somarFoto(P, E, j);
    return E;
  }
  function somarFoto(P, E, j) {
    const ev = P.fotos[j].ev;
    for (let i = 0; i < ev.length; i += 5) {
      const m = ev[i];
      E.sec[m] += ev[i + 1];
      E.aptos[m] += ev[i + 2];
      E.L[m] += ev[i + 3];
      E.B[m] += ev[i + 4];
    }
    E.k = j;
  }

  function placar(P, E) {
    let L = 0,
      B = 0,
      s = 0;
    for (let m = 0; m < P.n; m++) {
      L += E.L[m];
      B += E.B[m];
      s += E.sec[m];
    }
    return { L, B, V: L + B, secoes: s, pct: (100 * s) / P.N, lula: L + B > 0 ? L / (L + B) : null };
  }

  // Referência de cada UF: a variação média (métodos de variação) ou a fração dos "outros" que foi para Lula
  // (transferência), com recuo UF -> região -> Brasil -> 1º turno quando falta dado.
  function estimarReferencias(P, E, metodo) {
    const nU = P.ufs.length,
      nR = P.regioes.length;
    const novo = () => ({ W: 0, Sx: 0, Syo: 0, Soo: 0 });
    const U = Array.from({ length: nU }, novo),
      R = Array.from({ length: nR }, novo),
      BR = novo();
    for (let m = 0; m < P.n; m++) {
      const nm = E.L[m] + E.B[m];
      if (nm <= 0) continue;
      const s = E.L[m] / nm,
        u = P.mun.uf[m];
      for (const g of [U[u], R[P.ufRegiao[u]], BR]) {
        g.W += nm;
        g.Sx += nm * (s - P.b[m]);
        g.Syo += nm * (s - P.l[m]) * P.o[m];
        g.Soo += nm * P.o[m] * P.o[m];
      }
    }
    const transf = metodo === "transferencia";
    const valor = (g) => (transf ? (g.Soo > 0 ? clamp(g.Syo / g.Soo, 0, 1) : 0.5) : g.W > 0 ? g.Sx / g.W : 0);
    const prever = (m, par) => (transf ? P.l[m] + par * P.o[m] : P.b[m] + par);
    const ref = [];
    for (let u = 0; u < nU; u++) {
      const r = P.ufRegiao[u];
      let g = null,
        fonte = "1º turno";
      if (U[u].W >= MIN_PAI) {
        g = U[u];
        fonte = "UF";
      } else if (R[r].W >= MIN_PAI) {
        g = R[r];
        fonte = "região";
      } else if (BR.W >= MIN_PAI) {
        g = BR;
        fonte = "Brasil";
      }
      ref.push({ par: g ? valor(g) : transf ? 0.5 : 0, fonte });
    }
    // dispersão dos municípios em torno da referência da sua UF
    const RS = Array.from({ length: nU }, () => ({ W: 0, S2: 0, W2: 0, c: 0 }));
    for (let m = 0; m < P.n; m++) {
      const nm = E.L[m] + E.B[m];
      if (nm <= 0) continue;
      const u = P.mun.uf[m],
        res = E.L[m] / nm - prever(m, ref[u].par),
        g = RS[u];
      g.W += nm;
      g.S2 += nm * res * res;
      g.W2 += nm * nm;
      g.c++;
    }
    let tW = 0,
      tS2 = 0;
    for (const g of RS) {
      tW += g.W;
      tS2 += g.S2;
    }
    const sdBR = tW > 0 ? Math.sqrt(tS2 / tW) : 0.04;
    // UFs que herdam a mesma referência (da região, do Brasil ou do 1º turno) erram juntas: mesmo "grupo".
    return ref.map((e, u) => {
      const g = RS[u];
      const sdRes = Math.max(0.005, g.c >= 5 ? Math.sqrt(g.S2 / g.W) : sdBR);
      const neff = g.W > 0 ? (g.W * g.W) / g.W2 : 0;
      const se = e.fonte === "UF" ? sdRes / Math.sqrt(Math.max(neff, 1)) : e.fonte === "1º turno" ? 0.04 : 0.02;
      const grupo = e.fonte === "UF" ? "uf" + u : e.fonte === "região" ? "r" + P.ufRegiao[u] : e.fonte;
      return { ...e, sdRes, se, grupo };
    });
  }

  // Projeção do resultado final.
  // metodo: 'placar' | 'uf' | 'municipio' | 'transferencia'
  // prm: { tau: incerteza regional (p.p.), delta: incerteza nacional (p.p.), k: votos para o município valer metade }
  function projetar(P, E, metodo, prm) {
    const pl = placar(P, E);
    const R = new Float64Array(P.n),
      shat = new Float64Array(P.n);
    let num = 0,
      den = 0;
    for (let m = 0; m < P.n; m++)
      if (E.aptos[m] > 0) {
        num += E.L[m] + E.B[m];
        den += E.aptos[m] * P.r1[m];
      }
    const rho = den > 0 ? num / den : 1; // válidos do 2T em relação ao 1T, onde já chegou
    const ref = metodo === "placar" ? null : estimarReferencias(P, E, metodo);
    const RU = new Float64Array(P.ufs.length);
    const pl0 = pl.V > 0 ? pl.L / pl.V : 0.5;
    let varInd = 0,
      Rtot = 0,
      Ladd = 0;
    for (let m = 0; m < P.n; m++) {
      const remA = Math.max(0, P.mun.A[m] - E.aptos[m]);
      if (remA <= 0) continue;
      const nm = E.L[m] + E.B[m];
      const Rm = remA * (E.aptos[m] >= 300 && nm > 0 ? nm / E.aptos[m] : P.r1[m] * rho);
      let s = pl0;
      if (ref) {
        const u = P.mun.uf[m],
          e = ref[u];
        const base = metodo === "transferencia" ? P.l[m] + e.par * P.o[m] : P.b[m] + e.par;
        const w = metodo !== "uf" && nm > 0 ? nm / (nm + prm.k) : 0;
        s = nm > 0 ? base + w * (E.L[m] / nm - base) : base;
        RU[u] += Rm;
        varInd += Rm * Rm * (1 - w) * e.sdRes * e.sdRes;
      }
      s = clamp(s, 0.01, 0.99);
      R[m] = Rm;
      shat[m] = s;
      Rtot += Rm;
      Ladd += Rm * s;
    }
    const Vp = pl.V + Rtot,
      Pp = Vp > 0 ? (pl.L + Ladd) / Vp : 0.5;
    if (!ref) return { P: pl.V > 0 ? Pp : null, sigma: null, chance: null, R, shat, Rtot, Vp };
    let v = varInd + sq((Rtot * prm.delta) / 100);
    const grupos = new Map();
    for (let u = 0; u < RU.length; u++) {
      v += sq((RU[u] * prm.tau) / 100);
      const g = grupos.get(ref[u].grupo) || { R: 0, se: ref[u].se };
      g.R += RU[u];
      grupos.set(ref[u].grupo, g);
    }
    for (const g of grupos.values()) v += sq(g.R * g.se);
    const sigma = Math.sqrt(v) / Vp;
    return { P: Pp, sigma, chance: sigma > 0 ? phi((Pp - 0.5) / sigma) : Pp > 0.5 ? 1 : 0, R, shat, Rtot, Vp, ref };
  }

  // Fração das seções do município m que já tinham chegado no 1º turno quando o país tinha x% das seções.
  function perfil(P, m, x) {
    const Q = P.perfilQ,
      base = m * Q.length;
    if (x >= 100) return 1;
    if (x <= 0) return P.perfil1T[base] / 1000;
    const i = Math.min(Q.length - 2, Math.floor(x / (Q[1] - Q[0])));
    const t = (x - Q[i]) / (Q[i + 1] - Q[i]);
    return (P.perfil1T[base + i] * (1 - t) + P.perfil1T[base + i + 1] * t) / 1000;
  }

  // Curva projetada: o placar parcial daqui até 100%, somando o que falta de cada município
  // segundo um modelo de ordem de chegada:
  //   'turno1'       no ritmo em que o município chegou no 1º turno;
  //   'proporcional' o que falta chega misturado, cada município na mesma proporção;
  //   'ritmo'        cada UF continua no ritmo que mostrou até agora nesta noite;
  //   'mistura'      média de 'turno1' e 'ritmo'.
  function curvaProjetada(P, E, pr, passos = 50, ordem = "mistura") {
    const pl = placar(P, E),
      p0 = pl.pct;
    if (ordem !== "turno1" && ordem !== "proporcional" && p0 < 2) ordem = ordem === "mistura" ? "turno1" : "proporcional";
    const cU = new Float64Array(P.ufs.length),
      sU = new Float64Array(P.ufs.length);
    for (let m = 0; m < P.n; m++) {
      cU[P.mun.uf[m]] += E.sec[m];
      sU[P.mun.uf[m]] += P.mun.S[m];
    }
    const lista = [];
    for (let m = 0; m < P.n; m++) {
      const remS = P.mun.S[m] - E.sec[m];
      if (remS <= 0) continue;
      const u = P.mun.uf[m],
        c0 = cU[u] / sU[u];
      // ritmo: fração da UF que falta e chega a cada ponto percentual nacional, no ritmo observado
      lista.push([m, remS, perfil(P, m, p0), c0 < 1 ? c0 / (p0 / 100) / (1 - c0) : 1e9]);
    }
    const pts = pl.V > 0 ? [{ x: p0, y: pl.lula, sd: 0 }] : [];
    for (let st = 1; st <= passos; st++) {
      const x = p0 + ((100 - p0) * st) / passos;
      let aS = 0,
        aV = 0,
        aL = 0;
      for (const [m, remS, F0, vel] of lista) {
        const f1 = () => (F0 >= 0.999 ? (x - p0) / (100 - p0) : clamp((perfil(P, m, x) - F0) / (1 - F0), 0, 1));
        const fr =
          st === passos
            ? 1
            : ordem === "proporcional"
              ? (x - p0) / (100 - p0)
              : ordem === "ritmo"
                ? clamp((vel * (x - p0)) / 100, 0, 1)
                : ordem === "mistura"
                  ? (f1() + clamp((vel * (x - p0)) / 100, 0, 1)) / 2
                  : f1();
        aS += fr * remS;
        aV += fr * pr.R[m];
        aL += fr * pr.R[m] * pr.shat[m];
      }
      const V = pl.V + aV;
      if (V <= 0) continue;
      const sd = pr.sigma != null && pr.Rtot > 0 ? (pr.sigma * pr.Vp * (aV / pr.Rtot)) / V : 0;
      pts.push({ x: (100 * (pl.secoes + aS)) / P.N, y: (pl.L + aL) / V, sd });
    }
    return pts;
  }

  // Ponto da curva projetada em que muda quem lidera, com a faixa em que isso pode acontecer:
  // de quando a margem do candidato atrás encosta em 50% até quando a curva toda passa de 50%.
  function viradaProjetada(pts) {
    if (pts.length < 2) return null;
    const lider0 = pts[0].y > 0.5 ? "L" : "B";
    const atras = (p) => (lider0 === "L" ? 1 - p.y : p.y); // fatia de quem está atrás agora
    const cruza = (f) => {
      for (let i = 1; i < pts.length; i++) {
        const a = f(pts[i - 1]),
          b = f(pts[i]);
        if (a <= 0.5 && b > 0.5) return pts[i - 1].x + ((0.5 - a) / (b - a)) * (pts[i].x - pts[i - 1].x);
      }
      return null;
    };
    const x = cruza(atras);
    return {
      x,
      quem: x == null ? lider0 : lider0 === "L" ? "B" : "L",
      cedo: cruza((p) => atras(p) + 1.96 * p.sd),
      tarde: x == null ? null : cruza((p) => atras(p) - 1.96 * p.sd),
    };
  }

  // Roda o método na noite inteira e resume o desempenho.
  function testar(P, metodo, prm) {
    const fim = P.final.L / (P.final.L + P.final.B),
      lulaVence = fim > 0.5;
    const E = apuracaoNaFoto(P, -1),
      linhas = [],
      viradas = {};
    const marcos = [20, 40, 60];
    for (let j = 0; j < P.fotos.length; j++) {
      somarFoto(P, E, j);
      const pr = projetar(P, E, metodo, prm),
        pl = placar(P, E);
      linhas.push({ p: pl.pct, P: pr.P, sigma: pr.sigma, chance: pr.chance, erro: pr.P == null ? null : 100 * Math.abs(pr.P - fim) });
      for (const mk of marcos) if (viradas[mk] === undefined && pl.pct >= mk) viradas[mk] = viradaProjetada(curvaProjetada(P, E, pr, 40, prm.ordem));
    }
    const erroEm = (pct) => {
      const l = linhas.find((l) => l.p >= pct);
      return l ? l.erro : null;
    };
    const desde = (ok) => {
      let d = null;
      for (const l of linhas) {
        if (ok(l)) {
          if (d === null) d = l.p;
        } else d = null;
      }
      return d;
    };
    const comS = linhas.filter((l) => l.sigma != null);
    return {
      metodo,
      linhas,
      viradas,
      erro5: erroEm(5),
      erro25: erroEm(25),
      erro50: erroEm(50),
      acertaDesde: desde((l) => l.P != null && l.P > 0.5 === lulaVence),
      chance95Desde: comS.length ? desde((l) => l.chance != null && (lulaVence ? l.chance : 1 - l.chance) >= 0.95) : null,
      cobertura: comS.length ? comS.filter((l) => Math.abs(l.P - fim) <= 1.96 * l.sigma).length / comS.length : null,
      brier: comS.length ? comS.reduce((s, l) => s + sq(l.chance - (lulaVence ? 1 : 0)), 0) / comS.length : null,
    };
  }

  return { preparar, apuracaoNaFoto, placar, projetar, curvaProjetada, viradaProjetada, testar };
})();

export { Projecao };
