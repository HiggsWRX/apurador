# Narração da noite

Type: grilling
Status: resolved
Blocked by: 01
Map: [Apurador 2026](../map.md)

## Question

Que eventos a narração da noite gera automaticamente, com que regras e com que texto?

- Catálogo de eventos: virada, marcos de % de seções totalizadas (no Brasil e por UF), chance de vitória cruzando limiares, projeção mudando de forma relevante, lugar "decidido" matematicamente, chegada de um estado grande, discrepância grande entre pesquisas e apuração num lugar.
- Regras contra excesso de mensagens: limiares, intervalo mínimo e prioridade.
- Tom e modelos de texto neutros.
- Se a narração existe por lugar ou só no Brasil.

Fatos de [API ao vivo do TSE](01-api-ao-vivo-tse.md): cada arquivo traz a hora da última totalização (`dt`/`ht`) e o andamento (`and`: não iniciada, parcial, finalizada), o que permite marcos como "UF X terminou". Não há arquivo de eleitos para Presidente; o resultado final vem do arquivo nacional (`tf="s"`). Os horários vêm sem fuso, provavelmente de Brasília.

De [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md): a narração é gerada pelo coletor, que tem o histórico da noite, e publicada pronta, igual para todos (decisão 1). Ela vai no JSON de cada lugar se existir por lugar (decisão 18). O coletor relê o TSE a cada 20 s, e o visitante fica ~35 s atrás do app oficial (decisão 17).

De [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md): a discrepância entre pesquisas e apuração num lugar é medida contra a **indicação das pesquisas** daquele lugar. Comparações com o 1º turno usam o **placar entre finalistas**, nunca o % sobre todos os válidos.

De [Telas da página de lugar](12-telas-da-pagina-de-lugar.md):
- **No celular**: o último evento aparece numa linha sob a **manchete**, e a lista dos 5 últimos vem depois da projeção, com "Ver toda a narração".
- **No computador**: a lista completa fica numa coluna fixa.
- **Na curva**: os eventos aparecem como números que batem com os da lista. Hoje são virada, marcos, "pesquisas param de pesar" e indicação do TSE.
- **Manchete**: a regra é a da decisão 5 desse ticket, que também gera texto e precisa do mesmo tom.
- **Nomes ambíguos**: no protótipo, "São Paulo terminou" confundia o estado com a capital na página do município. O texto precisa distinguir os dois.

De [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md): "As pesquisas deixaram de pesar" é um evento candidato. Ele acontece quando as duas bases da projeção passam a coincidir no Brasil (menos de 0,1 p.p. na projeção e menos de 1 ponto na chance de vitória). O JSON traz o peso das pesquisas a cada rodada.

De [Segunda consulta jurídica](21-segunda-consulta-juridica.md) (decisão 5 de lá): **textos preditivos automáticos ficam desligados durante a apuração** até a [Confirmação dos textos preditivos](22-confirmacao-dos-textos-preditivos.md).
- O catálogo precisa separar os eventos **factuais** (virada real, marcos de % de seções, UF que terminou, indicação do TSE, "as pesquisas deixaram de pesar"), que vão ao ar, dos **preditivos** (chance cruzando limiares, projeção mudando, mudança do sinal de virada), que ficam atrás da chave.
- A manchete fica só com o placar oficial enquanto a chave estiver desligada.
- Os textos preditivos do catálogo também precisam estar prontos, porque a chave pode ser ligada na própria noite.
- De [Sinal de virada](23-sinal-de-virada.md): com a chave ligada, os três estados (virada projetada, virada possível, sem sinal de virada) viram frases, como "Sem sinal de virada: Flávio deve seguir à frente até o fim".

## Answer

Resolvido em 18/10/2026 em conversa com o dono do projeto, que aceitou todas as recomendações em quatro rodadas. As regras foram testadas na noite do 2º turno de 2022, reconstruída seção por seção e conferida contra o histórico oficial: [research/14-narracao-noite-2t-2022.md](../research/14-narracao-noite-2t-2022.md).

**Em uma linha**: cada lugar tem a sua narração, com os principais eventos do Brasil intercalados. Os eventos factuais vão sempre ao ar. Os preditivos dependem da chave de textos preditivos e, com ela desligada, nem entram nos arquivos públicos.

**Decisões** (aceitas pelo dono do projeto):

