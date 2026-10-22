# 29: Metodologia: histórico de acerto e calibração (seções 6 e 7)

Status: resolved
Blocked by: 10, 28
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

As seções 6 ("Como o modelo teria se saído", `#acerto`) e 7 ("Como escolhemos as constantes", `#constantes`) da página de metodologia. Os números saem do mesmo código da noite, rodado no build sobre as noites da calibração: nada vem do protótipo. As seções chegam no build do ensaio 2 (23/10).

Decisões: [Página de metodologia](../../apurador-2026/issues/20-pagina-de-metodologia.md) (decisões 2, 3, 4 e 6) e [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisão 26 e comentário da metodologia).

## Critérios de aceite

- [x] **Noite reproduzida**: o gráfico alterna "2022 | 2018" e mostra o placar parcial, a projeção, a faixa de 95% e o resultado.
- [x] **Tabela de erros**: com 5%, 25% e 50% das seções, no placar parcial e nas duas bases, para as duas noites.
- [x] **Aviso**: a página diz "Este teste é otimista", porque os ajustes provisórios saíram de 2022.
- [x] **Agregado contra resultado**: o gráfico cobre os seis 2º turnos de 2002 a 2022, com a incerteza de cada ano calculada sem aquele ano, a partir do [ticket 05](05-historico-das-pesquisas.md).
- [x] **Seção 7**: traz a tabela da calibração (candidatos, números por noite e valor escolhido). O 1º turno de 2026 aparece só nela.
- [x] **"Em um minuto"**: ganha a frase do teste de 2022.
- [x] **Para baixar**: a calibração e as noites reproduzidas de 2018 e 2022, momento a momento, em CSV.
- [x] **Gráficos extras**: o peso das pesquisas ao longo da apuração, o diagrama da transferência de votos e o erro com as pesquisas deslocadas. São os primeiros a sair se atrasar.

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

- 22/10/2026, decisão do dono: a frase do teste de 2022 entra em "Em um minuto" como a sexta, e a quinta (a curva projetada) fica como está.

