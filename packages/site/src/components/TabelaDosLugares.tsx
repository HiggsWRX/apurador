import { formatarPctComCasas, oQueFaltaPara100 } from "../lib/formato";
import { corDoPartido, nomeCurto } from "../lib/identidade";
import {
  ORDEM_INICIAL,
  ordenarLinhas,
  proximaOrdem,
  type ColunaDaTabela,
  type ConteudoDaTabela,
  type LinhaDaTabela,
  type OrdemDaTabela,
} from "../lib/tabela-dos-lugares";

// A tabela de lugares do cartão do mapa (Telas da página de lugar, decisão 8): cada lugar com o link para a página dele e,
// em cada número, quem está à frente, na cor dele. Os números do TSE vão com as duas casas dele; o placar entre
// finalistas do 1º turno e a projeção, cálculos do Apurador, com uma. Cada cabeçalho ordena a tabela, e o mesmo
// cabeçalho de novo inverte. Sem estado: a ilha do cartão guarda a ordem.

interface Props {
  tabela: ConteudoDaTabela;
  ordem: OrdemDaTabela;
  aoOrdenar: (ordem: OrdemDaTabela) => void;
  /** O id do lugar da página, que a tabela destaca: num município, ele entre os da UF. */
  atual?: string;
}

const TITULOS: Record<Exclude<ColunaDaTabela, "nome">, string> = {
  primeiroTurno: "1º turno de 2026",
  secoes: "Seções",
  placar: "Placar",
  projecao: "Projeção",
};

/** A tabela de lugares, na ordem pedida. */
export function TabelaDosLugares({ tabela, ordem, aoOrdenar, atual }: Props) {
  const efetiva = tabela.colunas.includes(ordem.coluna) ? ordem : ORDEM_INICIAL;
  const [primeiro, segundo] = tabela.candidatos as [ConteudoDaTabela["candidatos"][number], ConteudoDaTabela["candidatos"][number]];

  /** Quem está à frente, na cor dele, com o % dele; empatados, "Empate". */
  const aFrente = (pcts: [number, number], casas: 1 | 2) => {
    const [c, pct] = pcts[0] > pcts[1] ? [primeiro, pcts[0]] : pcts[1] > pcts[0] ? [segundo, pcts[1]] : [null, pcts[0]];
    return (
      <>
        {c ? <span data-cor={corDoPartido(c.partido)}>{nomeCurto(c.nome)}</span> : "Empate"} {formatarPctComCasas(pct, casas)}
      </>
    );
  };
  /** Um % do 1º candidato com uma casa, repartido entre os dois como a página escreve um cálculo do Apurador. */
  const doPrimeiro = (pct: number | null) => (pct === null ? "—" : aFrente([pct, oQueFaltaPara100(pct)], 1));
  const celula = (l: LinhaDaTabela, coluna: Exclude<ColunaDaTabela, "nome">) => {
    if (coluna === "secoes") return l.secoes === null ? "—" : formatarPctComCasas(l.secoes, 2);
    if (coluna === "placar") return l.placar ? aFrente(l.placar, 2) : "—";
    return doPrimeiro(l[coluna]);
  };
  const numeros = tabela.colunas.filter((c): c is Exclude<ColunaDaTabela, "nome"> => c !== "nome");

  return (
    <>
      <div class="tabela-dos-lugares">
        <table>
          <thead>
            <tr>
              {tabela.colunas.map((c) => (
                <th key={c} scope="col" aria-sort={efetiva.coluna !== c ? "none" : efetiva.decrescente ? "descending" : "ascending"}>
                  <button type="button" onClick={() => aoOrdenar(proximaOrdem(efetiva, c))}>
                    {c === "nome" ? tabela.deQue : TITULOS[c]}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenarLinhas(tabela, efetiva).map((l) => (
              <tr key={l.id} {...(l.id === atual ? { "aria-current": "page" } : {})}>
                <th scope="row">
                  <a href={l.caminho}>{l.nome}</a>
                </th>
                {numeros.map((c) => (
                  <td key={c}>{celula(l, c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tabela.colunas.includes("primeiroTurno") ? (
        <p class="fonte">Placar entre finalistas no 1º turno de 2026: Cálculo do Apurador com dados do TSE</p>
      ) : (
        // A camada analítica leva a atribuição com ou sem a projeção (Segunda consulta jurídica, comentário nas Telas).
        <>
          <p class="fonte">Seções e placar: TSE, sem alteração (CC-BY)</p>
          <p class="fonte">{tabela.colunas.includes("projecao") ? "Projeção: " : ""}Cálculo do Apurador com dados do TSE</p>
        </>
      )}
    </>
  );
}
