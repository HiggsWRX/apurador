import type { Constantes } from "./constantes.ts";
import { phi, Z_95 } from "./normal.ts";

// A projeção da base "Só apuração", portada do módulo `Projecao` do protótipo do método (branch
// `prototipo/metodo-projecao`): transferência de votos estimada por UF nos municípios já apurados, corrigida
// pelo placar parcial do próprio município, com incerteza analítica e normal. Funções puras sobre dados
// simples, sem rede nem DOM: o coletor, o simulador no navegador, o pipeline e a calibração usam o mesmo código.
//
// As fatias são frações, de 0 a 1, do 1º finalista da base nos votos válidos dos dois finalistas. O % de seções
// totalizadas vai de 0 a 100.

/** O 1º turno de um município, como na base do modelo (`dados/bases`). */
export interface MunicipioDaBase {
  uf: string;
  municipio: number;
  aptos: number;
  /** As seções do 1º turno, o denominador do perfil de chegada. */
  secoes: number;
  validos: number;
  /** Os votos de cada finalista, na ordem de `BaseDoModelo.finalistas`. Os eliminados ficam com o resto dos válidos. */
  votos: number[];
  /** O perfil de chegada em degraus `[x, seções]`: com x% das seções do país, o município tinha `seções` totalizadas. */
  degrausDeChegada: [number, number][];
}

/** A base do modelo de uma noite: o 1º turno de cada município, com os dois finalistas da noite. */
export interface BaseDoModelo {
  finalistas: { numero: number }[];
  municipios: MunicipioDaBase[];
}

/** A apuração de um município agora, como o arquivo do TSE dele a dá. */
export interface ApuracaoDoMunicipio {
  /** As seções totalizadas. */
  secoes: number;
  /** Todas as seções do município na noite, o denominador do % de seções totalizadas. */
  secoesTotais: number;
  /** Os eleitores aptos das seções totalizadas. */
  aptos: number;
  aptosTotais: number;
  /** Os votos de cada finalista nas seções totalizadas, na ordem dos finalistas da base. */
  votos: number[];
}

/** A apuração de cada município, na ordem da base. */
export type Apuracao = ApuracaoDoMunicipio[];

/** A base preparada para projetar muitas vezes: o que o 1º turno diz de cada município, em vetores. */
export interface Modelo {
  /** Os números dos dois finalistas, na ordem da base. */
  finalistas: number[];
  /** Os municípios, na ordem da base. */
  municipios: { uf: string; municipio: number }[];
  /** As UFs e o Exterior (`ZZ`), na ordem da base. */
  ufs: string[];
  /** A posição da UF de cada município em `ufs`. */
  ufDoMunicipio: Int32Array;
  /** A região de cada UF, ou -1 no Exterior, que não tem região. */
  regiaoDaUf: Int32Array;
  /** Por município, no 1º turno: o placar entre finalistas (a fatia do 1º finalista nos votos dos dois). */
  placarEntreFinalistas: Float64Array;
  /** Por município, no 1º turno: a fatia do 1º finalista nos válidos. */
  fatiaNosValidos: Float64Array;
  /** Por município, no 1º turno: a fatia dos eliminados nos válidos. */
  fatiaDosEliminados: Float64Array;
  /** Por município, no 1º turno: os válidos por eleitor apto. */
  validosPorApto: Float64Array;
  /** O perfil de chegada: a fração das seções do município que tinha chegado com cada % inteiro das seções do país, 101 por município. */
  perfil: Float64Array;
}

/** As cinco regiões, na ordem em que entram em `Modelo.regiaoDaUf`. O Exterior não tem região. */
export const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
const REGIAO_DA_UF: Record<string, number> = {
  ...Object.fromEntries("AC AM AP PA RO RR TO".split(" ").map((uf) => [uf, 0])),
  ...Object.fromEntries("AL BA CE MA PB PE PI RN SE".split(" ").map((uf) => [uf, 1])),
  ...Object.fromEntries("DF GO MS MT".split(" ").map((uf) => [uf, 2])),
  ...Object.fromEntries("ES MG RJ SP".split(" ").map((uf) => [uf, 3])),
  ...Object.fromEntries("PR RS SC".split(" ").map((uf) => [uf, 4])),
  ZZ: -1,
};

