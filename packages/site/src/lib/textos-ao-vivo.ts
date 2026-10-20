import type { TipoDeLugar } from "@apurador/pipeline";
import { formatarPctComCasas, formatarVotos } from "./formato";
import { nomeCurto } from "./identidade";
import type { QuadroAoVivo } from "./leitor-ao-vivo";

// Os textos do bloco ao vivo. A manchete começa sempre pelo placar oficial e nunca traz frase de projeção enquanto os
// textos preditivos não forem confirmados (Narração da noite, decisão 9; Segunda consulta jurídica).

/** O app oficial de resultados do TSE, na web, para onde a página manda quando a atualização para. */
export const APP_DO_TSE = "https://resultados.tse.jus.br/oficial/app/index.html";

/** Abaixo de 0,10 ponto entre os dois, em centésimos de ponto, a manchete dá a diferença em votos. */
const DIFERENCA_EM_VOTOS = 10;

/** Onde a apuração ainda não começou, como a manchete diz. */
const ONDE: Record<TipoDeLugar, string> = { brasil: "no Brasil", uf: "neste estado", exterior: "no Exterior", municipio: "neste município" };

/** A manchete do lugar no momento do quadro. */
export function manchete(quadro: QuadroAoVivo, lugar: { tipo: TipoDeLugar; uf?: string }): string {
  const { rodada, lugar: dados } = quadro;
  if (quadro.fase === "antes-das-17h" || !rodada) return "A apuração do 2º turno começa às 17h";
  // Sem o arquivo do lugar depois das 17h (a primeira leitura ainda não o trouxe), ele ainda não tem seções.
  if (!dados || dados.tse.secoes.totalizadas === 0) return `A apuração ainda não começou ${lugar.tipo === "municipio" && lugar.uf === "ZZ" ? "nesta cidade" : ONDE[lugar.tipo]}`;
  const { secoes, votos, percentuais } = dados.tse;

  const [a, b] = rodada.candidatos.map((c, i) => ({ nome: nomeCurto(c.nome), votos: votos[i] ?? 0, centesimos: Math.round((percentuais[i] ?? 0) * 100) }));
  const comSecoes = `${formatarPctComCasas(secoes.percentual, 2)} das seções totalizadas`;
  if (!a || !b) return "";
  if (a.votos === b.votos) return `${a.nome} e ${b.nome} empatam com ${formatarVotos(a.votos)} votos cada, com ${comSecoes}`;
  const [lider, segundo] = a.votos > b.votos ? [a, b] : [b, a];
  if (lider.centesimos - segundo.centesimos < DIFERENCA_EM_VOTOS) return `${lider.nome} à frente por ${formatarVotos(lider.votos - segundo.votos)} votos, com ${comSecoes}`;
  return `${lider.nome} lidera com ${formatarPctComCasas(lider.centesimos / 100, 2)} dos votos válidos e ${comSecoes}`;
}
