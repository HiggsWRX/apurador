# Apurador 2026: especificação da construção

Status: ready-for-agent
Map: [Apurador 2026](../apurador-2026/map.md)

Esta especificação junta as decisões do mapa (tickets 01 a 24, todos resolvidos, salvo o 22, que espera o advogado) numa só peça para construir. Quando um número ou um texto exato importa, a fonte é o ticket citado. O vocabulário é o do `GLOSSARY.md`.

## Problema

Na noite de **domingo, 25/10/2026**, o Brasil acompanha a apuração do 2º turno entre Flávio Bolsonaro (PL) e Lula (PT). No 1º turno, Flávio teve 47,03% e Lula 45,16% dos votos válidos, então a disputa é apertada.

O visitante comum só tem o placar parcial do app do TSE e dos portais, que engana:

- **A ordem de chegada não é aleatória.** Centro-Oeste e Sul chegam cedo, Sudeste e Nordeste chegam tarde. Em 2022, Bolsonaro liderou o placar parcial até 67,76% das seções, e a virada só veio às 18:44. Quem olha só o placar não sabe se ele vai virar, quando, nem com que chance.
- **Ninguém mostra para onde a apuração vai.** Não existe uma curva projetada pública, nem uma projeção do resultado final com margem honesta e explicada.
- **As pesquisas ficam espalhadas** em reportagens, sem um agregado sóbrio, sem dizer quanto erraram no passado e sem mostrar como elas perdem importância quando a apuração começa.
- **Comparar com o 1º turno e com eleições passadas** em cada estado e município dá trabalho e quase ninguém faz.
- **Acompanhar é passivo.** Não há narração dos acontecimentos de cada lugar, nem como testar "e se o voto que falta pender para um lado?".

O dono do projeto quer um site que torne a apuração mais interessante e engajante, sem deixar de ser rigoroso, apartidário e dentro da lei eleitoral.

As restrições são estas:

- O núcleo ao vivo precisa estar no ar às 17h de 25/10 (20h UTC), e esse prazo não se negocia.
- Só os planos gratuitos da Cloudflare e do GitHub, mais o computador do dono como coletor.
- Um único operador na noite.
- Pareceres jurídicos que separam o que pode e o que não pode ir ao ar antes das 17h e durante a apuração.

## Solução

O **Apurador**, em `apurador.org`: um site público, sem login, em português, pensado primeiro para o celular. Ele tem uma **página de lugar** para o Brasil, cada UF, o Exterior e cada município, com o bloco ao vivo em cima e o histórico embaixo.

- **Antes das 17h** (a partir da etapa "Antes da noite", meta qui 22/10): a página do Brasil mostra a lista das pesquisas registradas, com os seis dados do art. 10; o **agregado de pesquisas** com faixa e tendência; a projeção e a chance de vitória antes da apuração; e "O que esperar da noite", com a curva projetada de 0% a 100% e a virada projetada. Os outros lugares mostram a **indicação das pesquisas**. O explorador histórico e a página de metodologia já estão no ar.
- **Às 17h de 25/10** a página passa sozinha ao ao vivo, sem recarregar. Nela aparecem:
  - o **placar oficial** do TSE, sem alteração e em moldura sólida;
  - a **curva real** e a **curva projetada**, com faixa de 95%, a **virada projetada** e o rótulo do **sinal de virada**;
  - a **projeção** com margem e a **chance de vitória**, em moldura tracejada, nas duas **bases da projeção** ("Só apuração" e "Apuração + pesquisas", padrão);
  - a **narração da noite** do lugar;
  - o mapa ou a tabela;
  - o **indicador ao vivo**, que diz se os dados estão andando.
- O **simulador "e se"** deixa o visitante ajustar hipóteses sobre o voto que falta e o comparecimento. A simulação fica numa moldura pontilhada, sempre ao lado da projeção do Apurador.
- **Depois da noite** entram "Como a projeção se saiu" e o 2º turno de 2026 no histórico.

Por trás, o **coletor** roda no computador do dono ([ADR 0001](../../docs/adr/0001-coletor-no-computador-do-dono.md)). A cada 20 s, ele lê o TSE, roda o modelo, gera a narração e grava JSONs estáticos no R2. A CDN da Cloudflare entrega tudo a todos os visitantes, e nenhuma requisição de visitante executa código nosso. O dono opera a noite por um **painel do coletor**, que só mostra, e por comandos de um conjunto fechado. Cada bloco sensível tem uma **chave de publicação**.

## Histórias de usuário

### Página de lugar e placar oficial

1. Como visitante no celular, quero abrir `apurador.org` e cair direto na página do Brasil, para ver o estado da apuração sem navegar.
2. Como visitante, quero ver o placar oficial com os dois candidatos lado a lado, com foto oficial do TSE, nome, partido, % com duas casas e votos, para saber que é o número oficial.
3. Como visitante, quero ver o % de seções totalizadas com "x de y" e a hora da última totalização do TSE, para saber quanto da apuração já aconteceu.
4. Como visitante, quero que o placar oficial tenha moldura sólida, o selo "Placar oficial · TSE" e "Fonte: TSE, sem alteração (CC-BY)", para nunca confundi-lo com um cálculo do Apurador.
5. Como visitante que rola a página, quero uma linha fina fixa no topo só com os números oficiais (Flávio %, Lula %, % de seções · TSE), para não perder o placar de vista.
6. Como visitante, quero os candidatos sempre na mesma ordem (Flávio primeiro, alfabética) e nas mesmas cores (laranja e roxo), para não me confundir na virada.
7. Como visitante, quero uma manchete que comece sempre pelo placar oficial, para entender o momento numa frase.
8. Como visitante, quero que a manchete mostre a diferença em votos quando ela fica abaixo de 0,10 ponto, para entender uma disputa colada.
9. Como visitante, quero que a manchete diga "Virada: …" nos 10 minutos depois de uma virada, para não perder o acontecimento.
10. Como visitante, quero ver "O TSE indica X eleito" quando o TSE der a indicação, com a chance de vitória em 100%, para saber que a eleição está matematicamente definida.
11. Como visitante, quero ver "X foi eleito com Y% dos votos válidos" depois da totalização final, para ter o resultado oficial.
12. Como visitante de uma UF ou de um município, quero ver "terminou a totalização" e "Lula vence na Bahia com …" quando o lugar terminar, para saber o resultado ali.
13. Como visitante de um lugar que ainda não tem seções, quero ver "A apuração ainda não começou neste estado" (ou município), para não achar que o site travou.
14. Como visitante, quero a trilha Brasil › UF › município e uma busca de município ou estado sempre visível no topo, para chegar rápido ao meu lugar.

### Curva e virada

15. Como visitante, quero ver a curva real do placar parcial ao longo do % de seções totalizadas, para ver como a apuração andou.
16. Como visitante, quero ver a curva projetada, tracejada, com a faixa de 95%, para saber para onde o placar parcial deve ir.
17. Como visitante, quero que a escala ignore o começo instável, até 3% das seções, para a curva não ficar achatada.
18. Como visitante, quero ver a virada projetada como um losango sobre uma faixa cinza, para saber quando a liderança deve mudar e com que folga.
19. Como visitante, quero um rótulo curto que diga se há virada projetada, virada possível ou nenhum sinal de virada, com a chance de virada, para saber o que esperar mesmo quando nada vai mudar.
20. Como visitante, quero ver a virada real como um ponto cheio, com "Virada às 18:45, com 87,3% das seções", para lembrar quando ela aconteceu.
21. Como visitante, quero números na curva que batem com os da narração, para ligar o gráfico aos acontecimentos.
22. Como visitante curioso, quero sobrepor a curva de comparação de qualquer turno passado, desligada por padrão, para comparar a noite de hoje com 2018, 2022 ou o 1º turno de 2026.
23. Como visitante antes das 17h, quero ver "O que esperar da noite", com a curva projetada de 0% a 100% e a virada projetada, para entender por que o placar parcial vai enganar no começo.

