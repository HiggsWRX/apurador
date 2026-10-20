import type { TipoDeLugar } from "@apurador/pipeline";
import { formatarPctComCasas, formatarVotos } from "./formato";
import { nomeCurto } from "./identidade";
import type { QuadroAoVivo } from "./leitor-ao-vivo";

// Os textos do bloco ao vivo. A manchete começa sempre pelo placar oficial e nunca traz frase de projeção enquanto os
// textos preditivos não forem confirmados (Narração da noite, decisão 9; Segunda consulta jurídica).

/** O app oficial de resultados do TSE, na web, para onde a página manda quando a atualização para. */
export const APP_DO_TSE = "https://resultados.tse.jus.br/oficial/app/index.html";

/** A diferença, em centésimos de ponto, abaixo da qual a manchete a dá em votos: 0,10 ponto. */
const LIMITE_DA_DIFERENCA_EM_VOTOS = 10;

/** Onde a apuração ainda não começou, como a manchete diz. */
const ONDE: Record<TipoDeLugar, string> = { brasil: "no Brasil", uf: "neste estado", exterior: "no Exterior", municipio: "neste município" };

/**
 * A manchete do lugar no momento do quadro, ou `null` depois das 17h enquanto o arquivo do lugar não chega: ele pode
 * faltar por um erro da CDN, e dizer que a apuração não começou ali seria falso.
 */
export function manchete(quadro: QuadroAoVivo, lugar: { tipo: TipoDeLugar; uf?: string }): string | null {
  const { rodada, lugar: arquivo } = quadro;
  if (quadro.fase === "antes-das-17h" || !rodada) return "A apuração do 2º turno começa às 17h";
  if (!arquivo) return null;
  const { secoes, votos, percentuais } = arquivo.tse;
  if (secoes.totalizadas === 0) return `A apuração ainda não começou ${lugar.tipo === "municipio" && lugar.uf === "ZZ" ? "nesta cidade" : ONDE[lugar.tipo]}`;

  // O líder sai dos votos; a diferença, dos % com as duas casas do TSE, em centésimos, para 50,05 − 49,95 não dar 0,0999….
  const [a, b] = rodada.candidatos.map((c, i) => ({ nome: nomeCurto(c.nome), votos: votos[i] ?? 0, centesimos: Math.round((percentuais[i] ?? 0) * 100) }));
  if (!a || !b) return null;
  const comSecoes = `${formatarPctComCasas(secoes.percentual, 2)} das seções totalizadas`;
  if (a.votos === b.votos) return `${a.nome} e ${b.nome} empatam com ${formatarVotos(a.votos)} votos cada, com ${comSecoes}`;
  const [lider, segundo] = a.votos > b.votos ? [a, b] : [b, a];
  if (lider.centesimos - segundo.centesimos < LIMITE_DA_DIFERENCA_EM_VOTOS) {
    return `${lider.nome} à frente por ${formatarVotos(lider.votos - segundo.votos)} votos, com ${comSecoes}`;
  }
  return `${lider.nome} lidera com ${formatarPctComCasas(lider.centesimos / 100, 2)} dos votos válidos e ${comSecoes}`;
}
