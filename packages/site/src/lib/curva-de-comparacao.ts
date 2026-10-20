import type { CurvaDeComparacao } from "@apurador/pipeline";

// A curva de comparação na página (Telas da página de lugar, decisão 4): a curva real de um turno passado, que o
// visitante liga por um botão, desligada por padrão. As curvas de um lugar (os cinco turnos passados num arquivo só,
// `/curvas/<id>.json`, com no máximo 1,4 KB com gzip) só se baixam quando o visitante liga uma delas, e uma vez só:
// trocar de turno não baixa de novo. Sem DOM nem rede: a ilha injeta o transporte, como no leitor ao vivo.

/** Um turno passado que a página pode sobrepor à curva real: o id dos dados, o nome no botão e o partido de Bolsonaro. */
export interface TurnoPassado {
  /** Como em `dados/turnos/`: "2022-2". */
  id: string;
  /** Como no botão: "2022 2T". */
  nome: string;
  /** 1 ou 2: num 1º turno, a fatia do PT é o placar entre finalistas, sem os outros candidatos. */
  turno: number;
  /** O PSL em 2018 e o PL depois, como o TSE escreve a sigla. */
  partidoDeBolsonaro: string;
}

/** As curvas de comparação de um lugar, pelo id do turno, como o site as serve em `/curvas/<id>.json`. */
export type CurvasDoLugar = Record<string, CurvaDeComparacao>;

/** O que a curva de comparação mostra agora: o turno ligado, se as curvas já chegaram e a curva dele. */
export interface EstadoDaComparacao {
  ligado: string | null;
  situacao: "desligada" | "baixando" | "pronta" | "falhou";
  curva: CurvaDeComparacao | null;
}

/** A comparação desligada, como a página abre. */
export const COMPARACAO_DESLIGADA: EstadoDaComparacao = { ligado: null, situacao: "desligada", curva: null };

/** O turno passado que o visitante escolhe na ilha, com as curvas do lugar baixadas no primeiro. */
export interface EscolhaDaComparacao {
  /** Liga o turno (e desliga o que estava ligado) ou, se ele já está ligado, desliga a curva. */
  alternar(turno: string): Promise<void>;
}

/** A escolha de um lugar, que baixa as curvas do `endereco` no primeiro turno ligado e dá cada estado a `aoMudar`. */
export function criarEscolhaDaComparacao(opcoes: { endereco: string; buscar: (url: string) => Promise<Response>; aoMudar: (estado: EstadoDaComparacao) => void }): EscolhaDaComparacao {
  let estado = COMPARACAO_DESLIGADA;
  let curvas: Promise<CurvasDoLugar> | null = null;
  const mudar = (novo: EstadoDaComparacao) => {
    estado = novo;
    opcoes.aoMudar(novo);
  };
  const baixar = async () => {
    const resposta = await opcoes.buscar(opcoes.endereco);
    if (!resposta.ok) throw new Error(`${opcoes.endereco}: HTTP ${resposta.status}`);
    return (await resposta.json()) as CurvasDoLugar;
  };

  return {
    async alternar(turno) {
      if (estado.ligado === turno) return mudar(COMPARACAO_DESLIGADA);
      mudar({ ligado: turno, situacao: "baixando", curva: null });
      curvas ??= baixar();
      const pedido = curvas;
      try {
        const doLugar = await pedido;
        // Enquanto as curvas chegavam, o visitante pode ter trocado de turno ou desligado a curva.
        if (estado.ligado === turno) mudar({ ligado: turno, situacao: "pronta", curva: doLugar[turno] ?? null });
      } catch {
        // O próximo clique tenta de novo.
        if (curvas === pedido) curvas = null;
        if (estado.ligado === turno) mudar({ ligado: turno, situacao: "falhou", curva: null });
      }
    },
  };
}
