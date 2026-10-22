import type { AnoDoAgregado, MomentoReproduzido, NoiteReproduzida, ProjecaoReproduzida } from "./metodologia";

// Os gráficos das seções 4 e 6 da página de metodologia (Página de metodologia, decisão 2): a noite reproduzida, o erro
// com as pesquisas deslocadas, o agregado contra o resultado e o peso das pesquisas. Só a geometria, em números e em
// caminhos (`d`) do SVG, como o sino de `sino.ts`: os componentes desenham, e o teste a confere sem navegador. Os
// desenhos são os do protótipo (`svgNoite`, `svgErro`, `svgHist`, `svgPeso`), a referência visual da decisão, na
// largura do celular.

/** O tamanho de um desenho, em px do `viewBox`. */
export interface Tamanho {
  largura: number;
  altura: number;
}

/** Uma marca de um eixo: o valor, a posição em px e o texto. */
export interface Marca {
  valor: number;
  posicao: number;
  rotulo: string;
}

/** A área de desenho dentro das margens, em px. */
export interface Area {
  esquerda: number;
  direita: number;
  topo: number;
  base: number;
}

const numero = (n: number) => n.toFixed(2);
/** Um caminho que passa pelos pontos dados, na ordem. */
const linha = (pontos: readonly (readonly [number, number])[]) => pontos.map(([x, y], i) => `${i ? "L" : "M"}${numero(x)},${numero(y)}`).join("");
/** A escala linear de um domínio para um intervalo de px. */
const escala =
  ([d0, d1]: readonly [number, number], [p0, p1]: readonly [number, number]) =>
  (v: number) =>
    p0 + ((v - d0) / (d1 - d0)) * (p1 - p0);
const limitar = (v: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, v));
const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

/** O eixo do % de seções totalizadas: as marcas de 25 em 25, ou nos valores dados. */
function eixoDasSecoes(area: Area, ate: number, valores: readonly number[]) {
  const x = escala([0, ate], [area.esquerda, area.direita]);
  return { x, marcas: valores.map((v) => ({ valor: v, posicao: x(v), rotulo: pct(v) })) };
}

/** A geometria da noite reproduzida: o placar parcial, a projeção com a faixa de 95% e o resultado, no 1º finalista. */
export interface GraficoDaNoite {
  area: Area;
  /** Os extremos do eixo vertical, em % do 1º finalista. */
  dominio: readonly [number, number];
  marcasX: Marca[];
  /** As marcas de 4 em 4 pontos em volta de 50%, com o nome de quem está à frente: "Lula 54%", "50%", "Bolsonaro 54%". */
  marcasY: Marca[];
  y50: number;
  placar: string;
  projecao: string;
  /** A faixa de 95% da projeção, recortada no eixo. */
  faixa: string;
  yResultado: number;
}

const MARGEM_DA_NOITE = { esquerda: 78, direita: 10, topo: 12, base: 30 };

/** A noite reproduzida, com a projeção da base escolhida (a da noite é a Apuração + pesquisas). */
export function graficoDaNoite(noite: NoiteReproduzida, base: (m: MomentoReproduzido) => ProjecaoReproduzida, { largura, altura }: Tamanho): GraficoDaNoite {
  const area = {
    esquerda: MARGEM_DA_NOITE.esquerda,
    direita: largura - MARGEM_DA_NOITE.direita,
    topo: MARGEM_DA_NOITE.topo,
    base: altura - MARGEM_DA_NOITE.base,
  };
  const comPlacar = noite.momentos.filter((m) => m.placar !== null);
  // O eixo cobre o placar parcial, a projeção, o resultado e 50%, com um ponto de folga; a faixa larga do começo é recortada.
  const valores = [...comPlacar.map((m) => m.placar!), ...noite.momentos.map((m) => base(m).projecao), noite.resultado, 50];
  const dominio = [Math.floor(Math.min(...valores)) - 1, Math.ceil(Math.max(...valores)) + 1] as const;
  const { x, marcas: marcasX } = eixoDasSecoes(area, 100, [0, 25, 50, 75, 100]);
  const y = (v: number) => escala(dominio, [area.base, area.topo])(limitar(v, dominio));
  const [primeiro, segundo] = noite.finalistas;
  const marcasY: Marca[] = [];
  for (let v = 50 - 4 * Math.floor((50 - dominio[0]) / 4); v <= dominio[1]; v += 4) {
    marcasY.push({ valor: v, posicao: y(v), rotulo: v === 50 ? "50%" : v > 50 ? `${primeiro.nome} ${v}%` : `${segundo.nome} ${100 - v}%` });
  }
  const ponto = (m: MomentoReproduzido, v: number) => [x(m.secoes), y(v)] as const;
  const superior = noite.momentos.map((m) => ponto(m, base(m).projecao + base(m).margem));
  const inferior = noite.momentos.map((m) => ponto(m, base(m).projecao - base(m).margem)).reverse();
  return {
    area,
    dominio,
    marcasX,
    marcasY,
    y50: y(50),
    placar: linha(comPlacar.map((m) => ponto(m, m.placar!))),
    projecao: linha(noite.momentos.map((m) => ponto(m, base(m).projecao))),
    faixa: `${linha([...superior, ...inferior])}Z`,
    yResultado: y(noite.resultado),
  };
}

