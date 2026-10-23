import {
  avaliarAlertas,
  falhaDeGravacao,
  LIMITES_DOS_ALERTAS,
  picoDoUltimoMinuto,
  PLANO_GRATUITO_DO_R2,
  respostasNaJanela,
  rodadaCompleta,
  type Alerta,
  type IdDoAlerta,
  type LimitesDosAlertas,
  type MudancasDosAlertas,
  type RodadaNoPainelDoColetor,
} from "./alertas.ts";
import type { ArquivoDeRodada, ArquivoDoLugar, Fase } from "./arquivos.ts";
import { CHAVES_DA_NOITE, NOMES_DAS_CHAVES, type Controle } from "./chaves.ts";
import type { RegistroDaRodada } from "./coletor.ts";
import { somaDoMes } from "./contador.ts";
import { comCasas, duracao, horaDeBrasilia, ROTULO_DAS_BASES, ROTULO_DO_NIVEL } from "./formatos.ts";
import { divergenciasDoPlacar, type PlacarDoTse } from "./placar-conferido.ts";

// O painel do coletor (Operação na noite, decisões 5 e 6; Volume de gravações na noite, decisões 5 e 8): uma página que
// o coletor grava como arquivo a cada rodada e a cada 5 s, e que se recarrega a cada 5 s no navegador do dono, sem
// servidor nem porta aberta. Ela só mostra, nas sete seções da decisão 6, nesta ordem: estado, visto de fora, TSE, placar
// conferido, projeção do Brasil, gravação e computador. Os comandos ficam no `npm run noite`.
//
// O painel recebe cada rodada (`registrar`, no `aoRodar` do coletor) e é atualizado por um temporizador de 5 s
// (`atualizar`): é ele que lê o site visto de fora, mede o computador e percebe que as rodadas pararam, o que nenhuma
// rodada diz. Os alertas saem da mesma situação que o painel mostra (`alertas.ts`), e o painel os despacha quando um
// começa ou termina. A hora é a do relógio do coletor, a mesma das rodadas.

/** O site visto de fora: o arquivo de rodada e o JSON do Brasil lidos pelo endereço público, como a página lê. */
export interface LeituraDeFora {
  /** A raiz lida, com a barra no fim. */
  endereco: string;
  /** `null` se o endereço ainda não tem o arquivo. */
  rodada: ArquivoDeRodada | null;
  brasil: ArquivoDoLugar | null;
  /** O `Date` da resposta do arquivo de rodada, em ms: a página mede a idade da rodada por ele. */
  data: number;
}

/** O computador do coletor numa medida (`computador.ts`). Cada parte é `null` quando não deu para medir. */
export interface MedidaDoComputador {
  /** O uso da CPU desde a medida anterior, em %. */
  cpu: number | null;
  /** Em bytes. */
  memoria: { usada: number; total: number } | null;
  /** O disco do repositório, em bytes. */
  disco: { livre: number; total: number } | null;
  /** A conexão da rota padrão: o cabo de rede ou o celular por ancoragem USB. */
  conexao: "cabo" | "celular" | null;
  /** O adaptador da rota padrão e o que passou por ele desde a medida anterior, em bytes por segundo. */
  rede: { adaptador: string; recebidos: number; enviados: number } | null;
  /** Os bytes que passaram pelo celular desde a troca, somados na noite, ou `null` se ele nunca levou a rota padrão. */
  peloCelular: number | null;
}

/** O que o painel do coletor recebe: o relógio, de onde lê, para onde vão os alertas e onde grava. */
export interface OpcoesDoPainelDoColetor {
  /** A hora em ms, pelo relógio do coletor. */
  agora: () => number;
  /** Lê o site visto de fora no endereço do destino ativo. Sem ela, o painel não tem visto de fora. */
  lerDeFora?: (destinoAtivo: RegistroDaRodada["destinoAtivo"]) => Promise<LeituraDeFora>;
  /** Mede o computador. Sem ela, a seção fica sem medida. */
  medirComputador?: () => Promise<MedidaDoComputador>;
  /** Recebe os alertas que começaram e os que terminaram (`despacharAlertas`). */
  notificar: (mudancas: MudancasDosAlertas) => void;
  /** Grava a página. Uma falha fica para a gravação seguinte. */
  gravar: (html: string) => Promise<void>;
  /** Confere o relógio contra o `Date` do TSE: só no TSE de verdade, porque o TSE falso dá a hora da noite que serve. */
  conferirRelogio: boolean;
  limites?: LimitesDosAlertas;
}

