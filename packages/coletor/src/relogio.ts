// O relógio do coletor: a hora real, em milissegundos, e as esperas entre as rodadas e entre os pedidos ao TSE.
// Entra por parâmetro, para o replay rodar as mesmas rodadas com um relógio simulado, sem esperar de verdade.

export interface RelogioDoColetor {
  agora(): number;
  esperar(ms: number): Promise<void>;
}

export const relogioReal: RelogioDoColetor = {
  agora: () => Date.now(),
  esperar: (ms) => new Promise((pronto) => setTimeout(pronto, ms)),
};

/** O relógio do replay: começa em `inicio` e só anda nas esperas, na hora, sem esperar de verdade. */
export function relogioSimulado(inicio: number): RelogioDoColetor {
  let agora = inicio;
  return {
    agora: () => agora,
    esperar: async (ms) => {
      agora += Math.max(0, ms);
    },
  };
}
