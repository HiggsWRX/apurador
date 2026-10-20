import type { ArquivoDeRodada, ArquivoDoLugar, Fase } from "@apurador/coletor";
import { DIA_DA_ELEICAO } from "@apurador/modelo";

// O leitor ao vivo: a lógica da ilha do bloco ao vivo que lê o arquivo de rodada e o JSON do lugar e decide o que a
// página mostra. A fase vem só do arquivo de rodada (Ensaio geral, decisão 7), e a página passa sozinha de "antes das
// 17h" a "ao vivo" na leitura em que ela muda. A interrupção compara a hora da rodada com o cabeçalho `Date` da
// resposta, a hora do outro lado, nunca com o relógio do aparelho: 3 min sem rodada nova é "interrompido", como na
// decisão 19 da Arquitetura, e com 10 min entra o link do app oficial do TSE (Operação na noite, decisão 11).

/** A função de rede, com a forma do `fetch`, injetável para os testes. */
export type Buscar = (url: string, init: { headers: Record<string, string>; cache: RequestCache }) => Promise<Response>;

/** Os seis estados do indicador ao vivo (Simulador "e se", decisão 14). */
export type EstadoDoIndicador = "antes-das-17h" | "ao-vivo" | "tse-sem-novidade" | "interrompido" | "sem-conexao" | "encerrada";

export type Indicador =
  | {
      estado: "antes-das-17h";
      /** Os segundos até as 17h na última hora, ou `null` antes dela. Chega a zero e espera o arquivo de rodada. */
      faltam: number | null;
    }
  | { estado: "ao-vivo" | "sem-conexao" | "encerrada" }
  | {
      estado: "tse-sem-novidade";
      /** A hora da última totalização do TSE no Brasil, HH:MM em Brasília. */
      desde: string;
    }
  | {
      estado: "interrompido";
      /** A hora da última rodada, HH:MM em Brasília. */
      atualizadoAs: string;
      /** Depois de 10 min, a página manda para o app oficial do TSE, com os últimos dados à vista. */
      linkDoTse: boolean;
    };

/** O que o bloco ao vivo mostra depois da última leitura. */
export interface QuadroAoVivo {
  fase: Fase;
  indicador: Indicador;
  rodada: ArquivoDeRodada | null;
  lugar: ArquivoDoLugar | null;
  /** Há quantos segundos chegou a última resposta do arquivo de rodada, pelo relógio do aparelho. */
  ultimaLeitura: number | null;
  /**
   * Os números do placar que a última leitura mudou (`percentual-0`, `votos-1`, `secoes`), para piscarem uma vez. A
   * primeira leitura não muda nada: os números chegam, não mudam.
   */
  mudaram: string[];
}

export interface LeitorAoVivo {
  /** Lê o arquivo de rodada e o JSON do lugar uma vez. */
  ler(): Promise<void>;
  quadro(): QuadroAoVivo;
}

const MINUTO = 60_000;
const INTERROMPIDO = 3 * MINUTO;
const LINK_DO_TSE = 10 * MINUTO;
/**
 * O TSE sem totalização nova no Brasil por esse tempo, com as rodadas em dia. Nenhuma decisão fixa o número: 2 min
 * fica abaixo dos 3 min da interrupção, para o visitante ver o TSE parado antes de qualquer parada do site.
 */
const TSE_SEM_NOVIDADE = 2 * MINUTO;
/** As 17h do dia da eleição, em Brasília: o fim da contagem regressiva. */
const INICIO_DA_DIVULGACAO = Date.parse(`${DIA_DA_ELEICAO}T17:00:00-03:00`);

function numerosQueMudaram(antes: ArquivoDoLugar["tse"], depois: ArquivoDoLugar["tse"]): string[] {
  const mudaram = antes.secoes.percentual === depois.secoes.percentual ? [] : ["secoes"];
  depois.percentuais.forEach((p, i) => p !== antes.percentuais[i] && mudaram.push(`percentual-${i}`));
  depois.votos.forEach((v, i) => v !== antes.votos[i] && mudaram.push(`votos-${i}`));
  return mudaram;
}

const HORA_DE_BRASILIA =new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

