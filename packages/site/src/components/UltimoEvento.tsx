import type { QuadroAoVivo } from "../lib/leitor-ao-vivo";
import { eventosDoLugar, horaDoEvento } from "../lib/narracao";

// O último evento sob a manchete (Telas da página de lugar, decisão 1; Narração da noite, decisão 10): sempre o do
// próprio lugar, nunca o de outro, com o link para a coluna da narração.

/** A linha com o evento mais novo do lugar, ou nada antes do primeiro. */
export function UltimoEvento({ quadro }: { quadro: QuadroAoVivo }) {
  const [ultimo] = eventosDoLugar(quadro);
  if (!ultimo || quadro.fase === "antes-das-17h") return null;
  return (
    <p class="ultimo-evento" data-ultimo-evento>
      <time>{horaDoEvento(ultimo)}</time> {ultimo.texto} <a href="#narracao">Narração →</a>
    </p>
  );
}