### Projeção e chance de vitória

24. Como visitante, quero ver o resultado final estimado de cada candidato com uma casa e ± a margem de 95%, para saber onde a apuração deve terminar.
25. Como visitante, quero ver a chance de vitória numa barra dividida, com números inteiros, "<1%" e ">99%", para entender a incerteza sem falsa precisão.
26. Como visitante, quero que a projeção tenha moldura tracejada e o aviso "Estimativa do Apurador. Não é resultado oficial nem garantia do resultado.", para nunca tomá-la por resultado oficial.
27. Como visitante, quero escolher a **Base da projeção** entre "Só apuração" e "Apuração + pesquisas", a noite toda, para ver o que os dados sozinhos dizem.
28. Como visitante, quero ver "As pesquisas pesam X% na projeção agora", para entender quanto as pesquisas ainda contam.
29. Como visitante, quero ver "As duas bases já coincidem aqui" quando elas convergirem, para saber que a escolha não importa mais.
30. Como visitante, quero ver a projeção comparada com o 1º turno, pelo placar entre finalistas, e com a indicação das pesquisas, no formato "Lula +1,8", para saber quem ganhou ou perdeu terreno.
31. Como visitante, quero links "Como calculamos →" que levam à seção certa da metodologia, para entender o número que estou vendo.
32. Como visitante, a partir das 17h, quero um link para "as 8 pesquisas do agregado", para conferir de onde vem a indicação das pesquisas.
33. Como visitante, quero ver a projeção e a chance de vitória antes da apuração na página do Brasil, para saber o que as pesquisas indicam.

### Narração da noite

34. Como visitante, quero uma narração do meu lugar, com o evento mais novo primeiro, com hora e número, para acompanhar o que aconteceu ali.
35. Como visitante no celular, quero o último evento do próprio lugar numa linha sob a manchete e os 5 últimos depois da projeção, com "Ver toda a narração", para não rolar demais.
36. Como visitante no computador, quero a narração completa numa coluna fixa à direita, para acompanhar sem perder o resto da página.
37. Como visitante de uma UF, do Exterior ou de um município, quero ver intercalados, marcados como "Brasil", os quatro eventos principais do Brasil (virada, "as pesquisas deixaram de pesar", indicação do TSE e totalização final), para não perder o quadro geral.
38. Como visitante do Brasil, quero eventos das UFs (viradas, UF que terminou, 50% dos 8 maiores eleitorados), para saber o que acontece nos estados que decidem.
39. Como visitante, quero que cada marco do Brasil diga em que duas regiões está a maior parte das seções que faltam, para entender o que ainda pode mudar.
40. Como visitante, quero que uma virada indecisa vire um evento só ("a liderança trocou 4 vezes entre 18:42 e 18:44; Lula à frente"), para a narração não piscar.
41. Como visitante, quero textos sem ambiguidade ("o estado de São Paulo" e "São Paulo (SP)"), para não confundir o estado com a capital.
42. Como visitante, quero que os eventos preditivos comecem com "Projeção do Apurador:", para separar o que aconteceu do que se espera.
43. Como visitante antes das 17h, quero ver "A narração começa às 17h, com as primeiras seções totalizadas", para saber que ela vai aparecer.
44. Como visitante depois da noite, quero que a narração fique na página como registro, para rever a noite.

### Indicador ao vivo, fases e avisos

45. Como visitante, quero um indicador "Ao vivo" com um anel que se completa em 30 s e o texto "Atualiza sozinho, sem recarregar", para saber que não preciso recarregar a página.
46. Como visitante, quero que os números que mudaram pisquem uma vez e que a curva se estenda, para perceber a novidade.
47. Como visitante, quero tocar no indicador e ver quando foi a última leitura e a última totalização do TSE, para confiar que os dados estão frescos.
48. Como visitante, quero ver "TSE sem novidade desde HH:MM" quando o site está bem e o TSE parou, para não culpar o site.
49. Como visitante, quero ver "Atualizado às HH:MM, atualização interrompida" quando o site parar de receber rodadas por 3 min, para não confiar em dados velhos.
50. Como visitante, quero que, depois de 10 min de interrupção, a página me mande para o app oficial do TSE com um link e mantenha os últimos dados à vista, para continuar acompanhando.
51. Como visitante sem internet, quero ver "Sem conexão · tentando de novo", para saber que o problema é meu.
52. Como visitante, quero ver "Apuração encerrada" depois da totalização final, sem alarme de interrupção, para saber que acabou.
53. Como visitante antes das 17h, quero ver "A divulgação começa às 17h", com contagem regressiva na última hora, e ver a página passar sozinha ao ao vivo às 17h, para não precisar recarregar.
54. Como visitante que prefere movimento reduzido, quero o indicador sem pulso nem pisca, com "próxima leitura em 18 s", e a página inteira funcionando sem efeitos, para usar o site com conforto.
55. Como visitante, quero ver numa faixa abaixo da manchete os avisos que o dono publicar, para saber quando o TSE demora ou o site está instável.
56. Como visitante no plano zero, quero ver "Acompanhe a apuração no app oficial do TSE", com o link, em vez de qualquer dado ao vivo, para nunca ver um placar errado.

### Pesquisas antes das 17h

57. Como visitante, quero ver o agregado de pesquisas do Brasil com faixa de incerteza e a linha de tendência desde 05/10, para entender o quadro antes da apuração.
58. Como visitante, quero o aviso "Média calculada pelo Apurador sobre pesquisas registradas no TSE. Não é uma pesquisa própria.", para saber o que é o agregado.
59. Como visitante, quero a lista das pesquisas do agregado, recolhida, cada uma com os seis dados do art. 10 e o link da fonte, para conferir cada uma.
60. Como visitante de uma UF ou de um município, quero ver a indicação das pesquisas do meu lugar, para saber o que esperar ali.
61. Como visitante, quero que pesquisas e agregado fiquem em blocos separados, para não confundir uma pesquisa com a média.

### Mapa e tabela

62. Como visitante, quero alternar o cartão entre **Mapa | Tabela**, para escolher como ver os lugares.
63. Como visitante do Brasil, quero o mapa por estados que alterna para municípios, para ir do geral ao detalhe.
64. Como visitante, quero a cor de quem lidera, mais forte com vantagem maior, mais transparente com menos seções e cinza sem seções, para ler o mapa de relance.
65. Como visitante, quero o modo "Mudança desde o 1º turno", que usa a projeção enquanto a apuração corre, para ver onde cada candidato ganhou terreno.
66. Como visitante, quero que tocar num lugar abra um cartão com os números e "Abrir a página →", sem navegar de primeira, para explorar sem me perder.
67. Como visitante de uma UF, quero ver os municípios dela, e como visitante de um município, quero ver a UF com ele destacado, para me situar.
68. Como visitante do Exterior, quero uma tabela das cidades, sem mapa, para ver os votos de fora do país.
69. Como visitante, quero ordenar a tabela por % de seções, placar e, no Brasil, projeção, para achar o que procuro.

### Histórico

70. Como visitante, quero um botão por turno (2026 1T, 2022 2T e 1T, 2018 2T e 1T) com as barras de todos os candidatos (nos 1º turnos, os 5 maiores e "demais"), para consultar eleições passadas no meu lugar.
71. Como visitante, quero comparar dois turnos entre o PT e o partido de Bolsonaro (PSL em 2018, PL depois), com o placar entre finalistas nos 1º turnos, e ver onde mais mudou, para entender a evolução do voto.
72. Como visitante depois da noite, quero o 2º turno de 2026 no histórico, com aviso de provisório até os arquivos oficiais do TSE, para consultar o resultado.
73. Como visitante depois da noite, quero ver "Como a projeção se saiu", com o erro das duas bases ao longo da noite e a frase "com 5% das seções, a projeção errava X", para julgar o Apurador.

### Simulador "e se"

