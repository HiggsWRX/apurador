import { ehPreditivo, type ArquivoDeRodada, type ArquivoDoLugar, type EventoDaNarracao, type RegistroDaRodada } from "@apurador/coletor";
import { instanteDaNoite, type Cadastro, type Noite } from "@apurador/pipeline";
import { conferirPlacar, type PlacarPublicado } from "./conferencia.ts";
import { conferirPreditivos, type JsonPublico } from "./conferencia-dos-preditivos.ts";
import type { LeituraDoEnsaio } from "./leitor-do-ensaio.ts";
import { momentoReal, relogioAcelerado, type PartidaDoRelogio } from "./relogio.ts";

// A conferência do ensaio geral (Ensaio geral, decisões 20, 22 e 23; Volume de gravações na noite, decisão 9): os
// números de cada critério que um script mede, tirados do que o leitor do ensaio registrou no endereço público e das
// rodadas que o coletor registrou. As conferências do placar e dos preditivos são as mesmas do replay; aqui só entram
// as leituras, na ordem em que foram feitas.
//
// - **Atraso**: o tempo entre o TSE falso pôr no ar uma totalização do Brasil (`momentoReal`, pela partida e pelo
//   ritmo do relógio dele) e ela aparecer para quem lê, contado em cada leitura que traz uma totalização mais nova que a
//   última vista, no endereço que a trouxe. Inclui a espera da página entre as leituras, como a meta de 35 s.
// - **Cache**: as respostas 200 e 304 do caminho principal; da borda são `HIT` e `REVALIDATED`.
// - **Dados por visitante**: o que a página do Brasil baixa (o arquivo de rodada e o JSON do Brasil, e o mapa.json com o
//   cartão na tela) nas leituras feitas das 17h às 20h da noite, pelo relógio do TSE falso, e levado à noite real pela
//   velocidade dele: a 3x, a janela dura 1 h, e a noite faz 3x mais leituras.
// - **Narração**: a do último JSON do Brasil lido contra a do replay da mesma noite, sem os preditivos, que dependem da
//   chave. Um evento casa com o do replay pelo lugar, pelo tipo e pelo marco; a hora pode variar com a fase do relógio
//   do coletor, até a tolerância.

/** Uma distribuição de medidas em segundos: a mediana e o p95 pelo posto mais próximo. */
export interface Distribuicao {
  amostras: number;
  mediana: number;
  p95: number;
  maximo: number;
}

/** Os números do ensaio contra os critérios que um script mede. */
export interface NumerosDoEnsaio {
  /** Quantas leituras (de 30 s) o leitor fez. */
  leituras: number;
  placar: { conferidos: number; divergencias: string[] };
  preditivos: { divergencias: string[] };
  /** O atraso em segundos, por endereço, ou `null` sem nenhuma totalização nova vista nele. */
  atraso: Record<LeituraDoEnsaio["tipo"], Distribuicao | null>;
  /** As respostas 200 e 304 do caminho principal, e quantas vieram da borda. */
  cache: { respostas: number; daBorda: number };
  /** Os bytes da página do Brasil das 17h às 20h da noite, e quantas vezes a noite real faz essas leituras. */
  dadosPorVisitante: { bytes: number; bytesComOMapa: number; fatorDaNoite: number } | null;
  /** As rodadas do coletor no ensaio: a duração em segundos e as gravações. */
  rodadas: {
    quantidade: number;
    duracao: Distribuicao | null;
    /** A rodada com mais municípios baixados. */
    noPico: { inicio: string; duracao: number; municipios: number } | null;
    gravacoes: { total: number; maximaPorRodada: number; maximaPorHora: number };
  } | null;
  /** As gravações do mês no bucket do ensaio, pelo contador do coletor e pelo painel da Cloudflare. */
  contador: { coletor: number; painel: number } | null;
  /** As diferenças da narração do Brasil com a do replay, ou `null` sem o replay. */
  narracao: string[] | null;
}

/** Até quanto a hora de um evento pode variar do replay, em segundos da noite: o coletor do ensaio lê o Brasil a cada ~1 min da noite. */
const TOLERANCIA_DA_NARRACAO = 120;

