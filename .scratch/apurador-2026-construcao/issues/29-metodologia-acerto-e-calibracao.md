# 29: Metodologia: histórico de acerto e calibração (seções 6 e 7)

Status: ready-for-agent
Blocked by: 10, 28
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

As seções 6 ("Como o modelo teria se saído", `#acerto`) e 7 ("Como escolhemos as constantes", `#constantes`) da página de metodologia. Os números saem do mesmo código da noite, rodado no build sobre as noites da calibração: nada vem do protótipo. As seções chegam no build do ensaio 2 (23/10).

Decisões: [Página de metodologia](../../apurador-2026/issues/20-pagina-de-metodologia.md) (decisões 2, 3, 4 e 6) e [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisão 26 e comentário da metodologia).

## Critérios de aceite

- [ ] **Noite reproduzida**: o gráfico alterna "2022 | 2018" e mostra o placar parcial, a projeção, a faixa de 95% e o resultado.
- [ ] **Tabela de erros**: com 5%, 25% e 50% das seções, no placar parcial e nas duas bases, para as duas noites.
- [ ] **Aviso**: a página diz "Este teste é otimista", porque os ajustes provisórios saíram de 2022.
- [ ] **Agregado contra resultado**: o gráfico cobre os seis 2º turnos de 2002 a 2022, com a incerteza de cada ano calculada sem aquele ano, a partir do [ticket 05](05-historico-das-pesquisas.md).
- [ ] **Seção 7**: traz a tabela da calibração (candidatos, números por noite e valor escolhido). O 1º turno de 2026 aparece só nela.
- [ ] **"Em um minuto"**: ganha a frase do teste de 2022.
- [ ] **Para baixar**: a calibração e as noites reproduzidas de 2018 e 2022, momento a momento, em CSV.
- [ ] **Gráficos extras**: o peso das pesquisas ao longo da apuração, o diagrama da transferência de votos e o erro com as pesquisas deslocadas. São os primeiros a sair se atrasar.

## Comments

- 19/10/2026, do [ticket 08](08-base-apuracao-mais-pesquisas.md): o gráfico do erro com as pesquisas deslocadas reproduz a série do protótipo da metodologia. Na noite de 2022, o erro com 5% das seções é de 0,10 com o agregado real, 0,23 com +2 para Lula e 0,03 com +2 para Bolsonaro, e as versões ficam a menos de 0,1 ponto da "Só apuração" a partir de 7,0% das seções. Os números saem do executor de noites (ver os comentários do [ticket 28](28-calibracao.md)).

- 19/10/2026, do [ticket 28](28-calibracao.md):
  - A tabela da calibração e os números por noite estão em `docs/calibracao.md` ("Resultados"). Os CSVs para baixar estão em `docs/calibracao/`: `constantes.csv`, `ordem-de-chegada.csv`, `k.csv`, `sinal-de-virada.csv` e `zona.csv`, e as noites momento a momento em `noite-2022-2.csv`, `noite-2018-2.csv` e `noite-2026-1.csv`. O `npm run calibracao` os regrava.
  - Nas noites, cada linha traz a hora (de Brasília, vazia antes da primeira seção), o % de seções e o placar parcial, e, por base (`so_apuracao`, `com_pesquisas` e, em 2022, `com_pesquisas_mais_2_13` e `com_pesquisas_mais_2_22`), o peso das pesquisas, a projeção, a margem de 95% e a chance de vitória do 1º finalista da base, cujo número vai no nome da coluna. As porcentagens vão de 0 a 100, e a margem em pontos percentuais. A primeira linha é antes da primeira seção.
  - Os números saem das constantes congeladas. A noite de 2026-1 parte de 48,78 na base com pesquisas, e não do agregado de 48,87, porque a base é o 1º turno de 2022 pesado pelos eleitores de 2026 (ver o registro do ticket 28).

