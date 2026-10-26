import type { Feature, MultiLineString } from "geojson";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  comecaNoCanvas,
  desenharCaminhos,
  FATIA,
  lembrarDoCanvas,
  LIMITE_DO_DESENHO_MS,
  paletaDe,
  pausa,
  preenchimento,
  type Desenho,
  type Paleta,
} from "../lib/desenho-do-mapa";
import { formatarPctComCasas, oQueFaltaPara100 } from "../lib/formato";
import { corDoPartido, nomeCurto } from "../lib/identidade";
import type { ConteudoDoMapa, LugarDoMapa } from "../lib/mapa-dos-lugares";

// O mapa do cartão (Telas da página de lugar, decisão 8; ticket 26), em SVG ou, se o SVG não sair em 2 s neste aparelho,
// em canvas, com os mesmos caminhos. Cada lugar sai na cor que `mapaDosLugares` dá, e a cada leitura só mudam os que
// mudaram de cor. Tocar num lugar abre embaixo um cartão com os números e "Abrir a página →", sem navegar de primeira.
// O mapa não tem foco por lugar: quem navega pelo teclado ou com leitor de tela usa a Tabela, que é a alternativa a ele.

interface Props {
  feicoes: Feature[];
  /** Linhas por cima dos lugares: as fronteiras das UFs no Brasil por municípios, o contorno da UF na página dela. */
  contorno: MultiLineString | null;
  /** A hora (`performance.now()`) em que a malha começou a ser decodificada: o tempo do desenho conta dela. */
  desde: number;
  conteudo: ConteudoDoMapa;
  /** O lugar da página, destacado: um município entre os da UF. */
  destaque?: string;
  rotulo: string;
}

