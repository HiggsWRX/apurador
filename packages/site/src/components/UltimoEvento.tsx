import type { IdDaBase } from "../lib/bases-da-projecao";
import { horaDoTse } from "../lib/formato";
import type { QuadroAoVivo } from "../lib/leitor-ao-vivo";
import { eventosDoLugar, naBaseEscolhida } from "../lib/narracao";

// O último evento sob a manchete (Telas da página de lugar, decisão 1; Narração da noite, decisão 10): sempre o do
// próprio lugar, nunca o de outro, com o link para a coluna da narração. Um preditivo é o da base escolhida.

/** A linha com o evento mais novo do lugar, ou nada antes do primeiro. */
export function UltimoEvento({ quadro, base }: { quadro: QuadroAoVivo; base: IdDaBase }) {
  const [ultimo] = naBaseEscolhida(eventosDoLugar(quadro), quadro, base);
  if (!ultimo || quadro.fase === "antes-das-17h") return null;
  return (
    <p class="ultimo-evento" data-ultimo-evento>
      <time>{horaDoTse(ultimo.quando, false)}</time> {ultimo.texto} <a href="#narracao">Narração →</a>
    </p>
  );
}
