import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, MultiLineString } from "geojson";
import type { Pintura } from "./mapa-dos-lugares";

// O desenho do mapa do cartão (ticket 26; Arquitetura e tecnologia, decisão 4): d3-geo projeta a malha em caminhos de
// SVG, numa caixa de largura fixa que o CSS estica, e os mesmos caminhos servem ao canvas (`Path2D`). A conta e a
// entrada dos caminhos no SVG saem em fatias, com uma pausa entre elas, para a rolagem não travar no celular enquanto os
// 5.571 municípios do Brasil saem. Se o SVG levar mais de 2 s para aparecer, o mapa passa para o canvas neste aparelho:
// a decisão 4 da arquitetura deixava a troca para depois do ensaio, mas, feita pelo próprio mapa, ela vale já na noite,
// sem um deploy. Se o canvas também falhar no ensaio, o dono desliga a chave do mapa (Ensaio geral, decisões 19 e 22).

/** A largura da caixa dos caminhos: a altura sai da forma do lugar. */
const LARGURA = 1000;
/** Quantos lugares cada fatia projeta, ou põe no SVG, antes de devolver a vez à página. */
export const FATIA = 400;

/** O mapa projetado: um caminho por feição, na ordem delas, e o contorno por cima. */
export interface Desenho {
  /** A largura da caixa dos caminhos (o `viewBox` do SVG), que o CSS estica até a do cartão. */
  largura: number;
  /** A altura da caixa, na mesma unidade: a da forma do lugar com essa largura. */
  altura: number;
  /** O id do site de cada feição, na ordem dos caminhos. */
  ids: string[];
  caminhos: string[];
  contorno: string | null;
}

/**
 * Devolve a vez à página, entre uma fatia e outra, para o toque e a rolagem passarem na frente. Sem o `setTimeout`, que
 * depois de algumas chamadas seguidas espera pelo menos 4 ms cada uma: pelo `scheduler.yield()`, onde há, ou por uma
 * mensagem a si mesmo.
 */
export function pausa(): Promise<void> {
  const agendador = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (agendador?.yield) return agendador.yield();
  return new Promise((pronto) => {
    const canal = new MessageChannel();
    canal.port1.onmessage = () => pronto();
    canal.port2.postMessage(null);
  });
}

/** Projeta as feições (e o contorno, como as fronteiras das UFs) em caminhos de SVG, em fatias. */
export async function desenharCaminhos(feicoes: Feature[], contorno: MultiLineString | null): Promise<Desenho> {
  const todas: FeatureCollection = { type: "FeatureCollection", features: feicoes };
  // Sem reamostragem: a malha simplificada já tem arestas curtas, e a conta fica bem mais leve.
  const projecao = geoMercator()
    .precision(0)
    .fitWidth(LARGURA - 4, todas);
  const [[, y0], [, y1]] = geoPath(projecao).bounds(todas);
  const altura = Math.ceil(y1 - y0) + 4;
  projecao.fitExtent(
    [
      [2, 2],
      [LARGURA - 2, altura - 2],
    ],
    todas,
  );
  const caminho = geoPath(projecao).digits(1);
  const caminhos: string[] = [];
  for (let i = 0; i < feicoes.length; i += FATIA) {
    for (const f of feicoes.slice(i, i + FATIA)) caminhos.push(caminho(f) ?? "");
    await pausa();
  }
  return { largura: LARGURA, altura, ids: feicoes.map((f) => String(f.id)), caminhos, contorno: contorno ? caminho(contorno) : null };
}

/** O tempo que o mapa tem para desenhar todos os lugares (Ensaio geral, decisão 22). */
export const LIMITE_DO_DESENHO_MS = 2000;
const NO_CANVAS = "apurador:mapa-em-canvas";

/**
 * Se o mapa começa no canvas: neste aparelho o SVG já passou do limite, ou o endereço pede (`?mapa=canvas`, para o
 * ensaio conferir o canvas sem esperar o SVG falhar; `?mapa=svg` volta ao SVG).
 */
export function comecaNoCanvas(): boolean {
  const pedido = new URLSearchParams(location.search).get("mapa");
  if (pedido) return pedido === "canvas";
  try {
    return localStorage.getItem(NO_CANVAS) === "1";
  } catch {
    return false;
  }
}

/** Guarda neste aparelho que o SVG passou do limite: os próximos mapas já saem no canvas. */
export function lembrarDoCanvas(): void {
  try {
    localStorage.setItem(NO_CANVAS, "1");
  } catch {
    // Sem armazenamento, o mapa volta a tentar o SVG na próxima página.
  }
}

/** As cores da página que o mapa usa, lidas do CSS, para o tema claro ou o escuro. */
export interface Paleta {
  flavio: string;
  lula: string;
  /** A dos outros partidos, que também pinta o empate. */
  cinza: string;
  /** A do lugar sem seções: a do trilho das barras. */
  semSecoes: string;
  /** A do cartão: a mistura parte dela, e as divisas entre os lugares são dela. */
  fundo: string;
  contorno: string;
  destaque: string;
}

/** As cores do CSS no elemento do mapa. */
export function paletaDe(el: Element): Paleta {
  const css = getComputedStyle(el);
  const v = (nome: string) => css.getPropertyValue(nome).trim();
  return {
    flavio: v("--cor-flavio"),
    lula: v("--cor-lula"),
    cinza: v("--cor-cinza"),
    semSecoes: v("--trilho"),
    fundo: v("--cartao"),
    contorno: v("--texto-suave"),
    destaque: v("--texto"),
  };
}

/** Quanto da cor do candidato entra na mistura com o fundo, em cada força. */
const MISTURA = [0.3, 0.45, 0.6, 0.75, 0.88, 1];

/** Os canais de uma cor `#rrggbb` (ou `#rgb`). */
function canais(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const cheia = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(cheia.slice(i, i + 2), 16)) as [number, number, number];
}

/** A cor de preenchimento de uma pintura: a do candidato misturada ao fundo pela força, ou o cinza. */
export function preenchimento(pintura: Pintura, paleta: Paleta): string {
  if (pintura.cor === null) return paleta.semSecoes;
  if (pintura.cor === "empate") return paleta.cinza;
  const t = MISTURA[pintura.forca] ?? 1;
  const [a, b] = [canais(paleta[pintura.cor]), canais(paleta.fundo)];
  return `rgb(${a.map((c, i) => Math.round(t * c + (1 - t) * b[i]!)).join(" ")})`;
}
