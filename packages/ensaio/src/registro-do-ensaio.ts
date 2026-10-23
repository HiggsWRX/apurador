import type { Distribuicao, NumerosDoEnsaio } from "./conferencia-do-ensaio.ts";

// A parte do registro de cada ensaio geral que um script escreve (Ensaio geral, decisão 26): os números da conferência
// contra a meta de cada critério, com o veredito do número, e as divergências. O resto do registro (o indicador, as
// quedas, os celulares, as falhas com hora e o veredito de cada bloco, que o dono assina) segue o modelo de
// `docs/ensaios/modelo.md`. As metas são as das decisões 20, 22 e 23 do Ensaio geral e 9 do Volume de gravações na
// noite. Os números são arredondados uma vez, do valor inteiro, às casas que a tabela mostra; o veredito usa o valor
// inteiro.

const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const comCasas = (casas: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas, useGrouping: false });
const n = (x: number) => inteiro.format(x);
const umaCasa = (x: number) => comCasas(1).format(x);
const quantas = (x: number, singular: string, plural: string) => `${n(x)} ${x === 1 ? singular : plural}`;

/** Quantas divergências de cada conferência o registro lista: as outras ficam na saída inteira do script. */
const LISTADAS = 20;

const veredito = (passa: boolean) => (passa ? "passa" : "não passa");

function linhaDoAtraso(titulo: string, d: Distribuicao | null, metas: [number, number]): string {
  const meta = `mediana até ${metas[0]} s e p95 até ${metas[1]} s`;
  if (!d) return `| ${titulo} | sem leitura | ${meta} | não medido |`;
  const medido = `mediana de ${n(d.mediana)} s e p95 de ${n(d.p95)} s (${quantas(d.amostras, "totalização", "totalizações")})`;
  return `| ${titulo} | ${medido} | ${meta} | ${veredito(d.mediana <= metas[0] && d.p95 <= metas[1])} |`;
}

function lista(titulo: string, itens: string[]): string[] {
  if (itens.length === 0) return [];
  const mais = itens.length > LISTADAS ? [`- … e mais ${n(itens.length - LISTADAS)}.`] : [];
  return ["", `**${titulo}** (${n(itens.length)}):`, "", ...itens.slice(0, LISTADAS).map((i) => `- ${i}`), ...mais];
}

/** O trecho do registro do ensaio com os números da conferência, em Markdown. */
export function registroDoEnsaio(numeros: NumerosDoEnsaio): string {
  const { placar, preditivos, atraso, cache, dadosPorVisitante, rodadas, contador, narracao } = numeros;
  const semLeitura = numeros.leituras === 0;

  const bloqueantes = [
    "| Critério | Medido | Meta | Resultado |",
    "| --- | --- | --- | --- |",
    `| Placar idêntico | ${quantas(placar.conferidos, "arquivo de lugar conferido", "arquivos de lugar conferidos")}, ${quantas(placar.divergencias.length, "divergência", "divergências")} | nenhuma divergência | ${placar.conferidos === 0 ? "não medido" : veredito(placar.divergencias.length === 0)} |`,
    `| Textos preditivos com a chave desligada | ${quantas(preditivos.divergencias.length, "divergência", "divergências")} | nenhuma | ${semLeitura ? "não medido" : veredito(preditivos.divergencias.length === 0)} |`,
    linhaDoAtraso("Atraso no caminho R2", atraso.principal, [35, 70]),
    linhaDoAtraso("Atraso no plano B", atraso["plano B"], [75, 150]),
    cache.respostas === 0
      ? "| Cache no caminho R2 | sem resposta do caminho R2 | pelo menos 90% | não medido |"
      : `| Cache no caminho R2 | ${umaCasa((100 * cache.daBorda) / cache.respostas)}% da borda (${n(cache.daBorda)} de ${quantas(cache.respostas, "resposta", "respostas")}) | pelo menos 90% | ${veredito(cache.daBorda >= 0.9 * cache.respostas)} |`,
    narracao === null
      ? "| Narração factual | sem o replay da mesma noite | igual à do replay, salvo o que as quedas explicam | não medido |"
      : narracao.length === 0
        ? "| Narração factual | igual à do replay | igual à do replay, salvo o que as quedas explicam | passa |"
        : `| Narração factual | ${quantas(narracao.length, "diferença", "diferenças")} com o replay, listadas abaixo | igual à do replay, salvo o que as quedas explicam | o dono julga |`,
  ];

  const mb = (bytes: number) => umaCasa(bytes / 1_000_000);
  const fator =
    dadosPorVisitante && (Number.isInteger(dadosPorVisitante.fatorDaNoite) ? n(dadosPorVisitante.fatorDaNoite) : umaCasa(dadosPorVisitante.fatorDaNoite));
  const medicoes = [
    "| Medição | Medido | Referência |",
    "| --- | --- | --- |",
    rodadas?.duracao
      ? `| Tempo de cada rodada | até ${umaCasa(rodadas.duracao.maximo)} s (p95 de ${umaCasa(rodadas.duracao.p95)} s)${rodadas.noPico ? `; no pico, com ${n(rodadas.noPico.municipios)} municípios, ${umaCasa(rodadas.noPico.duracao)} s` : ""} | menos de 20 s no pico a 3x |`
      : "| Tempo de cada rodada | sem o registro do coletor (--rodadas) | menos de 20 s no pico a 3x |",
    rodadas
      ? `| Gravações | ${n(rodadas.gravacoes.total)} no ensaio; até ${n(rodadas.gravacoes.maximaPorRodada)} por rodada; até ${n(rodadas.gravacoes.maximaPorHora)} por hora | abaixo de 200 mil levadas à noite; nunca o teto de 1.500 por rodada |`
      : "| Gravações | sem o registro do coletor (--rodadas) | abaixo de 200 mil levadas à noite; nunca o teto de 1.500 por rodada |",
    contador
      ? `| Contador do coletor contra o painel da Cloudflare | ${n(contador.coletor)} contra ${n(contador.painel)}, ${comCasas(2).format((100 * Math.abs(contador.coletor - contador.painel)) / contador.painel)}% de diferença | até 1% |`
      : "| Contador do coletor contra o painel da Cloudflare | sem o número do painel (--painel-da-cloudflare) | até 1% |",
    dadosPorVisitante
      ? `| Dados por visitante na página do Brasil, das 17h às 20h | ${mb(dadosPorVisitante.bytes)} MB (${mb(dadosPorVisitante.bytesComOMapa)} MB com o mapa); levados à noite (x${fator}), ${mb(dadosPorVisitante.bytes * dadosPorVisitante.fatorDaNoite)} MB (${mb(dadosPorVisitante.bytesComOMapa * dadosPorVisitante.fatorDaNoite)} MB) | até 10 MB |`
      : "| Dados por visitante na página do Brasil, das 17h às 20h | sem leitura das 17h às 20h da noite | até 10 MB |",
  ];

  return [
    `Conferência automática de ${quantas(numeros.leituras, "leitura", "leituras")} do endereço público.`,
    "",
    ...bloqueantes,
    "",
    "Medições sem meta bloqueante:",
    "",
    ...medicoes,
    ...lista("Divergências do placar", placar.divergencias),
    ...lista("Divergências dos textos preditivos", preditivos.divergencias),
    ...lista("Diferenças da narração com o replay", narracao ?? []),
    "",
  ].join("\n");
}
