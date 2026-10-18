# Apurador

Site para acompanhar a apuração do 2º turno da eleição presidencial brasileira de 2026, com projeção do resultado ao vivo e consulta a eleições passadas.

## Apuração

**Apuração**:
O processo, na noite da eleição, em que o TSE totaliza os votos das seções e divulga o placar parcial.
_Avoid_: contagem

**Seção**:
A menor unidade de votação: uma urna, com seu eleitorado. É o que o TSE totaliza e conta.
_Avoid_: urna (quando se fala da unidade apurada)

**% de seções totalizadas**:
A fração das seções já totalizadas pelo TSE. É a medida oficial de quanto da apuração já ocorreu e o eixo horizontal das curvas.
_Avoid_: % das urnas apuradas, % de votos apurados

**Votos válidos**:
Votos dados a um candidato, excluídos brancos e nulos. Todos os percentuais de candidatos são sobre votos válidos.
_Avoid_: votos totais

**Placar parcial**:
O % de votos válidos de cada candidato entre as seções já totalizadas.
_Avoid_: resultado parcial, parcial

**Placar entre finalistas**:
Num 1º turno, o % de cada um dos dois finalistas sobre a soma dos votos dos dois (no Brasil, em 2026: Flávio 51,0, Lula 49,0). É a base de toda comparação entre um 2º turno e o 1º turno.
_Avoid_: resultado do 1º turno (quando é a base de comparação com o 2º)

**Curva real**:
A trajetória do placar parcial ao longo do % de seções totalizadas, com os dados já divulgados.

**Virada**:
O momento em que muda o candidato que lidera o placar parcial.

**Curva de comparação**:
A curva real de um turno passado, sobreposta à curva real atual no mesmo eixo de % de seções totalizadas.
_Avoid_: curva de 2022 (é qualquer turno)

## Previsão

**Projeção**:
O resultado final estimado (% de votos válidos de cada candidato, com margem de incerteza), recalculado a cada nova informação: uma pesquisa nova ou uma atualização da apuração.
_Avoid_: previsão (como termo técnico), estimativa

**Pesquisa**:
Uma pesquisa de intenção de voto registrada no TSE, de um instituto, com datas de campo e abrangência (Brasil ou UF).
_Avoid_: sondagem, enquete (enquete é outra coisa: sem metodologia amostral)

**Agregado de pesquisas**:
A estimativa combinada das pesquisas nacionais, num momento. Só existe para o Brasil.
_Avoid_: média das pesquisas, poll of polls

**Indicação das pesquisas**:
O % de votos válidos que as pesquisas indicam para cada candidato num lugar. No Brasil, é o agregado de pesquisas. Nos outros lugares, é o placar entre finalistas do lugar no 1º turno, somado à mesma mudança que o agregado mostra para o Brasil.
_Avoid_: agregado da UF, pesquisa do lugar

**Erro histórico das pesquisas**:
A diferença, medida em eleições passadas, entre o que o agregado de pesquisas indicava e o resultado oficial.

**Base da projeção**:
O conjunto de informações que a projeção usa, escolhido pelo visitante: **Só apuração** (placar parcial e eleições passadas) ou **Apuração + pesquisas** (o mesmo, mais o agregado de pesquisas).
_Avoid_: modo, modelo (para a escolha do visitante)

**Chance de vitória**:
A probabilidade, segundo o modelo, de cada candidato terminar com mais votos válidos.
_Avoid_: probabilidade, odds

**Curva projetada**:
A trajetória prevista do placar parcial desde o ponto atual até 100% de seções totalizadas, incluindo se e onde deve ocorrer a virada.

**Virada projetada**:
O ponto da curva projetada em que deve mudar quem lidera, sempre acompanhado da faixa de % de seções em que a virada é provável (ou da indicação de que pode não ocorrer).
_Avoid_: hora da virada, previsão da virada

**Ordem de chegada**:
A sequência em que as seções (e, por agregação, municípios e UFs) são totalizadas na noite. A ordem prevista define o formato da curva projetada.
_Avoid_: ordem de apuração, ordem de contagem

**Transferência de votos**:
A fração dos votos dados no 1º turno aos candidatos eliminados que vai para cada finalista no 2º turno.
_Avoid_: migração de votos, herança de votos

## Produto

**Núcleo ao vivo**:
A parte do site usada na noite da apuração: placar parcial, curva real, curva projetada, projeção e chance de vitória.

**Explorador histórico**:
A parte do site para consultar eleições presidenciais passadas e comparar resultados.

**Narração da noite**:
A sequência de eventos da apuração (virada, marcos, mudanças de chance) gerada automaticamente a partir dos dados.
_Avoid_: feed, timeline, ao vivo (sozinho)

**Simulador "e se"**:
O recurso em que o visitante ajusta hipóteses e vê a projeção e a curva projetada resultantes. Ele nunca substitui a projeção do site.
_Avoid_: cenários, previsão do usuário

**Lugar**:
Um recorte consultável: Brasil, estado (UF), Exterior ou município. Não há recorte menor que município.
_Avoid_: região (reservado às cinco regiões do IBGE), localidade

**Exterior**:
O lugar que reúne os votos dados fora do país. Fica no mesmo nível das UFs, entra no total do Brasil e não aparece no mapa.
_Avoid_: ZZ, UF exterior