/** A distribuição de medidas, ou `null` sem nenhuma. */
function distribuicao(valores: number[]): Distribuicao | null {
  if (valores.length === 0) return null;
  const v = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(v.length / 2);
  const mediana = v.length % 2 ? v[meio]! : (v[meio - 1]! + v[meio]!) / 2;
  return { amostras: v.length, mediana, p95: v[Math.ceil(0.95 * v.length) - 1]!, maximo: v.at(-1)! };
}

const doLugar = (conteudo: unknown): conteudo is ArquivoDoLugar =>
  typeof conteudo === "object" && conteudo !== null && "tse" in conteudo && "lugar" in conteudo;

/** Os números do ensaio, das leituras na ordem em que foram feitas e das rodadas do coletor. */
export function conferirEnsaio(entrada: {
  leituras: LeituraDoEnsaio[];
  fonte: { noite: Noite; cadastro: Cadastro };
  /** A partida e o ritmo do relógio do TSE falso no ensaio (`.cache/tse-falso/relogio.json`). */
  relogio: PartidaDoRelogio;
  /** As rodadas do coletor, como ele as registra em `.cache/coletor/rodadas-*.jsonl`. */
  rodadas: Pick<RegistroDaRodada, "inicio" | "duracao" | "gravacoes" | "baixados">[];
  /** As janelas (ms reais, início e fim) que ficam fora do atraso: as quedas provocadas. */
  excluir?: [number, number][];
  contador?: { coletor: number; painel: number };
  /** A narração final do Brasil no replay da mesma noite. */
  narracaoDoReplay?: EventoDaNarracao[];
}): NumerosDoEnsaio {
  const { leituras, fonte, relogio } = entrada;
  const instante = (dataHora: string) => instanteDaNoite(fonte.noite, dataHora);

  // O placar e os preditivos: cada JSON lido, com os candidatos do último arquivo de rodada.
  const placares: PlacarPublicado[] = [];
  const publicados: JsonPublico[] = [];
  let candidatos: number[] | null = null;
  let ultimoBrasil: ArquivoDoLugar | null = null;
  for (const l of leituras) {
    if (l.status !== 200 || l.conteudo === undefined) continue;
    publicados.push({ caminho: l.caminho, conteudo: l.conteudo });
    if (l.caminho === "rodada.json") candidatos = (l.conteudo as ArquivoDeRodada).candidatos.map((c) => c.numero);
    else if (l.caminho.startsWith("lugares/") && doLugar(l.conteudo)) {
      if (candidatos) placares.push({ candidatos, lugar: l.conteudo });
      if (l.conteudo.lugar === "BR") ultimoBrasil = l.conteudo;
    }
  }

  // O atraso: cada totalização do Brasil mais nova que a última vista, pelo endereço que a trouxe.
  const excluida = (quando: number) => (entrada.excluir ?? []).some(([de, ate]) => quando >= de && quando <= ate);
  const atrasos: Record<LeituraDoEnsaio["tipo"], number[]> = { principal: [], "plano B": [] };
  let maisNova = "";
  for (const l of [...leituras].sort((a, b) => a.quando - b.quando)) {
    const totalizacao = l.caminho === "lugares/BR.json" && l.status === 200 && doLugar(l.conteudo) ? l.conteudo.tse.totalizacao : null;
    if (totalizacao === null || totalizacao <= maisNova) continue;
    maisNova = totalizacao;
    if (excluida(l.quando)) continue;
    atrasos[l.tipo].push(Math.round((l.quando - momentoReal(relogio, instante(totalizacao))) / 100) / 10);
  }

  // O cache, no caminho principal.
  const doPrincipal = leituras.filter((l) => l.tipo === "principal" && (l.status === 200 || l.status === 304));
  const cache = { respostas: doPrincipal.length, daBorda: doPrincipal.filter((l) => l.cache === "HIT" || l.cache === "REVALIDATED").length };

  // Os dados da página do Brasil das 17h às 20h da noite.
  const [as17h, as20h] = ["17:00:00", "20:00:00"].map((h) => instante(`${fonte.noite.dia} ${h}`)) as [number, number];
  const naJanela = leituras.filter((l) => {
    const i = relogioAcelerado({ ...relogio, agoraReal: () => l.quando }).agora().instante;
    return i >= as17h && i < as20h;
  });
  const somar = (caminhos: string[]) => naJanela.filter((l) => caminhos.includes(l.caminho)).reduce((s, l) => s + l.bytes, 0);
  const fatorDaNoite = ((as20h - as17h) * 1000) / (momentoReal(relogio, as20h) - momentoReal(relogio, as17h));
  const dadosPorVisitante =
    naJanela.length === 0
      ? null
      : { bytes: somar(["rodada.json", "lugares/BR.json"]), bytesComOMapa: somar(["rodada.json", "lugares/BR.json", "mapa.json"]), fatorDaNoite };

  return {
    leituras: new Set(leituras.map((l) => l.leitura)).size,
    placar: { conferidos: placares.length, divergencias: conferirPlacar(placares, fonte) },
    preditivos: { divergencias: conferirPreditivos(publicados) },
    atraso: { principal: distribuicao(atrasos.principal), "plano B": distribuicao(atrasos["plano B"]) },
    cache,
    dadosPorVisitante,
    rodadas: resumirRodadas(entrada.rodadas),
    contador: entrada.contador ?? null,
    narracao: entrada.narracaoDoReplay && ultimoBrasil ? compararNarracao(ultimoBrasil.narracao, entrada.narracaoDoReplay, instante) : null,
  };
}

