import type { Constantes } from "@apurador/modelo";
import type { Calibracao, LinhaMomentoAMomento, MedidaDaNoite } from "./calibracao.ts";

// O registro da calibração (Ensaio geral, decisão 26): a seção "Resultados" do docs/calibracao.md, abaixo dos
// candidatos e da regra registrados antes de rodar, e os CSVs de docs/calibracao/ que a página de metodologia oferece
// para baixar. No registro, os números vão como no resto do documento, com vírgula; nos CSVs, com ponto, como nos
// outros CSVs do repositório.

/** Um número com vírgula, como no texto. */
const br = (x: number, casas: number) => x.toFixed(casas).replace(".", ",");
/** Uma fração em %, com vírgula. */
const pctBr = (x: number, casas: number) => `${br(100 * x, casas)}%`;
const milhar = (x: number) => x.toLocaleString("pt-BR");
const ORDENS: Record<string, string> = { mistura: '"mistura"', "primeiro-turno": '"1º turno"', "ritmo-da-noite": '"ritmo da noite"' };

/** Uma tabela em Markdown. */
const tabela = (cabecalho: string[], linhas: string[][]) => [`| ${cabecalho.join(" | ")} |`, `|${cabecalho.map(() => "---").join("|")}|`, ...linhas.map((l) => `| ${l.join(" | ")} |`)].join("\n");

