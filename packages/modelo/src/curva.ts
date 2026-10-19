import type { Constantes } from "./constantes.ts";
import { Z_95 } from "./normal.ts";
import type { Apuracao, Modelo, Projecao, ViradaProjetada } from "./projecao.ts";

// A curva projetada: o placar parcial daqui até 100% das seções, somando o voto que falta de cada município
// conforme a ordem de chegada. O tempo da curva é o % de seções do país: no Brasil, os passos são os do
// protótipo; em cada UF e no Exterior, os pontos ficam espalhados por igual no % de seções do próprio lugar.

export interface PontoDaCurva {
  /** O % de seções totalizadas do lugar. */
  x: number;
  /** O placar parcial projetado. */
  y: number;
  /** O desvio padrão do placar projetado: a faixa de 95% é `y ± Z_95 × desvio`. */
  desvio: number;
}

export interface CurvaDoLugar {
  /** Do placar parcial de agora (se já há votos) até 100% das seções. */
  pontos: PontoDaCurva[];
  /** `null` quando a curva tem menos de dois pontos, como num lugar que terminou. */
  virada: ViradaProjetada | null;
}

export interface CurvasProjetadas {
  brasil: CurvaDoLugar;
  /** Cada UF e o Exterior. */
  ufs: Record<string, CurvaDoLugar>;
}

/** Os passos da curva: o placar de agora, mais 50 pontos até 100% das seções. */
const PASSOS = 50;

/**
 * A virada projetada de uma curva: onde muda quem lidera, com a faixa em que isso pode acontecer, de quando a
 * margem de quem está atrás encosta em 50% até quando a curva toda passa de 50%.
 */
export function viradaProjetada(pontos: PontoDaCurva[]): ViradaProjetada | null {
  if (pontos.length < 2) return null;
  const lider = pontos[0]!.y > 0.5 ? 0 : 1;
  const atras = (p: PontoDaCurva) => (lider === 0 ? 1 - p.y : p.y);
  const cruza = (f: (p: PontoDaCurva) => number) => {
    for (let i = 1; i < pontos.length; i++) {
      const a = f(pontos[i - 1]!);
      const b = f(pontos[i]!);
      if (a <= 0.5 && b > 0.5) return pontos[i - 1]!.x + ((0.5 - a) / (b - a)) * (pontos[i]!.x - pontos[i - 1]!.x);
    }
    return null;
  };
  const x = cruza(atras);
  return {
    x,
    cedo: cruza((p) => atras(p) + Z_95 * p.desvio),
    tarde: x === null ? null : cruza((p) => atras(p) - Z_95 * p.desvio),
    quem: x === null ? lider : 1 - lider,
  };
}