74. Como visitante, quero abrir "Simular 'e se' →" numa tela própria, para testar hipóteses sem mexer na página.
75. Como visitante, quero ajustar quanto o voto que falta pende para um candidato no Brasil, de −5 a +5 em passos de 0,5, em relação à projeção, para ver o que mudaria.
76. Como visitante, quero ajustar o voto em cada uma das cinco regiões, de −10 a +10, somado ao do Brasil, para testar hipóteses regionais.
77. Como visitante, quero ajustar o comparecimento por região, de −10 a +10 pontos percentuais em passos de 1, para testar quem vai votar.
78. Como visitante, quero ver ao lado de cada controle a tradução em relação ao 1º turno ("isso dá Lula +4,2 sobre o 1º turno no Nordeste"), para entender a hipótese.
79. Como visitante, quero ver a simulação com resultado ± margem, chance de vitória, curva projetada e tabela das regiões, numa moldura pontilhada com o selo "Simulação · com as suas hipóteses, não é a projeção do Apurador", sempre ao lado da projeção do Apurador, para nunca confundir as duas.
80. Como visitante antes da apuração, quero o par de hipóteses prontas ("As pesquisas subestimam Flávio como no 1º turno" e "… Lula na mesma medida"), para testar o erro das pesquisas com um toque.
81. Como visitante, quero a frase "o que seria preciso" para quem está atrás, com um botão "Aplicar", para saber quanto o voto que falta precisaria pender.
82. Como visitante, quero que a frase diga "mais de 5 pontos" e nunca "impossível", para não confundir a simulação com a indicação do TSE.
83. Como visitante, quero copiar um link da simulação que guarda só a base e as hipóteses, para mostrar a alguém.
84. Como quem recebe o link, quero ver "Simulação de outra pessoa · com os dados de agora", para saber que os números mudaram desde então.
85. Como visitante, quero que a simulação se atualize a cada 30 s com as hipóteses paradas, para acompanhar a noite dentro do simulador.
86. Como visitante que abre o simulador da página de uma UF ou de um município, quero a região daquele lugar já expandida, para começar pelo que me interessa.
87. Como visitante, quero que o simulador herde a base escolhida na página e mostre o peso das pesquisas, para comparar com a mesma referência.
88. Como visitante, quero que o simulador feche com a indicação do TSE ("O voto que falta não muda mais o resultado") e com a totalização final, sempre com link de volta, para não simular o que já está decidido.
89. Como visitante, quero "Zerar" e "Copiar link", para recomeçar e compartilhar.

### Página de metodologia

90. Como visitante sem formação em estatística, quero um cartão "Em um minuto" no topo, para entender o essencial rápido.
91. Como visitante interessado, quero nove seções numeradas com âncoras fixas e as fórmulas recolhidas em "As contas", para ir mais fundo só se eu quiser.
92. Como visitante, quero o sino da distribuição do resultado final com a área de cada lado igual à chance de vitória, para entender de onde vem a chance.
93. Como visitante, quero ver a noite reproduzida (2022 | 2018), com placar parcial, projeção, faixa e resultado, e uma tabela de erros com 5%, 25% e 50% das seções, para julgar o modelo.
94. Como visitante, quero ver o agregado contra o resultado nos seis 2º turnos de 2002 a 2022, para saber quanto as pesquisas erraram.
95. Como visitante, quero a tabela da calibração, para ver como as constantes foram escolhidas sem treinar nada.
96. Como visitante, quero as sete limitações e o aviso "Este teste é otimista", para saber onde o modelo pode falhar.
97. Como visitante, quero a declaração "sem IA generativa nem aprendizagem de máquina", para saber o que o modelo é.
98. Como pesquisador ou jornalista, quero baixar em CSV as pesquisas, o histórico das pesquisas, a calibração e as noites reproduzidas, para conferir os números.

### Identidade, rodapé e acesso

99. Como visitante, quero tema claro ou escuro conforme o sistema, com botão, para ler confortavelmente.
100. Como visitante, quero que tudo fora do placar oficial leve "Cálculo do Apurador com dados do TSE", para separar a camada analítica dos dados do TSE.
101. Como visitante, quero um rodapé com o nome do responsável, o e-mail do projeto, a independência em relação ao TSE, aos candidatos e aos partidos, as atribuições do TSE e do IBGE e o aviso sobre a projeção, para saber quem faz o site.
102. Como visitante, quero navegar sem banner de cookies e sem rastreadores, para não ser rastreado.
103. Como visitante num Android barato no 4G, quero ver o placar e a curva em até 3 s, para acompanhar mesmo com um aparelho fraco.

### Dono do projeto: coletor e noite

104. Como dono, quero que o coletor leia os índices do TSE a cada 20 s e baixe só o que mudou, para ficar perto do TSE sem estourar o limite de 100 req/s.
105. Como dono, quero que o coletor gere as URLs a partir da configuração do TSE, para nunca pedir um arquivo que não existe (404 conta para o bloqueio).
106. Como dono, quero que o coletor pare de pedir ao TSE no primeiro 403 ou 429 e, depois da troca de IP, retome com rodadas a cada 40 s por 15 min, para não renovar o bloqueio.
107. Como dono, quero que o placar publicado seja idêntico ao do arquivo do TSE de cada lugar, para cumprir a lei e nunca publicar um placar errado.
108. Como dono, quero que o coletor grave cada arquivo só quando os bytes mudam, com teto de 1.500 gravações por rodada e trava em 90% do mês, para nunca passar do plano gratuito.
109. Como dono, quero um painel do coletor, um arquivo local que se recarrega a cada 5 s e mostra estado, visto de fora, TSE, placar conferido, projeção, gravação e computador, para ver a noite toda num lugar só.
110. Como dono, quero comandos de terminal que pedem para digitar o nome do bloco como confirmação, para não desligar nada por engano.
111. Como dono, quero ligar e desligar cada chave de publicação (núcleo mínimo, projeção, base Apuração + pesquisas, simulador, mapa e textos preditivos) e ver a mudança no site em até 2 rodadas mais o cache, para reagir na noite sem código novo.
112. Como dono, quero ligar o plano zero desligando o núcleo mínimo e desfazê-lo religando, para tirar o bloco ao vivo do ar e voltar.
113. Como dono, quero publicar um de três avisos prontos, sem texto livre, para informar o visitante sem improvisar.
114. Como dono, quero trocar o destino para o plano B por comando, e ele ficar até o fim da noite, para seguir publicando se o R2 falhar.
115. Como dono, quero receber alertas críticos e de atenção no computador e no celular (ntfy), para saber quando algo pede minha atenção.
116. Como dono, quero que uma sentinela na nuvem me avise quando o arquivo de rodada público parar por mais de 3 min, para saber quando o meu computador ou a minha internet caiu.
117. Como dono, quero que o coletor volte sozinho em menos de 1 min depois de cair, sem repetir nem inventar eventos, para não precisar intervir.
118. Como dono, quero que o coletor retome do último estado no R2 em outra máquina, para ter uma reserva fria.
119. Como dono, quero que o coletor compare o próprio relógio com o cabeçalho `Date` do TSE e alerte acima de 2 s, para não errar a hora dos eventos.
120. Como dono, quero que, na totalização final, o coletor publique a fase "encerrada" e pare sozinho 30 min depois, para poder dormir.
121. Como dono, quero guardar no R2 um objeto comprimido por rodada, com o estado de retomada e os arquivos do TSE da rodada, para auditar, retomar e medir depois o acerto do modelo.
122. Como dono, quero que rodar o modelo de novo sobre os arquivos guardados dê exatamente os números publicados, para provar o que o site mostrou.
123. Como dono, quero rodar o coletor contra os arquivos reais e zerados do TSE por 15 min por dia de 21 a 24/10, publicando numa pasta local, para pegar a tempo qualquer mudança de formato.

### Dono do projeto: pesquisas, ensaio e lançamento