export function prepararModelo(base: BaseDoModelo): Modelo {
  if (base.finalistas.length !== 2) throw new Error(`a base do modelo tem ${base.finalistas.length} finalistas, e não 2`);
  const n = base.municipios.length;
  const ufs = [...new Set(base.municipios.map((m) => m.uf))];
  const posicaoDaUf = new Map(ufs.map((uf, i) => [uf, i]));
  const modelo: Modelo = {
    finalistas: base.finalistas.map((f) => f.numero),
    municipios: base.municipios.map((m) => ({ uf: m.uf, municipio: m.municipio })),
    ufs,
    ufDoMunicipio: Int32Array.from(base.municipios, (m) => posicaoDaUf.get(m.uf)!),
    regiaoDaUf: Int32Array.from(ufs, (uf) => {
      const r = REGIAO_DA_UF[uf];
      if (r === undefined) throw new Error(`a base do modelo tem uma UF desconhecida: ${uf}`);
      return r;
    }),
    placarEntreFinalistas: new Float64Array(n),
    fatiaNosValidos: new Float64Array(n),
    fatiaDosEliminados: new Float64Array(n),
    validosPorApto: new Float64Array(n),
    perfil: new Float64Array(n * 101),
  };
  base.municipios.forEach((m, i) => {
    const [a, b] = m.votos as [number, number];
    modelo.placarEntreFinalistas[i] = a + b > 0 ? a / (a + b) : 0.5;
    modelo.fatiaNosValidos[i] = m.validos > 0 ? a / m.validos : 0.5;
    modelo.fatiaDosEliminados[i] = m.validos > 0 ? (m.validos - a - b) / m.validos : 0;
    modelo.validosPorApto[i] = m.aptos > 0 ? m.validos / m.aptos : 0.8;
    let degrau = 0;
    let chegadas = 0;
    for (let x = 0; x <= 100; x++) {
      while (degrau < m.degrausDeChegada.length && m.degrausDeChegada[degrau]![0] <= x) chegadas = m.degrausDeChegada[degrau++]![1];
      modelo.perfil[i * 101 + x] = m.secoes > 0 ? chegadas / m.secoes : 0;
    }
  });
  return modelo;
}

/** De onde vem a transferência de votos de uma UF: dela, da região, do Brasil ou, sem apuração, do 1º turno. */
export type FonteDaReferencia = "UF" | "região" | "Brasil" | "1º turno";

export type SinalDeVirada = "virada projetada" | "virada possível" | "sem sinal de virada";

export interface ResultadoDoLugar {
  /** O % de seções totalizadas. */
  secoes: number;
  /** O placar parcial, ou `null` sem votos válidos apurados. */
  placar: number | null;
  /** A fatia final projetada. */
  projecao: number;
  /** O desvio padrão da projeção. */
  desvio: number;
  /** A margem de 95%: a projeção fica entre `projecao ± margem` com 95% de chance. */
  margem: number;
  /** A chance de vitória do 1º finalista: a probabilidade de a fatia final passar de 50%. */
  chance: number;
  /** Os votos válidos dos dois finalistas no fim, projetados: os apurados mais o voto que falta. */
  validos: number;
  /** A chance de vitória de quem está atrás no placar parcial, ou `null` se ninguém está atrás. */
  chanceDeVirada: number | null;
  sinalDeVirada: SinalDeVirada | null;
}

export interface ResultadoDaUf extends ResultadoDoLugar {
  referencia: FonteDaReferencia;
}

/** A virada projetada: o ponto e a faixa de % de seções em que a curva projetada de um lugar muda de líder. */
export interface ViradaProjetada {
  /** Onde a curva projetada cruza 50%, ou `null` se ela não cruza. */
  x: number | null;
  /** Desde quando a virada é possível: onde a margem de quem está atrás encosta em 50%. */
  cedo: number | null;
  /** Até quando: onde a faixa toda passa de 50%. Só existe com o ponto. */
  tarde: number | null;
  /** O finalista (0 ou 1) que lidera no fim da curva: quem vira, se houver virada. */
  quem: number;
}

export interface ResultadoDoMunicipio extends ResultadoDoLugar {
  virada: ViradaProjetada;
}

