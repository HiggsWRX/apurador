// O relógio do TSE falso. Ele tem duas horas: a real, do CDN, que conta o limite de pedidos por segundo e o
// tempo de um bloqueio; e o instante da noite (segundos desde 00:00 do dia da eleição, em Brasília), que diz
// que estado da apuração os arquivos mostram e vai no cabeçalho `Date`.

export interface Momento {
  /** Milissegundos do relógio do CDN. */
  real: number;
  /** Segundos desde 00:00 do dia da eleição, em hora de Brasília. */
  instante: number;
}

export interface Relogio {
  agora(): Momento;
}

/**
 * O relógio da velocidade máxima, para o replay dentro do processo: quem roda a noite o põe em qualquer
 * instante, sem esperar. A hora real anda junto com a da noite (um segundo da noite, mil milissegundos).
 */
export interface RelogioManual extends Relogio {
  ajustar(instante: number): void;
  avancar(segundos: number): void;
}

export function relogioManual(instante: number): RelogioManual {
  let agora = instante;
  return {
    agora: () => ({ real: agora * 1000, instante: agora }),
    ajustar(i) {
      agora = i;
    },
    avancar(segundos) {
      agora += segundos;
    },
  };
}

/** Um trecho do ritmo: a partir de `desde` (instante da noite), cada segundo real vale `velocidade` segundos da noite. */
export interface Trecho {
  desde: number;
  velocidade: number;
}

const hora = (h: number, m: number) => h * 3600 + m * 60;

/** O ritmo do ensaio geral: 3x das 16:50 às 20:30 e 30x daí até a totalização final. */
export const RITMO_DO_ENSAIO: Trecho[] = [
  { desde: hora(16, 50), velocidade: 3 },
  { desde: hora(20, 30), velocidade: 30 },
];

/**
 * O relógio do ensaio geral, que anda sozinho com a hora real: no instante real `partida`, a noite está no
 * começo do primeiro trecho do ritmo, e daí acelera trecho a trecho.
 */
export function relogioAcelerado(opcoes: { partida: number; ritmo?: Trecho[]; agoraReal?: () => number }): Relogio {
  const ritmo = opcoes.ritmo ?? RITMO_DO_ENSAIO;
  const agoraReal = opcoes.agoraReal ?? Date.now;
  if (ritmo.length === 0) throw new Error("O ritmo do relógio precisa de pelo menos um trecho");
  return {
    agora() {
      const real = agoraReal();
      let segundos = Math.max(0, (real - opcoes.partida) / 1000);
      let instante = ritmo[0]!.desde;
      for (const [i, trecho] of ritmo.entries()) {
        const proximo = ritmo[i + 1];
        // Quanto tempo real o trecho dura até o próximo começar.
        const duracao = proximo ? (proximo.desde - trecho.desde) / trecho.velocidade : Infinity;
        const usado = Math.min(segundos, duracao);
        instante = trecho.desde + usado * trecho.velocidade;
        segundos -= usado;
        if (segundos <= 0) break;
      }
      return { real, instante: Math.floor(instante) };
    },
  };
}
