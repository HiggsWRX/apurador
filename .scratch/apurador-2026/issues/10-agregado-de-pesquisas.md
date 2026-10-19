# Agregado de pesquisas e erro histórico

Type: grilling
Status: resolved
Blocked by: 04, 06
Map: [Apurador 2026](../map.md)

## Question

Como montamos o agregado de pesquisas do 2º turno de 2026 e como transformamos o erro histórico das pesquisas (2º turnos de 2002 a 2022) em projeção e chance de vitória antes da apuração?

- Critério exato de inclusão: registro no TSE, institutos com histórico em 2018/2022, pesquisas nacionais e por UF.
- Método de agregação: pesos por data, amostra e instituto, ajuste por viés de instituto, tratamento de brancos, nulos e indecisos.
- Como o erro histórico vira incerteza: por eleição, por instituto, por UF, e a correlação entre UFs.
- Como o agregado se atualiza até 24/10 (coleta manual ou automática de pesquisas novas).
- O que o site mostra das pesquisas, dentro do que *Restrições legais à projeção* permitir.

Achados de [Pesquisas eleitorais: dados atuais e erro histórico](06-pesquisas-eleitorais.md) que moldam as decisões:

- **Coleta**: não há fonte oficial dos percentuais (o TSE só tem metadados). As opções são um agregado mantido à mão a partir das reportagens ou um leitor do texto da Wikipédia, conferido contra o registro do TSE.
- **UF**: não há pesquisas do 2T por UF em volume útil. Pela regra "por UF se houver volume", o agregado fica só nacional. A estimativa inicial por UF teria de vir do 1T de 2026 mais a mudança nacional medida nas pesquisas.
- **Viés do 1T de 2026** (pesquisas −2,8 pontos na margem contra Flávio): quanto dele levar para o 2T é a decisão que mais mexe na chance de vitória. Em 2018 e 2022, o viés do 1T foi maior e quase sumiu no 2T.
- **Por instituto**: o efeito de cada instituto se apoia em 1 a 3 eleições, e metade dos institutos de 2026 é nova. Uma média simples com a incerteza histórica é defensável; o ajuste por instituto seria frágil. Isso conflita com o critério "institutos com histórico em 2018/2022": aplicá-lo à risca descartaria metade das pesquisas de 2026.
- **Histórico**: há buracos (2T 2002 sem institutos; Base dos Dados sem toda a campanha de 2018 e com trecho pago) e sujeira (boca de urna misturada, válidos rotulados como totais). O erro por UF exige 1 a 2 dias de limpeza. Os resultados de 2002–2018 vindos de tabelas secundárias precisam ser conferidos no TSE.
- **Legal**: a Res. 23.600, art. 11, permite divulgar no dia da eleição as pesquisas registradas feitas antes dele (ver [Restrições legais à projeção](04-restricoes-legais.md)).

## Answer

Resolvido em 18/10/2026 em conversa com o dono do projeto, que aceitou todas as recomendações.

**Em uma linha**: o agregado é só do Brasil. Ele é a média simples da última pesquisa de cada um de 14 institutos com histórico, sem deslocar o centro pelo viés do 1º turno, com incerteza de 1,5 ponto na eleição. UFs, Exterior e municípios recebem a **indicação das pesquisas**: o próprio placar entre finalistas do 1º turno mais a mudança nacional.

**Decisões** (aceitas pelo dono do projeto):

1. **Só nacional.** O agregado de pesquisas existe só para o Brasil. As pesquisas estaduais do 2º turno ficam fora do modelo e do site: são 30 registros, nenhum em SP, PR, RS, PE ou CE.
2. **Inclusão.** Entram pesquisas nacionais de Presidente do 2º turno com campo a partir de 05/10 e registro conferido no CSV diário do TSE. O instituto precisa estar numa **lista fechada de 14**, os que tiveram pesquisa final no 2º turno de 2018 ou 2022: Datafolha, Ipec/Ibope, Quaest, AtlasIntel, MDA, Paraná Pesquisas, Futura, Gerp, PoderData, Ipespe, Veritá, Brasmarket, Real Time Big Data e FSB, identificados pelo CNPJ. Boca de urna nunca entra.
   - Na janela da noite (campo terminando de 18 a 24/10) devem sobrar cerca de 8 institutos. Em 2018 houve 7 pesquisas finais e em 2022, 12.
   - Por quê: o erro histórico foi medido nesses institutos, a regra é objetiva, e republicar menos pesquisas expõe menos ao art. 21 da Res. 23.600.