124. Como dono, quero que o Claude atualize o `pesquisas.csv` uma vez por dia e que um verificador confira cada linha no CSV do TSE e faça o CI falhar se algo não bater, para só publicar pesquisas regulares.
125. Como dono, quero um registro datado de cada verificação, para me defender se uma pesquisa for questionada.
126. Como dono, quero retirar uma pesquisa e ver o agregado recalculado no site em até 10 min, só por deploy, para cumprir uma suspensão até as 16h de 25/10.
127. Como dono, quero que o agregado congele às 23h de 24/10, para que a noite use um valor fixo.
128. Como dono, quero que o CI rode os testes e o replay automático em cada pull request e push na `main` e faça o deploy a partir da `main`, para não pôr no ar um build quebrado.
129. Como dono, quero um TSE falso que sirva a noite do 2º turno de 2022 no formato de 2026, com relógio próprio a 3x e 30x, com o limite de 100 req/s e a injeção de 403, para ensaiar a noite inteira.
130. Como dono, quero um ambiente de ensaio separado (Worker, subdomínio e bucket próprios), com `noindex` e a tarja "Ensaio: reprodução da apuração de 30/10/2022. Não é resultado de 2026.", para que nenhum print do ensaio circule como resultado.
131. Como dono, quero scripts que confiram o placar publicado contra o do TSE falso, o atraso visto de fora e a ausência de textos preditivos nos JSONs públicos, para aprovar cada bloco com números.
132. Como dono, quero rodar a calibração com candidatos e regra de escolha escritos antes, e um registro com os números por noite, para escolher as constantes sem treinar nada.
133. Como dono, quero conferir o critério de pronto da etapa "Antes da noite" e registrar o meu de acordo, para abrir o endereço com segurança.
134. Como dono, quero que um deploy que quebre um critério de pronto volte à versão anterior na hora, para o site não ficar errado no ar.
135. Como dono, quero que "Como a projeção se saiu" seja calculado com o mesmo código sobre o arquivo da noite, para o balanço ser honesto.

### Vigia e pessoas do ensaio

136. Como vigia, quero acompanhar o site como visitante, fora da rede do dono e no 4G, e compará-lo com o app do TSE a cada 15 min, para avisar o dono de qualquer diferença.
137. Como pessoa do ensaio, quero uma lista curta do que conferir e o link privado do ensaio, para reportar falhas com hora e print.

## Decisões de implementação

### Módulos e interfaces

Um repositório com workspaces do npm, TypeScript em tudo e testes em Vitest. Seis módulos ([Arquitetura e tecnologia](../apurador-2026/issues/08-arquitetura-e-tecnologia.md), decisão 13), mais dois Workers pequenos.

**`tse`**: lê e normaliza os arquivos do TSE, ao vivo e históricos. É compartilhado.

- **Ao vivo**:
  - **Arquivos**: `https://resultados.tse.jus.br/oficial/ele2026/`, eleição `6258`, cargo `1`, pleito `3221`, com os códigos em `oficial/comum/config/ele-c.json`. Brasil, UF, Exterior (`zz`), município e zona têm o mesmo formato: votos por candidato, brancos, nulos, comparecimento, abstenção, eleitorado das seções totalizadas, seções totalizadas e total, hora da última totalização (`dt`/`ht`), andamento e totalização final (`tf`). Os índices `-ab.json` do Brasil e de cada UF dizem o que mudou.
  - **URLs**: geradas da configuração de municípios e zonas (`mun-e006258-cm.json`), nunca adivinhadas.
  - **Nada fixo no código**: candidatos, municípios e zonas vêm dos arquivos, porque o TSE falso serve 2022 com a geografia de 2022.
  - **Indicação do TSE**: vem do campo do EA20 que o TSE usa para ela. O campo ainda precisa ser conferido no dicionário.
  - **Arquivo que o leitor não entende**: vira um erro tipado, que o coletor transforma em alerta. Fica o último arquivo bom do município.
- **Históricos**:
  - `votacao_candidato_munzona` e `detalhe_votacao_munzona`, só o membro `*_BR.csv`, lido por HTTP *Range*;
  - `detalhe_votacao_secao`, com a hora de recebimento e de primeira totalização de cada seção;
  - `bweb` ou `votacao_secao`;
  - a tabela `municipio_tse_ibge`.
- **Tratamentos**: o Exterior vem como `ZZ` e é um lugar no nível das UFs. Os "nulos técnicos" contam como nulos. Boa Esperança do Norte (MT) existe a partir de 2026.

**`modelo`**: a projeção pura, sem rede nem DOM. É compartilhado pelo coletor, pelo simulador (no navegador), pelo pipeline (metodologia, histórico de acerto, "Como a projeção se saiu") e pelo `ensaio` (calibração). O ponto de partida é o módulo `Projecao` do protótipo (`preparar`, `projetar`, `curvaProjetada`, `viradaProjetada`, `testar`), portado para TypeScript. O que ele faz:

- **Agregado de pesquisas** ([ticket 10](../apurador-2026/issues/10-agregado-de-pesquisas.md)):
  - entram só pesquisas nacionais do 2º turno, com campo a partir de 05/10, de 14 institutos identificados por CNPJ, nunca boca de urna;
  - o estimador é a média simples da última pesquisa de cada instituto com campo terminando nos 7 dias anteriores (14 dias se houver menos de 4 institutos), em válidos: Flávio ÷ (Flávio + Lula);
  - a incerteza é normal, de 1,5 ponto na eleição, e √(1,5² + 0,4² × dias até 25/10) antes dela;
  - a tendência é recalculada dia a dia desde 05/10, com a mesma regra.
- **Indicação das pesquisas**: no Brasil, é o agregado. Nos outros lugares, é o placar entre finalistas do lugar no 1º turno somado a (agregado − 51,0), limitado a 0–100%.
- **Base "Só apuração"** ([ticket 09](../apurador-2026/issues/09-metodo-projecao-so-apuracao.md)):
  - **Método**: transferência de votos por município. A fração dos votos dos eliminados que vai para cada finalista é estimada por UF nos municípios já apurados, com recuo UF → região → Brasil → 1º turno (mínimo de 2.000 votos válidos por nível). Cada município mistura essa estimativa com o próprio placar parcial, pesando metade com 3.000 votos apurados (provisório).
  - **Antes da primeira seção**: parte do placar entre finalistas do lugar.
  - **Diferença deliberada em relação ao protótipo**: no recuo "1º turno", o protótipo divide os eliminados meio a meio (`par = 0,5`). O código segue a decisão e parte do placar entre finalistas ([ticket 11](../apurador-2026/issues/11-combinacao-pesquisas-e-apuracao.md), nota final).
- **Incerteza**: analítica e normal. Somam-se o erro estatístico da referência de cada UF (UFs que herdam a mesma referência erram juntas), a incerteza regional (1 p.p., provisória), a nacional comum a todo o voto que falta (1 p.p., provisória) e a dispersão dos municípios. A chance de vitória é a probabilidade de passar de 50%.
- **Base "Apuração + pesquisas"** ([ticket 11](../apurador-2026/issues/11-combinacao-pesquisas-e-apuracao.md)):
  - **Mesmo modelo**: para o voto que falta de cada município, a estimativa é peso × indicação das pesquisas + (1 − peso) × estimativa da apuração. A correção pelo próprio município fica por cima.
  - **Peso das pesquisas**: K ÷ (K + % de seções totalizadas no Brasil), com K = 0,5% provisório.
  - **Incerteza das pesquisas**: 1,5 ponto nacional, mais uma parte local independente (na UF, 0,13 × a fatia dos eliminados no 1º turno; no município, 0,15 × a mesma fatia). Ela entra multiplicada pelo peso, e a da apuração pelo restante.
  - **Bases que coincidem**: menos de 0,1 p.p. na projeção e menos de 1 ponto na chance de vitória.