/** O tempo, o pico e as gravações das rodadas do coletor. */
function resumirRodadas(rodadas: Pick<RegistroDaRodada, "inicio" | "duracao" | "gravacoes" | "baixados">[]): NumerosDoEnsaio["rodadas"] {
  if (rodadas.length === 0) return null;
  const pico = rodadas.reduce((a, b) => (b.baixados.municipios > a.baixados.municipios ? b : a));
  const porHora = new Map<string, number>();
  for (const r of rodadas) porHora.set(r.inicio.slice(0, 13), (porHora.get(r.inicio.slice(0, 13)) ?? 0) + r.gravacoes);
  return {
    quantidade: rodadas.length,
    duracao: distribuicao(rodadas.map((r) => r.duracao / 1000)),
    noPico: { inicio: pico.inicio, duracao: pico.duracao / 1000, municipios: pico.baixados.municipios },
    gravacoes: {
      total: rodadas.reduce((s, r) => s + r.gravacoes, 0),
      maximaPorRodada: Math.max(...rodadas.map((r) => r.gravacoes)),
      maximaPorHora: Math.max(...porHora.values()),
    },
  };
}

const chaveDoEvento = (e: EventoDaNarracao) => `${e.lugar} ${e.tipo} ${e.marco ?? ""}`;
const descrever = (e: EventoDaNarracao) => (e.tipo === "marco" ? `o marco ${e.marco}% em ${e.lugar}` : `o evento ${e.tipo} em ${e.lugar}`);

/** As diferenças entre a narração publicada e a do replay, sem os preditivos: o que falta, a hora fora da tolerância e o que sobra. */
function compararNarracao(publicada: EventoDaNarracao[], doReplay: EventoDaNarracao[], instante: (dataHora: string) => number): string[] {
  const sobrando = publicada.filter((e) => !ehPreditivo(e));
  const diferencas: string[] = [];
  for (const e of doReplay.filter((x) => !ehPreditivo(x))) {
    const distancia = (p: EventoDaNarracao) => Math.abs(instante(p.quando) - instante(e.quando));
    const candidatos = sobrando.filter((p) => chaveDoEvento(p) === chaveDoEvento(e)).sort((a, b) => distancia(a) - distancia(b));
    const par = candidatos[0];
    if (!par) {
      diferencas.push(`falta o evento do replay ${e.tipo} em ${e.lugar} às ${e.quando}: ${e.texto}`);
      continue;
    }
    sobrando.splice(sobrando.indexOf(par), 1);
    if (distancia(par) > TOLERANCIA_DA_NARRACAO) diferencas.push(`${descrever(e)} saiu às ${par.quando}, e no replay às ${e.quando}`);
  }
  for (const p of sobrando) diferencas.push(`sobra o evento ${p.tipo} em ${p.lugar} às ${p.quando}: ${p.texto}`);
  return diferencas;
}
