import { instanteDoTse } from "@apurador/coletor/narracao";
import type { TipoDeLugar } from "@apurador/pipeline";
import { formatarPctComCasas, formatarVotos } from "./formato";
import { nomeCurto } from "./identidade";
import type { QuadroAoVivo } from "./leitor-ao-vivo";
import { eventosDoLugar } from "./narracao";
import type { ProjecaoNaPagina } from "./projecao-ao-vivo";

// Os textos do bloco ao vivo. A manchete começa sempre pelo placar oficial, e só ganha a frase de projeção com a chave
// dos textos preditivos ligada (Narração da noite, decisão 9; Segunda consulta jurídica, decisão 5). A virada e a
// indicação do TSE saem da narração do lugar, que o coletor publica pronta; a frase de projeção, dos números do sinal de
// virada na base escolhida, os mesmos do rótulo da curva, e por isso ela nunca vai num JSON.

/** O app oficial de resultados do TSE, na web, para onde a página manda quando a atualização para. */
export const APP_DO_TSE = "https://resultados.tse.jus.br/oficial/app/index.html";

/** A diferença, em centésimos de ponto, abaixo da qual a manchete a dá em votos: 0,10 ponto. */
const LIMITE_DA_DIFERENCA_EM_VOTOS = 10;
/**
 * Por quanto tempo depois de uma virada a manchete fala dela (decisão 9), na hora do TSE: a última totalização do
 * Brasil contra a do evento. A hora da rodada é a do relógio do coletor, que no ensaio geral está em outro dia.
 */
const MANCHETE_DA_VIRADA = 10 * 60_000;

/** Onde a apuração ainda não começou, como a manchete diz. */
const ONDE: Record<TipoDeLugar, string> = { brasil: "no Brasil", uf: "neste estado", exterior: "no Exterior", municipio: "neste município" };

/** O lugar da página para a manchete: o tipo, a UF e o nome com a preposição (`emLugar`, em `lib/lugares.ts`). */
export interface LugarDaManchete {
  tipo: TipoDeLugar;
  uf?: string;
  em: string;
}

/** Quem lidera o placar parcial pelos votos, com o nome curto e o % das duas casas do TSE em centésimos, ou `undefined` num empate. */
function lider(candidatos: { nome: string }[], tse: { votos: number[]; percentuais: number[] }) {
  const [a, b] = candidatos.map((c, i) => ({ nome: nomeCurto(c.nome), votos: tse.votos[i] ?? 0, centesimos: Math.round((tse.percentuais[i] ?? 0) * 100) }));
  if (!a || !b || a.votos === b.votos) return undefined;
  return a.votos > b.votos ? { ...a, segundo: b } : { ...b, segundo: a };
}

/** O eleito pela indicação do TSE, pelo nome curto, ou `null` sem ela. Só no Brasil: é o que torna a eleição "matematicamente definida". */
export function eleitoPelaIndicacao(quadro: QuadroAoVivo): string | null {
  const { rodada, lugar: arquivo } = quadro;
  if (!rodada || arquivo?.lugar !== "BR" || !eventosDoLugar(quadro).some((e) => e.tipo === "indicacao")) return null;
  return lider(rodada.candidatos, arquivo.tse)?.nome ?? null;
}

/**
 * A frase de projeção da manchete (Narração da noite, decisão 9; Sinal de virada, decisão 4), com a chave dos textos
 * preditivos ligada: o estado do sinal de virada na base escolhida, dito de quem está atrás (`atras`) ou à frente
 * (`frente`) no placar parcial. `null` sem a chave, sem a projeção na página, sem sinal ou com a indicação do TSE, quando
 * o sinal para.
 */
