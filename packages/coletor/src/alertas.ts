import { somaDoMes, TRAVA_DAS_GRAVACOES } from "./contador.ts";
import type { RegistroDaRodada } from "./coletor.ts";
import { comCasas, duracao, ROTULO_DAS_BASES, TITULO_DO_ALERTA_CRITICO } from "./formatos.ts";
import type { MensagemDoNtfy } from "./ntfy.ts";

// Os alertas da noite (Operação na noite, decisões 7 e 8; Volume de gravações na noite, decisão 5), em dois níveis. Os
// críticos tocam no computador e vão ao celular pelo ntfy; os de atenção ficam no painel do coletor, com um som curto no
// computador. Nenhum alerta age sozinho: quem decide é o dono, pelo roteiro. Os limites são parâmetros provisórios,
// conferidos no ensaio 1; mudam aqui, num lugar só.
//
// Um alerta está ativo enquanto a condição vale, e o dono é alertado quando ele começa; um crítico que termina vai ao
// celular sem som. As condições de um momento só, como o 403 ou o arquivo que o leitor não entende, valem por 10 min,
// a janela do TSE no painel: o arquivo do Brasil é pedido uma vez por minuto, e sem a janela o mesmo arquivo estragado
// tocaria a cada minuto. O fim da janela não diz que o problema acabou, e por isso essas não vão ao celular quando
// terminam. O do 403 fica também enquanto o coletor está parado no bloqueio, sem pedir: lá, a janela acabaria sozinha.
//
// "Rodada completa" é a que chegou ao TSE: com a internet fora, os pedidos falham na hora e as rodadas seguem a cada
// 20 s, e o sinal da queda é justamente o "nenhuma rodada" (decisão 13). A gravação falhando conta as tentativas que
// deram resultado: no R2, cada rodada; no plano B, a republicação do Worker, que leva até 2 min para falhar e dá a falha
// numa rodada qualquer depois dela.

/** Crítico (som no computador e no celular) ou de atenção (no painel, com som curto). */
export type NivelDoAlerta = "critico" | "atencao";

/** Cada alerta da decisão 7 da Operação na noite. */
export type IdDoAlerta =
  | "tse-bloqueou"
  | "sem-rodada"
  | "gravacao-falhando"
  | "rodada-publica-parada"
  | "placar-divergente"
  | "brasil-ou-uf-ilegivel"
  | "tse-sem-novidade"
  | "projecao-saltou"
  | "pico-de-pedidos"
  | "rodada-lenta"
  | "relogio-desviado"
  | "gravacoes-do-mes"
  | "gravacoes-travadas"
  | "municipio-ilegivel";

/** Um alerta ativo: a mensagem só diz o estado ("Coletor sem rodada completa há 75 s"). */
export interface Alerta {
  id: IdDoAlerta;
  nivel: NivelDoAlerta;
  mensagem: string;
}

/** Os limites dos alertas, provisórios até o ensaio 1. Tempos em ms. */
export const LIMITES_DOS_ALERTAS = {
  /** Crítico: nenhuma rodada completa há esse tempo. */
  semRodada: 60_000,
  /** Crítico: tentativas seguidas de gravar no destino ativo falhando. */
  falhasDeGravacaoSeguidas: 2,
  /** Crítico: o arquivo de rodada público, como a página o vê, com mais que isso. */
  rodadaPublica: 120_000,
  /** Atenção: o TSE sem novidade há esse tempo, com o Brasil abaixo de `secoesSemNovidade`. */
  semNovidade: 300_000,
  /** Em % das seções do Brasil. */
  secoesSemNovidade: 99,
  /** Atenção: a projeção do Brasil numa base muda mais que isso numa rodada (p.p.)... */
  saltoDaProjecao: 1,
  /** ... ou a chance de vitória mais que isso (pontos)... */
  saltoDaChance: 20,
  /** ... depois desse % das seções do Brasil. */
  secoesDoSalto: 5,
  /** Atenção: pedidos ao TSE num mesmo segundo, no último minuto. */
  picoDePedidos: 50,
  /** Atenção: a duração de uma rodada. */
  duracaoDaRodada: 15_000,
  /** Atenção: o relógio do coletor contra o `Date` do TSE, para um lado ou para o outro. */
  desvioDoRelogio: 2_000,
  /** Atenção: as gravações do mês nos dois buckets, em fração do plano gratuito do R2. */
  gravacoesDoMes: 0.7,
  /** A janela das respostas do TSE e dos arquivos que o leitor não entende. */
  janela: 600_000,
};