/** A seção "Resultados" do registro, com a data em que a calibração rodou (`DD/MM/AAAA`). */
export function resultadosDaCalibracao(c: Calibracao, provisorias: Constantes, data: string): string {
  const e = c.constantes;
  const p1 = c.passo1;
  const passam1 = p1.candidatos.filter((x) => x.passaCobertura && x.passaChance).sort((a, b) => a.erroMedio - b.erroMedio);
  const escolhido1 = p1.candidatos.find((x) => x.candidato === p1.escolhido);
  const provisorio1 = p1.candidatos.find(
    (x) => x.candidato.incertezaRegional === provisorias.incertezaRegional && x.candidato.incertezaNacional === provisorias.incertezaNacional && x.candidato.pesoDoMunicipio === provisorias.pesoDoMunicipio,
  );
  const porNoite = (rotulo: string, medidas: MedidaDaNoite[]) =>
    medidas.map((m, i) => [rotulo, c.noites[i]!.nome, pctBr(m.cobertura, 1), pctBr(m.maiorChanceDeQuemPerdeu, 1), br(m.erroMedio, 3), br(m.margemMedia, 2)]);
  const incertezas = (x: (typeof p1.candidatos)[number]) => [br(x.candidato.incertezaRegional, 1), br(x.candidato.incertezaNacional, 1), milhar(x.candidato.pesoDoMunicipio)];

  return [
    "## Resultados",
    "",
    `Rodada em ${data} com \`npm run calibracao\`, sobre o código e os dados deste commit. Os números completos estão nos CSVs de \`docs/calibracao/\`.`,
    "",
    "### Constantes escolhidas",
    "",
    tabela(
      ["Constante", "Provisória", "Escolhida"],
      [
        ["Incerteza regional", `${br(provisorias.incertezaRegional, 1)} p.p.`, `${br(e.incertezaRegional, 1)} p.p.`],
        ["Incerteza nacional", `${br(provisorias.incertezaNacional, 1)} p.p.`, `${br(e.incertezaNacional, 1)} p.p.`],
        ["Peso do próprio município", `${milhar(provisorias.pesoDoMunicipio)} votos`, `${milhar(e.pesoDoMunicipio)} votos`],
        ["Ordem de chegada", ORDENS[provisorias.ordemDeChegada]!, ORDENS[e.ordemDeChegada]!],
        ["K", `${br(provisorias.secoesDasPesquisas, 2)}%`, `${br(e.secoesDasPesquisas, 2)}%`],
        ['Limite de "sem sinal de virada"', pctBr(provisorias.sinalDeVirada.possivel, 0), pctBr(e.sinalDeVirada.possivel, 0)],
        ["Zona", provisorias.zona ? "sim" : "não", e.zona ? "sim" : "não"],
      ],
    ),
    "",
    c.semEscolha.length === 0
      ? "Todos os passos escolheram."
      : `**Sem escolha**, para o dono decidir antes do congelamento: ${c.semEscolha.join("; ")}. Nesses passos, os seguintes rodaram com o valor provisório.`,
    "",
    "### 1. Incertezas e peso do próprio município",
    "",
    `Passaram ${passam1.length} dos ${p1.candidatos.length} candidatos. Ficaram de fora ${p1.candidatos.filter((x) => !x.passaCobertura).length} pela cobertura e ${p1.candidatos.filter((x) => x.passaCobertura && !x.passaChance).length} só pela chance de quem perdeu. Os dez de menor erro médio, entre os que passaram (média das três noites, momentos de 5% a 50% das seções):`,
    "",
    tabela(
      ["Regional (p.p.)", "Nacional (p.p.)", "Peso (votos)", "Erro médio (p.p.)", "Margem média (p.p.)", ""],
      passam1.slice(0, 10).map((x) => [...incertezas(x), br(x.erroMedio, 3), br(x.margemMedia, 2), x.candidato === p1.escolhido ? "escolhido" : ""]),
    ),
    "",
    "Por noite, o escolhido e o provisório:",
    "",
    tabela(
      ["Candidato", "Noite", "Cobertura", "Maior chance de quem perdeu", "Erro médio (p.p.)", "Margem média (p.p.)"],
      [...(escolhido1 ? porNoite("escolhido", escolhido1.porNoite) : []), ...(provisorio1 ? porNoite("provisório", provisorio1.porNoite) : [])],
    ),
    "",
    "### 2. Ordem de chegada",
    "",
    "O erro da curva projetada do Brasil contra a curva real, em pontos percentuais (momentos de 5% a 50% das seções):",
    "",
    tabela(
      ["Ordem", ...c.noites.map((n) => n.nome), "Média", ""],
      c.passo2.candidatos.map((x) => [ORDENS[x.candidato]!, ...x.porNoite.map((v) => br(v, 3)), br(x.erroDaCurva, 3), x.candidato === c.passo2.escolhido ? "escolhida" : ""]),
    ),
    "",
    "### 3. K",
    "",
    'O maior erro de 0,1% a 5% das seções, em pontos percentuais, na base "Apuração + pesquisas", e a menor cobertura entre os casos:',
    "",
    tabela(
      ["K", ...c.casosDoK.map((x) => x.nome), "Pior caso", "Menor cobertura", ""],
      c.passo3.candidatos.map((x) => [
        `${br(x.candidato, 2)}%`,
        ...x.porCaso.map((m) => br(m.maiorErroNoComeco, 2)),
        br(x.piorCaso, 2),
        pctBr(Math.min(...x.porCaso.map((m) => m.cobertura)), 1),
        x.candidato === c.passo3.escolhido ? "escolhido" : x.passaCobertura ? "" : "não cobre",
      ]),
    ),
    "",
    '### 4. Sinal de virada',
    "",
    'Nas oito execuções, os lugares de cima (Brasil, UFs e Exterior) com algum momento "sem sinal de virada" seguido de virada, e a maior fração dos momentos "sem sinal de virada" de municípios seguidos de virada:',
    "",
    tabela(
      ["Limite", "Lugares de cima com virada depois", "Municípios (maior fração)", ""],
      c.passo4.candidatos.map((x) => {
        const lugares = [...new Set(x.porExecucao.flatMap((m) => m.deCima.lugares))];
        const fracao = Math.max(...x.porExecucao.map((m) => (m.municipios.semSinal > 0 ? m.municipios.seguidosDeVirada / m.municipios.semSinal : 0)));
        return [pctBr(x.candidato, 0), lugares.length === 0 ? "nenhum" : lugares.join(", "), pctBr(fracao, 2), x.candidato === c.passo4.escolhido ? "escolhido" : x.passa ? "" : "falha"];
      }),
    ),
    "",
    "### 5. Zona",
    "",
    'Na base "Só apuração", com as constantes dos passos anteriores, o erro médio de 5% a 50% das seções e a cobertura com o município inteiro e com as zonas:',
    "",
    tabela(
      ["Noite", "Erro médio, município (p.p.)", "Erro médio, zonas (p.p.)", "Redução (p.p.)", "Cobertura, município", "Cobertura, zonas", ""],
      c.passo5.porNoite.map((x, i) => [
        c.noites[i]!.nome,
        br(x.municipio.erroMedio, 3),
        br(x.zona.erroMedio, 3),
        br(x.reducao, 3),
        pctBr(x.municipio.cobertura, 1),
        pctBr(x.zona.cobertura, 1),
        x.passa ? "passa" : "não passa",
      ]),
    ),
    "",
    c.passo5.escolhido ? "A zona entra." : "A zona não entra: fica o município.",
    "",
  ].join("\n");
}

/** Um número com ponto, como nos CSVs do repositório. */
const num = (x: number | null, casas = 4) => (x === null ? "" : x.toFixed(casas));
const csv = (cabecalho: string[], linhas: (string | number)[][]) => [cabecalho, ...linhas].map((l) => l.join(",")).join("\n") + "\n";