- 22/10/2026, registro do ticket 29 (branch `ticket/29-metodologia-acerto-e-calibracao`):
  - **O que entrou**:
    - As seções 6 (`#acerto`, "Como o modelo teria se saído") e 7 (`#constantes`, "Como escolhemos as constantes") entram na lista `SECOES`, entre `virada` e `limites`. `limites` passa a 08 e `fontes` a 09.
    - A abertura diz "as contas, os testes e os limites".
    - "Em um minuto" ganhou a sexta frase, pela decisão acima: "Na noite de 2022, com 5% das seções, a projeção errou menos de 0,1 ponto. O placar parcial errava 4,2 pontos." A projeção é a da base Apuração + pesquisas (0,0398), e o placar parcial erra 4,19.
  - **De onde vêm os números**: dos CSVs que o executor de noites grava em `docs/calibracao/` com as constantes congeladas (`npm run calibracao`). `lib/metodologia.ts` os lê no build.
    - O build não roda o executor de novo. Os números seriam os mesmos, os dos CSVs que a página oferece para baixar, e cada build precisaria das noites reconstruídas e de minutos a mais.
    - Quem garante que os CSVs são os do código é o job `replay` do CI: ele roda a calibração de novo e falha se eles mudarem, e o deploy depende dele. Um deploy feito à mão com CSVs velhos passaria pelo build.
    - A leitura confere que as linhas escolhidas dos CSVs são as do `constantes.json`, e o build para se não forem.
    - A spec diz "rodado no build sobre as noites da calibração". Se o dono quiser o executor dentro do build, basta trocar a leitura dos CSVs pela chamada a ele, e os números ficam os mesmos.
  - **Seção 6**:
    - **Noite reproduzida** (`components/NoitesReproduzidas.astro`):
      - Os botões "2022 | 2018" trocam a noite. O gráfico mostra o placar parcial, a projeção na base Apuração + pesquisas (a que a caixa da projeção abre na noite) com a faixa de 95%, e o resultado.
      - O eixo vertical cobre o placar parcial da noite inteira, e a faixa larga do começo é recortada nele.
      - Sem JavaScript, os botões somem e as duas noites ficam à vista, como no histórico da página de lugar.
    - **Tabela de erros**: em módulo, com uma casa, no momento mais perto de cada ponto. O que fica abaixo de 0,05 é "<0,1" na tabela e "menos de 0,1 ponto" no texto.

      | Noite | Com | Placar parcial | Só apuração | Apuração + pesquisas |
      |---|---|---|---|---|
      | 2022 (Lula 50,90%) | 5% | 4,2 | <0,1 | <0,1 |
      | | 25% | 2,2 | 0,3 | 0,3 |
      | | 50% | 1,2 | 0,4 | 0,4 |
      | 2018 (Bolsonaro 55,13%) | 5% | 4,8 | 0,3 | 0,4 |
      | | 25% | 2,4 | 0,9 | 0,9 |
      | | 50% | 1,0 | 0,6 | 0,6 |

    - **Cobertura**: o resultado fica dentro da faixa de 95% em todos os momentos depois de 1% das seções, nas duas noites e nas duas bases. A fotografia de 1% fica de fora, como na calibração.
    - **Aviso**: "Este teste é otimista. Os ajustes provisórios do modelo saíram da noite de 2022, e a calibração das constantes também usou estas duas noites (veja como). Numa noite nova, o erro pode ser maior."
    - **Pesquisas deslocadas** (gráfico extra, `PesquisasDeslocadas.astro`):
      - Antes da primeira seção, a projeção erraria 2,1 pontos com +2 para Lula e 1,9 ponto com +2 para Bolsonaro.
      - Com 5% das seções, o erro cai para 0,1145 e 0,0350: a página diz "0,1 ponto" e "menos de 0,1 ponto".
      - A partir de 5% das seções, as duas versões ficam a menos de 0,1 ponto da Só apuração.
      - O comentário do ticket 08 neste ticket (0,10, 0,23 e 0,03, e 7,0% das seções) traz os números das constantes provisórias, com K de 0,5%. Com o K congelado de 0,25%, a Apuração + pesquisas real erra 0,0398 com 5%.
    - **Agregado contra resultado** (`AgregadoContraResultado.astro`): os seis 2º turnos, em % de quem liderou o 1º turno, com a faixa de 95% da incerteza sem o ano, saídos do `historicoDoAgregado`. São os números do registro do ticket 05, e os seis resultados caem na faixa.
    - Nenhum texto da seção cita o 1º turno de 2026.
  - **Seção 7**:
    - A tabela das constantes: os candidatos, o valor de antes e o escolhido. Os candidatos saem dos CSVs, e o valor de antes, de `CONSTANTES_PROVISORIAS`. Na página, as incertezas regional e nacional se chamam "Desvio de cada estado" e "Desvio comum do país", como na seção 3.
    - A regra, em cinco passos.
    - A tabela por noite, com as constantes escolhidas. Traz a cobertura, a maior chance de quem perdeu depois de 5%, o erro médio e a margem média de 5% a 50%, o erro da curva projetada, o maior erro até 5% com pesquisas, a maior fração de momentos "sem sinal de virada" de municípios seguidos de virada e o erro médio com as zonas.
    - Recolhidos em "Os números de cada candidato", o passo 1 em números e as tabelas da ordem de chegada, do K e do sinal de virada, com o escolhido em negrito.
    - As medidas vão com duas casas e arredondam como o registro (`toFixed`). Por isso, o 1,8250 do K de 1% aparece como 1,82, igual ao docs/calibracao.md.
    - O 1º turno de 2026 aparece só nesta seção.
    - A chance de quem perdeu é a de noites passadas, mas, como toda chance na página, leva `data-chance-de-vitoria` e sai com a chave da projeção desligada.
  - **Para baixar**: entraram `noite-2022-2.csv`, `noite-2018-2.csv` e os cinco CSVs da calibração, com o nome `calibracao-<nome>.csv`, iguais aos de `docs/calibracao/`. A noite do 1º turno de 2026 fica de fora: a decisão 6 fala das noites de 2018 e 2022, e 2026 aparece só na seção 7.
  - **Gráficos extras**: os três entraram.
    - O peso das pesquisas, na seção 4 (`PesoDasPesquisas.astro`), com o K congelado.
    - A transferência de votos, na seção 3 (`TransferenciaDeVotos.astro`). É um exemplo com 46%, 46% e 8%, em que 60% dos eliminados vão para Flávio, com a legenda "Exemplo, com números redondos."
    - O erro com as pesquisas deslocadas, na seção 6.
  - **Geometria**: `lib/graficos-da-metodologia.ts`, ao lado de `lib/sino.ts`. Só calcula números e caminhos, e tem teste próprio, sem navegador.
  - **Ficou de fora**: as limitações 3 e 4 seguem sem os números de 2022, porque a tabela da seção 6 já os mostra.
  - **Testes**:
    - `test/metodologia.test.ts`: as noites, os erros, a cobertura, as deslocadas, o agregado e a tabela da calibração com os passos, contra as linhas dos CSVs, o docs/calibracao.md, o ticket 05 e o resultado do TSE.
    - `test/graficos-da-metodologia.test.ts`: a geometria.
    - `test/build/metodologia.test.ts`: as nove âncoras, a numeração de 01 a 09, sete "As contas", as seis frases, as seções 6 e 7, a chance da calibração atrás da chave, os gráficos extras e os nove CSVs em `dist/dados/`.
  - **Revisão** (`/code-review`). Corrigidos:
    - a chance de quem perdeu sem a marca e sem a chave;
    - a seção 7 sem os números de cada candidato;
    - as condições que faltavam na regra do K e da zona;
    - "0,0" na tabela contra "menos de 0,1" no texto;
    - "4,2" sem "pontos";
    - a chance e o peso carregados sem uso;
    - nomes que confundiam px com % (`xFaixa`, `doAno`) e o ponto da apuração (`secoes`);
    - parâmetros de um uso só;
    - os testes da geometria que passavam por construção e o comentário que citava a série errada.

    Ficaram de fora:
    - o leitor de CSV próprio (`linhasDoCsv`), em vez do `lerCsv` do pipeline, que não é exportado: exportá-lo mexeria no pipeline, fora deste ticket;
    - os ids das noites como texto (`"2022-2"`);
    - o `metodologia.ts` com a leitura, as medidas e os textos das tabelas juntos.
  - **Para os próximos**: notas nos comentários dos tickets 08, 32 e 35 e da decisão da [Página de metodologia](../../apurador-2026/issues/20-pagina-de-metodologia.md).