3. **Estimador.** É a média simples, em votos válidos, da pesquisa mais recente de cada instituto da lista com campo terminando nos 7 dias anteriores à data do cálculo. Os válidos são calculados dos votos totais publicados: Flávio ÷ (Flávio + Lula).
   - Não há peso por amostra, data ou modo de coleta, nem ajuste por instituto. Se a janela tiver menos de 4 institutos, ela passa a 14 dias.
   - É o mesmo estimador cujo erro foi medido de 2002 a 2022.
   - Em 18/10, dá Flávio 51,0% com 8 institutos, igual ao placar entre finalistas do 1º turno.
4. **Viés do 1º turno.** O centro não é deslocado, e a dúvida entra na incerteza. Em 2018 e 2022, o viés do 1º turno contra o candidato bolsonarista não passou ao 2º turno: em 2018 as pesquisas do 2º turno até superestimaram Bolsonaro, e em 2022 erraram 0,1 ponto.
5. **Incerteza.** A distribuição é normal, e a chance de vitória é a probabilidade de passar de 50%.
   - Na eleição, a incerteza é de **1,5 ponto na participação**: junta o erro histórico da média (1,2), a dúvida sobre o viés do 1º turno (0,7) e uma folga por haver só seis eleições.
   - Antes da eleição, é √(1,5² + 0,4² × dias até 25/10).
   - Em 18/10, dá 1,84 ponto e chance de Flávio de ~71%. Em 25/10, com o agregado em 51,0, a faixa de 95% vai de 48,1% a 53,9%, e a chance fica em ~75%.
   - O erro das pesquisas é o mesmo em todos os lugares.
6. **Indicação das pesquisas por lugar.** Em cada UF, no Exterior e em cada município, é o placar entre finalistas do lugar no 1º turno somado à mudança nacional (agregado − 51,0), limitado a 0–100%. No Brasil, é o próprio agregado.
   - A base "Apuração + pesquisas" começa desse valor em cada lugar.
   - Como ele perde peso e qual incerteza local ele tem fica para [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md).
   - Descartado: repartir os votos dos outros candidatos do 1º turno na proporção que as pesquisas implicam. Seria uma hipótese a mais, sem dado que a sustente.
7. **Comparações com o 1º turno** usam sempre o placar entre finalistas (Brasil: 51,0 × 49,0), nunca o % sobre todos os válidos (47,03 × 45,16).
8. **Coleta.** Um `pesquisas.csv` no repositório, com uma linha por pesquisa: registro, instituto, contratante, campo, entrevistas, margem, nível de confiança, modo, votos totais, brancos e nulos, indecisos, URL da fonte e data de divulgação.
   - O Claude preenche o arquivo uma vez por dia, a partir da Wikipédia e das reportagens.
   - Um verificador confere cada linha no CSV do TSE (registro existe, CNPJ na lista, datas e entrevistas batem, divulgação liberada) e faz a CI falhar se algo não bater.
   - Cada atualização é um deploy.
   - **A última atualização é em 24/10, até as 23h.** Aí o agregado congela, e a noite usa esse valor. Pesquisas divulgadas em 25/10 ficam de fora.
   - O leitor automático da Wikipédia fica só para se sobrar tempo.
9. **O que o site mostra.** A forma segue a [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md).
   - **(a)** A lista das pesquisas do agregado, cada uma com os seis dados do art. 10 e link para a fonte. Pesquisas fora do critério não aparecem.
   - **(b)** O agregado com faixa de incerteza e a linha de tendência desde 05/10, recalculada dia a dia com a mesma regra.
   - **(c)** A projeção e a chance de vitória antes da apuração, na base "Apuração + pesquisas".
   - Sem o sinal verde do advogado, até as 17h de 25/10 só aparece (a). Os itens (b) e (c) entram às 17h.
10. **Histórico e teste.** Um `pesquisas-historicas.csv` só nacional, com as pesquisas finais do 2º turno de 2006 a 2022 e a média de 2002 de Jennings e Wlezien. Cada linha traz a fonte, e os resultados de 2002 a 2018 são conferidos no TSE (cerca de meio dia de trabalho). Não entram o erro por UF nem o erro por instituto.
    - A página de metodologia mostra a regra aplicada a 2018 e 2022, com a incerteza de cada ano calculada sem aquele ano.
    - Conta prévia, com incerteza de 1,5: Bolsonaro com ~100% de chance em 2018 (média de 57,0% contra 55,1% real) e Lula com ~75% em 2022 (51,0% contra 50,9%).

