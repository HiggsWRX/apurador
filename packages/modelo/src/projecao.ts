import type { Agregado } from "./agregado.ts";
import type { Constantes } from "./constantes.ts";
import { indicacaoDasPesquisas } from "./indicacao.ts";
import { phi, Z_95 } from "./normal.ts";

// A projeção nas duas bases. A "Só apuração" é portada do módulo `Projecao` do protótipo do método (branch
// `prototipo/metodo-projecao`): transferência de votos estimada por UF nos municípios já apurados, corrigida
// pelo placar parcial do próprio município, com incerteza analítica e normal. A "Apuração + pesquisas" é o mesmo
// modelo com outro ponto de partida (Combinação de pesquisas e apuração, decisões 1 a 3): o voto que falta de cada
// município parte da indicação das pesquisas com o peso das pesquisas, e da estimativa da apuração com o restante.
// Funções puras sobre dados simples, sem rede nem DOM: o coletor, o simulador no navegador, o pipeline e a
// calibração usam o mesmo código.
//
// As fatias são frações, de 0 a 1, do 1º finalista da base nos votos válidos dos dois finalistas. O % de seções
// totalizadas vai de 0 a 100.

/** O 1º turno de um município, como na base do modelo (`dados/bases`). */
export interface MunicipioDaBase {
  uf: string;
  municipio: number;
  /**
   * Só num município dividido em zonas, para o teste da zona da calibração: a zona desta parte. Cada parte entra no
   * modelo como um município, com o 1º turno e o perfil de chegada dela.
   */
  zona?: number;
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
  /** Os municípios, ou as partes de um município dividido em zonas, na ordem da base. */
  municipios: { uf: string; municipio: number; zona?: number }[];
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
  /**
   * No 1º turno, o placar entre finalistas do Brasil, como fração (a fatia do 1º finalista nos votos dos dois): a mudança
   * que o agregado mostra é medida a partir dele.
   */
  placarEntreFinalistasDoBrasil: number;
  /** Por UF, no 1º turno: a fatia dos eliminados nos válidos, que dá a incerteza local da indicação das pesquisas. */
  fatiaDosEliminadosDaUf: Float64Array;
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

/** A região de uma UF, pelo nome de `REGIOES`, ou `null` no Exterior e numa sigla desconhecida. */
export function regiaoDe(uf: string): string | null {
  const r = REGIAO_DA_UF[uf];
  return r === undefined || r < 0 ? null : REGIOES[r]!;
}

/** A base do modelo preparada para projetar muitas vezes. */
export function prepararModelo(base: BaseDoModelo): Modelo {
  if (base.finalistas.length !== 2) throw new Error(`a base do modelo tem ${base.finalistas.length} finalistas, e não 2`);
  const n = base.municipios.length;
  const ufs = [...new Set(base.municipios.map((m) => m.uf))];
  const posicaoDaUf = new Map(ufs.map((uf, i) => [uf, i]));
  const modelo: Modelo = {
    finalistas: base.finalistas.map((f) => f.numero),
    municipios: base.municipios.map((m) => ({ uf: m.uf, municipio: m.municipio, ...(m.zona === undefined ? {} : { zona: m.zona }) })),
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
    placarEntreFinalistasDoBrasil: 0.5,
    fatiaDosEliminadosDaUf: new Float64Array(ufs.length),
    perfil: new Float64Array(n * 101),
  };
  const noBrasil = { primeiro: 0, finalistas: 0 };
  const validosDaUf = new Float64Array(ufs.length);
  const eliminadosDaUf = new Float64Array(ufs.length);
  base.municipios.forEach((m, i) => {
    const [a, b] = m.votos as [number, number];
    modelo.placarEntreFinalistas[i] = a + b > 0 ? a / (a + b) : 0.5;
    modelo.fatiaNosValidos[i] = m.validos > 0 ? a / m.validos : 0.5;
    modelo.fatiaDosEliminados[i] = m.validos > 0 ? (m.validos - a - b) / m.validos : 0;
    modelo.validosPorApto[i] = m.aptos > 0 ? m.validos / m.aptos : 0.8;
    noBrasil.primeiro += a;
    noBrasil.finalistas += a + b;
    validosDaUf[modelo.ufDoMunicipio[i]!]! += m.validos;
    eliminadosDaUf[modelo.ufDoMunicipio[i]!]! += m.validos - a - b;
    let degrau = 0;
    let chegadas = 0;
    for (let x = 0; x <= 100; x++) {
      while (degrau < m.degrausDeChegada.length && m.degrausDeChegada[degrau]![0] <= x) chegadas = m.degrausDeChegada[degrau++]![1];
      modelo.perfil[i * 101 + x] = m.secoes > 0 ? chegadas / m.secoes : 0;
    }
  });
  if (noBrasil.finalistas > 0) modelo.placarEntreFinalistasDoBrasil = noBrasil.primeiro / noBrasil.finalistas;
  validosDaUf.forEach((validos, u) => (modelo.fatiaDosEliminadosDaUf[u] = validos > 0 ? eliminadosDaUf[u]! / validos : 0));
  return modelo;
}

/** De onde vem a transferência de votos de uma UF: dela, da região, do Brasil ou, sem apuração, do 1º turno. */
export type FonteDaReferencia = "UF" | "região" | "Brasil" | "1º turno";

/** Os três estados do sinal de virada, pela chance de virada e os limites das constantes. */
export type SinalDeVirada = "virada projetada" | "virada possível" | "sem sinal de virada";

/** A projeção de um lugar num momento: o placar, a projeção com a margem e as chances. */
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

/** A projeção de uma UF, com a fonte da referência da transferência de votos. */
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

/** A projeção de um município, com a virada projetada dele. */
export interface ResultadoDoMunicipio extends ResultadoDoLugar {
  virada: ViradaProjetada;
}

/** A projeção de um momento numa base: o Brasil, as UFs e os municípios. */
export interface Projecao {
  /** Quanto a indicação das pesquisas pesa no voto que falta: o peso das pesquisas na base "Apuração + pesquisas", 0 na "Só apuração". */
  pesoDasPesquisas: number;
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

/**
 * O peso das pesquisas com um % de seções totalizadas no Brasil: K ÷ (K + %), um número só para o país, porque o erro
 * das pesquisas é sobretudo nacional (Combinação de pesquisas e apuração, decisão 2).
 */
export function pesoDasPesquisas(secoes: number, constantes: Pick<Constantes, "secoesDasPesquisas">): number {
  return constantes.secoesDasPesquisas / (constantes.secoesDasPesquisas + secoes);
}

/**
 * Se as duas bases coincidem num lugar: diferem em menos de 0,1 p.p. na projeção e de 1 ponto na chance de vitória
 * (Combinação de pesquisas e apuração, decisão 5). No Brasil, é o evento "as pesquisas deixaram de pesar".
 */
export function basesCoincidem(soApuracao: Pick<ResultadoDoLugar, "projecao" | "chance">, comPesquisas: Pick<ResultadoDoLugar, "projecao" | "chance">): boolean {
  return Math.abs(soApuracao.projecao - comPesquisas.projecao) < 0.001 && Math.abs(soApuracao.chance - comPesquisas.chance) < 0.01;
}

/**
 * As somas de um lugar: o apurado, o voto que falta e a variância do que o voto que falta dá ao 1º finalista, a da
 * estimativa da apuração e a da indicação das pesquisas.
 */
interface Somas {
  votos1: number;
  votos: number;
  secoes: number;
  secoesTotais: number;
  falta: number;
  falta1: number;
  varianciaDaApuracao: number;
  varianciaDasPesquisas: number;
}

/**
 * Desvios locais independentes, de variância s², que se anulam sobre todo o voto do lugar de cima (Σ V·x = 0, com V os
 * válidos finais de cada parte). Sobre o voto que falta (Σ a·x), sobra a variância condicionada a isso:
 * Σ a²s² − (Σ a·V·s²)² ÷ Σ V²s². É zero antes da apuração, quando o que falta é todo o voto.
 */
interface DesviosQueSeAnulam {
  aa: number;
  av: number;
  vv: number;
}

const desviosQueSeAnulam = (): DesviosQueSeAnulam => ({ aa: 0, av: 0, vv: 0 });

/** Soma uma parte com `a` votos que faltam, `v` válidos finais e desvio local `s`. */
function somarDesvio(d: DesviosQueSeAnulam, a: number, v: number, s: number): void {
  const s2 = s * s;
  d.aa += a * a * s2;
  d.av += a * v * s2;
  d.vv += v * v * s2;
}

/** A variância que os desvios deixam sobre o voto que falta, já descontado o que se anula. */
const oQueNaoSeAnula = (d: DesviosQueSeAnulam) => (d.vv > 0 ? Math.max(0, d.aa - (d.av * d.av) / d.vv) : 0);

/** Os números de um lugar, a partir das somas dos seus municípios, com o peso das pesquisas da base. */
function resultado(somas: Somas, constantes: Constantes, peso: number): ResultadoDoLugar {
  const validos = somas.votos + somas.falta;
  const projecao = validos > 0 ? (somas.votos1 + somas.falta1) / validos : 0.5;
  // Decisão 3 da Combinação, como no protótipo da metodologia: os desvios se somam em quadratura, e por isso a margem
  // da base com pesquisas fica um pouco mais estreita que a da "Só apuração" enquanto as pesquisas pesam.
  const variancia = peso * peso * somas.varianciaDasPesquisas + (1 - peso) * (1 - peso) * somas.varianciaDaApuracao;
  const desvio = validos > 0 ? Math.sqrt(variancia) / validos : 0;
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

/**
 * A projeção de cada lugar (Brasil, UFs, Exterior e municípios) para a apuração de agora: na base "Só apuração" ou,
 * com o agregado de pesquisas (o valor em % do 1º finalista da base e a incerteza em pontos), na "Apuração + pesquisas".
 */
export function projetar(modelo: Modelo, apuracao: Apuracao, constantes: Constantes, agregado?: Pick<Agregado, "valor" | "incerteza">): Projecao {
  const n = modelo.municipios.length;
  if (apuracao.length !== n) throw new Error(`a apuração tem ${apuracao.length} municípios, e a base, ${n}`);
  const referencias = estimarReferencias(modelo, apuracao, constantes.minimoPorNivel);
  const regional = constantes.incertezaRegional / 100;
  const nacional = constantes.incertezaNacional / 100;

  // A base "Apuração + pesquisas": o peso das pesquisas sai do % de seções do Brasil, e cada município parte da
  // indicação das pesquisas dele. A incerteza das pesquisas é a nacional do agregado, comum a todos os lugares, mais
  // as locais: a da UF, em torno do Brasil, e a do município, em torno da UF. Por serem desvios em torno do lugar de
  // cima, as locais se anulam nele: antes da apuração, o Brasil fica só com a nacional, e cada UF, com a nacional e a
  // dela (decisão 3: 1,5, ~1,8 na UF média e ~2,5 em Goiás). Um município sozinho na UF, o Distrito Federal, não se
  // afasta dela.
  const secoesTotais = apuracao.reduce((s, a) => s + a.secoesTotais, 0);
  const secoesDoBrasil = secoesTotais > 0 ? (100 * apuracao.reduce((s, a) => s + a.secoes, 0)) / secoesTotais : 0;
  const peso = agregado ? pesoDasPesquisas(secoesDoBrasil, constantes) : 0;
  const indicacao = (m: number, valor: number) =>
    indicacaoDasPesquisas({ placarEntreFinalistasDoLugar: 100 * modelo.placarEntreFinalistas[m]!, placarEntreFinalistasDoBrasil: 100 * modelo.placarEntreFinalistasDoBrasil, agregado: valor }) / 100;
  const nacionalDasPesquisas = agregado ? agregado.incerteza / 100 : 0;
  const { uf: localDaUf, municipio: localDoMunicipio } = constantes.incertezaLocalDasPesquisas;
  /** A incerteza local da UF na indicação das pesquisas, comum a todo o voto que falta dela. */
  const localDaUfDe = (u: number) => localDaUf * modelo.fatiaDosEliminadosDaUf[u]!;
  /** A parte da variância das pesquisas comum a todo o voto que falta de um lugar dentro de uma UF: a nacional e a local da UF. */
  const varianciaComumDasPesquisas = (falta: number, u: number) => falta * falta * (nacionalDasPesquisas ** 2 + localDaUfDe(u) ** 2);
  const municipiosDaUf = new Int32Array(modelo.ufs.length);
  modelo.ufDoMunicipio.forEach((u) => municipiosDaUf[u]!++);
  // Os desvios locais dos municípios de cada UF e os das UFs no Brasil, que se anulam sobre todo o voto do lugar de cima.
  const municipiosQueSeAnulam = modelo.ufs.map(desviosQueSeAnulam);
  const ufsQueSeAnulam = desviosQueSeAnulam();

  // Os válidos esperados por eleitor apto, do 1º turno. No recuo "1º turno" (o Brasil ainda sem o mínimo de votos,
  // e então todas as UFs nele), contam só os votos dos dois finalistas: cada lugar parte assim do próprio placar
  // entre finalistas, e não de uma média que pesa mais onde os eliminados tiveram mais votos. É a diferença
  // deliberada em relação ao protótipo, que ali dividia os votos dos eliminados meio a meio.
  const semReferencia = referencias.every((r) => r.transferencia === null);
  const validosPorApto = (m: number) => modelo.validosPorApto[m]! * (semReferencia ? 1 - modelo.fatiaDosEliminados[m]! : 1);

  // Os válidos do 2º turno em relação aos esperados pelo 1º, onde a apuração já chegou: estima os válidos de quem
  // ainda não tem votos.
  let apurados = 0;
  let esperados = 0;
  apuracao.forEach((a, m) => {
    if (a.aptos <= 0) return;
    apurados += a.votos[0]! + a.votos[1]!;
    esperados += a.aptos * validosPorApto(m);
  });
  const validosSobreEsperados = esperados > 0 ? apurados / esperados : 1;
  /** A parte da variância da apuração comum a todo o voto que falta de um lugar: a nacional, a regional e o erro da referência. */
  const varianciaComumDaApuracao = (falta: number, ref: Referencia) => falta * falta * (nacional * nacional + regional * regional + ref.erro * ref.erro);

  const votoQueFalta = new Float64Array(n);
  const fatiaDoQueFalta = new Float64Array(n);
  const somaVazia = (): Somas => ({ votos1: 0, votos: 0, secoes: 0, secoesTotais: 0, falta: 0, falta1: 0, varianciaDaApuracao: 0, varianciaDasPesquisas: 0 });
  // A variância das pesquisas de cada lugar é montada à parte, porque as locais não se somam de um lugar para o de cima.
  const acumular = (a: Somas, b: Somas) => {
    a.votos1 += b.votos1;
    a.votos += b.votos;
    a.secoes += b.secoes;
    a.secoesTotais += b.secoesTotais;
    a.falta += b.falta;
    a.falta1 += b.falta1;
    a.varianciaDaApuracao += b.varianciaDaApuracao;
  };
  const porUf = modelo.ufs.map(somaVazia);
  const municipios = apuracao.map((a, m): ResultadoDoMunicipio => {
    const u = modelo.ufDoMunicipio[m]!;
    const ref = referencias[u]!;
    const votos = a.votos[0]! + a.votos[1]!;
    const somas: Somas = { ...somaVazia(), votos1: a.votos[0]!, votos, secoes: a.secoes, secoesTotais: a.secoesTotais };
    const aptosQueFaltam = Math.max(0, a.aptosTotais - a.aptos);
    if (aptosQueFaltam > 0) {
      // Os válidos que faltam, pelos válidos por apto já apurados no próprio município quando ele tem eleitores bastantes.
      const falta = aptosQueFaltam * (a.aptos >= 300 && votos > 0 ? votos / a.aptos : validosPorApto(m) * validosSobreEsperados);
      // O ponto de partida (a estimativa da referência e, com pesquisas, a indicação delas), misturado com o placar
      // parcial do município, que pesa metade com `pesoDoMunicipio` votos.
      const estimativa = estimar(modelo, m, ref.transferencia);
      const partida = agregado ? peso * indicacao(m, agregado.valor) + (1 - peso) * estimativa : estimativa;
      const pesoDoPlacar = votos > 0 ? votos / (votos + constantes.pesoDoMunicipio) : 0;
      const fatia = clamp(votos > 0 ? partida + pesoDoPlacar * (a.votos[0]! / votos - partida) : partida, 0.01, 0.99);
      votoQueFalta[m] = falta;
      fatiaDoQueFalta[m] = fatia;
      somas.falta = falta;
      somas.falta1 = falta * fatia;
      somas.varianciaDaApuracao = falta * falta * (1 - pesoDoPlacar) * ref.dispersao * ref.dispersao;
      // A parte local do município na incerteza das pesquisas, que o placar parcial dele também reduz.
      const local = municipiosDaUf[u]! > 1 ? localDoMunicipio * modelo.fatiaDosEliminados[m]! : 0;
      somarDesvio(municipiosQueSeAnulam[u]!, falta * (1 - pesoDoPlacar), votos + falta, local);
      somas.varianciaDasPesquisas = (falta * (1 - pesoDoPlacar) * local) ** 2;
    }
    acumular(porUf[u]!, somas);
    // No município, a mesma fórmula restrita ao voto que falta dele.
    somas.varianciaDaApuracao += varianciaComumDaApuracao(somas.falta, ref);
    somas.varianciaDasPesquisas += varianciaComumDasPesquisas(somas.falta, u);
    const r = resultado(somas, constantes, peso) as ResultadoDoMunicipio;
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
    brasil.varianciaDaApuracao += (somas.falta * regional) ** 2;
    const dosMunicipios = oQueNaoSeAnula(municipiosQueSeAnulam[u]!);
    brasil.varianciaDasPesquisas += dosMunicipios;
    somarDesvio(ufsQueSeAnulam, somas.falta, somas.votos + somas.falta, localDaUfDe(u));
    const g = grupos.get(ref.grupo) ?? { falta: 0, erro: ref.erro };
    g.falta += somas.falta;
    grupos.set(ref.grupo, g);
    const variancias = {
      varianciaDaApuracao: somas.varianciaDaApuracao + varianciaComumDaApuracao(somas.falta, ref),
      varianciaDasPesquisas: dosMunicipios + varianciaComumDasPesquisas(somas.falta, u),
    };
    ufs[sigla] = { ...resultado({ ...somas, ...variancias }, constantes, peso), referencia: ref.fonte };
  });
  brasil.varianciaDaApuracao += (brasil.falta * nacional) ** 2;
  for (const g of grupos.values()) brasil.varianciaDaApuracao += (g.falta * g.erro) ** 2;
  brasil.varianciaDasPesquisas += oQueNaoSeAnula(ufsQueSeAnulam) + (brasil.falta * nacionalDasPesquisas) ** 2;

  return { pesoDasPesquisas: peso, brasil: resultado(brasil, constantes, peso), ufs, municipios, votoQueFalta, fatiaDoQueFalta };
}

/** As duas bases da projeção sobre a mesma apuração, como a página as mostra lado a lado. */
export interface ProjecaoNasDuasBases {
  soApuracao: Projecao;
  /** Com o peso das pesquisas de agora. */
  comPesquisas: Projecao;
  /** Em cada lugar, se as duas bases já coincidem. Os municípios vão na ordem da base do modelo. */
  coincidem: { brasil: boolean; ufs: Record<string, boolean>; municipios: boolean[] };
}

/** A projeção de cada lugar nas duas bases, para a apuração de agora e o agregado de pesquisas, e onde elas já coincidem. */
export function projetarNasDuasBases(modelo: Modelo, apuracao: Apuracao, constantes: Constantes, agregado: Pick<Agregado, "valor" | "incerteza">): ProjecaoNasDuasBases {
  const soApuracao = projetar(modelo, apuracao, constantes);
  const comPesquisas = projetar(modelo, apuracao, constantes, agregado);
  return {
    soApuracao,
    comPesquisas,
    coincidem: {
      brasil: basesCoincidem(soApuracao.brasil, comPesquisas.brasil),
      ufs: Object.fromEntries(modelo.ufs.map((uf) => [uf, basesCoincidem(soApuracao.ufs[uf]!, comPesquisas.ufs[uf]!)])),
      municipios: soApuracao.municipios.map((r, m) => basesCoincidem(r, comPesquisas.municipios[m]!)),
    },
  };
}
