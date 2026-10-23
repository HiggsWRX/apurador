import type { Feature, MultiLineString } from "geojson";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  comecaNoCanvas,
  desenharCaminhos,
  lembrarDoCanvas,
  LIMITE_DO_DESENHO_MS,
  paletaDe,
  preenchimento,
  type Desenho,
  type Paleta,
} from "../lib/desenho-do-mapa";
import { formatarPctComCasas } from "../lib/formato";
import { corDoPartido, nomeCurto } from "../lib/identidade";
import type { ConteudoDoMapa, LugarDoMapa } from "../lib/mapa-dos-lugares";

// O mapa do cartão (Telas da página de lugar, decisão 8; ticket 26), em SVG ou, se o SVG não sair em 2 s neste aparelho,
// em canvas, com os mesmos caminhos. Cada lugar sai na cor que `mapaDosLugares` dá. Tocar num lugar abre embaixo um
// cartão com os números e "Abrir a página →", sem navegar de primeira. O mapa não tem foco por lugar: quem navega pelo
// teclado ou com leitor de tela usa a Tabela, que é a alternativa a ele.

interface Props {
  feicoes: Feature[];
  /** Linhas por cima dos lugares: as fronteiras das UFs no Brasil por municípios, o contorno da UF na página dela. */
  contorno: MultiLineString | null;
  conteudo: ConteudoDoMapa;
  /** O lugar da página, destacado: um município entre os da UF. */
  destaque?: string;
  rotulo: string;
}

