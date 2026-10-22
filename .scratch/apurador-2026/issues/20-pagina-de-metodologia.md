# Página de metodologia

Type: prototype
Status: resolved
Blocked by: —
Map: [Apurador 2026](../map.md)
Protótipo: branch `prototipo/pagina-metodologia`, arquivo `prototipos/pagina-metodologia/pagina-metodologia.html` (abre com dois cliques)

## Question

O que a página de metodologia mostra, em que ordem e com que tom, para que um visitante sem formação em estatística entenda de onde vêm a projeção e a chance de vitória e veja o histórico de acerto do modelo?

Protótipo rápido: um esboço do texto e dos gráficos, para reagir e decidir.

O que já está decidido e precisa entrar:

- **Método da base "Só apuração"**: transferência de votos corrigida pelo próprio município, e o desempenho na noite de 2022. Ver [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md).
- **Agregado de pesquisas**: a regra de inclusão (a lista dos 14 institutos), o estimador, a incerteza e o teste em 2018 e 2022, com a incerteza de cada ano calculada sem aquele ano. Ver [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md).
- **Combinação**: o peso das pesquisas ao longo da noite e o erro das duas bases na noite de 2022, com as pesquisas reais e com as deslocadas 2 pontos. Ver [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md).
- **Avisos** de [Restrições legais à projeção](04-restricoes-legais.md):
  - a projeção não é resultado oficial nem pesquisa;
  - os dados do TSE aparecem sem alteração, com atribuição (CC-BY);
  - a lista das pesquisas traz os seis dados do art. 10.
- **Exigência do advogado**, de [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md) (decisão 5): a metodologia do agregado e da projeção é pública, com os critérios de seleção, os cálculos e as limitações. A página diz que o agregado não é pesquisa própria e que a projeção não é resultado oficial nem garantia do resultado. Pela pesquisa legal, o modelo não é apresentado como "IA".
- De [Segunda consulta jurídica](21-segunda-consulta-juridica.md) (decisão 3): a página declara "sem IA generativa nem aprendizagem de máquina", e nenhum texto diz que o modelo "aprende". Ele usa o erro medido em eleições passadas. A atribuição da malha é "IBGE, Malha Municipal Digital 2024, CC BY 4.0, simplificada pelo Apurador".

- **Sino da projeção**, de [Telas da página de lugar](12-telas-da-pagina-de-lugar.md): a distribuição do resultado final, com a área de cada lado de 50% igual à chance de vitória de cada candidato. Saiu da página de lugar, onde a chance aparece numa barra dividida, e serve aqui para explicar de onde vem a chance. Está pronto no protótipo (`svgSino` em `componentes.js`, variante C).

A decidir:

- Ordem e profundidade: um resumo em cima e os detalhes abaixo?
- Quais gráficos entram.
- Se reproduzimos a noite de 2018, para mostrar um caso em que as pesquisas erraram (1,9 ponto). O custo é montar a reprodução de 2018 a partir de `detalhe_votacao_secao`, como foi feito para 2022.
- Se a página oferece os dados ou o código para baixar.

De [Ensaio geral](15-ensaio-geral.md):
- **Calibração**: as constantes do modelo, a zona, o K e o limite do sinal de virada são escolhidos em três noites (2T de 2022, 2T de 2018 inteiro e 1T de 2026). Os valores candidatos e a regra de escolha são escritos antes, sem treinar nada (decisões 13 a 18 de lá). A tabela fica em `docs/calibracao.md` e entra nesta página, porque mostra como as constantes foram escolhidas.
- **2018**: a calibração já reproduz o 2T de 2018 inteiro, porque o `detalhe_votacao_secao` dá a hora de cada seção mesmo antes da abertura das 19h. Com isso, o custo da reprodução de 2018 deixa de pesar na pergunta acima.

De [Plano de lançamento em fases](19-plano-de-lancamento-em-fases.md) (decisões 3 e 5 de lá):
- **Mínimo para a etapa "Antes da noite"** (meta qui 22/10): a página precisa estar no ar com o que o advogado exige, ou seja, critérios de seleção, cálculos, limitações, "sem IA generativa nem aprendizagem de máquina" e a atribuição da malha. Sem isso, o painel de antes das 17h não abre.
- **Pode chegar depois**, até o build do ensaio 2 (23/10): a tabela da calibração e o histórico de acerto.
- **Corte, se atrasar**: os gráficos extras são os primeiros a sair.
- **Correções**: as de texto valem até as 18h de 24/10. Função nova, só até o ensaio 2.