function fraseDaProjecao(quadro: QuadroAoVivo, projecao: ProjecaoNaPagina | null, frente: string, atras: string): string | null {
  if (!quadro.chaves.textosPreditivos || !projecao || projecao.comIndicacao) return null;
  const { sinalDeVirada, virada } = projecao.naBase;
  if (sinalDeVirada === "virada projetada")
    return `A projeção do Apurador indica virada de ${atras}${virada?.x != null ? ` por volta de ${virada.x}% das seções` : ""}.`;
  if (sinalDeVirada === "virada possível")
    return `A projeção do Apurador vê virada possível de ${atras}${virada?.cedo != null ? ` a partir de ~${virada.cedo}% das seções` : ""}.`;
  if (sinalDeVirada === "sem sinal de virada") return `A projeção do Apurador não indica virada: ${frente} deve seguir à frente.`;
  return null;
}

/**
 * A manchete do lugar no momento do quadro, ou `null` depois das 17h enquanto o arquivo do lugar não chega: ele pode
 * faltar por um erro da CDN, e dizer que a apuração não começou ali seria falso. Com a projeção que a página mostra, na
 * base escolhida, o placar ganha a frase de projeção, se a chave dos textos preditivos estiver ligada.
 */
export function manchete(quadro: QuadroAoVivo, lugar: LugarDaManchete, projecao: ProjecaoNaPagina | null = null): string | null {
  const { rodada, lugar: arquivo } = quadro;
  if (quadro.fase === "antes-das-17h" || !rodada) return "A apuração do 2º turno começa às 17h";
  if (!arquivo) return null;
  const { secoes, votos } = arquivo.tse;
  if (secoes.totalizadas === 0) return `A apuração ainda não começou ${lugar.tipo === "municipio" && lugar.uf === "ZZ" ? "nesta cidade" : ONDE[lugar.tipo]}`;

  // O líder sai dos votos; a diferença, dos % com as duas casas do TSE, em centésimos, para 50,05 − 49,95 não dar 0,0999….
  const frente = lider(rodada.candidatos, arquivo.tse);
  const comSecoes = `${formatarPctComCasas(secoes.percentual, 2)} das seções totalizadas`;
  if (!frente) {
    const [a, b] = rodada.candidatos.map((c) => nomeCurto(c.nome));
    return `${a} e ${b} empatam com ${formatarVotos(votos[0] ?? 0)} votos cada, com ${comSecoes}`;
  }
  const pct = formatarPctComCasas(frente.centesimos / 100, 2);
  if (lugar.tipo === "brasil" && arquivo.tse.final) return `${frente.nome} foi eleito com ${pct} dos votos válidos`;
  if (eleitoPelaIndicacao(quadro)) return `O TSE indica ${frente.nome} eleito`;
  if (lugar.tipo !== "brasil" && secoes.totalizadas === secoes.total) return `${frente.nome} vence ${lugar.em} com ${pct} dos votos válidos`;
  const frase = fraseDaProjecao(quadro, projecao, frente.nome, frente.segundo.nome);
  const comFrase = (placar: string) => (frase ? `${placar}. ${frase}` : placar);
  // Com um número par de trocas na janela, a liderança voltou a quem estava à frente: não houve virada para anunciar.
  const virada = eventosDoLugar(quadro).find((e) => e.tipo === "virada");
  const agoraNoTse = rodada.novidade.totalizacao && instanteDoTse(rodada.novidade.totalizacao);
  if (virada && (virada.trocas ?? 1) % 2 === 1 && agoraNoTse && agoraNoTse - instanteDoTse(virada.quando) < MANCHETE_DA_VIRADA) {
    return comFrase(`Virada: ${frente.nome} passa à frente com ${pct}, com ${comSecoes}`);
  }
  if (frente.centesimos - frente.segundo.centesimos < LIMITE_DA_DIFERENCA_EM_VOTOS) {
    return comFrase(`${frente.nome} à frente por ${formatarVotos(frente.votos - frente.segundo.votos)} votos, com ${comSecoes}`);
  }
  return comFrase(`${frente.nome} lidera com ${pct} dos votos válidos e ${comSecoes}`);
}