/** A curva projetada do Brasil, de cada UF e do Exterior, com a virada projetada de cada um. */
export function curvaProjetada(modelo: Modelo, apuracao: Apuracao, projecao: Projecao, constantes: Constantes): CurvasProjetadas {
  const nUfs = modelo.ufs.length;
  // Agora, por UF: seções, votos dos finalistas, votos do 1º finalista e o voto que falta.
  const secoes = new Float64Array(nUfs);
  const secoesTotais = new Float64Array(nUfs);
  const votos = new Float64Array(nUfs);
  const votos1 = new Float64Array(nUfs);
  const votoQueFalta = new Float64Array(nUfs);
  apuracao.forEach((a, m) => {
    const u = modelo.ufDoMunicipio[m]!;
    secoes[u]! += a.secoes;
    secoesTotais[u]! += a.secoesTotais;
    votos[u]! += a.votos[0]! + a.votos[1]!;
    votos1[u]! += a.votos[0]!;
    votoQueFalta[u]! += projecao.votoQueFalta[m]!;
  });
  const soma = (v: Float64Array) => v.reduce((s, x) => s + x, 0);
  const p0 = soma(secoesTotais) > 0 ? (100 * soma(secoes)) / soma(secoesTotais) : 0;

  // Antes de 2% das seções, o ritmo da noite ainda não diz nada: a "mistura" fica só com o 1º turno, e o
  // "ritmo da noite" supõe que o que falta chega misturado, cada município na mesma proporção.
  const ordem = p0 >= 2 ? constantes.ordemDeChegada : constantes.ordemDeChegada === "ritmo-da-noite" ? "proporcional" : "primeiro-turno";

  // O ritmo da noite em cada UF: a fração do que falta nela que chega a cada ponto percentual do país.
  const ritmo = Float64Array.from(modelo.ufs, (_, u) => {
    const c0 = secoesTotais[u]! > 0 ? secoes[u]! / secoesTotais[u]! : 1;
    return c0 < 1 ? c0 / (p0 / 100) / (1 - c0) : 1e9;
  });

  // O que falta, por UF, em seções (0), votos (1) e votos do 1º finalista (2), e o que dele chega até cada %
  // inteiro do país no ritmo do 1º turno. O perfil de chegada é linear entre os pontos inteiros, e o que chega
  // também: os pontos inteiros bastam. Os municípios que já tinham chegado inteiros naquele ponto do 1º turno
  // ficam à parte e chegam na mesma proporção que o país.
  const primeiro = Math.floor(p0) + 1;
  const tres = (tamanho: number) => [new Float64Array(tamanho), new Float64Array(tamanho), new Float64Array(tamanho)] as const;
  const falta = tres(nUfs);
  const misturado = tres(nUfs);
  const noPrimeiroTurno = tres(nUfs * 101);
  const { perfil } = modelo;
  apuracao.forEach((a, m) => {
    const s = a.secoesTotais - a.secoes;
    if (s <= 0) return;
    const u = modelo.ufDoMunicipio[m]!;
    const partes = [s, projecao.votoQueFalta[m]!, projecao.votoQueFalta[m]! * projecao.fatiaDoQueFalta[m]!];
    partes.forEach((p, k) => (falta[k]![u]! += p));
    // o perfil em p0, entre os dois pontos inteiros em volta
    const i0 = Math.min(99, Math.floor(p0));
    const f0 = p0 >= 100 ? 1 : perfil[m * 101 + i0]! * (1 - (p0 - i0)) + perfil[m * 101 + i0 + 1]! * (p0 - i0);
    if (f0 >= 0.999) {
      partes.forEach((p, k) => (misturado[k]![u]! += p));
      return;
    }
    for (let j = primeiro; j <= 100; j++) {
      const f = Math.max(0, Math.min(1, (perfil[m * 101 + j]! - f0) / (1 - f0)));
      noPrimeiroTurno[0][u * 101 + j]! += f * partes[0]!;
      noPrimeiroTurno[1][u * 101 + j]! += f * partes[1]!;
      noPrimeiroTurno[2][u * 101 + j]! += f * partes[2]!;
    }
  });

  /** A parte `k` do que falta na UF que chega até o % `x` do país, de p0 a 100 (o fim, em que tudo chega, fica de fora). */
  const chega = (k: 0 | 1 | 2, u: number, x: number): number => {
    const total = falta[k][u]!;
    if (total === 0) return 0;
    const proporcao = (x - p0) / (100 - p0);
    if (ordem === "proporcional") return proporcao * total;
    const noRitmo = Math.min(1, (ritmo[u]! * (x - p0)) / 100) * total;
    if (ordem === "ritmo-da-noite") return noRitmo;
    // no 1º turno: de 0 em p0, linear até o primeiro ponto inteiro; depois, entre os pontos inteiros
    const k1 = noPrimeiroTurno[k];
    const i = Math.min(99, Math.floor(x));
    const ate = x <= primeiro ? ((x - p0) / (primeiro - p0)) * k1[u * 101 + primeiro]! : k1[u * 101 + i]! * (1 - (x - i)) + k1[u * 101 + i + 1]! * (x - i);
    const noPrimeiro = ate + proporcao * misturado[k][u]!;
    return ordem === "primeiro-turno" ? noPrimeiro : (noPrimeiro + noRitmo) / 2;
  };
  const chegaAte = (u: number, x: number, ultimo: boolean): [number, number, number] =>
    ultimo ? [falta[0][u]!, falta[1][u]!, falta[2][u]!] : [chega(0, u, x), chega(1, u, x), chega(2, u, x)];

  const ufs: Record<string, CurvaDoLugar> = {};
  const brasil = {
    secoes: soma(secoes),
    secoesTotais: soma(secoesTotais),
    votos: soma(votos),
    votos1: soma(votos1),
    falta: soma(votoQueFalta),
    validos: projecao.brasil.validos,
    desvio: projecao.brasil.desvio,
  };
  /** O ponto da curva de um lugar com o que chegou dele: `[seções, votos, votos do 1º finalista]`. */
  const ponto = (l: typeof brasil, [s, v, v1]: [number, number, number]): PontoDaCurva | null => {
    const total = l.votos + v;
    if (total <= 0) return null;
    return { x: (100 * (l.secoes + s)) / l.secoesTotais, y: (l.votos1 + v1) / total, desvio: l.falta > 0 ? (l.desvio * l.validos * (v / l.falta)) / total : 0 };
  };
  const comecaEm = (l: typeof brasil): PontoDaCurva[] => (l.votos > 0 ? [{ x: (100 * l.secoes) / l.secoesTotais, y: l.votos1 / l.votos, desvio: 0 }] : []);

  const pontosDoBrasil = comecaEm(brasil);
  for (let passo = 1; passo <= PASSOS; passo++) {
    const x = p0 + ((100 - p0) * passo) / PASSOS;
    const chegou: [number, number, number] = [0, 0, 0];
    for (let u = 0; u < nUfs; u++) chegaAte(u, x, passo === PASSOS).forEach((c, i) => (chegou[i]! += c));
    const p = ponto(brasil, chegou);
    if (p) pontosDoBrasil.push(p);
  }

  modelo.ufs.forEach((sigla, u) => {
    const r = projecao.ufs[sigla]!;
    const uf = { secoes: secoes[u]!, secoesTotais: secoesTotais[u]!, votos: votos[u]!, votos1: votos1[u]!, falta: votoQueFalta[u]!, validos: r.validos, desvio: r.desvio };
    const pontos = comecaEm(uf);
    if (falta[0][u]! > 0) {
      // As seções que chegam na UF crescem com o % do país, em linha reta entre os pontos inteiros e o joelho em
      // que o ritmo da noite termina a UF. Cada ponto da curva da UF sai da reta certa, entre dois desses nós.
      const nos = [p0];
      for (let j = primeiro; j < 100; j++) nos.push(j);
      const joelho = p0 + 100 / ritmo[u]!;
      if (ordem !== "primeiro-turno" && ordem !== "proporcional" && joelho > p0 && joelho < 100) nos.push(joelho);
      nos.push(100);
      nos.sort((a, b) => a - b);
      const chegadas = nos.map((x) => chega(0, u, x));
      let i = 0;
      for (let passo = 1; passo < PASSOS; passo++) {
        const alvo = (falta[0][u]! * passo) / PASSOS;
        while (i < nos.length - 1 && chegadas[i + 1]! < alvo) i++;
        if (i === nos.length - 1) break;
        const [a, b] = [chegadas[i]!, chegadas[i + 1]!];
        const x = b > a ? nos[i]! + ((alvo - a) / (b - a)) * (nos[i + 1]! - nos[i]!) : nos[i + 1]!;
        const p = ponto(uf, [alvo, chega(1, u, x), chega(2, u, x)]);
        if (p) pontos.push(p);
      }
      const p = ponto(uf, chegaAte(u, 100, true));
      if (p) pontos.push(p);
    }
    ufs[sigla] = { pontos, virada: viradaProjetada(pontos) };
  });

  return { brasil: { pontos: pontosDoBrasil, virada: viradaProjetada(pontosDoBrasil) }, ufs };
}
