import type { BaseDaProjecao } from "@apurador/coletor";
import { antesNaNarracao, TIPOS_PREDITIVOS, type EventoDaNarracao } from "@apurador/coletor/narracao";
import type { IdDaBase } from "./bases-da-projecao";
import type { QuadroAoVivo } from "./leitor-ao-vivo";

// A narração da noite como a página a mostra (Narração da noite, decisões 1, 5, 6 e 10): a do próprio lugar, que vem
// pronta no JSON dele, com os eventos do Brasil do arquivo de rodada (a virada, "as pesquisas deixaram de pesar", a
// indicação do TSE e a totalização final) intercalados pela hora nas páginas das UFs, do Exterior e dos municípios. A
// página não escreve texto nenhum: só junta, ordena e escolhe, e dos preditivos escolhe os da base escolhida.

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

/**
 * Os eventos como a página os mostra na base escolhida (decisões 5 e 6): os preditivos dela e os marcos com a linha da
 * projeção dela, só com a chave dos textos preditivos e a da projeção ligadas. Com a base com pesquisas fora do ar, vale
 * a "Só apuração", como na caixa da projeção. Sem a chave, nenhum preditivo, nem os que um JSON velho da CDN ainda traga.
 */
export function naBaseEscolhida(eventos: EventoDaNarracao[], quadro: Pick<QuadroAoVivo, "chaves">, escolhida: IdDaBase): EventoDaNarracao[] {
  const { textosPreditivos, projecao, baseComPesquisas } = quadro.chaves;
  const base: BaseDaProjecao | null = !textosPreditivos || !projecao ? null : escolhida === "com-pesquisas" && baseComPesquisas ? "comPesquisas" : "soApuracao";
  return eventos.flatMap((e) => {
    if (e.base !== undefined || TIPOS_PREDITIVOS.includes(e.tipo)) return e.base === base ? [e] : [];
    const linha = base && e.linhaDaProjecao?.[base];
    return linha ? [{ ...e, texto: `${e.texto} ${linha}` }] : [e];
  });
}
