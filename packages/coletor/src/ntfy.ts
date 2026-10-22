import type { Buscar } from "./coletor.ts";

// O canal dos alertas ao celular (Operação na noite, decisão 8): o ntfy, gratuito e sem conta. O alerta sai por HTTPS de
// saída, num tópico com nome impossível de adivinhar, guardado no `.env` do coletor, fora do Git: quem sabe o nome lê e
// publica no tópico. Vai como JSON na raiz do servidor, e não nos cabeçalhos, que não levam o "í" de "crítico" sem
// codificação. O módulo não usa nada do Node: a sentinela, um Worker, manda pelo mesmo caminho.

/** O servidor público do ntfy. */
const SERVIDOR_DO_NTFY = "https://ntfy.sh";

/** Uma mensagem ao tópico: só o estado ("Coletor sem rodada completa há 75 s"). */
export interface MensagemDoNtfy {
  titulo: string;
  texto: string;
  /** "urgente" toca e vibra mesmo no modo silencioso do app; "baixa" chega sem som. */
  prioridade: "urgente" | "baixa";
}

/** As prioridades do ntfy, de 1 a 5. */
const PRIORIDADES = { urgente: 5, baixa: 2 } as const;

/** O tempo máximo de um envio: um ntfy lento não pode segurar o coletor nem a sentinela. */
const TEMPO_DO_ENVIO = 10_000;

/** Manda mensagens ao tópico; rejeita se o ntfy não aceitar. */
export function enviarAoNtfy(opcoes: { topico: string; buscar: Buscar }): (mensagem: MensagemDoNtfy) => Promise<void> {
  const { topico, buscar } = opcoes;
  return async ({ titulo, texto, prioridade }) => {
    const resposta = await buscar(SERVIDOR_DO_NTFY, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic: topico, title: titulo, message: texto, priority: PRIORIDADES[prioridade] }),
      signal: AbortSignal.timeout(TEMPO_DO_ENVIO),
    });
    await resposta.body?.cancel();
    if (!resposta.ok) throw new Error(`o ntfy respondeu ${resposta.status}`);
  };
}