/** Os limites dos alertas, os de `LIMITES_DOS_ALERTAS` ou os de um ensaio. */
export type LimitesDosAlertas = typeof LIMITES_DOS_ALERTAS;

/** As operações classe A do plano gratuito do R2 num mês, somando os dois buckets. */
export const PLANO_GRATUITO_DO_R2 = 1_000_000;

/** Os alertas das condições de um momento só, que valem pela janela e não vão ao celular quando terminam. */
const PELA_JANELA: ReadonlySet<IdDoAlerta> = new Set(["tse-bloqueou", "brasil-ou-uf-ilegivel", "municipio-ilegivel"]);

/** Uma rodada no painel do coletor, com o fim dela pelo relógio do coletor (ms). */
export interface RodadaNoPainelDoColetor {
  registro: RegistroDaRodada;
  fim: number;
  /** A hora em que terminou a última republicação boa do plano B, vista no fim da rodada (`ultimaRepublicacaoBoa`). */
  republicacaoDoPlanoB: number | null;
}

/** O que o painel do coletor sabe da noite num momento, de onde saem os alertas. */
export interface SituacaoDaNoite {
  /** ms do relógio do coletor. */
  agora: number;
  /** O fim da última rodada completa, ou o começo do painel antes da primeira (ms). */
  ultimaRodadaCompleta: number;
  /** As rodadas da janela, da mais velha à mais nova, sempre com as duas últimas. */
  rodadas: RodadaNoPainelDoColetor[];
  /** As duas últimas rodadas com a projeção do Brasil, a mais nova por último. */
  comProjecao: RodadaNoPainelDoColetor[];
  /** Quando a fase passou a ao vivo (ms), ou `null`. */
  aoVivoDesde: number | null;
  /** A idade do arquivo de rodada público como a página a vê (ms), ou `null` sem visto de fora. */
  idadeDaRodadaPublica: number | null;
  /** O que difere no placar conferido, ou `null` sem conferência. */
  divergenciasDoPlacar: string[] | null;
  /** O desvio do relógio só vale contra o TSE de verdade: o TSE falso dá no `Date` a hora da noite que ele serve. */
  conferirRelogio: boolean;
}

/** A rodada chegou ao TSE: pediu e teve alguma resposta, ou não tinha o que pedir. */
export const rodadaCompleta = (r: RegistroDaRodada) => r.pedidos === 0 || Object.values(r.respostas).some((n) => n > 0);

/**
 * Uma falha de gravação no destino ativo, pelos textos do ticket 20: `gravar <caminho>: ...` no R2 e na pasta, e
 * `republicar o plano B: ...` na rodada seguinte à republicação do Worker que falhou.
 */
export const falhaDeGravacao = (falha: string) => falha.startsWith("gravar ") || falha.startsWith("republicar o plano B:");

/** O maior número de pedidos ao TSE num mesmo segundo, nas rodadas do último minuto. */
export const picoDoUltimoMinuto = (rodadas: RodadaNoPainelDoColetor[], agora: number) =>
  Math.max(0, ...rodadas.filter((r) => agora - r.fim <= 60_000).map((r) => r.registro.picoDePedidos));

/** As respostas do TSE nas rodadas da janela, com os status que `aceita` aceita. */
export const respostasNaJanela = (rodadas: RodadaNoPainelDoColetor[], agora: number, janela: number, aceita: (status: number) => boolean) =>
  rodadas
    .filter((r) => agora - r.fim <= janela)
    .reduce((soma, r) => soma + Object.entries(r.registro.respostas).reduce((s, [status, n]) => s + (aceita(Number(status)) ? n : 0), 0), 0);

/**
 * O resultado de cada tentativa de gravar no destino ativo, da mais velha à mais nova: `true` se falhou. Uma rodada que
 * não diz nada (a republicação do plano B ainda em andamento) não conta.
 */
function tentativasDeGravar(rodadas: RodadaNoPainelDoColetor[]): boolean[] {
  return rodadas.flatMap((r, i) => {
    if (r.registro.falhas.some(falhaDeGravacao)) return [true];
    if (r.registro.destinoAtivo === "principal") return r.registro.gravacoes > 0 ? [false] : [];
    const anterior = rodadas[i - 1]?.republicacaoDoPlanoB ?? null;
    return r.republicacaoDoPlanoB !== null && r.republicacaoDoPlanoB !== anterior ? [false] : [];
  });
}

