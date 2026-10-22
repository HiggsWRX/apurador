import type { Buscar } from "../src/coletor.ts";
import { enviarAoNtfy, type MensagemDoNtfy } from "../src/ntfy.ts";
import { lerRodadaPublica } from "../src/visto-de-fora.ts";

// A sentinela (Operação na noite, decisão 8): um Worker com Cron Trigger a cada minuto, fora do computador do dono, que
// lê o arquivo de rodada público e manda um alerta pelo ntfy se ele passar 3 min parado. É o único alerta que funciona
// com o computador ou a internet do dono fora, e, como os outros, não age sozinho.
//
// Ela lê os dois endereços, o principal e o do plano B, e fica com a rodada mais nova, como a página: depois do comando
// do plano B, o principal para de andar, e o site não. A idade é a do `Date` da resposta, como a página a mede. Com a
// fase "encerrada", o coletor parou de propósito, e ela não alerta; uma rodada de mais de 6 h é de outra noite (ou de um
// ensaio), e ela fica quieta, para poder ficar ligada antes e depois da noite.
//
// Um Worker não guarda nada entre duas execuções: o que já foi alertado fica no KV, gravado só quando muda. Assim o mesmo
// arquivo parado alerta uma vez, e o dono fica sabendo, sem som, quando ele volta a andar.

/** Parado há mais que isso, alerta. */
const PARADA = 3 * 60_000;
/** Uma rodada mais velha que isso é de outra noite. */
const OUTRA_NOITE = 6 * 3_600_000;
/** A chave do KV com a hora da rodada parada que já foi alertada. */
const ALERTADA = "rodada-parada-alertada";

/** O pedaço do KV que a sentinela usa. */
export interface EstadoDaSentinela {
  get(chave: string): Promise<string | null>;
  put(chave: string, valor: string): Promise<void>;
  delete(chave: string): Promise<void>;
}

/** O ambiente do Worker: as variáveis de `sentinela.jsonc`, o segredo do tópico e o KV. */
interface AmbienteDaSentinela {
  /** As raízes públicas dos arquivos ao vivo, com a barra no fim, separadas por espaço: a principal e a do plano B. */
  ENDERECOS: string;
  /** O tópico do ntfy, gravado com `wrangler secret put`: quem o sabe publica nele. */
  NTFY_TOPICO: string;
  ESTADO: EstadoDaSentinela;
}

const hora = (ms: number) => new Date(ms).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
const minutos = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}`;
};

/** A conferência de um minuto: lê os endereços, compara com o que já foi alertado e avisa se mudou. */
export async function conferirARodadaPublica(opcoes: {
  enderecos: string[];
  buscar: Buscar;
  /** A hora em ms, quando o `Date` não vem. */
  agora: () => number;
  estado: EstadoDaSentinela;
  avisar: (mensagem: MensagemDoNtfy) => Promise<void>;
}): Promise<void> {
  const { buscar, estado, avisar } = opcoes;
  // Um endereço que não responde fica de fora: a sentinela só fala do que leu.
  const lidas = await Promise.all(opcoes.enderecos.map((endereco) => lerRodadaPublica(buscar, endereco).catch(() => null)));
  const maisNova = lidas.reduce((a, b) => (b && (!a || Date.parse(b.rodada.rodada) > Date.parse(a.rodada.rodada)) ? b : a), null);
  if (!maisNova) return;
  const rodada = Date.parse(maisNova.rodada.rodada);
  const idade = (maisNova.data ?? opcoes.agora()) - rodada;
  const alertada = await estado.get(ALERTADA);
  const parada = maisNova.rodada.fase !== "encerrada" && idade > PARADA && idade <= OUTRA_NOITE;
  if (parada && alertada !== maisNova.rodada.rodada) {
    await avisar({
      titulo: "Apurador: alerta crítico",
      texto: `Sentinela: arquivo de rodada público parado há ${minutos(idade)}, desde ${hora(rodada)}`,
      prioridade: "urgente",
    });
    await estado.put(ALERTADA, maisNova.rodada.rodada);
  } else if (!parada && alertada !== null) {
    if (idade <= PARADA)
      await avisar({ titulo: "Apurador: terminou", texto: `Sentinela: arquivo de rodada público andando de novo, às ${hora(rodada)}`, prioridade: "baixa" });
    await estado.delete(ALERTADA);
  }
}

export default {
  async scheduled(_controle: unknown, ambiente: AmbienteDaSentinela, contexto: { waitUntil(promessa: Promise<unknown>): void }) {
    contexto.waitUntil(
      conferirARodadaPublica({
        enderecos: ambiente.ENDERECOS.split(/\s+/).filter(Boolean),
        buscar: fetch,
        agora: Date.now,
        estado: ambiente.ESTADO,
        avisar: enviarAoNtfy({ topico: ambiente.NTFY_TOPICO, buscar: fetch }),
      }),
    );
  },
};
