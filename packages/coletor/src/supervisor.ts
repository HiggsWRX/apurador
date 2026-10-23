// O supervisor (Operação na noite, decisões 3 e 15; Ensaio geral, decisão 20): roda o coletor e o põe de volta 5 s
// depois de ele cair, e o coletor retoma do estado em disco. Derrubado, ele volta em menos de 1 min. É o supervisor que
// a tarefa do Agendador do Windows inicia ao ligar o computador, sem login (`agendador/criar-tarefa.ps1`). O coletor
// que termina sozinho (código 0: o `--minutos`, o Ctrl+C, o fim da noite) não volta.

/** Quanto o supervisor espera para pôr o coletor de volta: o bastante para o Windows soltar os arquivos dele. */
export const VOLTA_DO_COLETOR = 5_000;

/** Um coletor em execução. */
export interface ProcessoDoColetor {
  /** O código de saída, quando ele termina; `null` se o Windows o derrubou. */
  saida: Promise<number | null>;
}

/** Roda o coletor até ele terminar sozinho ou o dono parar o supervisor, pondo-o de volta a cada queda. */
export async function supervisionar(opcoes: {
  iniciar: () => ProcessoDoColetor;
  esperar: (ms: number) => Promise<void>;
  registrar: (linha: string) => void;
  /** Se o dono parou o supervisor (Ctrl+C): o coletor que cai depois disso não volta. */
  parado: () => boolean;
  /** A hora em ms. */
  agora: () => number;
}): Promise<void> {
  const { iniciar, esperar, registrar, parado, agora } = opcoes;
  for (let vez = 1; ; vez++) {
    const inicio = agora();
    const codigo = await iniciar().saida;
    const durou = Math.round((agora() - inicio) / 1000);
    if (codigo === 0 || parado()) {
      registrar(`Supervisor: o coletor terminou (código ${codigo}) depois de ${durou} s.`);
      return;
    }
    registrar(`Supervisor: o coletor caiu (código ${codigo}) depois de ${durou} s, na ${vez}ª vez; volta em ${VOLTA_DO_COLETOR / 1000} s, do estado em disco.`);
    await esperar(VOLTA_DO_COLETOR);
    if (parado()) return;
  }
}