/** O mapa dos lugares de um cartão. */
export function MapaDosLugares({ feicoes, contorno, conteudo, destaque, rotulo }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const grupo = useRef<SVGGElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const [desenho, setDesenho] = useState<Desenho | null>(null);
  const [noCanvas, setNoCanvas] = useState(comecaNoCanvas);
  const [demorou, setDemorou] = useState<number | null>(null);
  const [paleta, setPaleta] = useState<Paleta | null>(null);
  const [tocado, setTocado] = useState<string | null>(null);
  const [largura, setLargura] = useState(0);
  const inicio = useRef(0);

  const porId = useMemo(() => new Map(conteudo.lugares.map((l) => [l.id, l])), [conteudo]);

  // Os caminhos, uma vez por malha, em fatias.
  useEffect(() => {
    let vivo = true;
    inicio.current = performance.now();
    setDesenho(null);
    setDemorou(null);
    void desenharCaminhos(feicoes, contorno).then((d) => vivo && setDesenho(d));
    return () => void (vivo = false);
  }, [feicoes, contorno]);

  // As cores do tema, de novo a cada troca de tema (pelo botão ou pelo sistema).
  useEffect(() => {
    const ler = () => caixa.current && setPaleta(paletaDe(caixa.current));
    ler();
    const sistema = matchMedia("(prefers-color-scheme: dark)");
    sistema.addEventListener("change", ler);
    const observador = new MutationObserver(ler);
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    return () => {
      sistema.removeEventListener("change", ler);
      observador.disconnect();
    };
  }, []);

  // A largura do canvas acompanha a do cartão, para o desenho sair nítido.
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const observador = new ResizeObserver(([e]) => setLargura(Math.round(e!.contentRect.width)));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  // SVG: os caminhos entram de uma vez; as cores mudam a cada quadro, só no atributo de estilo.
  const svg = useMemo(() => (desenho && !noCanvas ? desenho.caminhos.map((d, i) => `<path d="${d}" data-i="${i}"/>`).join("") : ""), [desenho, noCanvas]);
  useEffect(() => {
    const g = grupo.current;
    if (!desenho || noCanvas || !g || !paleta) return;
    const paths = g.children;
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i] as SVGPathElement;
      const l = porId.get(desenho.ids[i]!);
      p.style.fill = l ? preenchimento(l.pintura, paleta) : paleta.vazio;
      p.style.fillOpacity = String(l?.pintura.opacidade ?? 1);
    }
    if (demorou === null) {
      // O tempo até o SVG aparecer na tela: dois quadros de animação depois de entrar.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const ms = Math.round(performance.now() - inicio.current);
          setDemorou(ms);
          if (ms > LIMITE_DO_DESENHO_MS) {
            lembrarDoCanvas();
            setNoCanvas(true);
          }
        }),
      );
    }
  }, [desenho, noCanvas, paleta, porId, demorou]);

  // Canvas: os mesmos caminhos, em Path2D, redesenhados a cada quadro.
  const caminhos2d = useMemo(() => (desenho && noCanvas ? desenho.caminhos.map((d) => new Path2D(d)) : []), [desenho, noCanvas]);
  useEffect(() => {
    const c = tela.current;
    const ctx = c?.getContext("2d");
    if (!desenho || !noCanvas || !c || !ctx || !paleta || !largura) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(largura * dpr);
    c.height = Math.round((largura * dpr * desenho.altura) / desenho.largura);
    const escala = c.width / desenho.largura;
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.lineWidth = 0.5 / escala;
    ctx.strokeStyle = paleta.borda;
    caminhos2d.forEach((p, i) => {
      const l = porId.get(desenho.ids[i]!);
      ctx.globalAlpha = l?.pintura.opacidade ?? 1;
      ctx.fillStyle = l ? preenchimento(l.pintura, paleta) : paleta.vazio;
      ctx.fill(p);
      ctx.globalAlpha = 1;
      ctx.stroke(p);
    });
    if (desenho.contorno) {
      ctx.lineWidth = 1 / escala;
      ctx.strokeStyle = paleta.contorno;
      ctx.stroke(new Path2D(desenho.contorno));
    }
    for (const id of [destaque, tocado]) {
      const i = id ? desenho.ids.indexOf(id) : -1;
      if (i < 0) continue;
      ctx.lineWidth = 2 / escala;
      ctx.strokeStyle = paleta.destaque;
      ctx.stroke(caminhos2d[i]!);
    }
    if (demorou === null) setDemorou(Math.round(performance.now() - inicio.current));
  }, [desenho, noCanvas, caminhos2d, paleta, porId, largura, destaque, tocado, demorou]);

  /** O lugar sob o toque, pelo caminho do SVG ou, no canvas, pelo Path2D que contém o ponto. */
  const tocar = (e: MouseEvent) => {
    let id: string | undefined;
    if (!noCanvas) {
      const p = (e.target as Element).closest?.("path[data-i]");
      id = p ? desenho?.ids[Number(p.getAttribute("data-i"))] : undefined;
    } else {
      const c = tela.current;
      const ctx = c?.getContext("2d");
      if (c && ctx && desenho) {
        const r = c.getBoundingClientRect();
        const [x, y] = [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height];
        for (let i = caminhos2d.length - 1; i >= 0 && id === undefined; i--) if (ctx.isPointInPath(caminhos2d[i]!, x, y)) id = desenho.ids[i];
      }
    }
    setTocado(id && porId.has(id) && id !== tocado ? id : null);
  };

  const comDestaque = (id: string | undefined, classe: string) => {
    const i = id && desenho ? desenho.ids.indexOf(id) : -1;
    return i >= 0 ? <path class={classe} d={desenho!.caminhos[i]} /> : null;
  };
  const doTocado = tocado ? porId.get(tocado) : undefined;

  return (
    <div class="mapa-dos-lugares" ref={caixa} data-desenho={noCanvas ? "canvas" : "svg"} data-ms={demorou ?? undefined}>
      {!desenho ? (
        <p class="nota">Desenhando o mapa…</p>
      ) : noCanvas ? (
        <canvas ref={tela} role="img" aria-label={rotulo} style={{ aspectRatio: `${desenho.largura} / ${desenho.altura}` }} onClick={tocar} />
      ) : (
        <svg viewBox={`0 0 ${desenho.largura} ${desenho.altura}`} role="img" aria-label={rotulo} onClick={tocar}>
          <g ref={grupo} class="lugares" dangerouslySetInnerHTML={{ __html: svg }} />
          {desenho.contorno && <path class="contorno" d={desenho.contorno} />}
          {comDestaque(destaque, "destaque")}
          {tocado !== destaque && comDestaque(tocado ?? undefined, "destaque")}
        </svg>
      )}
      <Legenda conteudo={conteudo} />
      {doTocado && <CartaoDoLugar lugar={doTocado} conteudo={conteudo} aoFechar={() => setTocado(null)} />}
    </div>
  );
}

