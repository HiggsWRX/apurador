import { somaDoMes } from "./contador.ts";
import type { RegistroDaRodada } from "./coletor.ts";
import type { MensagemDoNtfy } from "./ntfy.ts";

// Os alertas da noite (Operação na noite, decisões 7 e 8; Volume de gravações na noite, decisão 5), em dois níveis. Os
// críticos tocam no computador e vão ao celular pelo ntfy; os de atenção ficam no painel do coletor, com um som curto no
// computador. Nenhum alerta age sozinho: quem decide é o dono, pelo roteiro. Os limites são parâmetros provisórios,
// conferidos no ensaio 1; mudam aqui, num lugar só.
//
// Um alerta está ativo enquanto a condição vale, e o dono é avisado quando ele começa; um crítico que termina vai ao
// celular sem som. As condições de um momento só, como o 403 ou o arquivo que o leitor não entende, valem por 10 min,
// a janela do TSE no painel: o arquivo do Brasil é pedido uma vez por minuto, e sem a janela o mesmo arquivo estragado
// tocaria a cada minuto.

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
  /** Crítico: rodadas seguidas com a gravação no destino ativo falhando. */
  rodadasComFalhaDeGravacao: 2,
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

/** Uma rodada no painel, com o fim dela pelo relógio do coletor (ms). */
export interface RodadaNoPainel {
  registro: RegistroDaRodada;
  fim: number;
}

/** O que o painel do coletor sabe da noite num momento, de onde saem os alertas. */
export interface SituacaoDaNoite {
  /** ms do relógio do coletor. */
  agora: number;
  /** Quando o painel começou, a referência de "sem rodada" antes da primeira (ms). */
  inicio: number;
  /** As rodadas da janela, da mais velha à mais nova, sempre com as duas últimas. */
  rodadas: RodadaNoPainel[];
  /** As duas últimas rodadas com a projeção do Brasil, a mais nova por último. */
  comProjecao: RodadaNoPainel[];
  /** Quando a fase passou a ao vivo (ms), ou `null`. */
  aoVivoDesde: number | null;
  /** A idade do arquivo de rodada público como a página a vê (ms), ou `null` sem visto de fora. */
  idadeDaRodadaPublica: number | null;
  /** O que difere no placar conferido, ou `null` sem conferência. */
  divergenciasDoPlacar: string[] | null;
  /** O desvio do relógio só vale contra o TSE de verdade: o TSE falso dá no `Date` a hora da noite que ele serve. */
  conferirRelogio: boolean;
}

