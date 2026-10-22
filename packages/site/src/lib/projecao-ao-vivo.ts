import type { ArquivoDeRodada, ProjecaoDoLugar, ProjecaoNaBase } from "@apurador/coletor";
import { Z_95, type PontoDaCurva, type ViradaProjetada } from "@apurador/modelo";
import { BASES_DA_PROJECAO, NOME_DA_BASE, type IdDaBase } from "./bases-da-projecao";
import { formatarCalculo, formatarChance } from "./formato";
import type { QuadroAoVivo } from "./leitor-ao-vivo";
import { narracaoDaPagina } from "./narracao";

// A projeção ao vivo como a página a mostra (Telas da página de lugar, decisões 3, 4 e 6; Sinal de virada): o coletor
// a publica pronta no JSON do Brasil, de cada UF e do Exterior, nas bases que estão no ar, e a página só escolhe a base,
// desenha e escreve os rótulos curtos. Ela aparece com a fase ao vivo e a chave da projeção ligada: antes das 17h,
// quem mostra a projeção é o painel de antes das 17h, e na totalização final a caixa sai. Com a indicação do TSE, o
// sinal de virada para em todo lugar.

/** O que a página mostra da projeção de um lugar num quadro. */
export interface ProjecaoNaPagina {
  /** As bases que o visitante escolhe, na ordem do controle: só "Só apuração" com a base com pesquisas desligada. */
  bases: IdDaBase[];
  /** A base que a página mostra: a escolhida, se ela está no ar. */
  base: IdDaBase;
  naBase: ProjecaoNaBase;
  doLugar: ProjecaoDoLugar;
  /** O peso das pesquisas, em %, do arquivo de rodada. */
  pesoDasPesquisas: number | null;
  /** A indicação do TSE já saiu: a eleição está matematicamente definida, e o sinal de virada para. */
  comIndicacao: boolean;
}

/** A projeção do lugar no quadro, na base escolhida, ou `null` quando a página não a mostra. */
export function projecaoNaPagina(quadro: QuadroAoVivo, escolhida: IdDaBase): ProjecaoNaPagina | null {
  const doLugar = quadro.lugar?.projecao;
  if (quadro.fase !== "ao-vivo" || !quadro.chaves.projecao || !doLugar) return null;
  const comPesquisas = quadro.chaves.baseComPesquisas ? doLugar.comPesquisas : undefined;
  const bases: IdDaBase[] = comPesquisas ? BASES_DA_PROJECAO : ["so-apuracao"];
  const base = bases.includes(escolhida) ? escolhida : "so-apuracao";
  return {
    bases,
    base,
    naBase: base === "com-pesquisas" ? comPesquisas! : doLugar.soApuracao,
    doLugar,
    pesoDasPesquisas: quadro.rodada?.pesoDasPesquisas ?? null,
    comIndicacao: (narracaoDaPagina(quadro) ?? []).some((e) => e.lugar === "BR" && e.tipo === "indicacao"),
  };
}

/**
 * O rótulo do sinal de virada, com a chance de virada no formato da chance de vitória (Sinal de virada, decisão 2):
 * "Virada projetada · ~88% das seções (80–95%) · chance de virada 62%", "Virada possível · a partir de ~69% das seções ·
 * chance de virada 25%" ou "Sem sinal de virada · chance de virada 3%". `null` antes de alguém estar atrás no placar
 * parcial e depois da indicação do TSE (decisão 3).
 */
export function rotuloDoSinal(projecao: Pick<ProjecaoNaPagina, "naBase" | "comIndicacao">): string | null {
  const { sinalDeVirada, chanceDeVirada, virada } = projecao.naBase;
  if (projecao.comIndicacao || sinalDeVirada === null || chanceDeVirada === null) return null;
  const chance = `chance de virada ${formatarChance(chanceDeVirada / 100)}`;
  if (sinalDeVirada === "virada projetada") {
    const faixa = virada?.cedo != null && virada.tarde !== null ? ` (${virada.cedo}–${virada.tarde}%)` : "";
    return ["Virada projetada", ...(virada?.x != null ? [`~${virada.x}% das seções${faixa}`] : []), chance].join(" · ");
  }
  if (sinalDeVirada === "virada possível") {
    return ["Virada possível", ...(virada?.cedo != null ? [`a partir de ~${virada.cedo}% das seções`] : []), chance].join(" · ");
  }
  return `Sem sinal de virada · ${chance}`;
}

/** A curva projetada como a curva real a desenha por cima de si: na base escolhida, com a virada e o rótulo do sinal. */
export interface CurvaProjetadaAoVivo {
  /** O nome da base, para a descrição. */
  base: string;
  /** Como os pontos do `modelo`: o `y` é a fatia do 1º candidato do arquivo de rodada, e o desvio dá a margem de 95%. */
  pontos: PontoDaCurva[];
  /** A virada que o sinal deixa desenhar: o losango só com virada projetada, a faixa também com virada possível. */
  virada: Pick<ViradaProjetada, "x" | "cedo" | "tarde">;
  rotulo: string | null;
}

/** A curva projetada da base escolhida, ou `null` quando ela tem menos de dois pontos, como num lugar que terminou. */
export function curvaProjetadaAoVivo(projecao: ProjecaoNaPagina): CurvaProjetadaAoVivo | null {
  const { curva, virada, sinalDeVirada } = projecao.naBase;
  if (curva.length < 2) return null;
  const sinal = projecao.comIndicacao ? null : sinalDeVirada;
  const desenha = sinal === "virada projetada" || sinal === "virada possível";
  return {
    base: NOME_DA_BASE[projecao.base],
    pontos: curva.map(([x, pct, margem]) => ({ x, y: pct / 100, desvio: margem / 100 / Z_95 })),
    virada: {
      x: sinal === "virada projetada" ? (virada?.x ?? null) : null,
      cedo: desenha ? (virada?.cedo ?? null) : null,
      tarde: desenha ? (virada?.tarde ?? null) : null,
    },
    rotulo: rotuloDoSinal(projecao),
  };
}

/**
 * Quem ganhou terreno entre dois % do 1º candidato do arquivo de rodada, ambos com uma casa, no formato "LULA +1,8"
 * da decisão 3, ou "sem mudança". A conta é em décimos, para fechar com os números da página.
 */
export function mudancaEntre(candidatos: ArquivoDeRodada["candidatos"], de: number, para: number): string {
  const decimos = Math.round(10 * para) - Math.round(10 * de);
  if (decimos === 0) return "sem mudança";
  return `${candidatos[decimos > 0 ? 0 : 1]!.nome} +${formatarCalculo(Math.abs(decimos) / 10)}`;
}
