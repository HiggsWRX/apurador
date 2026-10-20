import { phi } from "@apurador/modelo";

// O sino da página de metodologia (Página de metodologia, decisão 5, e Telas da página de lugar, variante C): a
// distribuição normal do resultado final, desenhada para que a área de cada lado de 50% seja a chance de vitória de
// cada candidato. Só a geometria, em números: o componente a transforma em SVG, e o teste a confere sem navegador.

/** O que o sino precisa: o agregado (em % do primeiro finalista), a incerteza em pontos e o tamanho do desenho em px. */
export interface EntradaDoSino {
  valor: number;
  incerteza: number;
  largura: number;
  altura: number;
}

/** A geometria do sino, em px do desenho. */
export interface Sino {
  /** Os extremos do eixo, em % do primeiro finalista: ao menos de 48% a 52%, e 3,4 desvios para cada lado. */
  dominio: [number, number];
  /** A posição horizontal de 50%. */
  x50: number;
  /** O topo da área desenhada e a linha do eixo, em px: onde ficam os rótulos. */
  topo: number;
  base: number;
  /** As marcas do eixo: o começo, 50% e o fim. */
  marcas: { valor: number; x: number }[];
  /** O caminho (`d`) da área de cada lado de 50%: a do primeiro finalista (de 50% para cima) e a do segundo. */
  areas: [string, string];
  /** A chance de vitória do primeiro finalista: a probabilidade normal de passar de 50%. */
  chance: number;
}

const MARGEM = { esq: 12, dir: 12, topo: 26, base: 28 };
// Os desvios que o eixo cobre para cada lado do agregado: a cauda além deles é invisível no desenho.
const DESVIOS = 3.4;
const PONTOS = 160;

/** A geometria do sino para um agregado, pronta para o SVG. */
export function sino({ valor, incerteza, largura, altura }: EntradaDoSino): Sino {
  const inicio = Math.min(48, valor - DESVIOS * incerteza);
  const fim = Math.max(52, valor + DESVIOS * incerteza);
  const interna = largura - MARGEM.esq - MARGEM.dir;
  const alturaInterna = altura - MARGEM.topo - MARGEM.base;
  const base = MARGEM.topo + alturaInterna;
  const x = (v: number) => MARGEM.esq + ((v - inicio) / (fim - inicio)) * interna;
  const densidade = (v: number) => Math.exp(-0.5 * ((v - valor) / incerteza) ** 2);
  const y = (d: number) => base - d * alturaInterna;

  const pontos: [number, number][] = [];
  for (let i = 0; i <= PONTOS; i++) {
    const v = inicio + (i / PONTOS) * (fim - inicio);
    pontos.push([v, densidade(v)]);
  }
  // Cada lado fecha em 50%, com o ponto exato da divisa, para as duas áreas se encostarem sem buraco nem sobra.
  const divisa: [number, number] = [50, densidade(50)];
  const area = (lado: [number, number][]) =>
    `M${x(lado[0]![0]).toFixed(2)},${base.toFixed(2)}` +
    lado.map(([v, d]) => `L${x(v).toFixed(2)},${y(d).toFixed(2)}`).join("") +
    `L${x(lado[lado.length - 1]![0]).toFixed(2)},${base.toFixed(2)}Z`;
  const doPrimeiro = [divisa, ...pontos.filter(([v]) => v > 50)];
  const doSegundo = [...pontos.filter(([v]) => v < 50), divisa];

  return {
    dominio: [inicio, fim],
    x50: x(50),
    topo: MARGEM.topo,
    base,
    marcas: [Math.ceil(inicio), 50, Math.floor(fim)].map((v) => ({ valor: v, x: x(v) })),
    areas: [area(doPrimeiro), area(doSegundo)],
    chance: phi((valor - 50) / incerteza),
  };
}
