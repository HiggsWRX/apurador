import type { Buscar } from "../src/coletor.ts";
import { duracao, horaDeBrasilia, TITULO_DO_ALERTA_CRITICO } from "../src/formatos.ts";
import { enviarAoNtfy, type MensagemDoNtfy } from "../src/ntfy.ts";
import { lerRodadaPublica } from "../src/visto-de-fora.ts";

// A sentinela (Operação na noite, decisão 8): um Worker com Cron Trigger a cada minuto, fora do computador do dono, que
// lê o arquivo de rodada público e manda um alerta pelo ntfy se ele passar 3 min parado. É o único alerta que funciona
// com o computador ou a internet do dono fora, e, como os outros, não age sozinho.
//
// Ela lê os dois endereços, o principal e o do plano B, e fica com a rodada mais nova, como a página: depois do comando
// do plano B, o principal para de andar, e o site não. A idade é a do `Date` da resposta, como a página a mede. Com a
// fase "encerrada", o coletor parou de propósito, e ela não alerta; uma rodada de mais de 6 h é de outra noite (ou de um
// ensaio), e ela fica quieta, para poder ficar ligada antes e depois da noite. Sem arquivo nenhum (404 nos dois), não há
// noite; com os dois endereços dando erro por mais de 3 min, o visitante também não lê nada, e ela alerta.
//
// Um Worker não guarda nada entre duas execuções: o que já foi alertado fica no KV, gravado só quando muda. Assim o mesmo
// problema alerta uma vez, e o dono fica sabendo, sem som, quando ele acaba.

/** Parado (ou ilegível) há mais que isso, alerta. */
const PARADA = 3 * 60_000;
/** Uma rodada mais velha que isso é de outra noite. */
const OUTRA_NOITE = 6 * 3_600_000;
/** A chave do KV com o que a sentinela já viu. */
const CHAVE = "sentinela";

/** O que a sentinela guarda entre duas execuções. */
interface Visto {
  /** A hora da rodada parada que já foi alertada (ISO). */
  parada?: string;
  /** Desde quando nenhum endereço deu o arquivo de rodada e algum deu erro (ms), e se isso já foi alertado. */
  ilegivel?: { desde: number; alertado: boolean };
}

/** O pedaço do KV que a sentinela usa. */
export interface EstadoDaSentinela {
  get(chave: string): Promise<string | null>;
  put(chave: string, valor: string): Promise<void>;
}

/** O ambiente do Worker: as variáveis de `sentinela.jsonc`, o segredo do tópico e o KV. */
interface AmbienteDaSentinela {
  /** As raízes públicas dos arquivos ao vivo, com a barra no fim, separadas por espaço: a principal e a do plano B. */
  ENDERECOS: string;
  /** O tópico do ntfy, gravado com `wrangler secret put`: quem o sabe publica nele. */
  NTFY_TOPICO: string;
  ESTADO: EstadoDaSentinela;
}

/** A conferência de um minuto: lê os endereços, compara com o que já foi alertado e alerta se mudou. */
export async function conferirARodadaPublica(opcoes: {
  enderecos: string[];
  buscar: Buscar;
  /** A hora em ms, quando o `Date` não vem. */
  agora: () => number;
  estado: EstadoDaSentinela;
  alertar: (mensagem: MensagemDoNtfy) => Promise<void>;
}): Promise<void> {
  const { buscar, estado, alertar } = opcoes;
  const lidas = await Promise.all(
    opcoes.enderecos.map((endereco) =>
      lerRodadaPublica(buscar, endereco).then(
        (lida) => ({ lida, erro: null }),
        (erro: Error) => ({ lida: null, erro: erro.message }),
      ),
    ),
  );
  const guardado = await estado.get(CHAVE);
  const antes: Visto = guardado ? (JSON.parse(guardado) as Visto) : {};
  const visto: Visto = { ...antes };
  const maisNova = lidas.reduce<(typeof lidas)[number]["lida"]>(
    (a, { lida: b }) => (b && (!a || Date.parse(b.rodada.rodada) > Date.parse(a.rodada.rodada)) ? b : a),
    null,
  );

  if (!maisNova) {
    const erros = lidas.flatMap((l) => (l.erro ? [l.erro] : []));
    if (erros.length === 0) delete visto.ilegivel;
    else {
      visto.ilegivel ??= { desde: opcoes.agora(), alertado: false };
      const tempo = opcoes.agora() - visto.ilegivel.desde;
      if (tempo > PARADA && !visto.ilegivel.alertado) {
        await alertar({
          titulo: TITULO_DO_ALERTA_CRITICO,
          texto: `Sentinela: arquivo de rodada público sem leitura há ${duracao(tempo)} (${erros.join("; ")})`,
          prioridade: "urgente",
        });
        visto.ilegivel = { ...visto.ilegivel, alertado: true };
      }
    }
  } else {
    if (visto.ilegivel?.alertado)
      await alertar({ titulo: "Apurador: terminou", texto: "Sentinela: arquivo de rodada público lido de novo", prioridade: "baixa" });
    delete visto.ilegivel;
    const rodada = Date.parse(maisNova.rodada.rodada);
    const idade = (maisNova.data ?? opcoes.agora()) - rodada;
    const parada = maisNova.rodada.fase !== "encerrada" && idade > PARADA && idade <= OUTRA_NOITE;
    if (parada && visto.parada !== maisNova.rodada.rodada) {
      await alertar({
        titulo: TITULO_DO_ALERTA_CRITICO,
        texto: `Sentinela: arquivo de rodada público parado há ${duracao(idade)}, desde ${horaDeBrasilia(rodada)}`,
        prioridade: "urgente",
      });
      visto.parada = maisNova.rodada.rodada;
    } else if (!parada && visto.parada !== undefined) {
      if (idade <= PARADA)
        await alertar({
          titulo: "Apurador: terminou",
          texto: `Sentinela: arquivo de rodada público andando de novo, às ${horaDeBrasilia(rodada)}`,
          prioridade: "baixa",
        });
      delete visto.parada;
    }
  }
  if (JSON.stringify(visto) !== JSON.stringify(antes)) await estado.put(CHAVE, JSON.stringify(visto));
}

export default {
  async scheduled(_controle: unknown, ambiente: AmbienteDaSentinela, contexto: { waitUntil(promessa: Promise<unknown>): void }) {
    contexto.waitUntil(
      conferirARodadaPublica({
        enderecos: ambiente.ENDERECOS.split(/\s+/).filter(Boolean),
        buscar: fetch,
        agora: Date.now,
        estado: ambiente.ESTADO,
        alertar: enviarAoNtfy({ topico: ambiente.NTFY_TOPICO, buscar: fetch }),
      }),
    );
  },
};