## Answer

Resolvido em 18/10/2026 com o protótipo (branch `prototipo/pagina-metodologia`), em uma rodada de conversa com o dono do projeto, que aceitou todas as recomendações.

O protótipo roda a noite real do 2T de 2022, seção por seção, com o módulo `Projecao` do [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md). Ele trouxe três estruturas: A, resumo e camadas; B, perguntas; C, a noite de 2022 com o gráfico fixo no topo.

**Em uma linha**: uma página estática, na estrutura A. No topo vem "Em um minuto"; depois, nove seções numeradas, cada uma com texto simples e as fórmulas recolhidas em "As contas". O histórico de acerto e a calibração chegam no build do ensaio 2.

**O que a noite de 2022 mostrou no protótipo** (ajustes provisórios; base com pesquisas aproximada como no [Volume de gravações na noite](24-volume-de-gravacoes-na-noite.md)):

- Com 5% das seções, a projeção errou 0,1 ponto, e o placar parcial, 4,2.
- Com 1% das seções, a projeção ainda errava 1,7 ponto.
- Com o agregado deslocado 2 pontos para cada lado, a projeção fica a menos de 0,1 ponto da "Só apuração" a partir de 7% das seções.
- O resultado ficou dentro da faixa de 95% em 98% dos momentos depois de 1% das seções.

**Decisões** (aceitas pelo dono do projeto):

1. **Estrutura**: a da variante A, numa página só.
   - **Topo**: o título "Como calculamos a projeção", uma frase, o aviso da projeção, o cartão "Em um minuto" (cinco frases e a declaração "Sem IA") e o índice das seções.
   - **Seções**, nesta ordem e com âncoras fixas:
     1. Antes das 17h: o agregado de pesquisas (`#pesquisas`);
     2. De onde vem a chance de vitória (`#chance`);
     3. A partir das 17h: a apuração (`#apuracao`);
     4. Como pesquisas e apuração se juntam (`#juntas`);
     5. A curva projetada e a virada (`#virada`);
     6. Como o modelo teria se saído (`#acerto`);
     7. Como escolhemos as constantes (`#constantes`);
     8. Limitações (`#limites`);
     9. Fontes, dados e avisos (`#fontes`).
   - **Descartadas**: C, porque perde o fio sem o histórico de acerto, na etapa mínima, e o gráfico fixo que anda com a rolagem é a peça mais cara e frágil no celular; B, porque se repete e não tem um fio que guie a leitura.
2. **Gráficos**:
   - **Essenciais**:
     - o sino, na seção 2;
     - a noite reproduzida, com placar parcial, projeção, faixa de 95% e resultado, na seção 6;
     - o agregado contra o resultado nos seis 2º turnos de 2002 a 2022, na seção 6, com a incerteza de cada ano calculada sem aquele ano.
   - **Extras**, os primeiros a sair se atrasar:
     - o peso das pesquisas ao longo da apuração;
     - o diagrama da transferência de votos, um exemplo com números redondos;
     - o erro com as pesquisas deslocadas 2 pontos. Sem ele, o caso fica só no texto.
3. **Noites**:
   - **Quais**: o gráfico da seção 6 alterna "2022 | 2018", com as noites que a calibração do [Ensaio geral](15-ensaio-geral.md) reproduz. Embaixo, uma tabela traz o erro com 5%, 25% e 50% das seções, no placar parcial e nas duas bases.
   - **Por que 2018**: foi uma noite em que as pesquisas erraram 1,9 ponto. Além disso, o teste só em 2022 é otimista, porque os ajustes provisórios saíram dela, e a página diz isso.
   - **1º turno de 2026**: aparece só nos números da tabela da calibração.
   - Isso fecha a reprodução de 2018 que a decisão 4 da [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md) deixou para cá. O custo é quase zero, porque a calibração já roda a noite.
