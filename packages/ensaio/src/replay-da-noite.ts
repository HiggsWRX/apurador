import { criarColetor, relogioSemEspera, type ArquivoDoLugar, type EntradaDaProjecao, type EventoDaNarracao } from "@apurador/coletor";
import { dataHoraDoInstante, instanteDaNoite, type Cadastro, type Lugar, type Noite } from "@apurador/pipeline";
import { relogioDoReplay } from "./relogio.ts";
import { buscarNoTseFalso } from "./servidor.ts";
import { criarTseFalso } from "./tse-falso.ts";

// A narração do replay automático da mesma noite, a referência da narração factual do ensaio geral (Ensaio geral,
// decisão 20): o coletor inteiro sobre o TSE falso, sem rede e na velocidade máxima, como no teste do replay
// (`test/replay.test.ts`), só com o que a conferência precisa: a narração final do Brasil. Roda a noite toda em ~1 min.

/** A data e a hora de Brasília de um instante da noite em ms, como o relógio do coletor as conta. */
const emMs = (noite: Noite, instante: number) => Date.parse(`${dataHoraDoInstante(noite, instante).replace(" ", "T")}-03:00`);

/**
 * A narração do Brasil publicada pelo coletor no replay de um trecho da noite (instantes da noite, em segundos), do
 * evento mais novo ao mais antigo. Sem `ate`, vai até 30 min depois da totalização final, como o coletor da noite.
 */
export async function narracaoDoReplay(entrada: {
  noite: Noite;
  cadastro: Cadastro;
  /** Os lugares do site (`dados/lugares.json`), com os nomes que a narração usa. */
  lugares: Lugar[];
  projecao: EntradaDaProjecao;
  de: number;
  ate?: number;
}): Promise<EventoDaNarracao[]> {
  const { noite, cadastro } = entrada;
  const relogio = relogioSemEspera(emMs(noite, entrada.de));
  const tse = criarTseFalso({ noite, cadastro, relogio: relogioDoReplay(entrada.de, relogio.agora) });
  let brasil: ArquivoDoLugar | null = null;
  const coletor = criarColetor({
    base: "http://tse-falso.local/oficial",
    eleicao: "6258",
    lugares: entrada.lugares,
    relogio,
    buscar: buscarNoTseFalso(tse),
    destino: {
      async gravar(caminho, bytes) {
        if (caminho === "lugares/BR.json") brasil = JSON.parse(new TextDecoder().decode(bytes)) as ArquivoDoLugar;
      },
    },
    projecao: entrada.projecao,
  });
  const chegou = () => {
    const { momento, dataHoraDaTotalizacaoFinal } = tse.estado();
    if (entrada.ate !== undefined) return momento.instante >= entrada.ate;
    return dataHoraDaTotalizacaoFinal !== null && momento.instante >= instanteDaNoite(noite, dataHoraDaTotalizacaoFinal) + 30 * 60;
  };
  await coletor.rodar({ ate: chegou });
  return (brasil as ArquivoDoLugar | null)?.narracao ?? [];
}