1. **Onde existe**: em cada lugar, com os eventos do próprio lugar. Nas páginas de UF, Exterior e município entram, intercalados e marcados como "Brasil", quatro eventos do Brasil: a virada, "as pesquisas deixaram de pesar", a indicação do TSE e a totalização final. Os números na curva marcam só os eventos **factuais** do próprio lugar. Os eventos do Brasil nas outras páginas e os preditivos ficam só na lista.
2. **Eventos factuais** (sempre no ar):
   - **Começo**: a primeira seção totalizada do lugar. No Brasil, "Começa a divulgação".
   - **Marcos**: no Brasil, nas UFs e no Exterior, 10, 25, 50, 75, 90, 95 e 99% das seções. Nos municípios, só 50%. Quando vários marcos são cruzados na mesma rodada, sai só o mais alto, e um município totalizado de uma vez ganha só "terminou".
   - **Fim**: no Brasil, a totalização final. Nos outros lugares, "terminou a totalização".
   - **Virada**: troca de líder no placar parcial, contada só depois de o lugar passar de 3% das suas seções, o mesmo corte da escala da curva. A primeira troca publica o evento na hora. Trocas seguintes dentro de 10 minutos atualizam esse mesmo evento ("a liderança trocou 4 vezes entre 18:42 e 18:44; Lula à frente"), e o número na curva fica na primeira.
   - **"As pesquisas deixaram de pesar"**: uma vez na noite, quando as duas bases coincidem no Brasil, pela regra de [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md).
   - **Indicação do TSE**: só no Brasil.
   - **Onde falta apurar**: cada marco do Brasil ganha uma frase com as duas regiões de maior fatia das seções ainda não totalizadas. A regra é sempre a mesma, para não escolher a região conforme o candidato.
3. **Eventos das UFs na narração do Brasil**: entram as viradas em UF, cada UF que termina e os 50% dos 8 maiores eleitorados (SP, MG, RJ, BA, RS, PR, PE e CE). Nenhum evento de município entra. Em 2022, isso daria cerca de 50 eventos, no máximo 3 por rodada e 7 por 10 minutos, então não há intervalo mínimo nem descarte.
4. **Fora do catálogo**:
   - **Discrepância entre pesquisas e apuração**: só a projeção permite a comparação, porque o placar parcial depende da ordem de chegada. A comparação fica no bloco da projeção.
   - **"Projeção mudando" como evento solto**: substituído pela linha da projeção nos marcos (decisão 5).
   - **Simulação**: nunca entra, como já previa o [Simulador "e se"](13-simulador-e-se.md).
5. **Eventos preditivos** (atrás da chave, por lugar):
   - **Sinal de virada**: a mudança entre "sem sinal", "possível" e "projetada", publicada só depois de durar 3 rodadas (~1 min).
   - **Chance de vitória**: passando de 90% e de 99%. Cada limiar só dispara de novo depois de a chance ter caído abaixo de 80% e de 95%.
   - **Linha da projeção**: entra em cada marco. Com a chave desligada, ela some e o marco continua factual.
   - **Bases**: o coletor gera os preditivos das duas bases da projeção, e a página mostra os da base escolhida pelo visitante. Os factuais são os mesmos nas duas.
6. **Chave de textos preditivos e arquivos públicos**:
   - **Desligada**: o coletor calcula os preditivos por dentro, para manter as travas, mas eles não entram nos JSONs públicos. Não basta o navegador escondê-los.
   - **Ligada no meio da noite**: os preditivos entram só a partir desse momento, sem publicação retroativa.
   - **Desligada de novo**: somem dos JSONs todos os preditivos, inclusive os passados, e também a frase de projeção da manchete.
7. **Forma do texto**:
   - Frases curtas, no presente e sem adjetivos ("histórica", "dispara").
   - A hora é o `ht` do arquivo do TSE em que o evento foi visto, em HH:MM de Brasília.
   - Números do TSE com duas casas. O % é sempre o observado, nunca arredondado para o marco. Os candidatos vêm sempre na ordem alfabética fixa (Flávio, Lula).
   - Estado sempre com "estado" ("o estado de São Paulo", "o Distrito Federal", "o Exterior"). Município sempre com a UF entre parênteses ("São Paulo (SP)").
   - O bloco leva o selo "Narração do Apurador com dados do TSE". Os eventos preditivos começam com "Projeção do Apurador:".