/** Ms como "75 s" ou "3 min 5 s". */
export function duracao(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 120 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}`;
}

/** Um número com as casas dadas, à brasileira. */
export const numero = (n: number, casas = 0) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

const ROTULO_DAS_BASES = { soApuracao: "Só apuração", comPesquisas: "Apuração + pesquisas" } as const;

/** Os alertas ativos na situação, os críticos primeiro. */
export function avaliarAlertas(s: SituacaoDaNoite, limites: LimitesDosAlertas = LIMITES_DOS_ALERTAS): Alerta[] {
  const alertas: Alerta[] = [];
  const critico = (id: IdDoAlerta, mensagem: string) => alertas.push({ id, nivel: "critico", mensagem });
  const atencao = (id: IdDoAlerta, mensagem: string) => alertas.push({ id, nivel: "atencao", mensagem });
  const ultima = s.rodadas.at(-1);
  const naJanela = s.rodadas.filter((r) => s.agora - r.fim <= limites.janela);
  const respostas = (status: number) => naJanela.reduce((soma, r) => soma + (r.registro.respostas[status] ?? 0), 0);
  const ilegiveis = naJanela.flatMap((r) => r.registro.ilegiveis);

  // Críticos.
  const bloqueios = [403, 429].filter((status) => respostas(status) > 0);
  if (bloqueios.length > 0) critico("tse-bloqueou", `TSE respondeu ${bloqueios.join(" e ")} nos últimos ${duracao(limites.janela)}`);
  const semRodada = s.agora - (ultima?.fim ?? s.inicio);
  if (semRodada > limites.semRodada) critico("sem-rodada", `Coletor sem rodada completa há ${duracao(semRodada)}`);
  const seguidas = s.rodadas.slice(-limites.rodadasComFalhaDeGravacao);
  if (seguidas.length === limites.rodadasComFalhaDeGravacao && seguidas.every((r) => falhouAoGravar(r.registro)))
    critico(
      "gravacao-falhando",
      `Gravação no ${ultima!.registro.destinoAtivo === "principal" ? "destino principal" : "plano B"} falhando em ${seguidas.length} rodadas seguidas`,
    );
  if (s.idadeDaRodadaPublica !== null && s.idadeDaRodadaPublica > limites.rodadaPublica)
    critico("rodada-publica-parada", `Arquivo de rodada público com ${duracao(s.idadeDaRodadaPublica)}`);
  if (s.divergenciasDoPlacar && s.divergenciasDoPlacar.length > 0) critico("placar-divergente", "Placar do Brasil publicado diferente do arquivo do TSE");
  const doBrasilOuUf = ilegiveis.filter((i) => i.tipo !== "municipio" && i.tipo !== "zona");
  if (doBrasilOuUf.length > 0)
    critico("brasil-ou-uf-ilegivel", `Arquivo do TSE que o leitor não entende: ${[...new Set(doBrasilOuUf.map((i) => nomeDoArquivo(i.url)))].join(", ")}`);

  // De atenção.
  const fase = ultima?.registro.fase ?? null;
  const secoes = ultima?.registro.placarDoTse?.secoes.percentual ?? null;
  if (fase === "ao-vivo" && secoes !== null && secoes < limites.secoesSemNovidade) {
    const vista = ultima!.registro.novidade.vista;
    const desde = vista === null ? s.aoVivoDesde : Date.parse(vista);
    if (desde !== null && s.agora - desde >= limites.semNovidade)
      atencao("tse-sem-novidade", `TSE sem novidade há ${duracao(s.agora - desde)}, com ${numero(secoes, 2)}% das seções`);
  }
  const [antes, depois] = s.comProjecao;
  if (antes && depois && fase === "ao-vivo" && secoes !== null && secoes >= limites.secoesDoSalto) {
    const { chaves } = depois.registro.controle;
    const noAr = (["soApuracao", "comPesquisas"] as const).filter((base) => chaves.projecao && (base === "soApuracao" || chaves.baseComPesquisas));
    const saltos = noAr.flatMap((base) => {
      const [a, d] = [antes.registro.projecaoDoBrasil![base], depois.registro.projecaoDoBrasil![base]];
      const projecao = Math.abs(d.projecao - a.projecao);
      const chance = Math.abs(d.chance - a.chance);
      if (projecao <= limites.saltoDaProjecao && chance <= limites.saltoDaChance) return [];
      return [`${ROTULO_DAS_BASES[base]} ${numero(projecao, 1)} p.p. e chance ${numero(chance)} pontos`];
    });
    if (saltos.length > 0) atencao("projecao-saltou", `Projeção do Brasil mudou numa rodada: ${saltos.join("; ")}`);
  }
  const pico = Math.max(0, ...s.rodadas.filter((r) => s.agora - r.fim <= 60_000).map((r) => r.registro.picoDePedidos));
  if (pico > limites.picoDePedidos) atencao("pico-de-pedidos", `Pico de ${pico} pedidos por segundo ao TSE no último minuto`);
  if (ultima && ultima.registro.duracao > limites.duracaoDaRodada) atencao("rodada-lenta", `Rodada de ${numero(ultima.registro.duracao / 1000, 1)} s`);
  const desvio = ultima?.registro.desvioDoRelogio ?? null;
  if (s.conferirRelogio && desvio !== null && Math.abs(desvio) > limites.desvioDoRelogio)
    atencao("relogio-desviado", `Relógio do computador ${numero(Math.abs(desvio) / 1000, 1)} s ${desvio > 0 ? "adiantado" : "atrasado"} em relação ao TSE`);
  const doMes = ultima?.registro.gravacoesDoMes;
  if (doMes && somaDoMes(doMes) > limites.gravacoesDoMes * PLANO_GRATUITO_DO_R2)
    atencao("gravacoes-do-mes", `Gravações do mês em ${numero((100 * somaDoMes(doMes)) / PLANO_GRATUITO_DO_R2)}% do plano gratuito do R2`);
  const deMunicipio = ilegiveis.filter((i) => i.tipo === "municipio" || i.tipo === "zona");
  if (deMunicipio.length > 0)
    atencao("municipio-ilegivel", `Arquivo de município que o leitor não entende (${new Set(deMunicipio.map((i) => i.url)).size}): fica o último bom`);
  return alertas;
}

/**
 * A rodada teve gravação falhando no destino ativo, pelos textos do ticket 20: `gravar <caminho>: ...` no R2 e na pasta, e
 * `republicar o plano B: ...` na rodada seguinte à republicação do Worker que falhou.
 */
const falhouAoGravar = (r: RegistroDaRodada) => r.falhas.some((f) => f.startsWith("gravar ") || f.startsWith("republicar o plano B:"));

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
 * para o dono que dorme saber que voltou. Uma falha do ntfy não segura nada: fica no registro.
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
      if (alerta.nivel === "critico") void enviar({ titulo: "Apurador: alerta crítico", texto: alerta.mensagem, prioridade: "urgente" });
    }
    for (const nivel of ["critico", "atencao"] as const) {
      const doNivel = novos.filter((a) => a.nivel === nivel);
      if (doNivel.length > 0) opcoes.tocar(nivel, doNivel.map((a) => a.mensagem).join("\n"));
    }
    for (const alerta of resolvidos) {
      opcoes.registrar(`Terminou: ${alerta.mensagem}`);
      if (alerta.nivel === "critico") void enviar({ titulo: "Apurador: terminou", texto: alerta.mensagem, prioridade: "baixa" });
    }
  };
}
