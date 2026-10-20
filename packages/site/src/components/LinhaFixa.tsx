import type { ArquivoDeRodada, ArquivoDoLugar } from "@apurador/coletor";
import type { ComponentChildren } from "preact";
import { formatarPctComCasas } from "../lib/formato";
import { corDoPartido, nomeCurto } from "../lib/identidade";
import { NumeroAoVivo } from "./NumeroAoVivo";

// A linha fixa (Telas da página de lugar, decisão 2): quando o placar oficial sai da tela, uma linha fina no topo mostra
// só os números oficiais, com as duas casas do TSE, nunca a projeção. No celular, o indicador fica só com o ponto e o anel.

interface Props {
  candidatos: ArquivoDeRodada["candidatos"];
  tse: ArquivoDoLugar["tse"];
  escondida: boolean;
  indicador: ComponentChildren;
  mudou: (numero: string) => boolean;
}

export function LinhaFixa({ candidatos, tse, escondida, indicador, mudou }: Props) {
  return (
    <div class="linha-fixa" data-linha-fixa hidden={escondida}>
      <p class="linha-fixa-numeros">
        {candidatos.map((c, i) => (
          <span data-cor={corDoPartido(c.partido)} key={c.numero}>
            {nomeCurto(c.nome)} <NumeroAoVivo forte valor={formatarPctComCasas(tse.percentuais[i] ?? 0, 2)} mudou={mudou(`percentual-${i}`)} />
          </span>
        ))}
        <span>
          <NumeroAoVivo valor={formatarPctComCasas(tse.secoes.percentual, 2)} mudou={mudou("secoes")} /> das seções · TSE
        </span>
      </p>
      {indicador}
    </div>
  );
}
