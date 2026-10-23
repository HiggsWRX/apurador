import type {
  ArquivoDeRodada,
  ArquivoDoLugar,
  ArquivoDoMapa,
  ArquivoDoSimuladorAoVivo,
  AvisoPronto,
  Buscar,
  ChavesDaNoite,
  Fase,
  MunicipiosDaTabela,
  ProjecoesDosMunicipios,
  TabelaDeProjecoes,
} from "@apurador/coletor";
import { DIA_DA_ELEICAO } from "@apurador/modelo";
import { criarArquivosAoVivo, type EnderecoAoVivo } from "./enderecos-ao-vivo";
import { horaDoTse } from "./formato";

// O leitor ao vivo: a lógica da ilha do bloco ao vivo que lê o arquivo de rodada e o JSON do lugar e decide o que a
// página mostra. A fase vem só do arquivo de rodada (Ensaio geral, decisão 7), e a página passa sozinha de "antes das
// 17h" a "ao vivo" na leitura em que ela muda. A interrupção compara a hora da rodada com o cabeçalho `Date` da
// resposta, a hora do outro lado, nunca com o relógio do aparelho: 3 min sem rodada nova é "interrompido", como na
// decisão 19 da Arquitetura, e com 10 min entra o link do app oficial do TSE (Operação na noite, decisão 11). Os arquivos
// do cartão do mapa (o mapa.json e a tabela de projeções da UF) vêm pelo mesmo leitor, nas mesmas leituras, só depois
// que o cartão entra na tela; num município, a tabela da UF vem desde a primeira, porque é dela que sai a projeção dele.
// Cada um só é pedido quando pode aparecer, pela última rodada: o mapa.json, da fase ao vivo em diante, fora do plano
// zero; a tabela, também só na fase ao vivo com a chave da projeção (o coletor só grava os municípios dela das 17h em
// diante). Na tela do simulador, que lê o Brasil, o arquivo do simulador vem nas mesmas leituras, na fase ao vivo e com a
// chave dele: a tela tem um leitor só, como as páginas de lugar.

/** O intervalo entre as leituras da página, em segundos (spec, "Entrega aos visitantes"). */
export const INTERVALO_DAS_LEITURAS = 30;

/** O indicador ao vivo num dos seis estados da decisão 14 do Simulador "e se", com o que cada um mostra. */
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
   * Os números do placar que a última leitura mudou (as chaves de `NUMEROS_DO_PLACAR`), para piscarem uma vez. A
   * primeira leitura não muda nada: os números chegam, não mudam.
   */
  mudaram: string[];
  /**
   * As chaves de publicação que valem (ticket 16): as do arquivo de rodada ou, até a primeira rodada chegar, as do
   * arquivo de chaves do site. Cada bloco lê a sua daqui (`quadro.chaves.projecao`, …), e `lib/chaves-ao-vivo.ts`
   * guarda as regras que derivam delas.
   */
  chaves: ChavesDaNoite;
  /** O aviso pronto que o dono publicou, pelo arquivo de rodada, ou `null`. */
  aviso: AvisoPronto | null;
  /** A tabela de projeções da UF do lugar, quando a página a lê: num município, desde a primeira leitura; numa UF, com o cartão do mapa. */
  tabelaDeProjecoes: TabelaDeProjecoesLida | null;
  /** O mapa.json, depois que o cartão do mapa entra na tela. */
  mapa: ArquivoDoMapa | null;
  /** O arquivo do simulador, na tela do simulador. */
  simulador: ArquivoDoSimuladorAoVivo | null;
}

/**
 * A tabela de projeções de uma UF como a página a usa: os municípios dela, com as comparações, que o coletor grava uma
 * vez (`MunicipiosDaTabela`), e as projeções deles na mesma ordem, quando a tabela as traz e os dois arquivos levam a
 * mesma assinatura.
 */
export interface TabelaDeProjecoesLida extends MunicipiosDaTabela {
  projecao?: ProjecoesDosMunicipios;
}

