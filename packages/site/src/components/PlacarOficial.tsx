import type { ArquivoDeRodada, ArquivoDoLugar } from "@apurador/coletor";
import type { ComponentChildren } from "preact";
import { formatarPctComCasas, formatarVotos } from "../lib/formato";
import { corDoPartido } from "../lib/identidade";
import { NumeroAoVivo } from "./NumeroAoVivo";

// O cartão do placar oficial (Telas da página de lugar, decisão 2): os números do TSE sem alteração, com as duas casas
// do TSE, numa moldura sólida com o selo. Antes das 17h, ele só diz quando a divulgação começa.

interface Props {
  /** Antes das 17h, o cartão só diz quando a divulgação começa. */
  antesDas17h: boolean;
  candidatos: ArquivoDeRodada["candidatos"] | null;
  /** Os dados do TSE do lugar, ou `null` antes das 17h e enquanto o arquivo do lugar não chega. */
  tse: ArquivoDoLugar["tse"] | null;
  fotos: Record<string, string>;
  /** O indicador ao vivo, que fica no cartão. */
  indicador: ComponentChildren;
  /** Se a última leitura mudou o número (`percentual-0`, `votos-1`, `secoes`), para ele piscar. */
  mudou: (numero: string) => boolean;
}

export function PlacarOficial({ antesDas17h, candidatos, tse, fotos, indicador, mudou }: Props) {
  return (
    <section class="cartao placar-oficial" data-placar-oficial aria-labelledby="placar-oficial-selo">
      <header class="placar-topo">
        <span class="selo" id="placar-oficial-selo">
          Placar oficial · TSE
        </span>
        {indicador}
      </header>
      {antesDas17h ? (
        <p class="placar-vazio">A divulgação começa às 17h</p>
      ) : !candidatos || !tse ? (
        <p class="placar-vazio">Aguardando os primeiros dados do TSE</p>
      ) : (
        <>
          <div class="placar-candidatos">
            {candidatos.map((c, i) => (
              <div class="placar-candidato" data-cor={corDoPartido(c.partido)} key={c.numero}>
                <Foto url={fotos[c.sequencial]} nome={c.nome} />
                <span class="placar-nome">
                  {c.nome} <small>{c.partido}</small>
                </span>
                <NumeroAoVivo forte classe="placar-pct" valor={formatarPctComCasas(tse.percentuais[i] ?? 0, 2)} mudou={mudou(`percentual-${i}`)} />
                <span class="placar-votos">
                  <NumeroAoVivo valor={formatarVotos(tse.votos[i] ?? 0)} mudou={mudou(`votos-${i}`)} /> votos
                </span>
              </div>
            ))}
          </div>
          <div class="barra-de-secoes" aria-hidden="true">
            <i style={{ width: `${tse.secoes.percentual}%` }} />
          </div>
          <p class="placar-secoes">
            <NumeroAoVivo valor={formatarPctComCasas(tse.secoes.percentual, 2)} mudou={mudou("secoes")} /> das seções totalizadas{" "}
            <small>
              ({formatarVotos(tse.secoes.totalizadas)} de {formatarVotos(tse.secoes.total)})
            </small>
          </p>
          {tse.totalizacao && <p class="placar-hora">Última totalização às {tse.totalizacao.slice(11)}</p>}
          <p class="fonte">Fonte: TSE, sem alteração (CC-BY)</p>
        </>
      )}
    </section>
  );
}

/** A foto oficial do TSE, sem alteração, ou as iniciais quando o site não tem a foto daquele sequencial. */
function Foto({ url, nome }: { url: string | undefined; nome: string }) {
  if (!url) {
    const iniciais = nome
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0])
      .join("");
    return (
      <span class="placar-foto sem-foto" aria-hidden="true">
        {iniciais}
      </span>
    );
  }
  return <img class="placar-foto" src={url} alt={`Foto oficial de ${nome}, do TSE`} width={64} height={90} />;
}