export interface Projecao {
  brasil: ResultadoDoLugar;
  ufs: Record<string, ResultadoDaUf>;
  /** Na ordem da base. */
  municipios: ResultadoDoMunicipio[];
  /** Por município, o que a curva projetada usa: os votos válidos que faltam, estimados. */
  votoQueFalta: Float64Array;
  /** Por município, a fatia estimada do 1º finalista no voto que falta. */
  fatiaDoQueFalta: Float64Array;
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

interface Referencia {
  fonte: FonteDaReferencia;
  /** A fração dos votos dos eliminados que vai para o 1º finalista, ou `null` no recuo "1º turno". */
  transferencia: number | null;
  /** A dispersão dos municípios da UF em torno da referência. */
  dispersao: number;
  /** O erro estatístico da referência. */
  erro: number;
  /** As UFs que herdam a mesma referência erram juntas: têm o mesmo grupo. */
  grupo: string;
}

/**
 * A fatia do 1º finalista que a referência dá para o voto que falta de um município: o 1º turno do município
 * com a transferência dos eliminados, ou, no recuo "1º turno", o placar entre finalistas do município.
 */
const estimar = (modelo: Modelo, m: number, transferencia: number | null) =>
  transferencia === null ? modelo.placarEntreFinalistas[m]! : modelo.fatiaNosValidos[m]! + transferencia * modelo.fatiaDosEliminados[m]!;

/** A referência de cada UF, com recuo UF → região → Brasil → 1º turno quando um nível tem menos que o mínimo de votos. */
function estimarReferencias(modelo: Modelo, apuracao: Apuracao, minimo: number): Referencia[] {
  // Mínimos quadrados da fatia apurada contra a do 1º turno: Σ n·(s − l)·o ÷ Σ n·o², por nível.
  const nivel = () => ({ votos: 0, sxo: 0, soo: 0 });
  const ufs = modelo.ufs.map(nivel);
  const regioes = REGIOES.map(nivel);
  const brasil = nivel();
  const somar = (g: { votos: number; sxo: number; soo: number }, n: number, sxo: number, soo: number) => {
    g.votos += n;
    g.sxo += sxo;
    g.soo += soo;
  };
  apuracao.forEach((a, m) => {
    const n = a.votos[0]! + a.votos[1]!;
    if (n <= 0) return;
    const u = modelo.ufDoMunicipio[m]!;
    const r = modelo.regiaoDaUf[u]!;
    const o = modelo.fatiaDosEliminados[m]!;
    const sxo = n * (a.votos[0]! / n - modelo.fatiaNosValidos[m]!) * o;
    const soo = n * o * o;
    somar(ufs[u]!, n, sxo, soo);
    if (r >= 0) somar(regioes[r]!, n, sxo, soo);
    somar(brasil, n, sxo, soo);
  });
  const transferencia = (g: { sxo: number; soo: number }) => (g.soo > 0 ? clamp(g.sxo / g.soo, 0, 1) : 0.5);
  const escolhidas = modelo.ufs.map((_, u): { fonte: FonteDaReferencia; transferencia: number | null } => {
    const r = modelo.regiaoDaUf[u]!;
    if (ufs[u]!.votos >= minimo) return { fonte: "UF", transferencia: transferencia(ufs[u]!) };
    if (r >= 0 && regioes[r]!.votos >= minimo) return { fonte: "região", transferencia: transferencia(regioes[r]!) };
    if (brasil.votos >= minimo) return { fonte: "Brasil", transferencia: transferencia(brasil) };
    return { fonte: "1º turno", transferencia: null };
  });

  // A dispersão dos municípios em torno da referência da sua UF.
  const residuos = modelo.ufs.map(() => ({ votos: 0, s2: 0, votos2: 0, municipios: 0 }));
  apuracao.forEach((a, m) => {
    const n = a.votos[0]! + a.votos[1]!;
    if (n <= 0) return;
    const u = modelo.ufDoMunicipio[m]!;
    const residuo = a.votos[0]! / n - estimar(modelo, m, escolhidas[u]!.transferencia);
    const g = residuos[u]!;
    g.votos += n;
    g.s2 += n * residuo * residuo;
    g.votos2 += n * n;
    g.municipios++;
  });
  const total = residuos.reduce((t, g) => ({ votos: t.votos + g.votos, s2: t.s2 + g.s2 }), { votos: 0, s2: 0 });
  const dispersaoNoBrasil = total.votos > 0 ? Math.sqrt(total.s2 / total.votos) : 0.04;

  return escolhidas.map((e, u) => {
    const g = residuos[u]!;
    const dispersao = Math.max(0.005, g.municipios >= 5 ? Math.sqrt(g.s2 / g.votos) : dispersaoNoBrasil);
    const efetivos = g.votos > 0 ? (g.votos * g.votos) / g.votos2 : 0;
    const erro = e.fonte === "UF" ? dispersao / Math.sqrt(Math.max(efetivos, 1)) : e.fonte === "1º turno" ? 0.04 : 0.02;
    const grupo = e.fonte === "UF" ? `uf ${u}` : e.fonte === "região" ? `região ${modelo.regiaoDaUf[u]}` : e.fonte;
    return { ...e, dispersao, erro, grupo };
  });
}

/** O estado do sinal de virada para uma chance de virada. */
export function sinalDeVirada(chanceDeVirada: number, constantes: Pick<Constantes, "sinalDeVirada">): SinalDeVirada {
  const { projetada, possivel } = constantes.sinalDeVirada;
  return chanceDeVirada >= projetada ? "virada projetada" : chanceDeVirada >= possivel ? "virada possível" : "sem sinal de virada";
}

/** As somas de um lugar: o apurado, o voto que falta e a variância do que o voto que falta dá ao 1º finalista. */
interface Somas {
  votos1: number;
  votos: number;
  secoes: number;
  secoesTotais: number;
  falta: number;
  falta1: number;
  variancia: number;
}

/** Os números de um lugar, a partir das somas dos seus municípios. */
function resultado(somas: Somas, constantes: Constantes): ResultadoDoLugar {
  const validos = somas.votos + somas.falta;
  const projecao = validos > 0 ? (somas.votos1 + somas.falta1) / validos : 0.5;
  const desvio = validos > 0 ? Math.sqrt(somas.variancia) / validos : 0;
  const chance = desvio > 0 ? phi((projecao - 0.5) / desvio) : projecao > 0.5 ? 1 : projecao < 0.5 ? 0 : 0.5;
  const placar = somas.votos > 0 ? somas.votos1 / somas.votos : null;
  const atras = placar === null || placar === 0.5 ? null : placar > 0.5 ? 1 : 0;
  const chanceDeVirada = atras === null ? null : atras === 0 ? chance : 1 - chance;
  return {
    secoes: somas.secoesTotais > 0 ? (100 * somas.secoes) / somas.secoesTotais : 0,
    placar,
    projecao,
    desvio,
    margem: Z_95 * desvio,
    chance,
    validos,
    chanceDeVirada,
    sinalDeVirada: chanceDeVirada === null ? null : sinalDeVirada(chanceDeVirada, constantes),
  };
}

/**
 * A virada projetada de um município, pela curva que liga o placar parcial à projeção: o voto que falta dele
 * chega todo com a mesma fatia, então a ordem de chegada não muda a curva, e o cruzamento sai em forma fechada.
 */
function viradaDoMunicipio(a: ApuracaoDoMunicipio, falta: number, fatia: number, desvioDosVotos: number): ViradaProjetada {
  const votos = a.votos[0]! + a.votos[1]!;
  const lider = (votos > 0 ? a.votos[0]! / votos : fatia) > 0.5 ? 0 : 1;
  if (votos <= 0 || falta <= 0) return { x: null, cedo: null, tarde: null, quem: lider };
  const votosDeQuemEstaAtras = lider === 0 ? a.votos[1]! : a.votos[0]!;
  const fatiaDeQuemEstaAtras = lider === 0 ? 1 - fatia : fatia;
  // Com a fração f do que falta já chegada, quem está atrás tem (atrás + f·falta·fatia + z·f·desvio) ÷ (votos + f·falta).
  const cruza = (z: number) => {
    const inclinacao = falta * fatiaDeQuemEstaAtras + z * desvioDosVotos - falta / 2;
    if (inclinacao <= 0) return null;
    const f = (votos / 2 - votosDeQuemEstaAtras) / inclinacao;
    return f < 1 ? (100 * (a.secoes + f * (a.secoesTotais - a.secoes))) / a.secoesTotais : null;
  };
  const x = cruza(0);
  return { x, cedo: cruza(Z_95), tarde: x === null ? null : cruza(-Z_95), quem: x === null ? lider : 1 - lider };
}

/** A projeção de cada lugar (Brasil, UFs, Exterior e municípios) para a apuração de agora. */
export function projetar(modelo: Modelo, apuracao: Apuracao, constantes: Constantes): Projecao {
  const n = modelo.municipios.length;
  if (apuracao.length !== n) throw new Error(`a apuração tem ${apuracao.length} municípios, e a base, ${n}`);
  const referencias = estimarReferencias(modelo, apuracao, constantes.minimoPorNivel);
  const regional = constantes.incertezaRegional / 100;
  const nacional = constantes.incertezaNacional / 100;

  // Os válidos esperados por eleitor apto, do 1º turno. No recuo "1º turno" (o Brasil ainda sem o mínimo de votos,
  // e então todas as UFs nele), contam só os votos dos dois finalistas: cada lugar parte assim do próprio placar
  // entre finalistas, e não de uma média que pesa mais onde os eliminados tiveram mais votos. É a diferença
  // deliberada em relação ao protótipo, que ali dividia os votos dos eliminados meio a meio.
  const semReferencia = referencias.every((r) => r.transferencia === null);
  const validosPorApto = (m: number) => modelo.validosPorApto[m]! * (semReferencia ? 1 - modelo.fatiaDosEliminados[m]! : 1);

  // Os válidos do 2º turno em relação aos esperados, onde a apuração já chegou: estima os válidos de quem ainda não tem votos.
  let apurados = 0;
  let esperados = 0;
  apuracao.forEach((a, m) => {
    if (a.aptos <= 0) return;
    apurados += a.votos[0]! + a.votos[1]!;
    esperados += a.aptos * validosPorApto(m);
  });
  const comparecimento = esperados > 0 ? apurados / esperados : 1;

  const votoQueFalta = new Float64Array(n);
  const fatiaDoQueFalta = new Float64Array(n);
  const somaVazia = (): Somas => ({ votos1: 0, votos: 0, secoes: 0, secoesTotais: 0, falta: 0, falta1: 0, variancia: 0 });
  const acumular = (a: Somas, b: Somas) => {
    a.votos1 += b.votos1;
    a.votos += b.votos;
    a.secoes += b.secoes;
    a.secoesTotais += b.secoesTotais;
    a.falta += b.falta;
    a.falta1 += b.falta1;
    a.variancia += b.variancia;
  };
  const porUf = modelo.ufs.map(somaVazia);
  const municipios = apuracao.map((a, m): ResultadoDoMunicipio => {
    const u = modelo.ufDoMunicipio[m]!;
    const ref = referencias[u]!;
    const votos = a.votos[0]! + a.votos[1]!;
    const somas: Somas = { votos1: a.votos[0]!, votos, secoes: a.secoes, secoesTotais: a.secoesTotais, falta: 0, falta1: 0, variancia: 0 };
    const aptosQueFaltam = Math.max(0, a.aptosTotais - a.aptos);
    if (aptosQueFaltam > 0) {
      // Os válidos que faltam, pelo comparecimento do próprio município quando ele já tem eleitores bastantes.
      const falta = aptosQueFaltam * (a.aptos >= 300 && votos > 0 ? votos / a.aptos : validosPorApto(m) * comparecimento);
      // A estimativa da referência, misturada com o placar parcial do município, que pesa metade com `pesoDoMunicipio` votos.
      const estimativa = estimar(modelo, m, ref.transferencia);
      const peso = votos > 0 ? votos / (votos + constantes.pesoDoMunicipio) : 0;
      const fatia = clamp(votos > 0 ? estimativa + peso * (a.votos[0]! / votos - estimativa) : estimativa, 0.01, 0.99);
      votoQueFalta[m] = falta;
      fatiaDoQueFalta[m] = fatia;
      somas.falta = falta;
      somas.falta1 = falta * fatia;
      somas.variancia = falta * falta * (1 - peso) * ref.dispersao * ref.dispersao;
    }
    acumular(porUf[u]!, somas);
    // No município, a mesma fórmula restrita ao voto que falta dele.
    somas.variancia += somas.falta * somas.falta * (nacional * nacional + regional * regional + ref.erro * ref.erro);
    const r = resultado(somas, constantes) as ResultadoDoMunicipio;
    r.virada = viradaDoMunicipio(a, somas.falta, fatiaDoQueFalta[m]!, r.desvio * r.validos);
    return r;
  });

  const brasil = somaVazia();
  const grupos = new Map<string, { falta: number; erro: number }>();
  const ufs: Record<string, ResultadoDaUf> = {};
  modelo.ufs.forEach((sigla, u) => {
    const somas = porUf[u]!;
    const ref = referencias[u]!;
    acumular(brasil, somas);
    brasil.variancia += (somas.falta * regional) ** 2;
    const g = grupos.get(ref.grupo) ?? { falta: 0, erro: ref.erro };
    g.falta += somas.falta;
    grupos.set(ref.grupo, g);
    const variancia = somas.variancia + somas.falta * somas.falta * (nacional * nacional + regional * regional + ref.erro * ref.erro);
    ufs[sigla] = { ...resultado({ ...somas, variancia }, constantes), referencia: ref.fonte };
  });
  brasil.variancia += (brasil.falta * nacional) ** 2;
  for (const g of grupos.values()) brasil.variancia += (g.falta * g.erro) ** 2;

  return { brasil: resultado(brasil, constantes), ufs, municipios, votoQueFalta, fatiaDoQueFalta };
}
