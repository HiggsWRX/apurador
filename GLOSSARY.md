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

**Comparecimento**:
A fração dos eleitores aptos de um lugar que votou.
_Avoid_: participação (usado para a fatia de um candidato), presença

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

**Indicação do TSE**:
O anúncio oficial do TSE de que a eleição presidencial está matematicamente definida, com o nome do eleito, antes da totalização final. Só existe para o Brasil.
_Avoid_: matematicamente definido (sozinho), eleito pela projeção

**Totalização final**:
O fim oficial da apuração num lugar, quando o TSE conclui a totalização de todas as seções.
_Avoid_: 100% apurado, resultado final (quando se fala da projeção)

**Curva de comparação**:
A curva real de um turno passado, sobreposta à curva real atual no mesmo eixo de % de seções totalizadas.
_Avoid_: curva de 2022 (é qualquer turno)

**Noite reconstruída**:
Uma apuração passada refeita seção por seção: cada seção entra no placar parcial no instante em que o TSE a totalizou, com os votos do boletim de urna (ou da votação por seção, no 1º turno de 2026). Dá o estado da apuração em qualquer instante, por zona, município, UF e Brasil. É o que o replay, o ensaio geral e a calibração reproduzem.
_Avoid_: noite simulada, simulação (é do simulador "e se")

## Previsão

**Projeção**:
O resultado final estimado (% de votos válidos de cada candidato, com margem de incerteza), recalculado a cada nova informação: uma pesquisa nova ou uma atualização da apuração.
_Avoid_: previsão (como termo técnico), estimativa

**Voto que falta**:
Os votos válidos das seções ainda não totalizadas, que a projeção estima. Só ele pode mudar o resultado.
_Avoid_: votos restantes, voto pendente

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

**Base do modelo**:
O 1º turno de cada município que o modelo usa numa noite: placar entre finalistas, fatia dos eliminados, aptos, seções, válidos por apto e perfil de chegada. A noite de 25/10 usa o 1º turno de 2026.
_Avoid_: base da projeção (é a escolha do visitante)

**Peso das pesquisas**:
Quanto a indicação das pesquisas ainda influencia a projeção na base Apuração + pesquisas. É 100% antes da apuração e cai conforme o Brasil é apurado, igual para todos os lugares.
_Avoid_: confiança nas pesquisas, peso do modelo

**Chance de vitória**:
A probabilidade, segundo o modelo, de cada candidato terminar com mais votos válidos.
_Avoid_: probabilidade, odds

**Chance de virada**:
A chance de vitória de quem está atrás no placar parcial. Diz se a virada é projetada, possível ou se não há sinal dela.
_Avoid_: probabilidade de virada

**Curva projetada**:
A trajetória prevista do placar parcial desde o ponto atual até 100% de seções totalizadas, incluindo se e onde deve ocorrer a virada.

**Virada projetada**:
O ponto da curva projetada em que deve mudar quem lidera, sempre acompanhado da faixa de % de seções em que a virada é provável e da chance de virada.
_Avoid_: hora da virada, previsão da virada

**Ordem de chegada**:
A sequência em que as seções (e, por agregação, municípios e UFs) são totalizadas na noite. A ordem prevista define o formato da curva projetada.
_Avoid_: ordem de apuração, ordem de contagem

**Perfil de chegada**:
Num turno passado, a fração das seções de um município que já tinha sido totalizada quando o país tinha cada % de seções totalizadas. Diz se o município chega cedo ou tarde na noite.
_Avoid_: curva de chegada

**Transferência de votos**:
A fração dos votos dados no 1º turno aos candidatos eliminados que vai para cada finalista no 2º turno.
_Avoid_: migração de votos, herança de votos

**Calibração**:
A escolha, em noites passadas, das constantes fixas do modelo, entre valores listados antes e por uma regra escrita antes. Não treina nada.
_Avoid_: treino, aprendizado, ajuste automático

**Histórico de acerto**:
Quanto a projeção teria errado em noites passadas, com o mesmo modelo rodado sobre a ordem real de chegada daquelas noites. Mostra também como o agregado de pesquisas se saiu nos 2º turnos anteriores.
_Avoid_: backtest, desempenho, "como a projeção se saiu" (reservado à noite de 2026, depois dela)

## Produto

**Núcleo ao vivo**:
A parte do site usada na noite da apuração: placar parcial, curva real, curva projetada, projeção e chance de vitória.

**Explorador histórico**:
A parte do site para consultar eleições presidenciais passadas e comparar resultados.

**Página de metodologia**:
A página do site que explica como a projeção e a chance de vitória são calculadas, com os critérios das pesquisas, o histórico de acerto, a calibração e as limitações. Nunca mostra dados ao vivo da apuração.
_Avoid_: sobre, FAQ, "como calculamos" (é o nome do link, não da página)