4. **Etapas**, conforme o [Plano de lançamento em fases](19-plano-de-lancamento-em-fases.md):
   - **22/10, Antes da noite**: entram as seções 1 a 5, 8 e 9, com o sino, e o "Em um minuto" sai sem a frase do teste de 2022. Isso cobre tudo o que os advogados exigem. Não há "em breve": a página só cresce.
   - **23/10, build do ensaio 2**: entram as seções 6 e 7 e a frase de 2022 no "Em um minuto".
5. **Sino**: usa o agregado do dia, com a data ao lado e a incerteza daquele dia. Ele se atualiza a cada deploy de pesquisas até o congelamento das 23h de 24/10 e, a partir daí, fica fixo. A página nunca lê dados ao vivo da apuração e continua build estático.
6. **Para baixar**, na seção 9:
   - **Em CSV**: `pesquisas.csv`, `pesquisas-historicas.csv`, a calibração e as noites reproduzidas de 2018 e 2022, momento a momento.
   - **Código**: aparece como "a partir de 26/10", quando o repositório abre.
   - **Fica interno**: `pesquisas-verificacoes.csv`, que é registro para defesa, não conteúdo do site.
7. **Tom**:
   - O texto fala com "você", em frases curtas e sem jargão. Fórmulas só aparecem dentro de "As contas".
   - A página admite os próprios limites: o aviso "Este teste é otimista" e uma seção de limitações.
   - Nunca usa "aprende", "IA" (fora a declaração "sem IA generativa nem aprendizagem de máquina") nem "previsão".
   - Os textos do protótipo (o objeto `T` em `template.html`) são o ponto de partida. As limitações são sete:
     - poucas eleições para medir o erro das pesquisas;
     - o viés do 1º turno de 2026;
     - o começo da noite;
     - as seções tardias dentro do município;
     - a ordem de chegada;
     - estados e municípios sem pesquisas estaduais;
     - a dependência do TSE.
8. **Links da página de lugar**: cada um leva à seção certa.
   - "Como calculamos →" vai ao topo.
   - A chance de vitória vai a `#chance`.
   - "As pesquisas pesam X%" e "As duas bases já coincidem" vão a `#juntas`.
   - O rótulo do sinal de virada vai a `#virada`.
9. **Escopo**:
   - **Na página**:
     - o agregado: critérios, os 14 institutos, o estimador, a incerteza, o viés do 1º turno e a indicação das pesquisas;
     - as duas bases e a chance de vitória;
     - a curva projetada com o sinal de virada;
     - o simulador, em três linhas com link;
     - o histórico de acerto e a calibração;
     - as limitações;
     - as fontes e os avisos: TSE sem alteração (CC-BY, duas casas), a camada "Cálculo do Apurador com dados do TSE", o link para a lista das pesquisas com os seis dados do art. 10 e a malha do IBGE;
     - "quem faz".
   - **Fora**: a narração e o mapa, que já levam o selo da camada analítica.

**Para a implementação**:

- Os números da seção 6 saem do mesmo código da noite (decisão 2 da [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md)), rodado no build sobre as noites da calibração. Nada vem do protótipo: a base com pesquisas dele é aproximada, e o recuo "1º turno" divide os eliminados meio a meio (nota da [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md)).
- Os gráficos do protótipo (`svgSino`, `svgNoite`, `svgHist`, `svgPeso`, `svgTransf`, `svgErro`) são referência visual, não código de produção.
- Os resultados de 2002 a 2018 do gráfico do agregado ainda precisam ser conferidos no TSE (decisão 10 do [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md)).
- O rodapé e "quem faz" usam o nome do dono e o e-mail do projeto (decisão 7 da [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md)).

**Glossário**: entram "Página de metodologia" e "Histórico de acerto".

## Comments

- 22/10/2026, do [ticket 29 da construção](../../apurador-2026-construcao/issues/29-metodologia-acerto-e-calibracao.md): a página mostra a noite de 2022 com as constantes congeladas pela calibração, e não com os ajustes provisórios do protótipo. Com 5% das seções, a projeção erra menos de 0,1 ponto (0,0398 na Apuração + pesquisas, 0,0432 na Só apuração) e o placar parcial, 4,2; com 1%, 1,7 ponto na Só apuração e 1,3 na Apuração + pesquisas; com o agregado deslocado, as versões ficam a menos de 0,1 ponto da Só apuração a partir de 5% das seções, e não de 7%; e o resultado fica dentro da faixa de 95% em todos os momentos depois de 1% das seções, e não em 98%.