/** O painel do coletor, alimentado pelas rodadas e por um temporizador de 5 s. */
export interface PainelDoColetor {
  /** Uma rodada terminou: o painel a guarda, avalia os alertas e se grava. */
  registrar(registro: RegistroDaRodada, extras: { republicacaoDoPlanoB: number | null }): void;
  /** O temporizador: lê o visto de fora, mede o computador, avalia os alertas e se grava. */
  atualizar(): Promise<void>;
  alertasAtivos(): Alerta[];
}

/** Os placares do TSE guardados para conferir o publicado, que pode estar algumas totalizações atrás na borda. */
const PLACARES_GUARDADOS = 30;
/** Os alertas que o painel lista com a hora em que começaram e terminaram. */
const ALERTAS_NA_LISTA = 15;

/** O painel do coletor, com a hora, a leitura de fora e a medida do computador injetadas. */
export function criarPainelDoColetor(opcoes: OpcoesDoPainelDoColetor): PainelDoColetor {
  const { agora } = opcoes;
  const limites = opcoes.limites ?? LIMITES_DOS_ALERTAS;
  const inicio = agora();
  let ultimaRodadaCompleta = inicio;
  let rodadas: RodadaNoPainelDoColetor[] = [];
  let comProjecao: RodadaNoPainelDoColetor[] = [];
  let aoVivoDesde: number | null = null;
  const placares = new Map<string, PlacarDoTse>();
  const ultimaGravacaoBoa: { principal: number | null; planoB: number | null } = { principal: null, planoB: null };
  /** A última leitura de fora que deu o arquivo de rodada, com a hora em que foi lida, e o erro da última, se falhou. */
  let deFora: { leitura: LeituraDeFora; lidaEm: number } | null = null;
  let erroDeFora: string | null = null;
  let computador: MedidaDoComputador | null = null;
  const ativos = new Map<IdDoAlerta, Alerta>();
  const lista: { alerta: Alerta; comecou: number; terminou: number | null }[] = [];
  let atualizando: Promise<void> | null = null;
  let gravacao = Promise.resolve();

  /** A idade do arquivo de rodada público agora: a que a página viu na leitura, mais o tempo desde ela. */
  function idadeDaRodadaPublica(): number | null {
    if (!opcoes.lerDeFora) return null;
    const rodada = deFora?.leitura.rodada;
    if (!deFora || !rodada) return agora() - inicio;
    return deFora.leitura.data - Date.parse(rodada.rodada) + (agora() - deFora.lidaEm);
  }

  /** O placar conferido: as divergências, ou o motivo de não haver conferência. */
  function placarConferido(): { divergencias: string[] } | { semConferencia: string } {
    const leitura = deFora?.leitura;
    if (!opcoes.lerDeFora) return { semConferencia: "sem visto de fora" };
    if (!leitura?.rodada || !leitura.brasil) return { semConferencia: "sem o JSON do Brasil publicado" };
    const doTse = placares.get(leitura.brasil.tse.totalizacao ?? "");
    if (!doTse) return { semConferencia: `sem o arquivo do TSE da totalização ${leitura.brasil.tse.totalizacao ?? "zerada"}` };
    return { divergencias: divergenciasDoPlacar(leitura.rodada, leitura.brasil, doTse) };
  }

  function avaliar() {
    const conferido = placarConferido();
    const idade = idadeDaRodadaPublica();
    const alertas = avaliarAlertas(
      {
        agora: agora(),
        ultimaRodadaCompleta,
        rodadas,
        comProjecao,
        aoVivoDesde,
        // Um arquivo público de antes deste coletor (o do 24/10, ou o de antes de um reinício) não conta contra ele: a
        // pergunta é se as rodadas dele chegam ao endereço público em 2 min.
        idadeDaRodadaPublica: idade === null ? null : Math.min(idade, agora() - inicio),
        divergenciasDoPlacar: "divergencias" in conferido ? conferido.divergencias : null,
        conferirRelogio: opcoes.conferirRelogio,
      },
      limites,
    );
    const novos = alertas.filter((a) => !ativos.has(a.id));
    const resolvidos = [...ativos.values()].filter((a) => !alertas.some((b) => b.id === a.id));
    for (const a of resolvidos) {
      ativos.delete(a.id);
      const naLista = lista.find((x) => x.alerta.id === a.id && x.terminou === null);
      if (naLista) naLista.terminou = agora();
    }
    for (const a of alertas) ativos.set(a.id, a);
    for (const a of novos) lista.unshift({ alerta: a, comecou: agora(), terminou: null });
    lista.splice(ALERTAS_NA_LISTA);
    if (novos.length + resolvidos.length > 0) opcoes.notificar({ novos, resolvidos });
    const conteudo = montarPagina();
    gravacao = gravacao.then(() => opcoes.gravar(conteudo)).catch(() => {});
  }

  function montarPagina(): string {
    const ultima = rodadas.at(-1)?.registro;
    return paginaDoPainelDoColetor({
      agora: agora(),
      ultima,
      rodadas,
      comProjecao,
      ativos: [...ativos.values()].sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "critico" ? -1 : 1)),
      lista,
      deFora: deFora && { ...deFora, idade: idadeDaRodadaPublica()! },
      erroDeFora,
      temDeFora: opcoes.lerDeFora !== undefined,
      conferido: placarConferido(),
      ultimaGravacaoBoa,
      computador,
      conferirRelogio: opcoes.conferirRelogio,
      limites,
    });
  }

  return {
    registrar(registro, { republicacaoDoPlanoB }) {
      const fim = Date.parse(registro.inicio) + registro.duracao;
      const rodada = { registro, fim, republicacaoDoPlanoB };
      rodadas.push(rodada);
      if (rodadaCompleta(registro)) ultimaRodadaCompleta = fim;
      rodadas = rodadas.filter((r, i) => i >= rodadas.length - 2 || fim - r.fim <= limites.janela);
      if (registro.projecaoDoBrasil) comProjecao = [...comProjecao, rodada].slice(-2);
      if (registro.fase === "ao-vivo") aoVivoDesde ??= fim;
      if (registro.placarDoTse) {
        placares.delete(registro.placarDoTse.totalizacao ?? "");
        placares.set(registro.placarDoTse.totalizacao ?? "", registro.placarDoTse);
        for (const chave of [...placares.keys()].slice(0, -PLACARES_GUARDADOS)) placares.delete(chave);
      }
      // No R2 e na pasta, a gravação boa é a rodada que gravou sem falha de gravação; no plano B, a republicação do Worker.
      if (registro.destinoAtivo === "principal" && registro.gravacoes > 0 && !registro.falhas.some(falhaDeGravacao)) ultimaGravacaoBoa.principal = fim;
      ultimaGravacaoBoa.planoB = republicacaoDoPlanoB;
      avaliar();
    },
    atualizar() {
      atualizando ??= (async () => {
        try {
          if (opcoes.lerDeFora) {
            try {
              const leitura = await opcoes.lerDeFora(rodadas.at(-1)?.registro.destinoAtivo ?? "principal");
              erroDeFora = leitura.rodada ? null : "o endereço ainda não tem o arquivo de rodada";
              if (leitura.rodada) deFora = { leitura, lidaEm: agora() };
            } catch (erro) {
              erroDeFora = (erro as Error).message;
            }
          }
          if (opcoes.medirComputador) {
            try {
              computador = await opcoes.medirComputador();
            } catch {
              computador = null;
            }
          }
          avaliar();
        } finally {
          atualizando = null;
        }
      })();
      return atualizando;
    },
    alertasAtivos: () => [...ativos.values()],
  };
}

