import { useMemo, useState } from "preact/hooks";
import { COMPARACAO_DESLIGADA, criarEscolhaDaComparacao, type EstadoDaComparacao, type TurnoPassado } from "../lib/curva-de-comparacao";
import { corDoPartido, PT } from "../lib/identidade";
import { COMECO_INSTAVEL, type Eixos } from "./EixosDaCurva";

// A curva de comparação (Telas da página de lugar, decisão 4): a curva real de um turno passado, sobreposta à curva real
// da noite, no mesmo eixo de % de seções totalizadas. Um botão por turno passado, desligada por padrão; ligada, as duas
// linhas pontilhadas do PT e do partido de Bolsonaro, espelhadas em torno de 50%, nas cores de Lula e de Flávio, e a
// legenda. É uma camada própria, que a curva real só monta: os botões e a legenda embaixo do gráfico, as linhas dentro
// dele, e a distância de 50% na conta da escala, como a da curva real, só depois do começo instável.

/** O que a curva recebe da ilha para a comparação: os turnos passados do lugar, o estado e o clique num botão. */
export interface PropsDaComparacao {
  turnos: TurnoPassado[];
  estado: EstadoDaComparacao;
  alternar: (turno: string) => void;
}

/** A maior distância de 50% que a curva de comparação ligada alcança depois do começo instável, ou 0 sem ela. */
export function distanciaDaComparacao({ estado }: PropsDaComparacao): number {
  let distancia = 0;
  estado.curva?.secoes.forEach((secoes, i) => {
    if (secoes > COMECO_INSTAVEL) distancia = Math.max(distancia, Math.abs(estado.curva!.pt[i]! - 50));
  });
  return distancia;
}

/** As duas linhas pontilhadas da curva de comparação ligada, para dentro do gráfico, debaixo das da curva real. */
export function LinhasDaComparacao({ turnos, estado, eixos }: PropsDaComparacao & { eixos: Eixos }) {
  const turno = turnos.find((t) => t.id === estado.ligado);
  const curva = estado.curva;
  if (!turno || !curva) return null;
  const linha = (y: (pt: number) => number) =>
    curva.secoes.map((s, i) => `${i ? "L" : "M"}${eixos.x(s).toFixed(1)},${eixos.y(y(curva.pt[i]!)).toFixed(1)}`).join("");
  return (
    <g data-curva-de-comparacao={turno.id}>
      <path class="linha-de-comparacao" data-cor={corDoPartido(PT[0]!)} d={linha((p) => p)} />
      <path class="linha-de-comparacao" data-cor={corDoPartido(turno.partidoDeBolsonaro)} d={linha((p) => 100 - p)} />
    </g>
  );
}

/**
 * Os botões dos turnos passados, com a legenda da curva ligada. Um lugar sem turno passado não tem nenhum. O rótulo
 * dos botões é "Comparar com" sobre a curva real, e outro onde não há curva real por baixo.
 */
export function ControleDaComparacao({ turnos, estado, alternar, rotulo = "Comparar com" }: PropsDaComparacao & { rotulo?: string }) {
  if (turnos.length === 0) return null;
  const turno = turnos.find((t) => t.id === estado.ligado);
  return (
    <div class="comparacao-da-curva" data-comparacao>
      <div class="turnos-da-comparacao" role="group" aria-label={`${rotulo}: a curva real de um turno passado`}>
        <span>{rotulo}</span>
        {turnos.map((t) => (
          <button key={t.id} type="button" aria-pressed={t.id === estado.ligado ? "true" : "false"} onClick={() => alternar(t.id)}>
            {t.nome}
          </button>
        ))}
      </div>
      {turno && (
        <p class="legenda" data-legenda-da-comparacao aria-live="polite">
          <Legenda turno={turno} estado={estado} />
        </p>
      )}
    </div>
  );
}

function Legenda({ turno, estado }: { turno: TurnoPassado; estado: EstadoDaComparacao }) {
  if (estado.situacao === "baixando") return <>Baixando a curva de {turno.nome}…</>;
  if (estado.situacao === "falhou" || !estado.curva) return <>Não foi possível baixar a curva de {turno.nome}. Tente de novo.</>;
  // Num 1º turno, a fatia do PT é o placar entre finalistas: os outros candidatos ficam de fora.
  return (
    <span>
      <i class="amostra amostra-pontilhada" /> Curva real de {turno.nome}
      {turno.turno === 1 ? ", só entre os dois" : ""}: <strong data-cor={corDoPartido(PT[0]!)}>{PT[0]}</strong> ×{" "}
      <strong data-cor={corDoPartido(turno.partidoDeBolsonaro)}>{turno.partidoDeBolsonaro}</strong>
    </span>
  );
}

/** A comparação de um lugar numa ilha: as curvas vêm de `/curvas/<id>.json`, baixadas no primeiro turno ligado. */
export function useComparacao(lugar: string, turnos: TurnoPassado[]): PropsDaComparacao {
  const [estado, setEstado] = useState(COMPARACAO_DESLIGADA);
  const escolha = useMemo(() => criarEscolhaDaComparacao({ endereco: `/curvas/${lugar}.json`, buscar: (url) => fetch(url), aoMudar: setEstado }), [lugar]);
  return { turnos, estado, alternar: (turno) => void escolha.alternar(turno) };
}
