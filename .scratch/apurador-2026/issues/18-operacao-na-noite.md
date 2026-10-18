# Operação na noite

Type: grilling
Status: open
Blocked by: —
Map: [Apurador 2026](../map.md)

## Question

Qual é o roteiro do dono e do coletor em 25/10, do preparo do computador até o fim da apuração, e o que fazemos quando algo dá errado?

- **Preparo do computador** (Windows 11, nobreak, 800 Mbps simétricos e roteador de celular como reserva): adiar atualizações e reinícios, desligar a suspensão, a hora de ligar o coletor, o que fica aberto.
- **Painel local**: o que o dono vê enquanto o coletor roda (última leitura do TSE, atraso, erros, arquivos publicados, carga) e se isso é uma página local ou o próprio terminal.
- **Alertas**: o que avisa o dono (TSE lento ou com 403, dados parados, projeção que salta, falha ao gravar no R2) e por qual canal.
- **Correção manual**: o que o dono pode fazer na noite (pausar a publicação, voltar a um estado anterior guardado no R2, esconder a projeção, publicar um aviso), sem nunca alterar os dados do TSE.
- **Quando acionar cada plano B**: o TSE mudou de formato ou bloqueou o IP, a internet caiu, o R2 falhou (republicação do Worker com os JSONs ao vivo), o computador travou.
- **Fim da noite**: quando o coletor para, como fica o site depois da totalização final e quem desliga o quê.

Decisões de [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md) que moldam esta: coletor no computador do dono, só com conexões de saída, estado em disco e supervisor que reinicia (16); JSONs ao vivo no R2 com plano B de republicação (15); cada estado da noite guardado no R2 (18); aviso de "atualização interrompida" depois de 3 min (19). Cuidado de [API ao vivo do TSE](01-api-ao-vivo-tse.md): 100 req/s por IP, bloqueio de 10 min que se renova, e 404 e 304 contam. O [Ensaio geral](15-ensaio-geral.md) é onde este roteiro é testado.

De [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md): a última atualização das pesquisas é um deploy até as 23h de 24/10, e nada das pesquisas muda em 25/10. O roteiro começa conferindo que esse deploy está no ar.
