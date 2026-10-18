# Operação na noite

Type: grilling
Status: resolved
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

## Answer

Resolvido em 18/10/2026 em conversa com o dono do projeto, que aceitou todas as recomendações em duas rodadas.

**Em uma linha**: o dono opera sozinho, com um vigia de fora e o Claude de prontidão. Ele vê tudo num painel do coletor que só mostra e age por comandos deliberados, de um conjunto fechado. Alertas chegam ao computador e ao celular, e uma sentinela na nuvem avisa quando o computador some. Cada falha tem um cartão no roteiro escrito, e nenhum alerta age sozinho.

**Fatos conferidos no computador do dono** (18/10):

- Só há placa de rede com cabo (Realtek GbE), sem Wi-Fi.
- Nenhum nobreak conversa com o Windows por USB: o computador não sabe quando a luz cai.
- O serviço de hora do Windows está parado, e as atualizações não estão pausadas (horário ativo das 9h às 2h).
- Fato de [Linha do tempo de apurações passadas](02-linha-do-tempo-apuracoes-passadas.md): no 2T de 2022, 99% vieram às 20:00 e a totalização final às 00:18. No 1T de 2022, às 10:27 do dia seguinte.

**Decisões** (aceitas pelo dono do projeto):

*Pessoas*

1. **Papéis**:
   - **Operador**: o dono.
   - **Vigia**: uma das pessoas do ensaio, fora da rede do dono e no 4G, das 16h30 até a indicação do TSE. Olha o site como visitante, compara com o app do TSE a cada 15 min e manda mensagem ao dono. Não tem acesso a nenhum comando.
   - **Claude**: uma sessão do Claude Code aberta no repositório, de prontidão para diagnosticar. Roda comandos do roteiro só quando o dono manda.
   - Descartado: uma segunda pessoa com os comandos (treinar alguém em 6 dias, e dois operadores podem se contradizer).

*Computador e rede*

2. **Reserva de internet**: o celular por ancoragem USB, plugado desde as 15h, com prioridade abaixo do cabo.
   - **A troca é puxar o cabo de rede**: o Windows passa ao celular em segundos. É a única forma que cumpre os 3 min do [Ensaio geral](15-ensaio-geral.md) sem reconfigurar nada nem comprar nada.
   - **A troca também muda o IP**, o que serve no bloqueio pelo TSE (decisão 12).
   - **Franquia**: pelo menos o dobro do volume de uma noite, medido no ensaio 1. Depende do [Volume de gravações na noite](24-volume-de-gravacoes-na-noite.md).
3. **Preparo do computador**:
   - **Até 21/10**, antes do ensaio 1:
     - pausar as atualizações do Windows até 28/10;
     - tirar a manutenção automática e a verificação do Defender da faixa das 16h às 2h;
     - ligar a hora automática e sincronizar;
     - desligar suspensão e hibernação (só a tela apaga);
     - coletor e supervisor numa tarefa do Agendador "ao iniciar o computador", que volta sozinha depois de um reinício e sem login (o dono digita a senha do Windows ao criar a tarefa). A tarefa fica desligada fora da noite;
     - na BIOS, "ligar quando a energia voltar", se houver.
   - **Em 25/10, antes das 15h**:
     - fechar e tirar da inicialização Steam, Discord, OneDrive e similares;
     - nada de jogo, download ou chamada de vídeo no computador;
     - pelo menos 20 GB livres no disco;
     - computador, monitor e roteador no nobreak, e celular da reserva plugado.
   - **Fica aberto**: o terminal do coletor (só o log), o painel do coletor, um navegador como visitante no site público, o app do TSE no celular e a sessão do Claude. O TSE nunca é aberto no navegador do computador.
4. **Máquina reserva**: se o dono tiver um notebook, ele vira reserva fria, com repositório, Node e `.env` prontos, testado no ensaio 1. Sem estado em disco, o coletor retoma do último estado guardado no R2, então pode voltar em outra máquina. Sem notebook, a única saída é reiniciar.

*Painel, alertas e comandos*