/**
 * A tabela de projeções que uma página lê, pela UF: num município, desde a primeira leitura, porque a projeção dele sai
 * dela; numa UF e no Exterior, só com o cartão do mapa, para a coluna da projeção da tabela de lugares.
 */
export interface OpcaoDaTabelaDeProjecoes {
  uf: string;
  desdeOInicio: boolean;
}

/** O quadro antes de qualquer leitura: o de antes das 17h, sem dados, com as chaves do arquivo de chaves do site. É o que o build desenha. */
export const antesDaPrimeiraLeitura = (chaves: ChavesDaNoite): QuadroAoVivo => ({
  fase: "antes-das-17h",
  indicador: { estado: "antes-das-17h", faltam: null },
  rodada: null,
  lugar: null,
  ultimaLeitura: null,
  mudaram: [],
  chaves,
  aviso: null,
  tabelaDeProjecoes: null,
  mapa: null,
  simulador: null,
});

/** As chaves dos números do placar que piscam: o % e os votos de cada candidato, na ordem do arquivo de rodada, e o % de seções. */
export const NUMEROS_DO_PLACAR = {
  percentual: (candidato: number) => `percentual-${candidato}`,
  votos: (candidato: number) => `votos-${candidato}`,
  secoes: "secoes",
};

/** Lê os arquivos ao vivo de um lugar, uma leitura por vez, e diz o que mostrar. */
export interface LeitorAoVivo {
  /** Lê o arquivo de rodada e o JSON do lugar uma vez, e os arquivos do cartão do mapa que a página já lê. */
  ler(): Promise<void>;
  /** O quadro da última leitura, com a contagem regressiva e "há N s" no instante do relógio. */
  quadro(): QuadroAoVivo;
  /** Passa a ler também, nas próximas leituras, os arquivos do cartão do mapa: o mapa.json e, se a página tiver, a tabela de projeções. */
  incluirOCartao(): void;
}

const CAMINHO_DO_MAPA = "mapa.json";
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

const HORA_DE_BRASILIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

function numerosQueMudaram(antes: ArquivoDoLugar["tse"], depois: ArquivoDoLugar["tse"]): string[] {
  const mudaram = antes.secoes.percentual === depois.secoes.percentual ? [] : [NUMEROS_DO_PLACAR.secoes];
  depois.percentuais.forEach((p, i) => p !== antes.percentuais[i] && mudaram.push(NUMEROS_DO_PLACAR.percentual(i)));
  depois.votos.forEach((v, i) => v !== antes.votos[i] && mudaram.push(NUMEROS_DO_PLACAR.votos(i)));
  return mudaram;
}