/** A geometria do erro da projeção no começo da noite, com o agregado real e com o deslocado. */
export interface GraficoDoErro {
  area: Area;
  marcasX: Marca[];
  /** As marcas de −2 a +2 pontos: acima de 0, o erro a favor do 1º finalista. */
  marcasY: Marca[];
  y0: number;
  /** Os caminhos da "Só apuração", da "Apuração + pesquisas" e das duas deslocadas (+2 para o 1º e para o 2º). */
  soApuracao: string;
  comPesquisas: string;
  deslocadas: readonly [string, string];
}

/** O erro vai até 2,5 pontos para cada lado: o resto é recortado. */
const ERRO_MAXIMO = 2.5;

/** O erro da projeção nos primeiros % de seções da noite, em pontos, nas bases e com o agregado deslocado 2 pontos. */
export function graficoDoErro(noite: NoiteReproduzida, { largura, altura }: Tamanho, ate = 30): GraficoDoErro {
  const area = { esquerda: 34, direita: largura - 10, topo: 10, base: altura - 30 };
  const { x, marcas: marcasX } = eixoDasSecoes(
    area,
    ate,
    [0, 5, 10, 20, 30].filter((v) => v <= ate),
  );
  const y = (v: number) => escala([-ERRO_MAXIMO, ERRO_MAXIMO], [area.base, area.topo])(limitar(v, [-ERRO_MAXIMO, ERRO_MAXIMO]));
  // A fotografia de um ponto pode passar um pouco dele (a de 30% de 2022 tem 30,0003%): ela entra.
  const momentos = noite.momentos.filter((m) => m.secoes < ate + 0.5);
  const caminho = (p: (m: MomentoReproduzido) => ProjecaoReproduzida) => linha(momentos.map((m) => [x(m.secoes), y(p(m).projecao - noite.resultado)]));
  if (!momentos.every((m) => m.deslocadas)) throw new Error(`A noite de ${noite.ano} não tem o agregado deslocado`);
  return {
    area,
    marcasX,
    marcasY: [-2, -1, 0, 1, 2].map((v) => ({ valor: v, posicao: y(v), rotulo: v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0" })),
    y0: y(0),
    soApuracao: caminho((m) => m.soApuracao),
    comPesquisas: caminho((m) => m.comPesquisas),
    deslocadas: [caminho((m) => m.deslocadas![0]), caminho((m) => m.deslocadas![1])],
  };
}

/** Um ano no gráfico do agregado contra o resultado, em px. */
export interface LinhaDoAgregado {
  ano: AnoDoAgregado;
  y: number;
  /** O começo e o fim da faixa de 95%. */
  faixa: readonly [number, number];
  agregado: number;
  resultado: number;
}

/** A geometria do agregado contra o resultado: uma linha por ano, com a faixa de 95%, o agregado e o resultado. */
export interface GraficoDoAgregado {
  area: Area;
  altura: number;
  marcasX: Marca[];
  x50: number;
  linhas: LinhaDoAgregado[];
}

const ALTURA_DA_LINHA = 34;

/** O agregado contra o resultado em cada ano, no 1º finalista do 1º turno: o eixo vai de 5 em 5 pontos e passa por 50%. */
export function graficoDoAgregado(anos: readonly AnoDoAgregado[], largura: number): GraficoDoAgregado {
  const altura = anos.length * ALTURA_DA_LINHA + 34;
  const area = { esquerda: 96, direita: largura - 12, topo: 6, base: altura - 28 };
  const valores = anos.flatMap((a) => [...a.faixa, a.resultado, 50]);
  const dominio = [5 * Math.floor(Math.min(...valores) / 5), 5 * Math.ceil(Math.max(...valores) / 5)] as const;
  const x = escala(dominio, [area.esquerda, area.direita]);
  const marcas: Marca[] = [];
  for (let v = dominio[0]; v <= dominio[1]; v += 5) marcas.push({ valor: v, posicao: x(v), rotulo: `${v}%` });
  return {
    area,
    altura,
    marcasX: marcas,
    x50: x(50),
    linhas: anos.map((ano, i) => ({
      ano,
      y: area.topo + (i + 0.5) * ALTURA_DA_LINHA,
      faixa: [x(ano.faixa[0]), x(ano.faixa[1])],
      agregado: x(ano.agregado),
      resultado: x(ano.resultado),
    })),
  };
}

/** A geometria do peso das pesquisas de 0% a 10% das seções totalizadas no Brasil. */
export interface GraficoDoPeso {
  area: Area;
  marcasX: Marca[];
  marcasY: Marca[];
  curva: string;
  /** Os pontos marcados: com K% das seções, quando as pesquisas pesam metade, e com 5%. */
  pontos: { secoes: number; peso: number; x: number; y: number }[];
}

/** O peso das pesquisas ao longo da apuração, dada a função do peso (de 0 a 1) e K. */
export function graficoDoPeso(peso: (secoes: number) => number, k: number, { largura, altura }: Tamanho): GraficoDoPeso {
  const area = { esquerda: 38, direita: largura - 12, topo: 12, base: altura - 30 };
  const { x, marcas: marcasX } = eixoDasSecoes(area, 10, [0, 2, 4, 6, 8, 10]);
  const y = escala([0, 1], [area.base, area.topo]);
  const curva: [number, number][] = [];
  for (let i = 0; i <= 200; i++) curva.push([x(i / 20), y(peso(i / 20))]);
  return {
    area,
    marcasX,
    marcasY: [0, 0.5, 1].map((v) => ({ valor: v, posicao: y(v), rotulo: pct(100 * v) })),
    curva: linha(curva),
    pontos: [k, 5].map((s) => ({ secoes: s, peso: peso(s), x: x(s), y: y(peso(s)) })),
  };
}