/** Os alertas ativos na situação, os críticos primeiro. */
export function avaliarAlertas(s: SituacaoDaNoite, limites: LimitesDosAlertas = LIMITES_DOS_ALERTAS): Alerta[] {
  const alertas: Alerta[] = [];
  const critico = (id: IdDoAlerta, mensagem: string) => alertas.push({ id, nivel: "critico", mensagem });
  const atencao = (id: IdDoAlerta, mensagem: string) => alertas.push({ id, nivel: "atencao", mensagem });
  const ultima = s.rodadas.at(-1);
  const ilegiveis = s.rodadas.filter((r) => s.agora - r.fim <= limites.janela).flatMap((r) => r.registro.ilegiveis);

  // Críticos. O do bloqueio fica enquanto o coletor está parado nele, mesmo depois da janela.
  const parado = ultima?.registro.bloqueio ?? null;
  const bloqueios = [403, 429].filter((status) => respostasNaJanela(s.rodadas, s.agora, limites.janela, (x) => x === status) > 0);
  if (parado) critico("tse-bloqueou", `TSE respondeu ${parado.status}: o coletor parou de pedir até a conexão mudar`);
  else if (bloqueios.length > 0) critico("tse-bloqueou", `TSE respondeu ${bloqueios.join(" e ")} nos últimos ${duracao(limites.janela)}`);
  const semRodada = s.agora - s.ultimaRodadaCompleta;
  if (semRodada > limites.semRodada) critico("sem-rodada", `Coletor sem rodada completa há ${duracao(semRodada)}`);
  const seguidas = tentativasDeGravar(s.rodadas).slice(-limites.falhasDeGravacaoSeguidas);
  if (seguidas.length === limites.falhasDeGravacaoSeguidas && seguidas.every(Boolean))
    critico(
      "gravacao-falhando",
      `Gravação no ${ultima!.registro.destinoAtivo === "principal" ? "destino principal" : "plano B"} falhando ${seguidas.length} vezes seguidas`,
    );
  if (s.idadeDaRodadaPublica !== null && s.idadeDaRodadaPublica > limites.rodadaPublica)
    critico("rodada-publica-parada", `Arquivo de rodada público com ${duracao(s.idadeDaRodadaPublica)}`);
  if (s.divergenciasDoPlacar && s.divergenciasDoPlacar.length > 0) critico("placar-divergente", "Placar do Brasil publicado diferente do arquivo do TSE");
  const doBrasilOuUf = ilegiveis.filter((i) => i.tipo !== "municipio" && i.tipo !== "zona");
  if (doBrasilOuUf.length > 0)
    critico("brasil-ou-uf-ilegivel", `Arquivo do TSE que o leitor não entende: ${[...new Set(doBrasilOuUf.map((i) => nomeDoArquivo(i.url)))].join(", ")}`);
  if (ultima?.registro.gravacoesTravadas)
    critico(
      "gravacoes-travadas",
      `Gravações do mês em ${comCasas((100 * TRAVA_DAS_GRAVACOES) / PLANO_GRATUITO_DO_R2)}% do plano gratuito do R2: o coletor grava só o arquivo de rodada, o Brasil, as UFs e as tabelas, e cada município a cada 5 min`,
    );

  // De atenção. Parado no bloqueio, a falta de novidade é do coletor, e o crítico já a explica.
  const fase = ultima?.registro.fase ?? null;
  const secoes = ultima?.registro.placarDoTse?.secoes.percentual ?? null;
  if (fase === "ao-vivo" && secoes !== null && secoes < limites.secoesSemNovidade && !parado) {
    const vista = ultima!.registro.novidade.vista;
    const desde = vista === null ? s.aoVivoDesde : Date.parse(vista);
    if (desde !== null && s.agora - desde >= limites.semNovidade)
      atencao("tse-sem-novidade", `TSE sem novidade há ${duracao(s.agora - desde)}, com ${comCasas(secoes, 2)}% das seções`);
  }
  // Só as bases no ar: desligada a projeção, que o roteiro manda desligar depois de um salto sem explicação (decisão 18),
  // ela não volta na noite, e o alerta dela seria barulho.
  const [antes, depois] = s.comProjecao;
  if (antes && depois && fase === "ao-vivo" && secoes !== null && secoes >= limites.secoesDoSalto) {
    const { chaves } = depois.registro.controle;
    const noAr = (["soApuracao", "comPesquisas"] as const).filter((base) => chaves.projecao && (base === "soApuracao" || chaves.baseComPesquisas));
    const saltos = noAr.flatMap((base) => {
      const [a, d] = [antes.registro.projecaoDoBrasil![base], depois.registro.projecaoDoBrasil![base]];
      const projecao = Math.abs(d.projecao - a.projecao);
      const chance = Math.abs(d.chance - a.chance);
      if (projecao <= limites.saltoDaProjecao && chance <= limites.saltoDaChance) return [];
      return [`${ROTULO_DAS_BASES[base]} ${comCasas(projecao, 1)} p.p. e chance ${comCasas(chance)} pontos`];
    });
    if (saltos.length > 0) atencao("projecao-saltou", `Projeção do Brasil mudou numa rodada: ${saltos.join("; ")}`);
  }
  const pico = picoDoUltimoMinuto(s.rodadas, s.agora);
  if (pico > limites.picoDePedidos) atencao("pico-de-pedidos", `Pico de ${pico} pedidos por segundo ao TSE no último minuto`);
  if (ultima && ultima.registro.duracao > limites.duracaoDaRodada) atencao("rodada-lenta", `Rodada de ${comCasas(ultima.registro.duracao / 1000, 1)} s`);
  const desvio = ultima?.registro.desvioDoRelogio ?? null;
  if (s.conferirRelogio && desvio !== null && Math.abs(desvio) > limites.desvioDoRelogio)
    atencao("relogio-desviado", `Relógio do computador ${comCasas(Math.abs(desvio) / 1000, 1)} s ${desvio > 0 ? "adiantado" : "atrasado"} em relação ao TSE`);
  const doMes = ultima?.registro.gravacoesDoMes;
  if (doMes && somaDoMes(doMes) > limites.gravacoesDoMes * PLANO_GRATUITO_DO_R2)
    atencao("gravacoes-do-mes", `Gravações do mês em ${comCasas((100 * somaDoMes(doMes)) / PLANO_GRATUITO_DO_R2)}% do plano gratuito do R2`);
  const deMunicipio = ilegiveis.filter((i) => i.tipo === "municipio" || i.tipo === "zona");
  if (deMunicipio.length > 0)
    atencao("municipio-ilegivel", `Arquivo de município que o leitor não entende (${new Set(deMunicipio.map((i) => i.url)).size}): fica o último bom`);
  return alertas;
}