export function criarLeitorAoVivo(opcoes: { base: string; lugar: string; buscar: Buscar; relogio: () => number }): LeitorAoVivo {
  let rodada: ArquivoDeRodada | null = null;
  let lugar: ArquivoDoLugar | null = null;
  /** O `Date` da última resposta do arquivo de rodada, em ms. */
  let horaDoOutroLado: number | null = null;
  /** O relógio do aparelho quando chegou essa resposta. */
  let momentoDaResposta: number | null = null;
  let semConexao = false;
  let mudaram: string[] = [];
  const etags = new Map<string, string>();

  /**
   * O corpo novo do arquivo, ou `null` quando a resposta não traz um. O pedido vai com a ETag da última resposta e
   * sem o cache do navegador, para um 304 chegar até aqui como 304.
   */
  async function lerJson<T>(caminho: string, aoResponder: (resposta: Response) => void = () => {}): Promise<T | null> {
    const etag = etags.get(caminho);
    const resposta = await opcoes.buscar(`${opcoes.base}${caminho}`, { headers: etag ? { "If-None-Match": etag } : {}, cache: "no-store" });
    aoResponder(resposta);
    if (resposta.status !== 200) return null;
    const corpo = (await resposta.json()) as T;
    const nova = resposta.headers.get("ETag");
    if (nova) etags.set(caminho, nova);
    return corpo;
  }

  function indicador(): Indicador {
    const fase = rodada?.fase ?? "antes-das-17h";
    // Depois da totalização final nada mais chega: nem a interrupção nem a conexão do visitante mudam o que se vê.
    if (fase === "encerrada") return { estado: "encerrada" };
    if (semConexao) return { estado: "sem-conexao" };
    if (fase === "ao-vivo" && rodada && horaDoOutroLado !== null) {
      const semRodada = horaDoOutroLado - Date.parse(rodada.rodada);
      if (semRodada >= INTERROMPIDO) {
        return { estado: "interrompido", atualizadoAs: HORA_DE_BRASILIA.format(Date.parse(rodada.rodada)), linkDoTse: semRodada >= LINK_DO_TSE };
      }
      const { totalizacao, vista } = rodada.novidade;
      if (totalizacao && vista && horaDoOutroLado - Date.parse(vista) >= TSE_SEM_NOVIDADE) return { estado: "tse-sem-novidade", desde: totalizacao.slice(11, 16) };
    }
    return fase === "ao-vivo" ? { estado: "ao-vivo" } : { estado: "antes-das-17h", faltam: faltamParaAs17h() };
  }

  /**
   * A contagem regressiva parte do `Date` da última resposta; entre as leituras, o relógio do aparelho só soma o tempo
   * que passou desde ela, sem nunca dizer que horas são.
   */
  function faltamParaAs17h(): number | null {
    if (horaDoOutroLado === null || momentoDaResposta === null) return null;
    const agora = horaDoOutroLado + (opcoes.relogio() - momentoDaResposta);
    const faltam = Math.max(0, Math.ceil((INICIO_DA_DIVULGACAO - agora) / 1000));
    return faltam <= 3600 ? faltam : null;
  }

  return {
    async ler() {
      const [novaRodada, novoLugar] = await Promise.allSettled([
        lerJson<ArquivoDeRodada>("rodada.json", (resposta) => {
          const date = Date.parse(resposta.headers.get("Date") ?? "");
          if (Number.isNaN(date)) return;
          horaDoOutroLado = date;
          momentoDaResposta = opcoes.relogio();
        }),
        lerJson<ArquivoDoLugar>(`lugares/${opcoes.lugar}.json`),
      ]);
      // Sem resposta do arquivo de rodada, a falta é do lado do visitante; uma resposta de erro ainda é a CDN no ar.
      semConexao = novaRodada.status === "rejected";
      if (novaRodada.status === "fulfilled") rodada = novaRodada.value ?? rodada;
      const novo = novoLugar.status === "fulfilled" ? novoLugar.value : null;
      mudaram = novo && lugar ? numerosQueMudaram(lugar.tse, novo.tse) : [];
      lugar = novo ?? lugar;
    },
    quadro() {
      const ultimaLeitura = momentoDaResposta === null ? null : Math.floor((opcoes.relogio() - momentoDaResposta) / 1000);
      return { fase: rodada?.fase ?? "antes-das-17h", indicador: indicador(), rodada, lugar, ultimaLeitura, mudaram };
    },
  };
}