- **Curva projetada**: soma o voto que falta de cada município pela ordem de chegada "mistura" (média entre o ritmo do 1º turno e o ritmo observado de cada UF na noite). Antes da apuração, usa a ordem do 1º turno.
- **Virada projetada**: ponto mais faixa (quando a margem de quem está atrás encosta em 50% até quando a curva toda passa).
- **Chance de virada**: a chance de vitória de quem está atrás no placar parcial. Dá três estados, com limites provisórios de 50% e 5% ([ticket 23](../apurador-2026/issues/23-sinal-de-virada.md)).
- **Simulação** ([ticket 13](../apurador-2026/issues/13-simulador-e-se.md)):
  - as hipóteses mexem só no voto que falta de cada município, por cima de toda a estimativa;
  - o voto desloca o % de votos válidos que falta (limitado a 0–100%), e o comparecimento multiplica os votos válidos que faltam;
  - o Exterior segue o Brasil, e a incerteza é a da projeção;
  - "o que seria preciso" é uma busca de ~20 projeções sobre o controle do Brasil.
- **Constantes**: entram como parâmetros, nunca fixas no código: incerteza regional e nacional, peso do próprio município, ordem de chegada, K, limites do sinal de virada, uso da zona. A calibração escolhe os valores, que ficam num arquivo de dados versionado e congelado no fim de 21/10.
- **Executor de noites**: roda uma noite inteira (a sequência de estados da apuração) e resume erro, cobertura e chance honesta. Serve à calibração, ao histórico de acerto e a "Como a projeção se saiu".
- **Zona**: o modelo aceita zonas nos 190 municípios com mais de uma, mas só as usa se a calibração mostrar ganho de pelo menos 0,05 p.p. em todas as noites, sem piorar a cobertura.

**`coletor`**: um processo Node 24 em TypeScript, direto no Windows, sem framework web e sem porta aberta. Faz só conexões de saída.

- **Rodada** (a cada 20 s, ou 40 s no modo depois do bloqueio):
  1. lê os índices;
  2. baixa o que mudou, no máximo uma vez por minuto por arquivo, com ETag/304;
  3. normaliza pelo `tse`;
  4. roda o `modelo` nas duas bases;
  5. gera a narração;
  6. monta os arquivos e grava só os que mudaram;
  7. grava o objeto da noite;
  8. grava o estado em disco;
  9. grava o painel do coletor;
  10. lê o arquivo de controle.
- **Transporte e relógio injetáveis**: o leitor do TSE, o relógio e o destino de publicação entram por parâmetro, para o replay rodar a mesma rodada sem rede e na velocidade máxima. A URL base do TSE é configurável: o TSE real, os arquivos finais do 1º turno de 2026 ou o TSE falso.
- **Uma interface de publicação** com quatro destinos: R2 de produção, R2 do ensaio, republicação do Worker do plano B e pasta local.
- **Proteções**, as únicas ações automáticas:
  - parar de pedir ao TSE no primeiro 403 ou 429;
  - teto de 1.500 gravações por rodada, com o excedente na ordem arquivo de rodada, Brasil, UFs, tabelas e municípios mais antigos;
  - trava em 90% das gravações do mês (só Brasil, UFs, tabelas e arquivo de rodada, mais cada município a cada 5 min), com alerta crítico;
  - na totalização final, publicar a fase "encerrada" e parar 30 min depois.
- **Retomada**: do estado em disco ou, sem ele, do último objeto da noite no R2. Recarrega a narração e os hashes, não reconstrói o passado e não repete eventos. Uma partida sem estado nenhum regrava tudo uma vez (~5.900 gravações).
- **Supervisor**: uma tarefa do Agendador do Windows "ao iniciar o computador" reinicia o coletor sem login.
- **Alertas**: crítico e de atenção, com os limites da [Operação na noite](../apurador-2026/issues/18-operacao-na-noite.md), decisão 7. Chegam por som e notificação no computador e por ntfy no celular. Nenhum alerta age sozinho, salvo a trava de 90%.
- **Comandos da noite**: um programa de terminal (`npm run noite -- <comando>`) pede para digitar o nome do bloco e grava o arquivo de controle. O conjunto é fechado:
  - ligar ou desligar cada chave;
  - plano zero, que é desligar o núcleo mínimo;
  - publicar ou retirar um aviso pronto;
  - trocar para o plano B.

  A retirada de pesquisa é um deploy, não um comando do coletor.

**`pipeline`**: os dados históricos e a malha, rodados fora da noite.

- **Origem**: baixa TSE e IBGE para um cache fora do Git. O repositório guarda só os dados derivados (~2 MB), com manifesto de origem (URL, data de geração do TSE, hash). A construção do site lê só o repositório.
- **Resultados**: por lugar, para 2018 1T/2T, 2022 1T/2T e 2026 1T, e depois o 2026 2T, a partir do último estado da noite e, mais tarde, dos arquivos oficiais.
- **Base do modelo**: os dados do 1º turno de 2026 por município (placar entre finalistas, fatia dos eliminados, aptos, seções) e o perfil de chegada do 1º turno.
- **Noites reconstruídas** seção por seção, com hora ao segundo: 2T de 2022, 2T de 2018 inteiro e 1T de 2026. Servem ao replay, à calibração e à metodologia.
- **Malha**: a do IBGE 2024, simplificada na construção para incluir Boa Esperança do Norte (MT). Fica em TopoJSON, com 0,4 a 1 MB com gzip.
- **Conferência automática**: os totais de cada turno, no Brasil e em cada UF, contra os arquivos oficiais.
- **Pesquisas**:
  - o verificador do `pesquisas.csv` contra o CSV diário do TSE confere o registro, o CNPJ na lista, as datas, as entrevistas e a divulgação liberada, e grava um registro datado em `pesquisas-verificacoes.csv`;
  - o `pesquisas-historicas.csv` traz os 2º turnos de 2002 a 2022, com os resultados de 2002 a 2018 conferidos no TSE.

**`ensaio`**: o TSE falso e as conferências.

- **TSE falso**: serve uma noite reconstruída no formato de 2026 (estrutura da eleição `6258`), com a configuração de municípios e zonas da geografia daquela noite e a indicação do TSE no campo do EA20.
- **Relógio próprio**: velocidade máxima no replay; no ensaio geral, 3x das 16:50 às 20:30 de 2022 e 30x até a totalização final.
- **Limites**: aplica o limite real (100 req/s, com 404 e 304 contando) e registra qualquer violação. Pode responder 403 por um tempo, por comando.
- **Calibração**: roda as três noites com os candidatos escritos antes e gera o registro da calibração, com as noites momento a momento nas duas bases.
- **Scripts de conferência**, os mesmos no replay e no ensaio geral:
  - placar publicado contra o arquivo do TSE falso, com meta de zero divergências;
  - atraso visto de fora, lendo o endereço público como a página lê;
  - nenhum preditivo nos JSONs públicos com a chave desligada;
  - narração factual contra o replay.

**`site`**: Astro, com ~5.800 páginas estáticas de lugar (o bloco histórico já no HTML), a página de metodologia e o painel de antes das 17h.

- **Ilhas em Preact**: o bloco ao vivo e o simulador.
- **Gráficos**: SVG feito à mão com partes pequenas do D3 (escalas, linhas).
- **Mapa**: d3-geo e TopoJSON em SVG. Passa para canvas se não desenhar todos os municípios em até 2 s no Android barato.
- **Audiência**: Cloudflare Web Analytics, sem cookies.
- **Deploy**: static assets num Worker. O ensaio usa um Worker separado, com `noindex` e a tarja.

**Workers auxiliares**:

- **Plano B**: um Worker só com os JSONs ao vivo como static assets, republicado a cada minuto quando o dono aciona o plano B. São ~5.820 arquivos, dentro dos 20.000 por versão.
- **Sentinela**: um Worker com Cron Trigger a cada minuto. Lê o arquivo de rodada público e manda alerta pelo ntfy se ele parar mais de 3 min.

### Contratos dos arquivos ao vivo

Revistos pelo [Volume de gravações na noite](../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md):

