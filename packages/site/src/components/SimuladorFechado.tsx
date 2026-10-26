import type { Fechamento } from "../lib/simulador-ao-vivo";

// A tela do simulador fechada (Simulador "e se", decisão 5): antes das 17h, com a chave de antes das 17h desligada; fora
// do ar, pelas chaves da noite; e no fim, com a indicação do TSE ou a totalização final. Sempre com o link de volta.

const FRASES: Record<Exclude<Fechamento["tipo"], "indicacao">, string> = {
  "abre-as-17h": "O simulador abre às 17h, com a apuração.",
  "fora-do-ar": "O simulador está fora do ar agora.",
  encerrada: "A apuração terminou.",
};

/** O aviso da tela fechada, no lugar do simulador. */
export function SimuladorFechado({ fechamento }: { fechamento: Fechamento }) {
  return (
    <section class="cartao sim-aviso" data-simulador-fechado={fechamento.tipo}>
      <p>
        {fechamento.tipo === "indicacao" ? `O TSE indica ${fechamento.eleito} eleito. O voto que falta não muda mais o resultado.` : FRASES[fechamento.tipo]}
      </p>
      <p>
        <a href="/">Voltar à página do Brasil</a>
      </p>
    </section>
  );
}