5. **Painel do coletor e comandos**:
   - **O painel** é uma página que o coletor grava como arquivo a cada rodada. O dono a abre no navegador e ela se recarrega a cada 5 s. Sem servidor nem porta aberta, o que mantém a decisão 16 da [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md).
   - **Os comandos** ficam num programa de terminal (`npm run noite -- <comando>`), que pede para digitar o nome do bloco como confirmação e grava um arquivo de controle, lido pelo coletor a cada rodada.
   - Descartados: página com botões em `127.0.0.1` (abre uma porta, e um clique errado desliga um bloco) e só o terminal.
6. **O que o painel do coletor mostra**, nesta ordem:
   1. **Estado**: fase (antes das 17h, ao vivo, encerrada), cada chave, destino ativo (R2 ou plano B), conexão ativa (cabo ou celular) e alertas ativos.
   2. **Visto de fora**: o arquivo de rodada e o JSON do Brasil lidos pelo endereço público, como a página lê, com o atraso do visitante.
   3. **TSE**: hora da última leitura e da última novidade (`ht` e % de seções do Brasil), pico de requisições por segundo no último minuto contra o limite de 100, respostas 403, 404 e 5xx nos últimos 10 min, e o tempo da rodada.
   4. **Placar conferido**: o placar do Brasil publicado contra o do arquivo do TSE, igual ou divergente.
   5. **Projeção do Brasil** nas duas bases, chance de vitória, peso das pesquisas e quanto mudou desde a rodada anterior.
   6. **Gravação**: a última gravação que deu certo em cada destino, as falhas da rodada e as gravações do mês no R2.
   7. **Computador**: CPU, memória, disco livre, rede, e o desvio do relógio contra o cabeçalho `Date` do TSE.

   Ficam fora: o log completo (está no terminal), o mapa e a narração (o dono vê no site).
7. **Alertas**, em dois níveis. Nenhum alerta age sozinho: quem decide é o dono, pelo roteiro. Os limites são provisórios, conferidos no ensaio 1.
   - **Crítico** (som no computador e no celular):
     - o TSE respondeu 403 ou 429, uma vez basta;
     - nenhuma rodada completa há 60 s;
     - gravação no destino ativo falhou em 2 rodadas seguidas;
     - visto de fora: arquivo de rodada público com mais de 2 min;
     - placar publicado diferente do arquivo do TSE, uma vez basta;
     - arquivo do TSE do Brasil ou de uma UF que o leitor não entende.
   - **Atenção** (só no painel, com um som curto):
     - TSE sem novidade há 5 min com menos de 99% das seções;
     - a projeção do Brasil muda mais de 1 p.p., ou a chance de vitória mais de 20 pontos, numa rodada, depois de 5% das seções;
     - pico acima de 50 req/s;
     - rodada com mais de 15 s;
     - relógio desviado mais de 2 s;
     - gravações do mês no R2 acima de 70% do plano gratuito;
     - arquivo de município que o leitor não entende (fica o último bom).
8. **Canal dos alertas**:
   - **Som e notificação** no próprio computador.
   - **Celular**, pelo **ntfy**: app gratuito e sem conta. O coletor manda o alerta por HTTPS de saída, num tópico com nome impossível de adivinhar.
   - **Sentinela**: um Worker agendado a cada minuto (1.440 execuções por dia, dentro do Workers Free) lê o arquivo de rodada público e manda alerta pelo ntfy se ele parar mais de 3 min. É o único alerta que funciona com o computador ou a internet do dono fora.
   - As mensagens só dizem o estado ("Coletor sem rodada há 60 s"). Descartado: Telegram (conta e bot).
9. **O que o dono pode fazer na noite**, um conjunto fechado:
   1. Ligar e desligar cada chave de bloco: núcleo mínimo, projeção, base Apuração + pesquisas, simulador, mapa e textos preditivos. Desligar a projeção desliga junto o simulador, que parte dela.
   2. **Plano zero**: é desligar a chave do núcleo mínimo. Reversível: religada, o bloco ao vivo volta.
   3. Publicar um **aviso pronto** (decisão 10). Não há texto livre.
   4. Trocar o destino para o plano B (decisão 14).
   5. Retirar uma pesquisa por deploy, só até as 16h.

   Saem do ticket: **pausar a publicação** (congela dados velhos com cara de ao vivo, ou trava também as chaves, que andam pela rodada; o plano zero cobre o caso) e **voltar a um estado anterior** (republicaria um placar velho; os estados no R2 servem para auditar e retomar). Nunca: mexer nos números do TSE ou da projeção, nem escrever texto livre no site.
