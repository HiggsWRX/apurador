import type { TurnoPassado } from "../lib/curva-de-comparacao";
import { ControleDaComparacao, distanciaDaComparacao, LinhasDaComparacao, useComparacao } from "./CurvaDeComparacao";
import { ALTURA, EixosDaCurva, eixosDaCurva, escalaDaCurva, LARGURA } from "./EixosDaCurva";

// As curvas reais de noites passadas em "O que esperar da noite" (Consulta a advogado eleitoral, decisão 2): com a
// projeção de antes das 17h desligada, o bloco fica sem números de projeção, com a ordem de chegada típica e estas
// curvas. São as curvas de comparação do Brasil, com os mesmos botões e a mesma escala, sem curva real por baixo:
// nenhuma vem ligada, e o gráfico só aparece, e as curvas só se baixam, quando o visitante escolhe um turno.

const MARGEM_DIREITA = 16;

interface Props {
  /** Os turnos passados do Brasil. */
  turnos: TurnoPassado[];
}

/** As curvas reais das noites passadas no Brasil, uma por vez, pelo botão do turno. */
export default function NoitesPassadas({ turnos }: Props) {
  const comparacao = useComparacao("BR", turnos);
  const turno = turnos.find((t) => t.id === comparacao.estado.ligado);
  const escala = escalaDaCurva(distanciaDaComparacao(comparacao));
  const eixos = eixosDaCurva(escala, MARGEM_DIREITA);
  return (
    <div class="noites-passadas" data-noites-passadas>
      <p>Nas noites passadas, o placar do PT contra o partido de Bolsonaro mudou ao longo da apuração. Escolha uma para ver a curva real do Brasil.</p>
      <ControleDaComparacao {...comparacao} rotulo="Ver a noite de" />
      {turno && comparacao.estado.curva && (
        <svg class="grafico-curva" viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={`Curva real do Brasil em ${turno.nome}: o PT e o ${turno.partidos[0]}`}>
          <EixosDaCurva eixos={eixos} escala={escala} recorte="noites-passadas-recorte" />
          <g clip-path="url(#noites-passadas-recorte)">
            <LinhasDaComparacao {...comparacao} eixos={eixos} />
          </g>
        </svg>
      )}
    </div>
  );
}
