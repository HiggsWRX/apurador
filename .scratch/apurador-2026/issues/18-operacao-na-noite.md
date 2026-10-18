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

De [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md):
- Em 25/10, às 8h e às 14h, o dono confere as notícias e decisões do TSE sobre suspensões de pesquisas. Se uma pesquisa do agregado for suspensa, ela sai, e o agregado é recalculado por deploy. O dono precisa conseguir fazer esse deploy no dia.
- As chaves de publicação (o agregado e a projeção antes das 17h, o simulador antes das 17h e, como plano B, o bloco da projeção) se ligam sem código novo. O roteiro diz quem liga cada uma e quando, conforme a [Segunda consulta jurídica](21-segunda-consulta-juridica.md).
- De [Segunda consulta jurídica](21-segunda-consulta-juridica.md): o agregado, a projeção e o simulador antes das 17h estão ligados. Fica desligada a chave de **textos preditivos**, que pode ser ligada na própria noite se a [Confirmação dos textos preditivos](22-confirmacao-dos-textos-preditivos.md) chegar. O roteiro precisa dizer como ligá-la e conferir que ela está desligada antes das 17h.

De [Narração da noite](14-narracao-da-noite.md): a chave de textos preditivos vive no coletor, que só põe os eventos preditivos nos JSONs públicos com ela ligada. Ligada no meio da noite, ela vale dali em diante, sem publicação retroativa. Desligada, apaga dos JSONs todos os preditivos já publicados (decisão 6 de lá). Na retomada depois de uma queda, o coletor recarrega o estado da narração guardado no R2 e não reconstrói o que perdeu (decisão 11).

De [Ensaio geral](15-ensaio-geral.md):
- **Prazo**: este roteiro precisa estar resolvido até 22/10. O ensaio geral 2, na noite de 23/10, segue o roteiro escrito, passo a passo (decisão 10 de lá).
- **Tempos que o roteiro precisa cumprir** (decisão 20 de lá): o coletor derrubado volta sozinho em menos de 1 min; com a internet cortada, a publicação volta em até 3 min pelo roteador de celular; com o plano B acionado, os dados voltam em até 5 min.
- **Uma chave por bloco** (decisão 19 de lá): núcleo mínimo, projeção, base Apuração + pesquisas (chave nova), simulador, mapa e textos preditivos. Um bloco reprovado no ensaio 2 fica desligado a noite toda. O roteiro confere, antes das 17h, que cada chave está como o ensaio decidiu.
- **Plano zero** (decisão 24 de lá): se o núcleo mínimo não for aprovado até 24/10, a partir das 17h o site mostra "Acompanhe a apuração no app oficial do TSE" e não publica nenhum dado ao vivo. O roteiro diz como ligar esse estado.
- **Fase pelo coletor** (decisão 7 de lá): a passagem das 17h na página depende do arquivo de rodada. Se o coletor não estiver rodando às 17h, as páginas não passam ao ao vivo.
- **Retirada de pesquisa** (decisão 12 de lá): o deploy do agregado recalculado vale no site em até 10 min, sem tocar no coletor.
- **TSE real, zerado** (decisão 11 de lá): de 21 a 24/10, o coletor roda 15 min por dia contra os arquivos reais da eleição `6258`, publicando só numa pasta local. Em 24/10, roda 30 min publicando nos destinos de produção.
- **Congelamento**: depois das 18h de 24/10, nada muda no código até a noite (decisão 25 de lá).