10. **Avisos prontos**, numa faixa abaixo da manchete, em todas as páginas. Nenhum é preditivo, então não passam pelo advogado:
    1. "O TSE está demorando a divulgar novos dados. Os números abaixo são os mais recentes divulgados."
    2. "O Apurador está com instabilidade. Acompanhe também no app oficial do TSE." (com o link)
    3. "A projeção do Apurador está suspensa. O placar oficial do TSE continua atualizado."
11. **Interrupção longa**: depois de 10 min de "interrompida", a página acrescenta sozinha "Acompanhe no app oficial do TSE", com o link, e mantém os últimos dados à vista. Com o computador fora, nenhum comando chega ao site, e isso cobre o caso sem ninguém.

*Falhas* (cada uma vira um cartão do roteiro)

12. **Bloqueio pelo TSE (403 ou 429)**:
    1. No primeiro 403 ou 429, o coletor para de pedir ao TSE, porque insistir renova o bloqueio. É proteção do coletor, não um alerta agindo.
    2. O dono confirma pelo painel, sem abrir o TSE no navegador do computador.
    3. Puxa o cabo: o celular dá outro IP. O coletor retoma com rodada a cada 40 s por 15 min.
    4. Se o IP do celular também estiver bloqueado (IP de operadora é dividido com muita gente no app do TSE), modo avião por 10 s, para outro IP.
    5. Não volta ao cabo antes de 15 min. Se o painel mostrou pico acima de 50 req/s, a rodada fica em 40 s até o fim da noite.
13. **Queda da internet**: o sinal é o alerta crítico "nenhuma rodada", com o TSE e o R2 falhando juntos. O dono puxa o cabo. O cabo volta quando outro aparelho na Wi-Fi da casa navegar normalmente por 15 min.
14. **Falha do R2 e plano B** (detalha a decisão 15 da [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md)):
    - **A página conhece os dois endereços** e lê o principal. Se ele der erro, ou se o arquivo de rodada dele tiver mais de 2 min, ela tenta o outro e fica com a rodada mais nova.
    - **O coletor só publica no Worker por comando do dono**: depois do alerta de gravação falhando, ou do visto de fora parado com a gravação dando certo.
    - **Ligado o plano B, ele fica até o fim da noite**, para não alternar.
    - **Sem domínio**, só existe o caminho do Worker, e a falha dele cai na decisão 11.
15. **Computador travado ou falta de luz**:
    - **Painel congelado ou alerta da sentinela**: esperar 1 min (o supervisor). Se o computador não responder, botão de reiniciar. A tarefa do Agendador volta o coletor sem login, com o estado do disco. Meta: dados de volta em 5 min, testada no ensaio 1.
    - **O computador não liga**: o notebook, se houver, retomando do estado no R2.
    - **Falta de luz mais longa que o nobreak**: 5 min antes do fim da autonomia, desligar pelo Windows. O site cai em "interrompida" e, depois de 10 min, no link para o TSE.
16. **TSE lento ou sem novidade**: comparar com o app do TSE no celular, pelo 4G.
    - **O app também está parado**: é o TSE. Depois de 10 min, aviso pronto 1, retirado quando chegar novidade.
    - **O app está à frente**: o problema é nosso. O dono diagnostica com o Claude e, depois de 10 min, publica o aviso pronto 2.
17. **Placar divergente** (alerta crítico): plano zero na hora, porque nunca vai ao ar um placar errado. O bloco ao vivo só volta se a causa for o leitor do TSE (decisão 19) e o placar conferido voltar a bater.
18. **Projeção que salta** (alerta de atenção): o dono vê se a chegada de um lugar grande, como SP ou MG, explica o salto. Sem explicação (número inválido, vai e volta), desliga a chave da projeção e publica o aviso pronto 3. Ela não volta na noite, salvo se a causa for uma leitura errada do TSE corrigida no leitor.
19. **Exceção ao congelamento**: se o TSE mudar o formato ou um arquivo quebrar o leitor, só o módulo `tse` pode mudar, e só para voltar a ler.
    - O Claude escreve, o dono revisa, a correção passa no replay automático local e entra reiniciando o coletor. O site não é republicado.
    - Se o placar do Brasil não voltar em 30 min do primeiro alerta, plano zero até voltar.
    - Nenhuma outra mudança de código na noite.

