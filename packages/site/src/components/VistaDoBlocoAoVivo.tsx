import type { TipoDeLugar } from "@apurador/pipeline";
import type { QuadroAoVivo } from "../lib/leitor-ao-vivo";
import { manchete } from "../lib/textos-ao-vivo";
import { CurvaReal } from "./CurvaReal";
import { IndicadorAoVivo } from "./IndicadorAoVivo";
import { LinhaFixa } from "./LinhaFixa";
import { PlacarOficial } from "./PlacarOficial";

// O desenho do bloco ao vivo para um quadro do leitor (Telas da página de lugar, decisões 1, 2, 4 e 5): a manchete, o
// placar oficial e a curva real. Não guarda estado nem lê nada: a ilha (`BlocoAoVivo`) faz as leituras e passa o
// quadro, e os testes renderizam esta vista em HTML.

export interface PropsDaVista {
  quadro: QuadroAoVivo;
  lugar: { tipo: TipoDeLugar; uf?: string };
  /** A URL da foto oficial de cada candidato, pelo sequencial do TSE. */
  fotos: Record<string, string>;
  movimentoReduzido: boolean;
  /** Os segundos até a próxima leitura, para o anel de 30 s. */
  proximaLeitura: number | null;
  /** Uma leitura em andamento: o anel vira uma rodinha. */
  lendo: boolean;
  /** O cartão do placar está na tela: a linha fixa fica escondida. */
  placarNaTela?: boolean;
}

export function VistaDoBlocoAoVivo({ quadro, lugar, fotos, movimentoReduzido, proximaLeitura, lendo, placarNaTela = true }: PropsDaVista) {
  // Antes das 17h o placar só diz quando a divulgação começa, mesmo com o coletor publicando o TSE zerado.
  const dados = quadro.fase !== "antes-das-17h" && quadro.rodada && quadro.lugar ? { candidatos: quadro.rodada.candidatos, tse: quadro.lugar.tse } : null;
  const indicador = () => (
    <IndicadorAoVivo
      indicador={quadro.indicador}
      ultimaLeitura={quadro.ultimaLeitura}
      ultimaTotalizacao={quadro.rodada?.novidade.totalizacao ?? null}
      movimentoReduzido={movimentoReduzido}
      proximaLeitura={proximaLeitura}
      lendo={lendo}
    />
  );
  // Com movimento reduzido, nada pisca.
  const mudou = (numero: string) => !movimentoReduzido && quadro.mudaram.includes(numero);
  return (
    <div class="bloco-ao-vivo">
      {dados && <LinhaFixa candidatos={dados.candidatos} tse={dados.tse} escondida={placarNaTela} indicador={indicador()} mudou={mudou} />}
      <p class="manchete" data-manchete>
        {manchete(quadro, lugar)}
      </p>
      <PlacarOficial antesDas17h={quadro.fase === "antes-das-17h"} candidatos={dados?.candidatos ?? null} tse={dados?.tse ?? null} fotos={fotos} indicador={indicador()} mudou={mudou} />
      {dados && <CurvaReal candidatos={dados.candidatos} curva={quadro.lugar!.curva} />}
    </div>
  );
}