/** O mapa de uma malha, pintado pelo conteúdo do quadro, com a legenda e o cartão do lugar tocado embaixo. */
export function MapaDosLugares({ feicoes, contorno, desde, conteudo, destaque, rotulo }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const grupo = useRef<SVGGElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const [desenho, setDesenho] = useState<Desenho | null>(null);
  /** O desenho cujos caminhos já estão todos no SVG. */
  const [noSvg, setNoSvg] = useState<Desenho | null>(null);
  const [noCanvas, setNoCanvas] = useState(comecaNoCanvas);
  const [demorou, setDemorou] = useState<number | null>(null);
  const [paleta, setPaleta] = useState<Paleta | null>(null);
  const [tocado, setTocado] = useState<string | null>(null);
  const [largura, setLargura] = useState(0);
  /** Desde quando o tempo do desenho conta: a decodificação da malha, ou a troca para o canvas. */
  const inicio = useRef(desde);
  /** Se a página ficou escondida (outra aba) enquanto o tempo contava: os quadros param, e o tempo não diz nada do aparelho. */
  const escondida = useRef(false);
  /** A cor que cada caminho do SVG tem agora, para só mexer nos que mudam. */
  const pintadas = useRef<string[]>([]);

  const porId = useMemo(() => new Map(conteudo.lugares.map((l) => [l.id, l])), [conteudo]);

  // Os caminhos, uma vez por malha, em fatias.
  useEffect(() => {
    let vivo = true;
    inicio.current = desde;
    escondida.current = document.hidden;
    const aoEsconder = () => void (document.hidden && (escondida.current = true));
    document.addEventListener("visibilitychange", aoEsconder);
    setDesenho(null);
    setDemorou(null);
    void desenharCaminhos(feicoes, contorno).then((d) => vivo && setDesenho(d));
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", aoEsconder);
    };
  }, [feicoes, contorno, desde]);

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

  /** Conta o tempo até o desenho aparecer, dois quadros depois de ele entrar; no SVG, passa ao canvas se estourar. */
  const medir = (doSvg: boolean) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const ms = Math.round(performance.now() - inicio.current);
        setDemorou(ms);
        if (doSvg && ms > LIMITE_DO_DESENHO_MS && !escondida.current) {
          lembrarDoCanvas();
          inicio.current = performance.now();
          setDemorou(null);
          setNoCanvas(true);
        }
      }),
    );

  // SVG: os caminhos entram em fatias, como saíram da conta.
  useEffect(() => {
    const g = grupo.current;
    if (!desenho || noCanvas || !g) return;
    let vivo = true;
    g.replaceChildren();
    pintadas.current = [];
    setNoSvg(null);
    void (async () => {
      for (let i = 0; i < desenho.caminhos.length; i += FATIA) {
        g.insertAdjacentHTML(
          "beforeend",
          desenho.caminhos
            .slice(i, i + FATIA)
            .map((d, j) => `<path d="${d}" data-i="${i + j}"/>`)
            .join(""),
        );
        await pausa();
        if (!vivo) return;
      }
      setNoSvg(desenho);
    })();
    return () => void (vivo = false);
  }, [desenho, noCanvas]);

  // SVG: as cores, a cada quadro, só nos caminhos que mudaram.
  useEffect(() => {
    const g = grupo.current;
    if (!desenho || noSvg !== desenho || noCanvas || !g || !paleta) return;
    const paths = g.children;
    for (let i = 0; i < paths.length; i++) {
      const pintura = porId.get(desenho.ids[i]!)?.pintura;
      const [cor, opacidade] = pintura ? [preenchimento(pintura, paleta), String(pintura.opacidade)] : [paleta.semSecoes, "1"];
      if (pintadas.current[i] === `${cor} ${opacidade}`) continue;
      pintadas.current[i] = `${cor} ${opacidade}`;
      const p = paths[i] as SVGPathElement;
      p.style.fill = cor;
      p.style.fillOpacity = opacidade;
    }
    if (demorou === null) medir(true);
  }, [desenho, noSvg, noCanvas, paleta, porId, demorou]);

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
    ctx.strokeStyle = paleta.fundo;
    caminhos2d.forEach((p, i) => {
      const pintura = porId.get(desenho.ids[i]!)?.pintura;
      ctx.globalAlpha = pintura?.opacidade ?? 1;
      ctx.fillStyle = pintura ? preenchimento(pintura, paleta) : paleta.semSecoes;
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
    if (demorou === null) medir(false);
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

  const comDestaque = (id: string | undefined) => {
    const i = id && desenho ? desenho.ids.indexOf(id) : -1;
    return i >= 0 ? <path class="destaque" d={desenho!.caminhos[i]} /> : null;
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
          {/* Os caminhos dos lugares entram aqui pela ilha, em fatias, e não pelo Preact. */}
          <g ref={grupo} class="lugares" />
          {desenho.contorno && <path class="contorno" d={desenho.contorno} />}
          {comDestaque(destaque)}
          {tocado !== destaque && comDestaque(tocado ?? undefined)}
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
        ? "Desde o 1º turno, pelo placar entre finalistas: a projeção enquanto a noite corre e o resultado depois do fim. Mais transparente, menos seções."
        : "Cor mais forte, vantagem maior; mais transparente, menos seções.";
  return (
    <div class="legenda-do-mapa">
      <ul>
        {nomes.map((n) => (
          <li key={n.nome} data-cor={n.cor}>
            {n.nome} {quem}
          </li>
        ))}
        {conteudo.lugares.some((l) => l.pintura.cor === "empate") && <li data-cor="empate">{conteudo.mostra === "mudanca" ? "sem mudança" : "empate"}</li>}
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
    numeros = pt === null ? ["Sem votos no 1º turno"] : [`1º turno de 2026, entre os finalistas: ${dois([pt, oQueFaltaPara100(pt)], 1)}`];
  } else if (!lugar.secoes || !lugar.placar) {
    numeros = ["Nenhuma seção totalizada"];
  } else {
    numeros = [`Seções totalizadas: ${formatarPctComCasas(lugar.secoes, 2)}`, `Placar: ${dois(lugar.placar, 2)}`];
    if (lugar.projecao !== null) numeros.push(`Projeção: ${dois([lugar.projecao, oQueFaltaPara100(lugar.projecao)], 1)}`);
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