- **Arquivo de rodada** (~0,3 KB): o que é nacional e vale para todo lugar.
  - a hora da rodada, a fase (antes das 17h, ao vivo, encerrada) e a hora da última novidade do TSE;
  - o estado de cada chave e o aviso pronto ativo;
  - o peso das pesquisas;
  - os quatro eventos do Brasil intercalados nas outras narrações.

  É ele que separa "TSE sem novidade" de "interrompido" e que muda a fase.
- **JSON do Brasil, de cada UF e do Exterior** (Brasil 3 a 8 KB, UF 2 a 3 KB, com gzip): completos.
  - os dados do TSE do lugar (placar parcial, % de seções, x de y, hora, curva real);
  - nas duas bases: projeção, margem, chance de vitória, curva projetada, virada projetada, chance de virada e estado do sinal de virada;
  - as comparações com o 1º turno e com a indicação das pesquisas, e "as duas bases coincidem";
  - a narração do lugar.
- **JSON do município** (0,4 a 0,6 KB): só o que vem do arquivo do TSE dele (placar parcial, % de seções, hora, curva real) e a narração dele. É gravado quando chega novidade do TSE ou sai um evento.
- **Tabela de projeções por UF** (28, contando o Exterior; 68 KB somadas): por município, nas duas bases, a projeção, a margem, a chance de vitória, a virada projetada e os votos válidos projetados. A página de município desenha a própria curva projetada ligando o placar à projeção, sem modelo no navegador. A mesma tabela alimenta a tabela de municípios da página de UF.
- **`mapa.json`** (~25 KB com gzip): baixado só com o mapa na tela.
- **Arquivo do simulador**: os dados por município na precisão do modelo, baixados só quando o simulador abre.
- **Objeto da noite**: um objeto comprimido por rodada no R2, com o estado de retomada (narração, hashes, chaves e contador de gravações) e os arquivos do TSE que chegaram nela.
- **Precisão**: os arquivos levam os números como a página os mostra. Os do TSE vão com duas casas, a projeção e a margem com uma, e a chance e o % da virada inteiros. A exceção é o arquivo do simulador.
- **Gravação**: cada arquivo é gravado só quando os bytes mudam, com o hash guardado no estado. Os JSONs vão com gzip (`Content-Encoding: gzip`). Se o ensaio 1 mostrar que a borda não os entrega certos, com ETag e 304, o coletor grava sem compressão.
- **Orçamento**: ~135 mil gravações por noite e ~370 mil no mês, contando os dois ensaios gerais, contra 1 milhão de operações classe A do plano gratuito.

### Entrega aos visitantes

- **Endereços**:
  - site em `apurador.org`;
  - JSONs ao vivo no R2 em `ao-vivo.apurador.org`, com Cache Rule que respeita o `Cache-Control` da origem, Tiered Cache e TTL do navegador em "Respect Existing Headers";
  - até o domínio existir, produção em `*.workers.dev` com `noindex`. Depois, o `*.workers.dev` fica só como plano B, nunca divulgado.
- **Ritmo**: a CDN guarda cada JSON por 15 s. A página relê a cada 30 s, com `If-None-Match`. O atraso esperado sobre o app do TSE é de ~35 s em média e ~70 s no pior caso.
- **A página conhece os dois endereços**: lê o principal e passa ao do plano B se ele der erro ou tiver arquivo de rodada com mais de 2 min, ficando com a rodada mais nova.
- **Relógio**: a fase e o "interrompido" saem do arquivo de rodada, comparado com o cabeçalho `Date` da resposta da CDN, nunca com o relógio do aparelho.
- **Indicador ao vivo**: um componente só, com seis estados: antes das 17h, ao vivo, TSE sem novidade, interrompido (3 min sem rodada, e o link para o app do TSE depois de 10 min), sem conexão e encerrada. Fica no cartão do placar oficial, na linha fixa e na barra do simulador.
- **Escala**: nenhuma requisição de visitante executa código nosso. A meta é 100 mil visitantes simultâneos.

### Chaves de publicação

São chaves por bloco, que mudam o que vai ao ar sem código novo:

- **Núcleo mínimo**: placar oficial, curva real, indicador ao vivo e narração factual. Desligada, é o plano zero.
- **Projeção**: projeção, chance de vitória, curva projetada e sinal de virada. Desligada, desliga também o simulador.
- **Base Apuração + pesquisas**: desligada, o controle de base some, e só "Só apuração" aparece.
- **Simulador**.
- **Mapa**: desligada, fica só a tabela.
- **Textos preditivos**: desligada até a [Confirmação dos textos preditivos](../apurador-2026/issues/22-confirmacao-dos-textos-preditivos.md). Desligada, o coletor calcula os preditivos por dentro, para manter as travas, mas eles não entram em nenhum JSON público. Ligada no meio da noite, eles entram dali em diante, sem nada retroativo. Desligada de novo, somem todos, inclusive os passados e a frase de projeção da manchete.
- **Antes das 17h**: o agregado e a tendência, a projeção e a curva, e o simulador. Hoje estão ligadas.

Antes de o coletor rodar (etapa "Antes da noite"), as chaves vêm de um arquivo de dados publicado com o site, que muda por deploy sem código novo. Com o coletor no ar, vêm do arquivo de rodada.

### Regras de conteúdo

- **Dados do TSE**: aparecem como o TSE publica, com duas casas, em todo o site (tabelas, cartões do mapa, linha fixa). Só os cálculos do Apurador são arredondados, e tudo o que fica fora do placar oficial leva "Cálculo do Apurador com dados do TSE".
- **Comparações com o 1º turno**: usam sempre o placar entre finalistas (Brasil: 51,0 × 49,0), nunca o % sobre todos os válidos. Durante a apuração, comparam a projeção; depois do fim, o resultado.
- **Indicação do TSE**: só ela torna a eleição "matematicamente definida", e só no Brasil. Com ela, a chance vai a 100%, e o sinal de virada e o simulador param. Na totalização final, a caixa da projeção sai. UFs e municípios mostram só "totalização final".
- **Narração** ([ticket 14](../apurador-2026/issues/14-narracao-da-noite.md)):
  - **Eventos factuais**: começo, marcos (10, 25, 50, 75, 90, 95 e 99% no Brasil, nas UFs e no Exterior; só 50% nos municípios; só o mais alto quando vários caem na mesma rodada), fim, virada (só depois de 3% das seções do lugar, com as trocas dentro de 10 minutos num evento só), "as pesquisas deixaram de pesar" (uma vez, no Brasil) e indicação do TSE.
  - **Marcos do Brasil**: dizem as duas regiões com a maior fatia das seções que faltam.
  - **Na narração do Brasil**: entram as viradas em UF, as UFs que terminam e os 50% de SP, MG, RJ, BA, RS, PR, PE e CE.
  - **Eventos preditivos**: a mudança do sinal de virada, depois de durar 3 rodadas; a chance passando de 90% e de 99%, que só dispara de novo depois de cair abaixo de 80% e de 95%; e a linha da projeção nos marcos. O coletor gera os das duas bases, e a página mostra os da base escolhida.
  - **Prioridade na mesma rodada**: virada; indicação do TSE ou totalização final; preditivo; marco; "as pesquisas deixaram de pesar".
  - **Hora**: o `ht` do arquivo do TSE em que o evento foi visto, em HH:MM de Brasília.
  - **Textos**: os modelos de texto e as manchetes estão nas decisões 8 e 9 do ticket.
- **Avisos fixos**:
  - na projeção: "Estimativa do Apurador. Não é resultado oficial nem garantia do resultado.";
  - no agregado: "Média calculada pelo Apurador sobre pesquisas registradas no TSE. Não é uma pesquisa própria.";
  - os três avisos prontos da [Operação na noite](../apurador-2026/issues/18-operacao-na-noite.md), decisão 10.
