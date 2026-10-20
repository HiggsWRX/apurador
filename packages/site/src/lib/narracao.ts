import { antesNaNarracao, type EventoDaNarracao } from "@apurador/coletor/narracao";
import type { QuadroAoVivo } from "./leitor-ao-vivo";

// A narração da noite como a página a mostra (Narração da noite, decisões 1 e 10): a do próprio lugar, que vem pronta
// no JSON dele, com os quatro eventos do Brasil do arquivo de rodada intercalados pela hora nas páginas das UFs, do
// Exterior e dos municípios. A página não escreve texto nenhum: só junta, ordena e escolhe.

/** A narração da página do lugar, do evento mais novo ao mais antigo, ou `null` antes das 17h, quando ela ainda não começou. */
export function narracaoDaPagina(quadro: QuadroAoVivo): EventoDaNarracao[] | null {
  if (quadro.fase === "antes-das-17h" || !quadro.rodada) return null;
  const doLugar = quadro.lugar?.narracao ?? [];
  if (quadro.lugar?.lugar === "BR") return doLugar;
  // A ordenação é estável: no mesmo instante e prioridade, o evento do lugar vem antes do do Brasil.
  return [...doLugar, ...quadro.rodada.eventosDoBrasil].sort(antesNaNarracao);
}

/** Os eventos do próprio lugar no quadro, do mais novo ao mais antigo: os que ganham número na curva e a linha sob a manchete. */
export const eventosDoLugar = (quadro: QuadroAoVivo): EventoDaNarracao[] => (quadro.lugar?.narracao ?? []).filter((e) => e.lugar === quadro.lugar?.lugar);

/** A hora de um evento, `HH:MM` de Brasília. */
export const horaDoEvento = (evento: EventoDaNarracao) => evento.quando.slice(11, 16);

/** Uma hora do TSE (`AAAA-MM-DD HH:MM:SS`, em Brasília), a de um evento ou a da última totalização, em ms. */
export const instanteDoTse = (dataHora: string) => Date.parse(`${dataHora.replace(" ", "T")}-03:00`);