- 20/10/2026, do [ticket 10](10-metodologia-secoes-iniciais.md):
  - **Onde as seções 6 e 7 entram.** A página é `packages/site/src/pages/metodologia.astro`. As seções estão na lista `SECOES`, na ordem da página, e cada uma é um `<Secao {...secao("id")}>` (`components/Secao.astro`). Insira `{ id: "acerto", titulo: "Como o modelo teria se saído" }` e `{ id: "constantes", titulo: "Como escolhemos as constantes" }` entre `virada` e `limites`, e escreva as duas seções no mesmo lugar do corpo. O número de cada seção ("06", "07") e o índice do topo saem da lista: `limites` e `fontes` passam a 08 e 09 sozinhas. Não há "em breve" em lugar nenhum, e não deve haver.
  - **Fórmulas só em "As contas".** Cada seção recolhe as fórmulas num `<details class="contas"><summary>As contas</summary><div>…</div></details>`, com cada fórmula num `.formula`. O teste `packages/site/test/build/metodologia.test.ts` conta esses `details` (hoje 5) e confere que nenhum `.formula` fica fora deles: ajuste a contagem.
  - **O teste de build.** O mesmo teste confere as sete âncoras, a numeração `["01", …, "07"]`, a ausência de `#acerto` e `#constantes`, as cinco frases do "Em um minuto" sem "2022" e os dois CSVs em `dist/dados/`. Ao entrar com as seções, inverta essas quatro conferências.
  - **"Em um minuto".** Já tem cinco frases (agregado, transferência de votos, peso das pesquisas, chance de vitória, curva projetada e sinal de virada). A frase do teste de 2022 seria a sexta, ou substitui a quinta: decisão do dono. A frase de abertura (`.lead`) diz "as contas e os limites"; com o histórico de acerto, acrescente "os testes".
  - **Números que já saem do código, em `packages/site/src/lib/metodologia.ts`**: `CONSTANTES` (o `constantes.json` congelado, via `lerConstantes`), `INSTITUTOS` (os 14, do `pesquisas-institutos.csv`), `ERRO_HISTORICO` (o `historicoDoAgregado(eleicoesPassadas(...))` sobre o `pesquisas-historicas.csv` e o `resultados-historicos.json`: 6 anos, erros de 0,08 a 1,88, raiz 1,30) e `VIES_DO_PRIMEIRO_TURNO` (o `agregadoDaNoite` de 2026-1: Flávio 48,87 entre os dois, contra 51,01). O gráfico "agregado contra resultado" da seção 6 pode partir do mesmo `historicoDoAgregado`; as leituras do CSV e do JSON são privadas do módulo, exporte-as se precisar. O agregado do dia vem de `lib/pesquisas.ts` (`AGREGADO`), com o relógio dos testes em `AGORA` (`test/html.ts`, 19/10 12h).
  - **Para baixar.** `PARA_BAIXAR` no mesmo módulo lista os arquivos (caminho, nome, descrição, KB e o texto), e o endpoint `src/pages/dados/[arquivo].csv.ts` serve cada um em `/dados/` com `Content-Type: text/csv`. Os CSVs da calibração (`docs/calibracao/*.csv`) e as noites momento a momento entram só na lista. O teste confere que `dist/dados/` tem exatamente os arquivos dela.
  - **O que ficou de fora e é de 2022**: as limitações 3 ("O começo da noite engana") e 4 ("Seções tardias") saíram sem os números do protótipo (1,7 ponto com 1% das seções; ~0,4 ponto abaixo). Se entrarem, que venham do executor de noites, na seção 6 ou como referência nas limitações.
  - **Gráficos.** O sino é `components/Sino.astro` sobre a geometria pura de `lib/sino.ts` (viewBox 340×180, cores por `data-cor` e variáveis de CSS, `aria-label` com a descrição). Os gráficos da seção 6 que usam dados do TSE levam "Cálculo do Apurador com dados do TSE", como os da página de lugar.
  - **Palavras.** O teste confere, em todo o texto da página e nos `aria-label`, que não há "aprend", "IA", "inteligência artificial" nem "previs", fora a declaração do cartão. Vale para os textos das seções 6 e 7 também ("Este teste é otimista" passa).