8. **Modelos de texto** (os números são ilustrativos):

   | Evento | Texto |
   |---|---|
   | Começo, Brasil | "17:00 · Começa a divulgação: 0,02% das seções totalizadas no Brasil." |
   | Marco, Brasil | "18:26 · Passa de 50% das seções totalizadas no Brasil: 50,34%. Flávio 50,43%, Lula 49,57%. Das seções que faltam, 51% são do Sudeste e 30% do Nordeste." |
   | Virada | "18:44 · Virada no Brasil: Lula passa à frente no placar parcial, com 67,74% das seções totalizadas." |
   | UF grande a 50% | "18:38 · Passa de 50% das seções totalizadas no estado de São Paulo: 50,12%. Flávio 55,40%, Lula 44,60%." |
   | Fim, UF | "21:03 · O estado de São Paulo terminou a totalização. Flávio 55,12%, Lula 44,88%." |
   | Fim, município | "19:27 · Salvador (BA) terminou a totalização. Flávio 27,88%, Lula 72,12%." |
   | Pesquisas | "17:26 · As pesquisas deixaram de pesar na projeção: com 5,12% das seções totalizadas no Brasil, as duas bases coincidem." |
   | Indicação do TSE | "19:56 · O TSE indica Lula eleito: eleição matematicamente definida, com 98,81% das seções totalizadas." |
   | Totalização final | "00:18 · Totalização final: Lula eleito com 50,90% dos votos válidos." |
   | Sinal de virada (preditivo) | "18:20 · Projeção do Apurador: virada possível. Flávio à frente no placar parcial; chance de virada de Lula 25%." |
   | Chance (preditivo) | "18:50 · Projeção do Apurador: chance de vitória de Lula passa de 90%." |
   | Linha nos marcos (preditivo) | "Projeção do Apurador: Flávio 49,1% ± 0,6, Lula 50,9% ± 0,6." |

9. **Manchete** (detalha a decisão 5 das [Telas da página de lugar](12-telas-da-pagina-de-lugar.md)):

   | Momento | Texto |
   |---|---|
   | Antes das 17h | "A apuração do 2º turno começa às 17h", sem números |
   | Lugar sem seções | "A apuração ainda não começou neste estado" (ou "neste município") |
   | Durante | "Flávio lidera com 50,43% dos votos válidos e 50,34% das seções totalizadas" |
   | Diferença menor que 0,10 ponto | "Lula à frente por 12.345 votos, com 67,76% das seções totalizadas" |
   | Até 10 min depois de uma virada | "Virada: Lula passa à frente com 50,01%, com 67,76% das seções totalizadas" |
   | Chave ligada, virada projetada | placar + "A projeção do Apurador indica virada de Lula por volta de 88% das seções." |
   | Chave ligada, virada possível | placar + "A projeção do Apurador vê virada possível de Lula a partir de ~69% das seções." |
   | Chave ligada, sem sinal | placar + "A projeção do Apurador não indica virada: Flávio deve seguir à frente." |
   | Indicação do TSE (Brasil) | "O TSE indica Lula eleito" |
   | Totalização final (Brasil) | "Lula foi eleito com 50,90% dos votos válidos" |
   | Fim de UF ou município | "Lula vence na Bahia com 72,12% dos votos válidos"; "Lula vence em Salvador (BA) com …" |

10. **Prioridade**:
    - A linha sob a manchete mostra o último evento do próprio lugar, nunca o de outro lugar.
    - Na mesma rodada, vale a ordem: virada; indicação do TSE ou totalização final; preditivo; marco; "as pesquisas deixaram de pesar".
    - Todo evento entra na lista.
11. **Antes, retomada e depois**:
    - **Antes das 17h**: a narração fica vazia, com "A narração começa às 17h, com as primeiras seções totalizadas".
    - **Coletor parado**: na volta, ele não reconstrói o passado. Publica só o marco mais alto cruzado, com o % e a hora observados. Uma virada que aconteceu e se desfez durante a parada não aparece. O estado da narração fica salvo no R2 a cada rodada, para retomar sem repetir eventos.
    - **Depois da noite**: a narração fica na página como registro, inclusive os preditivos que foram ao ar, e para de crescer na totalização final.

**Glossário**: entram "Evento", "Marco", "Indicação do TSE" e "Totalização final". "Narração da noite" passa a ser por lugar.
