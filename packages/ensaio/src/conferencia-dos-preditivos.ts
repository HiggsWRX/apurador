import { ehPreditivo, type ArquivoDeRodada, type ArquivoDoLugar, type EventoDaNarracao } from "@apurador/coletor";

// A conferência dos textos preditivos (Ensaio geral, decisão 22; Narração da noite, decisão 6): com a chave desligada,
// nenhum preditivo em nenhum JSON público de nenhuma rodada; ligada no meio da noite, nada de antes dela; desligada de
// novo, somem todos. É o mesmo script no replay automático e no ensaio geral: os JSONs entram na ordem em que foram
// gravados, ou lidos no endereço público, e a chave de cada rodada é a do arquivo de rodada, que o coletor grava antes dos
// lugares. O que conta é o que fica no ar: um JSON com preditivos que não é regravado depois de a chave desligar também
// é acusado, no fim de cada rodada.

/** Um JSON público como foi gravado (no replay) ou lido no endereço público (no ensaio): o caminho e o conteúdo. */
export interface JsonPublico {
  caminho: string;
  conteudo: unknown;
}

/**
 * Todo texto preditivo fala da projeção do Apurador: os eventos e a linha dos marcos começam com "Projeção do Apurador:", e
 * a frase da manchete, que a página escreve e nenhum JSON deveria levar, com "A projeção do Apurador".
 */
const DA_PROJECAO = /projeção do apurador/i;

/** Um texto preditivo achado num JSON: a hora do evento em que ele está e, na linha de um marco, a chave do marco. */
interface Preditivo {
  quando: string | null;
  texto: string;
  chaveDoMarco?: string;
}

const ehEvento = (valor: object): valor is EventoDaNarracao =>
  "tipo" in valor && typeof valor.tipo === "string" && "texto" in valor && typeof valor.texto === "string" && "quando" in valor;
/** Um marco é o mesmo em toda gravação: o lugar, o % e a hora em que ele foi visto. */
const chaveDoMarco = (e: EventoDaNarracao) => `${e.lugar} ${e.marco ?? e.tipo} ${e.quando}`;

/** Os textos preditivos de um JSON: os eventos preditivos, a linha da projeção dos marcos e qualquer outro texto sobre ela. */
function preditivosDe(conteudo: unknown): Preditivo[] {
  const achados: Preditivo[] = [];
  const visitar = (valor: unknown) => {
    if (typeof valor === "string") {
      if (DA_PROJECAO.test(valor)) achados.push({ quando: null, texto: valor });
    } else if (Array.isArray(valor)) {
      valor.forEach(visitar);
    } else if (typeof valor === "object" && valor !== null) {
      if (!ehEvento(valor)) return Object.values(valor).forEach(visitar);
      if (ehPreditivo(valor)) return void achados.push({ quando: valor.quando, texto: valor.texto });
      if (valor.linhaDaProjecao)
        achados.push({ quando: valor.quando, texto: Object.values(valor.linhaDaProjecao).join(" "), chaveDoMarco: chaveDoMarco(valor) });
      if (DA_PROJECAO.test(valor.texto)) achados.push({ quando: valor.quando, texto: valor.texto });
    }
  };
  visitar(conteudo);
  return achados;
}

/** Os marcos da narração de um JSON de lugar, ou nenhum em outro JSON. */
const marcosDe = (conteudo: unknown) => ((conteudo as Partial<ArquivoDoLugar>).narracao ?? []).filter((e) => e.tipo === "marco");

/**
 * As divergências dos textos preditivos nos JSONs públicos, em texto, cada uma uma vez: um preditivo no ar no fim de uma
 * rodada com a chave desligada; com ela ligada, um evento preditivo de antes da rodada em que ela ligou ou um marco
 * publicado antes disso que ganhou a linha da projeção. Nenhuma é a meta. Um preditivo leva a hora do arquivo novo do
 * lugar na rodada em que surgiu ou, sem ele, a do TSE mais nova: é de antes da ligação o que tem hora de antes da mais
 * nova publicada até ali e não depois da última publicada do próprio lugar.
 */
export function conferirPreditivos(publicados: Iterable<JsonPublico>): string[] {
  const divergencias = new Map<string, string>();
  const acusar = (chave: string, texto: string) => divergencias.has(chave) || divergencias.set(chave, texto);
  /** Os preditivos de cada caminho, pelo último JSON dele: o que está no ar. */
  const noAr = new Map<string, Preditivo[]>();
  let ligada = false;
  /** A última totalização do Brasil na rodada em curso, para dizer qual é. */
  let horaDaRodada: string | null = null;
  /** A hora do TSE mais nova já publicada, e a dela quando a chave ligou pela última vez. */
  let horaMaisNova = "";
  let ligadaDesde = "";
  /** A última hora do TSE publicada de cada lugar, pelo caminho, e a de cada um quando a chave ligou pela última vez. */
  const horaDoLugar = new Map<string, string>();
  let horaDoLugarAntes = new Map<string, string>();
  const marcosVistos = new Set<string>();
  let marcosDeAntes = new Set<string>();

  const fecharRodada = () => {
    if (ligada) return;
    for (const [caminho, preditivos] of noAr) {
      for (const p of preditivos) acusar(`${caminho}\n${p.texto}`, `${caminho}: com a chave desligada na rodada de ${horaDaRodada}, ainda no ar: ${p.texto}`);
    }
  };

  for (const { caminho, conteudo } of publicados) {
    if (caminho === "rodada.json") {
      fecharRodada();
      const { chaves, novidade } = conteudo as ArquivoDeRodada;
      if (chaves.textosPreditivos && !ligada) {
        ligadaDesde = horaMaisNova;
        horaDoLugarAntes = new Map(horaDoLugar);
        marcosDeAntes = new Set(marcosVistos);
      }
      ligada = chaves.textosPreditivos;
      horaDaRodada = novidade.totalizacao;
      if ((novidade.totalizacao ?? "") > horaMaisNova) horaMaisNova = novidade.totalizacao!;
    }
    const preditivos = preditivosDe(conteudo);
    noAr.set(caminho, preditivos);
    if (ligada) {
      for (const p of preditivos) {
        if (p.chaveDoMarco !== undefined && marcosDeAntes.has(p.chaveDoMarco)) {
          acusar(`${caminho}\n${p.texto}`, `${caminho}: o marco de ${p.quando}, publicado antes de a chave ligar (${ligadaDesde}), ganhou a linha: ${p.texto}`);
        } else if (p.chaveDoMarco === undefined && p.quando !== null && p.quando < ligadaDesde && p.quando <= (horaDoLugarAntes.get(caminho) ?? "")) {
          acusar(`${caminho}\n${p.texto}`, `${caminho}: ${p.quando}, antes de a chave ligar (${ligadaDesde}): ${p.texto}`);
        }
      }
    }
    for (const marco of marcosDe(conteudo)) marcosVistos.add(chaveDoMarco(marco));
    const totalizacao = (conteudo as Partial<ArquivoDoLugar>).tse?.totalizacao ?? "";
    if (!caminho.startsWith("lugares/")) continue;
    horaDoLugar.set(caminho, totalizacao);
    if (totalizacao > horaMaisNova) horaMaisNova = totalizacao;
  }
  fecharRodada();
  return [...divergencias.values()];
}