/** O nome do arquivo de uma URL do TSE (`br-c0001-e006258-u.json`). */
const nomeDoArquivo = (url: string) => url.slice(url.lastIndexOf("/") + 1);

/** Os alertas que começaram e os que terminaram numa avaliação. */
export interface MudancasDosAlertas {
  novos: Alerta[];
  resolvidos: Alerta[];
}

/**
 * Leva as mudanças dos alertas aonde a decisão 8 da Operação na noite manda: o crítico novo toca no computador e vai ao
 * celular pelo ntfy, com som; o de atenção só toca, curto, no computador; o crítico que termina vai ao celular sem som,
 * para o dono que dorme saber que voltou, salvo os que só terminam com a janela. Uma falha do ntfy não segura nada: fica
 * no registro.
 */
export function despacharAlertas(opcoes: {
  /** Manda ao celular; sem ela (sem tópico no `.env`), os alertas ficam no computador. */
  ntfy?: (mensagem: MensagemDoNtfy) => Promise<void>;
  /** Toca no computador e mostra a notificação dele. */
  tocar: (nivel: NivelDoAlerta, mensagem: string) => void;
  /** Escreve no terminal do coletor. */
  registrar: (texto: string) => void;
}): (mudancas: MudancasDosAlertas) => void {
  const enviar = (mensagem: MensagemDoNtfy) =>
    opcoes.ntfy?.(mensagem).catch((erro: Error) => opcoes.registrar(`O alerta não foi ao celular (ntfy): ${erro.message}`));
  return ({ novos, resolvidos }) => {
    for (const alerta of novos) {
      opcoes.registrar(`ALERTA ${alerta.nivel === "critico" ? "CRÍTICO" : "de atenção"}: ${alerta.mensagem}`);
      if (alerta.nivel === "critico") void enviar({ titulo: TITULO_DO_ALERTA_CRITICO, texto: alerta.mensagem, prioridade: "urgente" });
    }
    for (const nivel of ["critico", "atencao"] as const) {
      const doNivel = novos.filter((a) => a.nivel === nivel);
      if (doNivel.length > 0) opcoes.tocar(nivel, doNivel.map((a) => a.mensagem).join("\n"));
    }
    for (const alerta of resolvidos) {
      opcoes.registrar(`Terminou: ${alerta.mensagem}`);
      if (alerta.nivel === "critico" && !PELA_JANELA.has(alerta.id)) void enviar({ titulo: "Apurador: terminou", texto: alerta.mensagem, prioridade: "baixa" });
    }
  };
}
