import type { ArquivoDeRodada, ArquivoDoLugar, ColunasDaBase, PontoDaCurvaProjetada, ProjecaoDoLugar, ProjecaoNaBase } from "@apurador/coletor";
import { Z_95, type PontoDaCurva, type ViradaProjetada } from "@apurador/modelo";
import { BASE_NOS_ARQUIVOS, BASES_DA_PROJECAO, NOME_DA_BASE, type IdDaBase } from "./bases-da-projecao";
import { formatarCalculo, formatarChance } from "./formato";
import type { QuadroAoVivo } from "./leitor-ao-vivo";
import { narracaoDaPagina } from "./narracao";

// A projeção ao vivo como a página a mostra (Telas da página de lugar, decisões 3, 4 e 6; Sinal de virada): o coletor
// a publica pronta no JSON do Brasil, de cada UF e do Exterior, e na tabela de projeções da UF de cada município, nas
// bases que estão no ar, e a página só escolhe a base, desenha e escreve os rótulos curtos. Ela aparece com a fase ao
// vivo e a chave da projeção ligada: antes das 17h, quem mostra a projeção é o painel de antes das 17h, e na totalização
// final a caixa sai. Com a indicação do TSE, o sinal de virada para em todo lugar.

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
  const doLugar = projecaoDoLugar(quadro);
  if (quadro.fase !== "ao-vivo" || !quadro.chaves.projecao || !doLugar) return null;
  const comPesquisas = quadro.chaves.baseComPesquisas ? doLugar.comPesquisas : undefined;
  const bases: IdDaBase[] = comPesquisas ? BASES_DA_PROJECAO : ["so-apuracao"];
  const base = bases.includes(escolhida) ? escolhida : "so-apuracao";
  return {
    bases,
    base,
    naBase: doLugar[BASE_NOS_ARQUIVOS[base]]!,
    doLugar,
    pesoDasPesquisas: quadro.rodada?.pesoDasPesquisas ?? null,
    comIndicacao: (narracaoDaPagina(quadro) ?? []).some((e) => e.lugar === "BR" && e.tipo === "indicacao"),
  };
}

/**
 * A projeção do lugar no quadro: a do JSON do Brasil, da UF ou do Exterior, ou, num município, a da linha dele na tabela
 * de projeções da UF (Volume de gravações na noite, decisão 1), com a curva projetada que liga o placar parcial à
 * projeção. `undefined` sem ela.
 */
export function projecaoDoLugar(quadro: Pick<QuadroAoVivo, "lugar" | "tabelaDeProjecoes">): ProjecaoDoLugar | undefined {
  const { lugar, tabelaDeProjecoes } = quadro;
  if (!lugar || lugar.projecao) return lugar?.projecao;
  const projecoes = tabelaDeProjecoes?.projecao;
  const i = tabelaDeProjecoes?.municipios.indexOf(lugar.lugar) ?? -1;
  if (!tabelaDeProjecoes || !projecoes || i < 0) return undefined;
  const validos = projecoes.validos[i]!;
  const naBase = (c: ColunasDaBase): ProjecaoNaBase => {
    const [x, cedo, tarde] = c.virada[i]!;
    return {
      projecao: c.projecao[i]!,
      margem: c.margem[i]!,
      chance: c.chance[i]!,
      chanceDeVirada: c.chanceDeVirada[i]!,
      sinalDeVirada: c.sinalDeVirada[i]!,
      curva: curvaDoMunicipio(lugar.tse, c.projecao[i]!, c.margem[i]!, validos),
      virada: { x, cedo, tarde },
    };
  };
  const { primeiroTurno, pesquisas } = tabelaDeProjecoes.comparacoes;
  const comparacoes = { primeiroTurno: primeiroTurno[i]!, pesquisas: pesquisas[i]! };
  const soApuracao = naBase(projecoes.soApuracao);
  if (!projecoes.comPesquisas) return { soApuracao, comparacoes };
  return { soApuracao, comPesquisas: naBase(projecoes.comPesquisas), coincidem: projecoes.coincidem![i]!, comparacoes };
}

/** Os trechos da curva projetada de um município, do placar parcial à projeção. */
const TRECHOS_DO_MUNICIPIO = 20;

/**
 * A curva projetada de um município, sem modelo no navegador: o voto que falta dele chega todo com a mesma fatia, então,
 * com a fração f dele já chegada, cada candidato tem os votos de agora mais f × o que lhe falta para a projeção, nos votos
 * válidos projetados. A margem cresce com f, de 0 no placar parcial à da projeção, como na virada projetada do município
 * no `modelo`. Antes da primeira seção, a curva é a própria projeção; terminado o município, ela é um ponto só.
 */
function curvaDoMunicipio(tse: ArquivoDoLugar["tse"], projecao: number, margem: number, validos: number): PontoDaCurvaProjetada[] {
  const { totalizadas, total } = tse.secoes;
  if (totalizadas >= total) return [[100, projecao, margem]];
  const [primeiro = 0, segundo = 0] = tse.votos;
  const apurados = primeiro + segundo;
  const falta = Math.max(0, validos - apurados);
  const doPrimeiroQueFalta = (projecao / 100) * (apurados + falta) - primeiro;
  return Array.from({ length: TRECHOS_DO_MUNICIPIO + 1 }, (_, k): PontoDaCurvaProjetada => {
    const f = k / TRECHOS_DO_MUNICIPIO;
    const secoes = (100 * (totalizadas + f * (total - totalizadas))) / total;
    const votos = apurados + f * falta;
    if (votos <= 0) return [secoes, projecao, margem];
    return [secoes, (100 * (primeiro + f * doPrimeiroQueFalta)) / votos, (f * margem * (apurados + falta)) / votos];
  });
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

/** A mudança entre dois % do 1º candidato, ambos com uma casa, em décimos: positiva, ele ganhou terreno. */
export const decimosEntre = (de: number, para: number) => Math.round(10 * para) - Math.round(10 * de);

/**
 * Quem ganhou terreno entre dois % do 1º candidato do arquivo de rodada, ambos com uma casa, no formato "LULA +1,8"
 * da decisão 3, ou "sem mudança". A conta é em décimos, para fechar com os números da página.
 */
export function mudancaEntre(candidatos: Pick<ArquivoDeRodada["candidatos"][number], "nome">[], de: number, para: number): string {
  const decimos = decimosEntre(de, para);
  if (decimos === 0) return "sem mudança";
  return `${candidatos[decimos > 0 ? 0 : 1]!.nome} +${formatarCalculo(Math.abs(decimos) / 10)}`;
}
