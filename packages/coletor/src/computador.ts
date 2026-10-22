import { execFile } from "node:child_process";
import { statfs } from "node:fs/promises";
import { cpus, freemem, totalmem } from "node:os";
import type { NivelDoAlerta } from "./alertas.ts";
import type { MedidaDoComputador } from "./painel-do-coletor.ts";

// O computador do coletor no painel (Operação na noite, decisões 2, 6 e 8; Volume de gravações na noite, decisão 8): o
// Windows 11 do dono, com o cabo de rede (Realtek GbE) e o celular por ancoragem USB como reserva, de prioridade menor.
// A troca é puxar o cabo: a rota padrão passa ao celular. O Node não diz qual adaptador leva a rota padrão nem quantos
// bytes passaram por ele, e o PowerShell diz (`Get-NetRoute`, `Get-NetAdapterStatistics`), em ~1 a 3 s: ele roda a cada
// 20 s, fora da rodada, e o painel fica com a última medida. Fora do Windows, a rede fica sem medida.
//
// O som e a notificação do computador também saem pelo PowerShell: o crítico toca três bipes e mostra a notificação do
// Windows, que fica na central de notificações; o de atenção, um som curto. A mensagem vai por variável de ambiente, e não
// no texto do comando, porque traz URLs e respostas do R2.

/** O intervalo entre duas leituras da rede pelo PowerShell. */
const INTERVALO_DA_REDE = 20_000;

/** O adaptador da ancoragem USB do celular: o Android aparece como "Remote NDIS", e o iPhone como "Apple Mobile Device". */
const DO_CELULAR = /NDIS|Android|iPhone|Apple Mobile|USB/i;

const ROTA_PADRAO = [
  "$r = Get-NetRoute -DestinationPrefix 0.0.0.0/0 -ErrorAction Stop | Sort-Object { $_.RouteMetric + $_.InterfaceMetric } | Select-Object -First 1",
  "$a = Get-NetAdapter -InterfaceIndex $r.ifIndex",
  "$s = Get-NetAdapterStatistics -Name $a.Name",
  "[pscustomobject]@{ nome = $a.Name; descricao = $a.InterfaceDescription; recebidos = [double]$s.ReceivedBytes; enviados = [double]$s.SentBytes } | ConvertTo-Json -Compress",
].join("; ");

/** Roda um comando no PowerShell do Windows e dá a saída. */
function powershell(comando: string, env: Record<string, string> = {}): Promise<string> {
  return new Promise((pronto, falhou) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", comando],
      { env: { ...process.env, ...env }, timeout: 15_000, windowsHide: true },
      (erro, saida) => (erro ? falhou(erro) : pronto(saida)),
    );
  });
}

/** A rota padrão: o adaptador e os bytes que passaram por ele desde que ele ligou. */
interface RotaPadrao {
  nome: string;
  descricao: string;
  recebidos: number;
  enviados: number;
}

/** O medidor do computador: a CPU desde a medida anterior, a memória, o disco da pasta e a rede da rota padrão. */
export function medidorDoComputador(opcoes: {
  /** Uma pasta no disco que o painel mostra: a do repositório. */
  pasta: string;
  /** A hora em ms, pelo relógio do coletor. */
  agora: () => number;
}): () => Promise<MedidaDoComputador> {
  const { pasta, agora } = opcoes;
  const tempos = () =>
    cpus().reduce((t, c) => ({ ocioso: t.ocioso + c.times.idle, total: t.total + Object.values(c.times).reduce((a, b) => a + b, 0) }), { ocioso: 0, total: 0 });
  let cpuAnterior = tempos();
  let rotaAnterior: (RotaPadrao & { em: number }) | null = null;
  let rede: MedidaDoComputador["rede"] = null;
  let conexao: MedidaDoComputador["conexao"] = null;
  /** Os bytes que passaram pelo celular na noite, somados a cada leitura; `null` enquanto ele não levou a rota. */
  let peloCelular: number | null = null;
  let lendoARede: Promise<void> | null = null;
  let redeLidaEm = -Infinity;

  async function lerARede() {
    try {
      const rota = JSON.parse(await powershell(ROTA_PADRAO)) as RotaPadrao;
      const em = agora();
      conexao = DO_CELULAR.test(rota.descricao) ? "celular" : "cabo";
      if (rotaAnterior && rotaAnterior.nome === rota.nome && em > rotaAnterior.em) {
        const segundos = (em - rotaAnterior.em) / 1000;
        const [recebidos, enviados] = [Math.max(0, rota.recebidos - rotaAnterior.recebidos), Math.max(0, rota.enviados - rotaAnterior.enviados)];
        rede = { adaptador: `${rota.nome} (${rota.descricao})`, recebidos: recebidos / segundos, enviados: enviados / segundos };
        if (conexao === "celular") peloCelular = (peloCelular ?? 0) + recebidos + enviados;
      } else {
        rede = { adaptador: `${rota.nome} (${rota.descricao})`, recebidos: 0, enviados: 0 };
        if (conexao === "celular") peloCelular ??= 0;
      }
      rotaAnterior = { ...rota, em };
    } catch {
      rede = null;
      conexao = null;
    }
  }

  return async () => {
    const cpuAgora = tempos();
    const total = cpuAgora.total - cpuAnterior.total;
    const cpu = total > 0 ? 100 * (1 - (cpuAgora.ocioso - cpuAnterior.ocioso) / total) : null;
    cpuAnterior = cpuAgora;
    let disco: MedidaDoComputador["disco"] = null;
    try {
      const s = await statfs(pasta);
      disco = { livre: s.bavail * s.bsize, total: s.blocks * s.bsize };
    } catch {
      disco = null;
    }
    if (process.platform === "win32" && !lendoARede && agora() - redeLidaEm >= INTERVALO_DA_REDE) {
      redeLidaEm = agora();
      lendoARede = lerARede().finally(() => (lendoARede = null));
    }
    return { cpu, memoria: { usada: totalmem() - freemem(), total: totalmem() }, disco, conexao, rede, peloCelular };
  };
}

const NOTIFICACAO = [
  "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null",
  "$x = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)",
  "$t = $x.GetElementsByTagName('text')",
  "$t.Item(0).AppendChild($x.CreateTextNode($env:TITULO_DO_ALERTA)) | Out-Null",
  "$t.Item(1).AppendChild($x.CreateTextNode($env:MENSAGEM_DO_ALERTA)) | Out-Null",
  "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show([Windows.UI.Notifications.ToastNotification]::new($x))",
].join("; ");
const TRES_BIPES = "1..3 | ForEach-Object { [console]::Beep(880, 350); Start-Sleep -Milliseconds 150 }";
const SOM_CURTO = "[System.Media.SystemSounds]::Asterisk.Play(); Start-Sleep -Milliseconds 800";

/**
 * Toca no computador: o crítico com três bipes e a notificação do Windows, o de atenção com um som curto. Fora do
 * Windows, o sino do terminal. Não espera o PowerShell, e uma falha só fica no terminal.
 */
export function tocarNoComputador(nivel: NivelDoAlerta, mensagem: string): void {
  if (process.platform !== "win32") {
    process.stdout.write("\x07");
    return;
  }
  const comando = nivel === "critico" ? `${NOTIFICACAO}; ${TRES_BIPES}` : SOM_CURTO;
  powershell(comando, { TITULO_DO_ALERTA: "Apurador: alerta crítico", MENSAGEM_DO_ALERTA: mensagem }).catch((erro: Error) =>
    console.log(`O alerta não tocou no computador: ${erro.message.split("\n")[0]}`),
  );
}
