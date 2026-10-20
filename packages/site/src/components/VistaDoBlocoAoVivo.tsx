import { emPlanoZero } from "../lib/chaves-ao-vivo";
import type { QuadroAoVivo } from "../lib/leitor-ao-vivo";
import { eventosDoLugar } from "../lib/narracao";
import { eleitoPelaIndicacao, manchete, type LugarDaManchete } from "../lib/textos-ao-vivo";
import { CurvaReal } from "./CurvaReal";
import { FaixaDeAviso } from "./FaixaDeAviso";
import { IndicadorAoVivo } from "./IndicadorAoVivo";
import { LinhaFixa } from "./LinhaFixa";
import { PlacarOficial } from "./PlacarOficial";
import { PlanoZero } from "./PlanoZero";
import { UltimoEvento } from "./UltimoEvento";

// O desenho do bloco ao vivo para um quadro do leitor (Telas da página de lugar, decisões 1, 2, 4 e 5): a manchete com
// o último evento da narração, o placar oficial e a curva real. Não guarda estado nem lê nada: a ilha (`BlocoAoVivo`)
// faz as leituras e passa o quadro, e os testes renderizam esta vista em HTML.

/** O que a vista recebe da ilha: o quadro da última leitura e o que a ilha sabe da tela e do tempo. */
export interface PropsDaVista {
  quadro: QuadroAoVivo;
  lugar: LugarDaManchete;
  /** A URL da foto oficial de cada candidato, pelo sequencial do TSE. */
  fotos: Record<string, string>;
  /** O visitante prefere movimento reduzido: nada pulsa nem pisca. */
  movimentoReduzido: boolean;
  /** Os segundos até a próxima leitura, para o anel de 30 s. */
  proximaLeitura: number | null;
  /** Uma leitura em andamento: o anel vira uma rodinha. */
  lendo: boolean;
  /** O cartão do placar está na tela: a linha fixa fica escondida. */
  placarNaTela?: boolean;
}

/** O bloco ao vivo para o quadro: a manchete, a linha fixa, o placar oficial e a curva real. */
export function VistaDoBlocoAoVivo({ quadro, lugar, fotos, movimentoReduzido, proximaLeitura, lendo, placarNaTela = true }: PropsDaVista) {
  // No plano zero, o bloco inteiro dá lugar ao convite ao app oficial do TSE; a faixa do aviso pronto continua.
  if (emPlanoZero(quadro)) {
    return (
      <div class="bloco-ao-vivo">
        <PlanoZero />
        <FaixaDeAviso aviso={quadro.aviso} />
      </div>
    );
  }
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
  const frase = manchete(quadro, lugar);
  return (
    <div class="bloco-ao-vivo">
      {dados && <LinhaFixa candidatos={dados.candidatos} tse={dados.tse} escondida={placarNaTela} indicador={indicador()} mudou={mudou} />}
      {frase && (
        <p class="manchete" data-manchete>
          {frase}
        </p>
      )}
      <UltimoEvento quadro={quadro} />
      <FaixaDeAviso aviso={quadro.aviso} />
      <PlacarOficial
        antesDas17h={quadro.fase === "antes-das-17h"}
        candidatos={dados?.candidatos ?? null}
        tse={dados?.tse ?? null}
        fotos={fotos}
        indicador={indicador()}
        mudou={mudou}
        eleito={eleitoPelaIndicacao(quadro)}
      />
      {dados && <CurvaReal candidatos={dados.candidatos} curva={quadro.lugar!.curva} eventos={eventosDoLugar(quadro)} />}
    </div>
  );
}