/** As cores do mapa e o que cada uma quer dizer. */
function Legenda({ conteudo }: { conteudo: ConteudoDoMapa }) {
  const nomes = conteudo.candidatos.map((c) => ({ nome: nomeCurto(c.nome), cor: corDoPartido(c.partido) }));
  const quem = conteudo.mostra === "mudanca" ? "ganhou terreno" : "à frente";
  const nota =
    conteudo.mostra === "primeiroTurno"
      ? "1º turno de 2026, pelo placar entre finalistas. Cor mais forte, vantagem maior."
      : conteudo.mostra === "mudanca"
        ? "Desde o 1º turno, pelo placar entre finalistas: a projeção enquanto o lugar apura e o resultado quando termina. Mais transparente, menos seções."
        : "Cor mais forte, vantagem maior; mais transparente, menos seções.";
  return (
    <div class="legenda-do-mapa">
      <ul>
        {nomes.map((n) => (
          <li key={n.nome} data-cor={n.cor}>
            {n.nome} {quem}
          </li>
        ))}
        <li data-cor="vazio">{conteudo.mostra === "primeiroTurno" ? "sem voto" : "sem seções"}</li>
      </ul>
      <p class="nota">{nota}</p>
    </div>
  );
}

/** O cartão de um lugar tocado no mapa: os números e o link para a página dele. */
function CartaoDoLugar({ lugar, conteudo, aoFechar }: { lugar: LugarDoMapa; conteudo: ConteudoDoMapa; aoFechar: () => void }) {
  const [primeiro, segundo] = conteudo.candidatos.map((c) => nomeCurto(c.nome)) as [string, string];
  const dois = ([a, b]: [number, number], casas: 1 | 2) => `${primeiro} ${formatarPctComCasas(a, casas)} · ${segundo} ${formatarPctComCasas(b, casas)}`;
  let numeros: string[];
  if (conteudo.mostra === "primeiroTurno") {
    const pt = lugar.primeiroTurno;
    numeros = pt === null ? ["Sem votos no 1º turno"] : [`1º turno de 2026, entre os finalistas: ${dois([pt, Math.round(10 * (100 - pt)) / 10], 1)}`];
  } else if (!lugar.secoes || !lugar.placar) {
    numeros = ["Nenhuma seção totalizada"];
  } else {
    numeros = [`Seções totalizadas: ${formatarPctComCasas(lugar.secoes, 2)}`, `Placar: ${dois(lugar.placar, 2)}`];
    if (lugar.projecao !== null) numeros.push(`Projeção: ${dois([lugar.projecao, Math.round(10 * (100 - lugar.projecao)) / 10], 1)}`);
    if (lugar.mudanca) numeros.push(`Desde o 1º turno: ${lugar.mudanca}`);
  }
  return (
    <div class="cartao-do-lugar" aria-live="polite">
      <div class="cartao-do-lugar-topo">
        <strong>{lugar.nome}</strong>
        <button type="button" aria-label="Fechar" onClick={aoFechar}>
          ×
        </button>
      </div>
      {numeros.map((n) => (
        <p key={n}>{n}</p>
      ))}
      <a href={lugar.caminho}>Abrir a página →</a>
    </div>
  );
}