**Narração da noite**:
A sequência de eventos da apuração num lugar (virada, marcos, mudanças de chance), gerada automaticamente a partir dos dados, com os principais eventos do Brasil intercalados.
_Avoid_: feed, timeline, ao vivo (sozinho)

**Evento**:
Um acontecimento da noite num lugar, com hora, registrado na narração da noite: um marco, uma virada, a indicação do TSE. É factual, ou preditivo quando afirma o que a projeção espera.
_Avoid_: post, notícia, atualização

**Marco**:
Um % de seções totalizadas fixado de antemão, como 50%, cuja passagem num lugar vira um evento.
_Avoid_: meta, checkpoint

**Simulador "e se"**:
O recurso em que o visitante ajusta hipóteses e vê a simulação resultante. Ele nunca substitui a projeção do site.
_Avoid_: cenários, previsão do usuário

**Hipótese**:
Um ajuste do visitante no simulador "e se": quanto o voto que falta pende para um candidato além do que a projeção espera, ou quanto o comparecimento muda, no Brasil ou numa região.
_Avoid_: cenário, premissa

**Simulação**:
O resultado das hipóteses do visitante: resultado final estimado, chance de vitória e curva projetada. Fica sempre ao lado da projeção do site, sem substituí-la.
_Avoid_: projeção do visitante, previsão do usuário

**Página de lugar**:
A página do site dedicada a um lugar, com o bloco ao vivo em cima e o histórico embaixo. A inicial é a do Brasil.
_Avoid_: tela, painel, dashboard

**Manchete**:
A frase gerada no topo da página de lugar que resume o momento da apuração ali: sempre o placar parcial oficial e, no máximo, uma frase atribuída à projeção.
_Avoid_: título, resumo, chamada

**Texto preditivo**:
Uma frase gerada automaticamente que afirma o que a projeção espera, como quem vence ou quando vira. Não se confunde com os números e rótulos curtos do bloco da projeção.
_Avoid_: comentário, previsão

**Fase**:
O momento da noite que a página mostra: antes das 17h, ao vivo ou encerrada. Muda para todos os visitantes ao mesmo tempo, nunca pelo relógio do aparelho.
_Avoid_: etapa (reservado ao lançamento), estado, modo

**Etapa de lançamento**:
Um conjunto de partes do site que vai ao ar junto, com data e critério de pronto: antes da noite, noite e depois.
_Avoid_: fase (é o momento da página), release, versão

**Chave de publicação**:
Um liga-desliga de um bloco do site, que muda o que vai ao ar sem código novo.
_Avoid_: flag

**Lugar**:
Um recorte consultável: Brasil, estado (UF), Exterior ou município. Não há recorte menor que município.
_Avoid_: região (reservado às cinco regiões do IBGE), localidade

**Exterior**:
O lugar que reúne os votos dados fora do país. Fica no mesmo nível das UFs, entra no total do Brasil e não aparece no mapa. As cidades com posto de votação, que o TSE trata como municípios, são lugares no nível dos municípios ("Lisboa (Exterior)").
_Avoid_: ZZ, UF exterior

## Operação

**Ensaio geral**:
A reprodução de uma apuração passada inteira, acelerada, no site e na infraestrutura reais, com pessoas assistindo, para aprovar o site antes da noite.
_Avoid_: teste, simulado (o simulado é do TSE)

**Plano zero**:
O estado do site em que nenhum dado ao vivo vai ao ar e a página manda o visitante para o app oficial do TSE. É reversível na própria noite.
_Avoid_: site fora do ar, modo de emergência

**Painel do coletor**:
A tela do dono na noite, com o estado do coletor, do TSE e da publicação, e o site visto de fora. Nenhum visitante a vê.
_Avoid_: painel (sozinho), dashboard, monitor

**Alerta**:
Um sinal ao dono de que algo na noite pede atenção, crítico ou de atenção. Nunca aparece para o visitante e nunca age sozinho.
_Avoid_: aviso, alarme

**Aviso**:
Uma mensagem ao visitante sobre o estado do site, como "atualização interrompida". Fora os automáticos, só vão ao ar avisos prontos, de uma lista fechada.
_Avoid_: alerta, comunicado

**Vigia**:
A pessoa que acompanha a noite de fora da rede do dono, como visitante, compara o site com o app oficial do TSE e reporta ao dono. Não opera nada.
_Avoid_: monitor, sentinela

**Sentinela**:
O vigilante automático, fora do computador do dono, que confere se o site continua recebendo rodadas e alerta o dono quando elas param.
_Avoid_: vigia, monitor

**Roteiro da noite**:
O passo a passo escrito do dono para 25/10: a linha do tempo do dia e, para cada falha, o sintoma, como confirmar, o que fazer e como voltar.
_Avoid_: checklist, runbook, plano
