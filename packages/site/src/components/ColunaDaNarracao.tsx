import type { EventoDaNarracao } from "@apurador/coletor";
import { useState } from "preact/hooks";
import { emPlanoZero } from "../lib/chaves-ao-vivo";
import { horaDoTse } from "../lib/formato";
import type { QuadroAoVivo } from "../lib/leitor-ao-vivo";
import { narracaoDaPagina } from "../lib/narracao";

// A coluna da narração da noite (Telas da página de lugar, decisões 1 e 7; Narração da noite, decisões 1 e 7): o evento
// mais novo primeiro, com a hora e o número que bate com o da curva. No computador, a lista inteira fica na coluna fixa
// à direita; no celular, ela vem logo depois do bloco ao vivo (a ordem está no CSS), com os 5 últimos e "Ver toda a
// narração". Os eventos do Brasil nas outras páginas vêm marcados como "Brasil", sem número.

/** Quantos eventos o celular mostra antes de "Ver toda a narração": o resumo. */
const EVENTOS_NO_RESUMO = 5;

/** A coluna da narração do lugar para o quadro, ou nada no plano zero, quando nenhum dado ao vivo vai ao ar. */
export function ColunaDaNarracao({ quadro, id }: { quadro: QuadroAoVivo; id: string }) {
  const [toda, setToda] = useState(false);
  if (emPlanoZero(quadro)) return null;
  const eventos = narracaoDaPagina(quadro);
  return (
    <aside class="cartao narracao" id="narracao" aria-labelledby="narracao-titulo" data-toda={toda || undefined}>
      <h2 id="narracao-titulo">Narração da noite</h2>
      {eventos === null ? (
        <p class="nota">A narração começa às 17h, com as primeiras seções totalizadas.</p>
      ) : eventos.length === 0 ? (
        <p class="nota">A narração começa com as primeiras seções totalizadas.</p>
      ) : (
        <>
          <ol class="lista-da-narracao">
            {eventos.map((e, i) => (
              <ItemDaNarracao key={`${e.lugar} ${e.tipo} ${e.quando} ${e.marco ?? ""}`} evento={e} id={id} foraDoResumo={i >= EVENTOS_NO_RESUMO} />
            ))}
          </ol>
          {eventos.length > EVENTOS_NO_RESUMO && (
            <button type="button" class="ver-toda" data-ver-toda aria-expanded={toda} onClick={() => setToda(!toda)}>
              {toda ? "Mostrar só os últimos" : `Ver toda a narração (${eventos.length})`}
            </button>
          )}
        </>
      )}
      <p class="fonte">Narração do Apurador com dados do TSE</p>
    </aside>
  );
}

function ItemDaNarracao({ evento, id, foraDoResumo }: { evento: EventoDaNarracao; id: string; foraDoResumo: boolean }) {
  const doBrasil = evento.lugar === "BR" && id !== "BR";
  return (
    <li data-evento data-tipo={evento.tipo} data-fora-do-resumo={foraDoResumo || undefined}>
      {doBrasil ? (
        <span class="evento-marca">Brasil</span>
      ) : evento.numero !== undefined && evento.lugar === id ? (
        <span class="evento-numero">{evento.numero}</span>
      ) : (
        <span class="evento-sem-numero" aria-hidden="true" />
      )}
      <time dateTime={`${evento.quando.replace(" ", "T")}-03:00`}>{horaDoTse(evento.quando, false)}</time>
      <p>{evento.texto}</p>
    </li>
  );
}