**Glossário**: "Agregado de pesquisas" passa a valer só para o Brasil. Entram "Indicação das pesquisas" e "Placar entre finalistas".

## Comments

- 18/10/2026, de [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md):
  - Por escrito, só (a) está liberado antes das 17h. (b) e (c) ficam atrás de uma chave, desligada até a [Segunda consulta jurídica](21-segunda-consulta-juridica.md), e o caminho "sem sinal verde" da decisão 9 daqui volta a ser o padrão.
  - A coleta da decisão 8 ganha um registro datado de cada verificação (`pesquisas-verificacoes.csv`) e a conferência diária de suspensões.
  - Depois do congelamento das 23h de 24/10, ainda é permitido **retirar** uma pesquisa e recalcular o agregado. Incluir pesquisa nova não é.
  - O agregado leva o aviso "Média calculada pelo Apurador sobre pesquisas registradas no TSE. Não é uma pesquisa própria."
- 18/10/2026, de [Segunda consulta jurídica](21-segunda-consulta-juridica.md): (b) foi liberado, inclusive da 0h às 17h de 25/10, como agregado estatístico e não como nova pesquisa sujeita a registro. A chave fica ligada. (c) também fica ligada, como painel, com a confirmação pedida na [Confirmação dos textos preditivos](22-confirmacao-dos-textos-preditivos.md). Nenhum texto do site diz que o modelo "aprende" com o erro histórico: ele usa o erro medido.
- 18/10/2026, de [Página de metodologia](20-pagina-de-metodologia.md) (decisão 2 de lá): a página mostra a regra do agregado aplicada aos seis 2º turnos de 2002 a 2022, não só a 2018 e 2022, com a incerteza de cada ano calculada sem aquele ano. O `pesquisas-historicas.csv` fica para baixar na página.
- 19/10/2026, da construção da [Lista das pesquisas conferida no TSE](../../apurador-2026-construcao/issues/03-lista-das-pesquisas.md):
  - **Nexus é a FSB.** O dono decidiu que a Nexus conta como FSB na lista fechada. No registro do TSE, o CNPJ da FSB de 2018 (IPRI, Instituto FSB Pesquisa, 11077560000160) registra desde 2024 as pesquisas BTG/Nexus, depois da fusão do IPRI com a FSB Inteligência.
  - **O agregado de 18/10 muda.** Pela regra da decisão 3 sobre o `pesquisas.csv` conferido (divulgadas até 18/10, campo terminando de 11 a 17/10), ele passa a **9 institutos e 51,09%** (51,1%), não 51,0% com 8. Entra a BTG/Nexus de 10 a 12/10 (BR-07997/2026), com 51,6% nos válidos. Sem ela, daria 51,02% com 8.
  - **Incerteza e chance.** A incerteza segue em 1,84 ponto (decisão 5), e a chance de Flávio passa de ~71% a ~72%.
  - **CNPJs novos.** Três institutos da lista registram as pesquisas de 2026 com CNPJ diferente do das pesquisas finais de 2018/2022 e entram pelos dois: Futura (100% Cidades), Gerp (Gerp Mercadologia) e Real Time Big Data (Real Time Mídia). A lista, com a origem de cada CNPJ, fica em `dados/pesquisas-institutos.csv`.
- 19/10/2026, da construção do [Histórico das pesquisas de 2002 a 2022](../../apurador-2026-construcao/issues/05-historico-das-pesquisas.md):
  - **O erro histórico da média é de 1,30 ponto, não 1,2.**
    - A regra da decisão 3, aplicada aos seis 2º turnos com os resultados conferidos no TSE, pega também a Veritá de 17 a 20/10/2014 (nacional, BR-01144/2014), que faltou na tabela da pesquisa. Com ela, 2014 erra −1,5, não −0,8.
    - Os 1,5 da decisão 5 continuam de pé (√(1,3² + 0,7²) = 1,48), quase sem folga.
  - **A conta prévia da decisão 10 confere**, com a incerteza de cada ano calculada sem aquele ano: Bolsonaro com ~100% em 2018 (57,0 contra 55,1) e Lula com 75,5% em 2022 (51,0 contra 50,9).
  - **O viés do 1º turno de 2026.**
    - Pela mesma regra, as pesquisas finais do 1º turno são as de 12 institutos, com campo terminando de 27/09 a 03/10, não 8. Com elas, o erro na margem nos válidos é de −3,8 pontos contra Flávio, não −2,8.
    - Os −2,8 são o das 8 com campo terminando de 1 a 3/10.