// A página.

const ROTULO_DA_FASE: Record<Fase, string> = { "antes-das-17h": "antes das 17h", "ao-vivo": "ao vivo", encerrada: "encerrada" };

/** Escapa o texto para o HTML: as falhas trazem URLs e o corpo de respostas do R2. */
const escapar = (texto: string) => texto.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const quandoFoi = (ms: number | null, agora: number) => (ms === null ? "nenhuma" : `${horaDeBrasilia(ms)} (há ${duracao(agora - ms)})`);
const megabytes = (bytes: number) => `${comCasas(bytes / 1_000_000, 1)} MB`;
const linha = (rotulo: string, valor: string) => `<tr><th>${escapar(rotulo)}</th><td>${valor}</td></tr>`;
const secao = (id: string, titulo: string, linhas: string[]) => `<section id="${id}"><h2>${titulo}</h2><table>${linhas.join("")}</table></section>`;
const marca = (classe: "critico" | "atencao" | "ok", texto: string) => `<span class="${classe}">${escapar(texto)}</span>`;

/** Tudo o que a página mostra, já calculado pelo painel. */
interface DadosDaPagina {
  agora: number;
  ultima: RegistroDaRodada | undefined;
  rodadas: RodadaNoPainelDoColetor[];
  comProjecao: RodadaNoPainelDoColetor[];
  ativos: Alerta[];
  lista: { alerta: Alerta; comecou: number; terminou: number | null }[];
  deFora: { leitura: LeituraDeFora; lidaEm: number; idade: number } | null;
  erroDeFora: string | null;
  temDeFora: boolean;
  conferido: { divergencias: string[] } | { semConferencia: string };
  ultimaGravacaoBoa: { principal: number | null; planoB: number | null };
  computador: MedidaDoComputador | null;
  conferirRelogio: boolean;
  limites: LimitesDosAlertas;
}