- **Palavras proibidas**: nenhum texto diz que o modelo "aprende", que é "IA" ou que faz "previsão". A metodologia declara "sem IA generativa nem aprendizagem de máquina".
- **Neutralidade**: laranja para Flávio (`#c2410c`; `#f0793f` no escuro) e roxo para Lula (`#6d28d9`; `#a68bf7` no escuro), na ordem alfabética fixa. O indicador ao vivo é grafite. Nada de vermelho nem de verde e amarelo. As fotos oficiais do TSE vão sem alteração.
- **Tipografia**: Source Serif nos títulos e na manchete, Inter no resto e algarismos de largura fixa.
- **Rodapé**: o nome completo do dono, o e-mail do projeto, a independência em relação ao TSE, aos candidatos e aos partidos, a atribuição do TSE (CC-BY) e "Malha: IBGE, Malha Municipal Digital 2024, CC BY 4.0, simplificada pelo Apurador". Sem CPF nem endereço.

### Telas

- **Página de lugar**: segue a variante D do protótipo das [Telas da página de lugar](../apurador-2026/issues/12-telas-da-pagina-de-lugar.md), com a ordem e os detalhes das decisões 1 a 14 e dos comentários de lá.
- **Simulador**: segue a decisão 13 do [Simulador "e se"](../apurador-2026/issues/13-simulador-e-se.md).
- **Página de metodologia**: segue a variante A do protótipo da [Página de metodologia](../apurador-2026/issues/20-pagina-de-metodologia.md), com "Em um minuto", as nove seções com âncoras fixas (`#pesquisas`, `#chance`, `#apuracao`, `#juntas`, `#virada`, `#acerto`, `#constantes`, `#limites` e `#fontes`) e os textos do objeto `T` do protótipo como ponto de partida. Os números das seções 6 e 7 saem do executor de noites do `modelo`, rodado no build sobre as noites da calibração. Nada vem do protótipo.
- **Protótipos**: são referência visual, não código de produção. A noite e a projeção do protótipo das telas são imitações e não devem ser portadas.

### Etapas de lançamento e congelamento

([Plano de lançamento em fases](../apurador-2026/issues/19-plano-de-lancamento-em-fases.md))

- **Antes da noite** (meta qui 22/10, 12h, em `apurador.org`): páginas de lugar com o histórico, lista das pesquisas, agregado, painel de antes das 17h, metodologia (seções 1 a 5, 8 e 9) e rodapé. O simulador entra se estiver pronto. Vai ao ar como build estático, sem o coletor. Só abre com os nove itens do critério de pronto verdadeiros e o de acordo do dono no registro do lançamento. Se atrasar, o limite é a manhã de 24/10, com o build do ensaio 2.
- **Noite**: o build aprovado no ensaio 2, com as seções 6 e 7 da metodologia.
- **Depois** (a partir de 26/10): "Como a projeção se saiu" e o 2º turno de 2026 no histórico, provisório, de manhã. À tarde, o repositório fica público, depois da varredura de segredos. Quando chegarem os arquivos oficiais, o 2º turno de 2026 passa a eles.
- **Congelamento**: depois do ensaio 2 (23/10), nada de função nova em lugar nenhum do site. Até as 18h de 24/10, só correções e texto da metodologia. Até as 23h de 24/10, os dados das pesquisas. Na noite, só a retirada de pesquisa até as 16h e a correção do `tse` se o TSE mudar o formato.

## Decisões de teste

### O que é um bom teste aqui

- **Comportamento externo**: o teste confere o que sai na fronteira (os arquivos publicados, os números do modelo, o que a página mostra), nunca funções internas nem a forma dos dados intermediários.
- **Referências reais**: os números são comparados com referências externas, como os resultados oficiais do TSE, os números do protótipo, a medição da narração de 2022 e as contas de gravações do ticket 24, nunca com o próprio código.
- **Determinismo**: nada de rede nem de relógio real nos testes. O relógio e o transporte são injetados.
- **Os mesmos scripts**: as conferências do ensaio geral (placar idêntico, preditivos ausentes, narração) rodam também no replay automático, para que o CI e o ensaio meçam a mesma coisa.

### Fronteiras de teste

Saem de decisões já aceitas: os testes no CI da [Arquitetura e tecnologia](../apurador-2026/issues/08-arquitetura-e-tecnologia.md), decisão 12; os seis módulos da decisão 13; e o replay e os critérios do [Ensaio geral](../apurador-2026/issues/15-ensaio-geral.md), decisões 1 e 20 a 22. O dono deve confirmar que elas batem com o que espera antes de virarem tickets.

1. **O replay da noite (a fronteira principal)**: o coletor inteiro, rodada a rodada, sobre o TSE falso servindo o 2º turno de 2022 na velocidade máxima, publicando na pasta local. Exercita `tse`, `modelo`, `coletor` e `ensaio` juntos. Confere:
   - **Placar**: o publicado é idêntico ao do arquivo do TSE falso em todas as rodadas e lugares.
   - **Narração factual do Brasil**: ~50 eventos, uma única virada às ~18:44 (sem a troca de 0,26%) e as 4 viradas em UF (MG duas vezes, AP e AM), conforme a [medição de 2022](../apurador-2026/research/14-narracao-noite-2t-2022.md).
   - **Janela de 10 minutos**: fica no teste da narração, sobre a série de 2022 ao segundo. O replay lê o Brasil uma vez por minuto, e nesse ritmo nenhuma fase do relógio vê mais de duas trocas: ali, duas fases conferem só que o Brasil tem uma virada (ticket 15).
   - **Textos preditivos**: com a chave desligada, nenhum preditivo em nenhum arquivo público de nenhuma rodada. Ligada no meio, só dali em diante. Desligada de novo, nenhum.
   - **Retomada**: derrubar o coletor numa rodada e retomar do disco ou do objeto da noite não repete nem inventa eventos.
   - **Gravações**: só o que mudou é gravado, o teto de 1.500 por rodada não é atingido, e o total fica na ordem das contas do ticket 24.
   - **Fase e chaves**: a fase passa de antes das 17h a ao vivo e a encerrada. Cada chave muda o arquivo de rodada e o que vai nos JSONs, e o plano zero tira os dados ao vivo.
   - **Bloqueio**: um 403 do TSE falso faz o coletor parar de pedir, e nenhuma violação do limite é registrada.
   - **Projeção**: erro de até 0,5 p.p. depois de 5% das seções; resultado dentro da margem de 95% depois de 1%; "sem sinal de virada" nunca aparece no Brasil antes das 18:44; "as pesquisas deixaram de pesar" acontece uma vez.
   - **Reprodutível**: rodar o modelo de novo sobre os objetos da noite dá os mesmos números publicados.
2. **O módulo `modelo`**: funções puras sobre dados simples. Confere:
   - **Porte fiel**: no 2º turno de 2022, com as constantes provisórias, os números do protótipo com diferença de até 0,01 p.p. A única exceção é o recuo "1º turno", que segue a decisão e não o meio a meio.
   - **Agregado**: Flávio 51,0% com 8 institutos sobre o `pesquisas.csv` de 18/10; a janela passa a 14 dias com menos de 4 institutos; a incerteza de 18/10 é de 1,84 ponto, com chance de ~71%.
   - **Peso das pesquisas**: metade com 0,5% das seções e menos de 10% depois de 5%, com K = 0,5%.
   - **Simulador**: o par simétrico de hipóteses dá resultados espelhados; "o que seria preciso" leva o resultado a 50%; hipóteses zeradas reproduzem a projeção.
   - **Sinal de virada**: os três estados nos limites.
   - **Executor de noites**: os números do histórico de acerto de 2022 (por exemplo, erro de 0,1 com 5% das seções e cobertura de 98% depois de 1%) com as constantes provisórias.
