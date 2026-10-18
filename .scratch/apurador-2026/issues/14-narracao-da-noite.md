# Narração da noite

Type: grilling
Status: open
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