/** Os CSVs das tabelas da calibração, por nome de arquivo. As porcentagens vão de 0 a 100, e os erros e as margens em pontos percentuais. */
export function tabelasDaCalibracao(c: Calibracao): Record<string, string> {
  const noites = c.noites.map((n) => n.id);
  return {
    "constantes.csv": csv(
      ["incerteza_regional", "incerteza_nacional", "peso_do_municipio", ...noites.flatMap((n) => [`cobertura_${n}`, `maior_chance_de_quem_perdeu_${n}`, `erro_medio_${n}`, `margem_media_${n}`]), "erro_medio", "margem_media", "passa", "escolhido"],
      c.passo1.candidatos.map((x) => [
        x.candidato.incertezaRegional,
        x.candidato.incertezaNacional,
        x.candidato.pesoDoMunicipio,
        ...x.porNoite.flatMap((m) => [num(100 * m.cobertura, 2), num(100 * m.maiorChanceDeQuemPerdeu, 2), num(m.erroMedio), num(m.margemMedia)]),
        num(x.erroMedio),
        num(x.margemMedia),
        x.passaCobertura && x.passaChance ? "sim" : "não",
        x.candidato === c.passo1.escolhido ? "sim" : "não",
      ]),
    ),
    "ordem-de-chegada.csv": csv(
      ["ordem", ...noites.map((n) => `erro_da_curva_${n}`), "erro_da_curva", "escolhida"],
      c.passo2.candidatos.map((x) => [x.candidato, ...x.porNoite.map((v) => num(v)), num(x.erroDaCurva), x.candidato === c.passo2.escolhido ? "sim" : "não"]),
    ),
    "k.csv": csv(
      ["k", ...c.casosDoK.flatMap((x) => [`maior_erro_ate_5_${x.id}`, `cobertura_${x.id}`]), "pior_caso", "passa", "escolhido"],
      c.passo3.candidatos.map((x) => [
        x.candidato,
        ...x.porCaso.flatMap((m) => [num(m.maiorErroNoComeco), num(100 * m.cobertura, 2)]),
        num(x.piorCaso),
        x.passaCobertura ? "sim" : "não",
        x.candidato === c.passo3.escolhido ? "sim" : "não",
      ]),
    ),
    "zona.csv": csv(
      ["noite", "erro_medio_municipio", "erro_medio_zonas", "reducao", "cobertura_municipio", "cobertura_zonas", "passa"],
      c.passo5.porNoite.map((x, i) => [noites[i]!, num(x.municipio.erroMedio), num(x.zona.erroMedio), num(x.reducao), num(100 * x.municipio.cobertura, 2), num(100 * x.zona.cobertura, 2), x.passa ? "sim" : "não"]),
    ),
    "sinal-de-virada.csv": csv(
      ["limite", "execucao", "de_cima_sem_sinal", "de_cima_seguidos_de_virada", "lugares_de_cima_com_virada", "municipios_sem_sinal", "municipios_seguidos_de_virada", "passa", "escolhido"],
      c.passo4.candidatos.flatMap((x) =>
        x.porExecucao.map((m, i) => [
          num(100 * x.candidato, 0),
          `"${c.execucoes[i]!.nome}"`,
          m.deCima.semSinal,
          m.deCima.seguidosDeVirada,
          m.deCima.lugares.join(" "),
          m.municipios.semSinal,
          m.municipios.seguidosDeVirada,
          x.passa ? "sim" : "não",
          x.candidato === c.passo4.escolhido ? "sim" : "não",
        ]),
      ),
    ),
  };
}

/**
 * O CSV de uma noite momento a momento. Cada base tem a projeção, a margem de 95% e a chance de vitória do 1º finalista
 * da base, cujo número vai no nome das colunas, como nos `votos_<número>` do `pesquisas.csv`.
 */
export function csvMomentoAMomento({ bases, linhas }: { bases: string[]; linhas: LinhaMomentoAMomento[] }, finalista: number): string {
  return csv(
    ["hora", "secoes", `placar_${finalista}`, ...bases.flatMap((b) => [`${b}_peso_das_pesquisas`, `${b}_projecao_${finalista}`, `${b}_margem`, `${b}_chance_${finalista}`])],
    linhas.map((l) => [
      l.hora ?? "",
      num(l.secoes),
      num(l.placar === null ? null : 100 * l.placar),
      ...l.bases.flatMap((b) => [num(100 * b.pesoDasPesquisas, 2), num(100 * b.projecao), num(100 * b.margem), num(100 * b.chance, 2)]),
    ]),
  );
}