*Linha do tempo*

20. **Do congelamento às 17h**:
    - **Sáb 24/10**:
      - **18h**: congelamento do código.
      - **19h às 19h30**: o coletor roda contra o TSE real zerado, publicando na produção (decisão 11 do [Ensaio geral](15-ensaio-geral.md)), já com o código congelado.
      - **Até 23h**: último deploy das pesquisas. Às 23h, o dono confere pelo celular no 4G a lista, o agregado e as curvas das duas bases. O roteiro também congela às 23h.
    - **Dom 25/10**:
      - **8h e 14h**: notícias e decisões do TSE sobre pesquisas suspensas. Se uma do agregado for suspensa: comando de retirada, deploy e conferência em até 10 min. A última retirada é às 16h.
      - **15h**: preparo do dia (decisão 3), celular plugado, tarefa do Agendador e coletor ligados, publicando na produção. O painel do coletor fica aberto, e o visto de fora mostra "antes das 17h".
      - **16h**: cada chave igual ao veredito assinado do ensaio 2; textos preditivos desligados, salvo confirmação por escrito já registrada na [Confirmação dos textos preditivos](22-confirmacao-dos-textos-preditivos.md); um alerta de teste chega ao celular; sentinela ligada; relógio com desvio menor que 2 s; vigia confirmado.
      - **16h30**: o vigia começa. O dono fica perto do computador até a indicação do TSE e os 99%, com pausas de no máximo 5 min e o celular no bolso.
      - **16h55**: a página mostra a contagem regressiva, e nada mudou desde as 16h.
      - **17h**: a fase muda sozinha. Nas primeiras rodadas, o dono confere o placar conferido, o visto de fora e o app do TSE.
      - **Até 99%**: a cada 30 min, o placar do Brasil no site contra o app do TSE (o vigia, a cada 15).
      - **Confirmação dos textos preditivos na noite**: o dono liga a chave pelo comando, só com a resposta por escrito registrada no ticket. Vale dali em diante, sem nada retroativo.
21. **Fim da noite**:
    - **Dormir**: depois da indicação do TSE e de 99% das seções, o dono pode deixar o coletor rodando sozinho, só com os alertas críticos no celular.
    - **Fim do coletor**: na totalização final do Brasil, o coletor publica a fase "encerrada", roda mais 30 min e para sozinho. Com essa fase, a página nunca mais mostra "interrompida". A sentinela e a tarefa do Agendador são desligadas.
    - **No dia seguinte**: conferir que os estados da noite estão completos no R2, revogar a chave de escrita do R2 e registrar a noite em `docs/noite/2026-10-25.md` (alertas, ações com hora e quedas), como nos ensaios.
    - **Depois**: o que muda no site fica com o [Plano de lançamento em fases](19-plano-de-lancamento-em-fases.md).

*O roteiro escrito*

22. **Roteiro da noite**: em `docs/roteiro-da-noite.md`, impresso ao lado do computador e salvo no celular, porque com o computador travado não dá para ler na tela. Traz a linha do tempo (decisão 20) e um cartão por falha (decisões 12 a 19), no formato sintoma → como confirmar → o que fazer → como voltar, com o comando exato. O ensaio 2 o segue passo a passo, e as correções entram até as 23h de 24/10.

**Do dono**:

- Informar o celular da ancoragem USB e a franquia, e se há um notebook. Não foram informados na conversa.
- Medir a autonomia do nobreak antes de 22/10: 5 min fora da tomada, com tudo ligado.
- Fazer o preparo até 21/10 (decisão 3), inclusive a senha na tarefa do Agendador.
- Instalar o ntfy no celular e assinar o tópico.
- Escolher o vigia entre as pessoas do ensaio.

**Novo ticket**: [Volume de gravações na noite](24-volume-de-gravacoes-na-noite.md). A conta de gravações no R2 foi feita para um JSON só, antes de a decisão 18 da Arquitetura passar a um JSON por lugar.

**Glossário**: entram "Plano zero", "Painel do coletor", "Alerta", "Aviso", "Vigia", "Sentinela" e "Roteiro da noite".