/** O leitor ao vivo de um lugar. */
export function criarLeitorAoVivo(opcoes: {
  /** Os endereços dos arquivos ao vivo, o principal primeiro (`enderecosDoBuild`): a troca para o plano B é de `enderecos-ao-vivo.ts`. */
  enderecos: EnderecoAoVivo[];
  /** O id do lugar nos arquivos ao vivo (`BR`, `SP`, `ZZ`, o código do TSE do município). */
  lugar: string;
  buscar: Buscar;
  /** O relógio do aparelho, em ms (`performance.now()`): só mede o tempo entre as leituras, nunca a hora. */
  relogio: () => number;
  /** As chaves do arquivo de chaves do site, que valem até a primeira rodada do coletor chegar. */
  chaves: ChavesDaNoite;
  /** A tabela de projeções que a página lê, se alguma (no Brasil, nenhuma). */
  tabelaDeProjecoes?: OpcaoDaTabelaDeProjecoes;
  /**
   * Na tela do simulador, o caminho do arquivo do simulador nos arquivos ao vivo, que o leitor lê também. Vem de fora para
   * nenhuma página de lugar levar o nome dele no código.
   */
  simulador?: string;
}): LeitorAoVivo {
  let rodada: ArquivoDeRodada | null = null;
  let lugar: ArquivoDoLugar | null = null;
  let tabelaDeProjecoes: TabelaDeProjecoes | null = null;
  let municipiosDaTabela: MunicipiosDaTabela | null = null;
  let mapa: ArquivoDoMapa | null = null;
  let simulador: ArquivoDoSimuladorAoVivo | null = null;
  let comOCartao = false;
  /** O `Date` da última resposta do arquivo de rodada, em ms. */
  let horaDoOutroLado: number | null = null;
  /** O relógio do aparelho quando chegou essa resposta. */
  let momentoDaResposta: number | null = null;
  let semConexao = false;
  let mudaram: string[] = [];
  const arquivos = criarArquivosAoVivo({ enderecos: opcoes.enderecos, buscar: opcoes.buscar });
  const caminhoDoLugar = `lugares/${opcoes.lugar}.json`;
  const daTabela = opcoes.tabelaDeProjecoes;
  const caminhoDaTabela = daTabela && `tabelas/${daTabela.uf}.json`;
  const caminhoDosMunicipios = daTabela && `tabelas/${daTabela.uf}-municipios.json`;
  /** Pela última rodada, os números da noite podem aparecer: da fase ao vivo em diante, fora do plano zero. */
  const noitePodeAparecer = () => rodada === null || (rodada.fase !== "antes-das-17h" && rodada.chaves.nucleoMinimo);
  /** Pela última rodada, a projeção pode aparecer: na fase ao vivo, com a chave dela. Antes da primeira, a página ainda não sabe, e pede. */
  const projecaoPodeAparecer = () => noitePodeAparecer() && (rodada === null || (rodada.fase === "ao-vivo" && rodada.chaves.projecao));
  /** Pela última rodada, o simulador pode aparecer: com a projeção e com a chave dele, que o coletor só liga com a dela. */
  const simuladorPodeAparecer = () => projecaoPodeAparecer() && (rodada === null || rodada.chaves.simulador);
  /**
   * O que cada leitura pede além do arquivo de rodada: o JSON do lugar, os arquivos do cartão do mapa que a página lê e,
   * na tela do simulador, o arquivo dele. Os municípios da tabela não mudam na noite, e são pedidos de novo com a ETag,
   * como os outros: o 304 não traz nada.
   */
  const caminhos = () => [
    caminhoDoLugar,
    ...(daTabela && (daTabela.desdeOInicio || comOCartao) && projecaoPodeAparecer() ? [caminhoDaTabela!, caminhoDosMunicipios!] : []),
    ...(comOCartao && noitePodeAparecer() ? [CAMINHO_DO_MAPA] : []),
    ...(opcoes.simulador && simuladorPodeAparecer() ? [opcoes.simulador] : []),
  ];
  const lerTodos = (lista: string[]) => Promise.allSettled(lista.map((caminho) => arquivos.ler<unknown>(caminho)));
  const fase = (): Fase => rodada?.fase ?? "antes-das-17h";

  function indicador(): Indicador {
    // Depois da totalização final nada mais chega: nem a interrupção nem a conexão do visitante mudam o que se vê.
    if (fase() === "encerrada") return { estado: "encerrada" };
    if (semConexao) return { estado: "sem-conexao" };
    if (rodada && horaDoOutroLado !== null) {
      // Antes das 17h, a rodada velha do coletor de 24/10 não é interrupção; depois delas, uma rodada parada é, mesmo
      // que o coletor tenha caído antes de passar ao ao vivo.
      const semRodada = horaDoOutroLado - Date.parse(rodada.rodada);
      if (semRodada >= INTERROMPIDO && (fase() === "ao-vivo" || horaDoOutroLado >= INICIO_DA_DIVULGACAO)) {
        return { estado: "interrompido", atualizadoAs: HORA_DE_BRASILIA.format(Date.parse(rodada.rodada)), linkDoTse: semRodada >= LINK_DO_TSE };
      }
      const { totalizacao, vista } = rodada.novidade;
      if (fase() === "ao-vivo" && totalizacao && vista && horaDoOutroLado - Date.parse(vista) >= TSE_SEM_NOVIDADE) {
        return { estado: "tse-sem-novidade", desde: horaDoTse(totalizacao, false) };
      }
    }
    return fase() === "ao-vivo" ? { estado: "ao-vivo" } : { estado: "antes-das-17h", faltam: faltamParaAs17h() };
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
      let lista = caminhos();
      const [[novaRodada], lidosJunto] = await Promise.all([Promise.allSettled([arquivos.lerRodada()]), lerTodos(lista)]);
      let lidos = lidosJunto;
      // Sem resposta do arquivo de rodada em endereço nenhum, a falta é do lado do visitante; uma resposta de erro ainda
      // é a CDN no ar.
      semConexao = novaRodada.status === "rejected";
      if (novaRodada.status === "fulfilled") {
        const { resposta, rodada: lida, trocou } = novaRodada.value;
        // Fora da mesma origem, o `Date` só chega se o endereço o expuser (Access-Control-Expose-Headers).
        const hora = Date.parse(resposta.headers.get("Date") ?? "");
        if (!Number.isNaN(hora)) {
          horaDoOutroLado = hora;
          momentoDaResposta = opcoes.relogio();
        }
        rodada = lida ?? rodada;
        if (trocou) {
          // Os arquivos lidos junto são do endereço anterior: a página os lê de novo no endereço da rodada.
          lista = caminhos();
          lidos = await lerTodos(lista);
        } else {
          // A rodada que passa à fase ao vivo, ou que religa uma chave, pede arquivos que esta leitura ainda não leu. Só
          // eles: um lido de novo agora daria 304, e o corpo que acabou de chegar se perderia.
          const faltando = caminhos().filter((caminho) => !lista.includes(caminho));
          if (faltando.length > 0) {
            lidos = [...lidos, ...(await lerTodos(faltando))];
            lista = [...lista, ...faltando];
          }
        }
      }
      /** O corpo novo de um dos arquivos pedidos, ou `null` sem corpo novo (304, erro ou não pedido). */
      function novo<T>(caminho: string | undefined): T | null {
        const lido = caminho === undefined ? undefined : lidos[lista.indexOf(caminho)];
        return lido?.status === "fulfilled" ? (lido.value as T | null) : null;
      }
      const novoLugar = novo<ArquivoDoLugar>(caminhoDoLugar);
      mudaram = novoLugar && lugar ? numerosQueMudaram(lugar.tse, novoLugar.tse) : [];
      lugar = novoLugar ?? lugar;
      tabelaDeProjecoes = novo<TabelaDeProjecoes>(caminhoDaTabela) ?? tabelaDeProjecoes;
      municipiosDaTabela = novo<MunicipiosDaTabela>(caminhoDosMunicipios) ?? municipiosDaTabela;
      mapa = novo<ArquivoDoMapa>(CAMINHO_DO_MAPA) ?? mapa;
      simulador = novo<ArquivoDoSimuladorAoVivo>(opcoes.simulador) ?? simulador;
    },
    incluirOCartao() {
      comOCartao = true;
    },
    quadro() {
      const ultimaLeitura = momentoDaResposta === null ? null : Math.floor((opcoes.relogio() - momentoDaResposta) / 1000);
      return {
        fase: fase(),
        indicador: indicador(),
        rodada,
        lugar,
        ultimaLeitura,
        mudaram,
        chaves: rodada?.chaves ?? opcoes.chaves,
        aviso: rodada?.aviso ?? null,
        tabelaDeProjecoes: municipiosDaTabela && {
          ...municipiosDaTabela,
          ...(tabelaDeProjecoes?.projecao?.assinatura === municipiosDaTabela.assinatura ? { projecao: tabelaDeProjecoes.projecao } : {}),
        },
        mapa,
        simulador,
      };
    },
  };
}