function paginaDoPainelDoColetor(d: DadosDaPagina): string {
  const { agora, ultima } = d;
  const criticos = d.ativos.filter((a) => a.nivel === "critico").length;
  const titulo = `${d.ativos.length > 0 ? `(${criticos > 0 ? `${criticos} crítico${criticos > 1 ? "s" : ""}` : d.ativos.length}) ` : ""}Painel do coletor`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="5">
<title>${escapar(titulo)}</title>
<style>
body { font: 15px/1.4 system-ui, sans-serif; margin: 16px; background: #fff; color: #111; max-width: 1100px; }
h1 { font-size: 18px; margin: 0 0 8px; } h2 { font-size: 16px; margin: 18px 0 6px; border-bottom: 1px solid #ccc; }
table { border-collapse: collapse; } th { text-align: left; font-weight: 600; padding: 2px 16px 2px 0; vertical-align: top; } td { padding: 2px 0; font-variant-numeric: tabular-nums; }
.critico { color: #fff; background: #b00020; padding: 0 4px; } .atencao { background: #ffd54f; padding: 0 4px; } .ok { color: #1b5e20; }
ul { margin: 0; padding-left: 18px; }
</style>
</head>
<body>
<h1>Painel do coletor <small>· ${horaDeBrasilia(agora)} no relógio do coletor · rodada ${ultima ? `#${ultima.numero}` : "nenhuma"}</small></h1>
${[secaoDoEstado(d), secaoDoVistoDeFora(d), secaoDoTse(d), secaoDoPlacarConferido(d), secaoDaProjecao(d), secaoDaGravacao(d), secaoDoComputador(d)].join("\n")}
</body>
</html>
`;
}

function secaoDoEstado(d: DadosDaPagina): string {
  const r = d.ultima;
  const controle: Controle | undefined = r?.controle;
  const chaves = controle
    ? NOMES_DAS_CHAVES.map(
        (nome) => `${escapar(CHAVES_DA_NOITE[nome].rotulo)}: ${controle.chaves[nome] ? marca("ok", "ligada") : marca("atencao", "desligada")}`,
      ).join("<br>")
    : "sem rodada";
  const alertas =
    d.ativos.length === 0
      ? marca("ok", "nenhum")
      : `<ul>${d.ativos.map((a) => `<li>${marca(a.nivel, ROTULO_DO_NIVEL[a.nivel])} ${escapar(a.mensagem)}</li>`).join("")}</ul>`;
  const lista =
    d.lista.length === 0
      ? "nenhum"
      : `<ul>${d.lista.map((x) => `<li>${horaDeBrasilia(x.comecou)}${x.terminou === null ? "" : ` a ${horaDeBrasilia(x.terminou)}`} · ${escapar(x.alerta.mensagem)}</li>`).join("")}</ul>`;
  return secao("estado", "1. Estado", [
    linha(
      "Fase",
      r?.fase
        ? `${ROTULO_DA_FASE[r.fase]}${r.encerraEm ? ` · o coletor para sozinho às ${horaDeBrasilia(Date.parse(r.encerraEm))}, 30 min depois da totalização final` : ""}`
        : "sem fase (sem o Brasil do TSE)",
    ),
    linha("Chaves", chaves),
    linha("Aviso pronto", controle?.aviso ? `aviso ${controle.aviso} no ar` : "nenhum"),
    linha("Destino ativo", r ? (r.destinoAtivo === "principal" ? "principal" : marca("atencao", "plano B")) : "—"),
    linha("Conexão", d.computador?.conexao ? (d.computador.conexao === "cabo" ? "cabo" : marca("atencao", "celular")) : "sem medida"),
    linha("Pedidos ao TSE", pedidosAoTse(r, d.limites)),
    linha("Alertas ativos", alertas),
    linha("Alertas da noite", lista),
  ]);
}

/** O ritmo dos pedidos ao TSE (Operação na noite, decisão 12): parados no bloqueio, a rodada de 40 s depois dele, ou o normal. */
function pedidosAoTse(r: RegistroDaRodada | undefined, limites: LimitesDosAlertas): string {
  if (r?.bloqueio)
    return marca("critico", `parados no bloqueio desde ${horaDeBrasilia(Date.parse(r.bloqueio.desde))} (${r.bloqueio.status}): troque a conexão`);
  if (r?.rodadaDe40s)
    return marca(
      "atencao",
      r.rodadaDe40s.ate === null
        ? `uma rodada a cada 40 s até o fim da noite: o pico passou de ${limites.picoDePedidos} pedidos por segundo`
        : `uma rodada a cada 40 s até ${horaDeBrasilia(Date.parse(r.rodadaDe40s.ate))}, 15 min depois da volta`,
    );
  return r ? "no ritmo normal" : "—";
}

function secaoDoVistoDeFora(d: DadosDaPagina): string {
  if (!d.temDeFora) return secao("visto-de-fora", "2. Visto de fora", [linha("Endereço", "sem endereço público")]);
  const f = d.deFora;
  const rodada = f?.leitura.rodada;
  const brasil = f?.leitura.brasil;
  const placar =
    rodada && brasil
      ? rodada.candidatos.map((c, i) => `${escapar(c.nome)} ${comCasas(brasil.tse.percentuais[i] ?? NaN, 2)}%`).join(" · ") +
        ` · ${comCasas(brasil.tse.secoes.percentual, 2)}% das seções · totalização ${brasil.tse.totalizacao ?? "zerada"}`
      : "sem o JSON do Brasil";
  const idade = f ? (f.idade > d.limites.rodadaPublica ? marca("critico", duracao(f.idade)) : duracao(f.idade)) : "—";
  return secao("visto-de-fora", "2. Visto de fora", [
    linha("Endereço", escapar(f?.leitura.endereco ?? "—")),
    linha(
      "Arquivo de rodada",
      rodada ? `${horaDeBrasilia(Date.parse(rodada.rodada))} · ${ROTULO_DA_FASE[rodada.fase]} · atraso do visitante ${idade}` : "nenhum lido",
    ),
    linha("JSON do Brasil", placar),
    ...(d.erroDeFora ? [linha("Última leitura", marca("atencao", `falhou: ${d.erroDeFora}`))] : []),
  ]);
}

function secaoDoTse(d: DadosDaPagina): string {
  const { agora, ultima } = d;
  const naJanela = d.rodadas.filter((r) => agora - r.fim <= d.limites.janela);
  const respostas = (aceita: (status: number) => boolean) => respostasNaJanela(d.rodadas, agora, d.limites.janela, aceita);
  const lida = [...d.rodadas].reverse().find((r) => (r.registro.respostas[200] ?? 0) + (r.registro.respostas[304] ?? 0) > 0);
  const pico = picoDoUltimoMinuto(d.rodadas, agora);
  const novidade = ultima?.novidade;
  const secoes = ultima?.placarDoTse?.secoes.percentual;
  const contagem = (rotulo: string, n: number, alerta: boolean) => `${rotulo}: ${n > 0 && alerta ? marca("critico", String(n)) : n}`;
  return secao("tse", "3. TSE", [
    linha("Última leitura", quandoFoi(lida?.fim ?? null, agora)),
    linha(
      "Última novidade",
      novidade?.totalizacao
        ? `totalização ${novidade.totalizacao} · ${secoes === undefined ? "—" : `${comCasas(secoes, 2)}% das seções`} · vista ${quandoFoi(novidade.vista === null ? null : Date.parse(novidade.vista), agora)}`
        : "nenhuma totalização ainda",
    ),
    linha("Pico no último minuto", `${pico} pedidos/s, de 100`),
    linha(
      `Nos últimos ${duracao(d.limites.janela)}`,
      [
        contagem(
          "403",
          respostas((s) => s === 403),
          true,
        ),
        contagem(
          "429",
          respostas((s) => s === 429),
          true,
        ),
        contagem(
          "404",
          respostas((s) => s === 404),
          false,
        ),
        contagem(
          "5xx",
          respostas((s) => s >= 500),
          false,
        ),
      ].join(" · "),
    ),
    linha(
      "Tempo da rodada",
      ultima
        ? `${comCasas(ultima.duracao / 1000, 1)} s (máximo na janela: ${comCasas(Math.max(ultima.duracao, ...naJanela.map((r) => r.registro.duracao)) / 1000, 1)} s)`
        : "—",
    ),
  ]);
}

function secaoDoPlacarConferido(d: DadosDaPagina): string {
  const c = d.conferido;
  const valor =
    "semConferencia" in c
      ? escapar(`sem conferência: ${c.semConferencia}`)
      : c.divergencias.length === 0
        ? marca("ok", "igual ao arquivo do TSE")
        : `${marca("critico", "divergente")}<ul>${c.divergencias.map((x) => `<li>${escapar(x)}</li>`).join("")}</ul>`;
  return secao("placar-conferido", "4. Placar conferido", [linha("Brasil publicado contra o arquivo do TSE", valor)]);
}

function secaoDaProjecao(d: DadosDaPagina): string {
  const [antes, depois] = d.comProjecao.length === 2 ? d.comProjecao : [undefined, d.comProjecao[0]];
  const p = depois?.registro.projecaoDoBrasil;
  if (!p) return secao("projecao", "5. Projeção do Brasil", [linha("Projeção", "sem projeção")]);
  const nome = depois.registro.placarDoTse?.candidatos.find((c) => c.numero === p.candidato)?.nome ?? `o ${p.candidato}`;
  const { chaves } = depois.registro.controle;
  const base = (qual: "soApuracao" | "comPesquisas", noAr: boolean) => {
    const n = p[qual];
    const a = antes?.registro.projecaoDoBrasil?.[qual];
    const mudanca = a ? ` · desde a rodada anterior: ${sinal(n.projecao - a.projecao, 1)} p.p., chance ${sinal(n.chance - a.chance, 0)}` : "";
    return `${comCasas(n.projecao, 1)}% ± ${comCasas(n.margem, 1)} · chance ${comCasas(n.chance)}%${mudanca}${noAr ? "" : " · fora do ar"}`;
  };
  return secao("projecao", "5. Projeção do Brasil", [
    linha("De", escapar(nome)),
    linha(ROTULO_DAS_BASES.soApuracao, base("soApuracao", chaves.projecao)),
    linha(ROTULO_DAS_BASES.comPesquisas, base("comPesquisas", chaves.projecao && chaves.baseComPesquisas)),
    linha("Peso das pesquisas", `${p.pesoDasPesquisas}%`),
  ]);
}

/** Uma diferença com o sinal na frente. */
const sinal = (n: number, casas: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${comCasas(Math.abs(n), casas)}`;

function secaoDaGravacao(d: DadosDaPagina): string {
  const r = d.ultima;
  const doMes = r?.gravacoesDoMes;
  const mes = doMes
    ? [
        ...Object.entries(doMes.buckets).map(([bucket, n]) => `${escapar(bucket)}: ${comCasas(n)}`),
        `total ${comCasas(somaDoMes(doMes))} (${comCasas((100 * somaDoMes(doMes)) / PLANO_GRATUITO_DO_R2, 1)}% do plano gratuito, ${doMes.mes})`,
      ].join(" · ")
    : "sem contador";
  const falhas =
    r && r.falhas.length > 0
      ? `<ul>${r.falhas
          .slice(0, 10)
          .map((f) => `<li>${escapar(f)}</li>`)
          .join("")}${r.falhas.length > 10 ? `<li>e mais ${r.falhas.length - 10}</li>` : ""}</ul>`
      : "nenhuma";
  const c = d.computador;
  const peloCelular = !c?.conexao ? "sem medida" : c.peloCelular === null ? "nada, sempre no cabo" : megabytes(c.peloCelular);
  return secao("gravacao", "6. Gravação", [
    linha("Última gravação boa no principal", quandoFoi(d.ultimaGravacaoBoa.principal, d.agora)),
    linha("Última republicação boa do plano B", quandoFoi(d.ultimaGravacaoBoa.planoB, d.agora)),
    linha("Falhas da última rodada", falhas),
    linha("Gravações do mês", mes),
    linha(
      "Trava de 90%",
      r?.gravacoesTravadas ? marca("critico", "ligada: só o arquivo de rodada, o Brasil, as UFs e as tabelas, e cada município a cada 5 min") : "desligada",
    ),
    linha("Teto por rodada", r?.adiadas ? marca("atencao", `atingido: ${comCasas(r.adiadas)} arquivos para a rodada seguinte`) : "não atingido"),
    linha("Objeto da noite", objetoDaNoite(r)),
    linha("Pelo celular desde a troca", peloCelular),
  ]);
}

/** O objeto da noite da última rodada: pelo celular, ele fica no disco e sobe no primeiro no cabo (Volume de gravações na noite, decisão 8). */
function objetoDaNoite(r: RegistroDaRodada | undefined): string {
  if (!r?.objetoDaNoite) return "sem objeto da noite";
  if (r.objetoDaNoite === "no disco") return marca("atencao", "no disco enquanto a conexão for o celular: sobe no primeiro com o cabo");
  return r.objetoDaNoite === "gravado" ? "gravado" : marca("atencao", "falhou: vai no da rodada seguinte");
}

function secaoDoComputador(d: DadosDaPagina): string {
  const c = d.computador;
  const desvio = d.ultima?.desvioDoRelogio ?? null;
  const relogio = !d.conferirRelogio
    ? "não conferido: o TSE falso dá a hora da noite que serve"
    : desvio === null
      ? "sem resposta do TSE"
      : `${comCasas(desvio / 1000, 1)} s (o relógio do computador menos o Date do TSE)`;
  return secao("computador", "7. Computador", [
    linha("CPU", c?.cpu === null || c?.cpu === undefined ? "sem medida" : `${comCasas(c.cpu)}%`),
    linha("Memória", c?.memoria ? `${comCasas(c.memoria.usada / 1e9, 1)} GB de ${comCasas(c.memoria.total / 1e9, 1)} GB` : "sem medida"),
    linha("Disco livre", c?.disco ? `${comCasas(c.disco.livre / 1e9, 1)} GB de ${comCasas(c.disco.total / 1e9, 1)} GB` : "sem medida"),
    linha(
      "Rede",
      c?.rede ? `${escapar(c.rede.adaptador)} · ↓ ${comCasas(c.rede.recebidos / 1000)} kB/s · ↑ ${comCasas(c.rede.enviados / 1000)} kB/s` : "sem medida",
    ),
    linha("Desvio do relógio", relogio),
  ]);
}