3. **A página**:
   - **Leitor ao vivo**: a lógica que a ilha usa para decidir o que mostrar, testada com respostas simuladas (status, cabeçalho `Date`, ETag e corpo) e relógio injetado. Confere os seis estados do indicador, os 3 e os 10 min da interrupção, a passagem das 17h sem recarregar, a troca para o plano B (erro ou rodada com mais de 2 min, ficando com a mais nova), as chaves e os avisos prontos.
   - **Build estático**: as ~5.800 páginas se constroem. Os avisos, as atribuições do TSE e do IBGE, o rodapé e os seis dados do art. 10 estão no HTML. Nenhum texto proibido ("aprende", "IA" fora da declaração, "previsão") aparece.

**Conferências de dados no CI** (não são fronteiras de código, mas falham o build):

- o verificador do `pesquisas.csv` contra o CSV do TSE;
- os totais históricos contra os arquivos oficiais;
- o manifesto de origem dos dados derivados.

**Fora do CI**: a calibração (20 e 21/10) e o ensaio geral (22 e 23/10) usam essas mesmas fronteiras sobre a infraestrutura real e seguem os critérios das decisões 13 a 23 do [Ensaio geral](../apurador-2026/issues/15-ensaio-geral.md). Os registros dos ensaios ficam no repositório.

### Precedentes

Não há código de produção ainda. As referências são:

- o `Projecao.testar` do protótipo do método (branch `prototipo/metodo-projecao`), que já mede erro, cobertura e chance;
- a tabela de desempenho do [ticket 09](../apurador-2026/issues/09-metodo-projecao-so-apuracao.md);
- a [medição da narração de 2022](../apurador-2026/research/14-narracao-noite-2t-2022.md);
- as contas de gravações e tamanhos do [ticket 24](../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md);
- os números da noite de 2022 no [ticket 20](../apurador-2026/issues/20-pagina-de-metodologia.md).

## Fora do escopo

- **Outros cargos**: governadores e qualquer cargo além de Presidente.
- **Recortes menores que município no site** (zona, local de votação, bairro, seção). Seções e zonas podem ser usadas por dentro do modelo.
- **Eleições anteriores a 2018** no explorador histórico. As pesquisas de 2002 a 2022 entram só no histórico do agregado da metodologia.
- **Login, contas e personalização.**
- **Coletor na nuvem ou coletor reserva na nuvem** ([ADR 0001](../../docs/adr/0001-coletor-no-computador-do-dono.md)). Também ficam de fora Workers dinâmicos para visitantes, KV, `r2.dev`, GitHub Pages, Cloudflare Tunnel e servir visitantes do computador do dono.
- **Pesquisas estaduais** no modelo e no site, erro por UF e erro ou ajuste por instituto.
- **Engajamento não escolhido**: cards para compartilhar, palpites de visitantes e qualquer votação aberta, que seria uma enquete.
- **3D e efeitos**: mapa de picos em three.js, parallax e brilho na faixa de incerteza não entram antes de 25/10. Construí-los depois é decisão futura do dono.
- **No simulador**: mapa, resultado por lugar, hipóteses por UF, K e transferência de votos como hipóteses, e imagem de prévia por simulação.
- **Ações descartadas da noite**: pausar a publicação, voltar a um estado anterior e qualquer texto livre do dono no site.
- **Modo especial para a reserva de internet.** O plano de guardar o arquivo da noite no disco enquanto a conexão for o celular fica pronto, mas não construído, salvo se o ensaio 1 medir mais de 500 MB por noite.
- **Leitor automático da Wikipédia para as pesquisas.** Só entra se sobrar tempo; a coleta é manual.
- **Boletins por seção ao vivo e teste de carga contra a Cloudflare.**
- **Rastreadores** (Google Analytics, pixels de anúncio).

## Notas

- **Calendário**:
  - 19/10: a construção começa;
  - 20 e 21/10: calibração, com as constantes congeladas no fim de 21/10;
  - 22/10: etapa "Antes da noite" às 12h e ensaio geral 1 à noite;
  - 23/10: ensaio geral 2, o de aprovação;
  - 24/10: correções até as 18h, coletor contra o TSE zerado publicando na produção das 19h às 19h30, e último deploy das pesquisas até as 23h;
  - 25/10: a noite, com as chaves conferidas às 16h e a fase ao vivo às 17h;
  - 26/10: etapa "Depois".
- **Prioridade**: o núcleo mínimo vem antes de tudo, depois a projeção, a base Apuração + pesquisas, o simulador, o mapa e os textos preditivos. O explorador histórico só entra no que couber sem atrasar o núcleo. Se faltar tempo, saem primeiro a comparação de turnos e os gráficos extras da metodologia.
- **Pendências do dono** (HITL), que bloqueiam partes da construção:
  - comprar `apurador.org` (meta 19/10, limite 21/10);
  - criar o e-mail do projeto antes de 22/10;
  - gravar os secrets `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no GitHub;
  - criar as chaves de escrita só nos buckets de produção (`apurador-ao-vivo`) e do ensaio, e colá-las no `.env` do coletor;
  - antes do ensaio 2 (23/10), as chaves dos buckets privados dos objetos da noite: os buckets `apurador-noite` (produção) e `apurador-ensaio-noite` (ensaio), sem domínio, foram criados em 22/10; faltam as chaves, uma "Object Read & Write" só em cada um, coladas no `.env` do coletor (`R2_NOITE_*` e `R2_ENSAIO_NOITE_*`; passos em `packages/coletor/cloudflare/README.md`, "Os objetos da noite");
  - preparar o computador até 21/10;
  - instalar o ntfy, criar o tópico e colá-lo no `.env` do coletor, e ligar a sentinela (KV, deploy e segredo, em `packages/coletor/cloudflare/README.md`). Em 22/10, o tópico já está no `.env` e o alerta de teste foi aceito pelo ntfy. O KV `apurador-sentinela` foi criado em 22/10, com o `id` no `sentinela.jsonc`. Faltam assinar o tópico no app do celular e publicar as duas sentinelas, a do ensaio e a da noite, cada uma com o tópico como segredo; a do ensaio, só depois do domínio `ao-vivo-ensaio.apurador.org`;
  - medir o nobreak;
  - escolher o vigia;
  - confirmar 1 GB livre no celular.
- **Em aberto**:
  - a [Confirmação dos textos preditivos](../apurador-2026/issues/22-confirmacao-dos-textos-preditivos.md) ainda não chegou. Tudo é construído com a chave desligada e pronto para ser ligado na noite;
  - o campo do EA20 da indicação do TSE precisa ser conferido;
  - a entrega pela borda de objetos gravados com gzip no R2 é conferida no ensaio 2 (em 22/10, o ensaio 1 passou ao `npm run noite-local`, sem o R2);
  - a zona entra ou não pela calibração.
- **Protótipos de referência**: branches `prototipo/metodo-projecao` (o módulo `Projecao`), `prototipo/telas-pagina-lugar` (variante D, `componentes.js`, `mapa.js`) e `prototipo/pagina-metodologia` (variante A, objeto `T`, gráficos `svgSino`, `svgNoite`, `svgHist`). Nenhuma branch de protótipo entra na `main`.
  - A série de 2022 nas duas bases, com o agregado real e deslocado, é o `prototipos/pagina-metodologia/serie2022.js` da última. O ticket 08 a copiou para os testes do `modelo`. Diferença deliberada: a série soma as incertezas locais das pesquisas como independentes, e o modelo as anula no lugar de cima, por decisão do dono no [ticket 08](issues/08-base-apuracao-mais-pesquisas.md).
- **ADR**: a especificação segue o [ADR 0001](../../docs/adr/0001-coletor-no-computador-do-dono.md), sem conflito.
- **Vocabulário**: os tickets usam termos que ainda não estão no `GLOSSARY.md` e que esta especificação repete: arquivo de rodada, tabela de projeções, objeto da noite, TSE falso, replay automático, núcleo mínimo e arquivo de controle. Vale registrá-los com o `/domain-modeling` antes dos tickets de construção.
- **Próximo passo**: quebrar esta especificação em tickets de construção com o `/to-tickets`, em `issues/NN-<slug>.md` nesta mesma pasta.
