# Ensaio geral

Type: grilling
Status: resolved
Blocked by: 02, 08
Map: [Apurador 2026](../map.md)

## Question

Como reproduzimos uma apuração passada inteira no site, acelerada, antes de 25/10, e o que precisa acontecer para o ensaio ser aprovado?

- Qual apuração reproduzir (2º turno de 2022, 1º turno de 2026) e a partir de que fonte de linha do tempo. Candidata: os horários por seção de `detalhe_votacao_secao`, ver [Dados históricos por município e malhas](03-dados-historicos-e-malhas.md). [Linha do tempo de apurações passadas](02-linha-do-tempo-apuracoes-passadas.md) recomenda o 2T de 2022 (cerca de 130 MB, validado contra o histórico oficial). 2018 só tem dados públicos a partir das 19h. O `bweb` de 2026 mudou de formato em relação ao de 2022.
- Como simular o TSE: servir os arquivos no mesmo formato da divulgação oficial, para que o caminho ao vivo rode sem mudanças.
- Velocidade, quem assiste e critérios de aprovação: sem falhas, curva projetada plausível, narração coerente, carga simulada.
- Data do ensaio e o que fazemos se ele falhar.
- Fato de [API ao vivo do TSE](01-api-ao-vivo-tse.md): o TSE não oferece simulado nem replay para o 2T. O ensaio precisa gerar arquivos parciais no formato do TSE a partir da reconstrução seção por seção e servi-los num mock. O arquivo zerado do 2T (`6258`) dá o esqueleto.
- **Zona por dentro do modelo**: a divulgação ao vivo tem votos por zona, e só 190 municípios têm mais de uma (São Paulo tem 57). Testar no ensaio se usar a zona nesses municípios reduz o erro e o desvio das seções tardias. A decisão de unidade de [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md) previa revisão se houvesse dado abaixo do município.
- **Calibração do modelo**, herdada de [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md): reproduzir o 1T de 2026 com base em 2022 (e o 2T de 2018 a partir das 19h, se ajudar) para calibrar as incertezas regional e nacional, o peso do próprio município e o modelo de ordem de chegada. Medir o desvio das seções tardias em 2026. O protótipo da branch `prototipo/metodo-projecao` já tem o placar do teste reaproveitável.
- De [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md):
  - O TSE falso roda no computador do dono e serve, no formato oficial, a apuração reconstruída. O coletor lê dele só trocando a URL base (decisão 7).
  - Medir: o atraso de ponta a ponta sobre o TSE (meta ~35 s em média, ~70 s no pior caso, decisão 17), o tempo até um JSON novo valer na borda pelo R2 e pelo plano B de republicação (decisão 15) e a carga no computador.
  - Testar: derrubar e reiniciar o coletor no meio da noite, cortar a internet e passar para o roteador de celular, e conferir o aviso de "atualização interrompida" (decisões 16 e 19).
  - Usar as zonas dos 190 municípios com mais de uma, já coletadas desde o início (decisão 20).
- De [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md): a mesma reprodução do 2º turno de 2022 roda também com as pesquisas deslocadas 2 pontos para cada candidato, para calibrar K, o quanto as pesquisas valem em seções apuradas.
- De [Contas e acessos](07-contas-e-acessos.md): o domínio foi adiado. Até ele existir, os JSONs ao vivo seguem o plano B (Worker com os JSONs como static assets, em `*.workers.dev`), e é esse caminho que o ensaio mede primeiro.
- De [Simulador "e se"](13-simulador-e-se.md): testar os seis estados do indicador ao vivo, sobretudo "TSE sem novidade" contra "interrompido", que o arquivo de rodada separa. Testar também a passagem sozinha das 17h para o ao vivo, sem recarregar, e o simulador se atualizando com as hipóteses paradas.
- De [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md): testar as chaves de publicação ligadas e desligadas, sem código novo, e a retirada de uma pesquisa com o agregado recalculado depois do congelamento.
- De [Sinal de virada](23-sinal-de-virada.md): calibrar os limites provisórios de 50% e 5% da chance de virada e conferir se "sem sinal de virada" nunca apareceu numa noite que acabou virando. Testar também a chave de textos preditivos ligada e desligada no meio da noite.
- De [Narração da noite](14-narracao-da-noite.md):
  - "Narração coerente" pode ser conferida contra a [medição do 2º turno de 2022](../research/14-narracao-noite-2t-2022.md). Com as regras decididas, a narração do Brasil deve dar cerca de 50 eventos, uma única virada às ~18:44, sem a troca de 0,26%, e as 4 viradas em UF (MG duas vezes, AP e AM).
  - Testar a janela de 10 minutos da virada nas fases do relógio do coletor que veem 4 trocas no Brasil.
  - Testar a retomada do coletor sem eventos repetidos nem retroativos.
  - Com a chave desligada, conferir que nenhum evento preditivo, nem a frase de projeção da manchete, aparece nos JSONs públicos (decisão 6 de lá).

## Answer

Resolvido em 18/10/2026 em conversa com o dono do projeto, que aceitou todas as recomendações em quatro rodadas.

**Em uma linha**: são três peças. O replay automático roda nos testes, a calibração escolhe as constantes em três noites passadas (20 e 21/10), e o ensaio geral roda o 2º turno de 2022 de ponta a ponta na infraestrutura real (22 e 23/10). A aprovação é por bloco, cada um com a sua chave de publicação. Sem o núcleo mínimo, vale o plano zero.

**Decisões** (aceitas pelo dono do projeto):

*Estrutura e datas*

1. **Três peças**:
   - **Replay automático**: o 2T de 2022 roda sem rede, na velocidade máxima, nos testes de cada push (decisão 12 da [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md)). Pega erro de lógica. Roda também em várias fases do relógio do coletor, para testar a janela de 10 min da virada.
   - **Calibração**: rodadas locais do modelo em noites passadas. Termina com as constantes congeladas.
   - **Ensaio geral**: a noite inteira de ponta a ponta, na infraestrutura real (computador do dono, Cloudflare, celulares), com gente assistindo. Testa atraso, borda, quedas e aparelhos. Só começa com as constantes congeladas.
2. **Datas**:
   - **Calibração**: 20 e 21/10, com as constantes congeladas no fim de 21/10.
   - **Ensaio geral 1**: qui 22/10 à noite, com o que estiver pronto.
   - **Ensaio geral 2**, o de aprovação: sex 23/10 à noite.
   - **Sáb 24/10**: só correções do que falhou no ensaio 2, até as 18h. Nada de função nova depois do ensaio 2.

*O ensaio geral*

3. **Noite**: o 2º turno de 2022, com os candidatos reais (Bolsonaro e Lula) e o agregado das pesquisas de 2022, montado pela regra do [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md).
4. **TSE falso**:
   - Roda no computador do dono e serve os dados de 2022 no formato de 2026 (estrutura da eleição `6258`). Os horários vêm do `detalhe_votacao_secao` e os votos do `bweb` ou da `votacao_secao`.
   - Gera também a configuração de municípios e zonas com a geografia de 2022. Por isso, o coletor e o site não podem ter os candidatos nem a lista de municípios fixos no código: tudo vem dos arquivos do TSE.
   - Aplica o limite real do TSE (100 req/s, com 404 e 304 contando) e registra qualquer violação.
5. **Ambiente separado e fechado**:
   - Worker, subdomínio e bucket do R2 próprios. O ensaio nunca grava nos de produção.
   - `noindex` e uma tarja fixa: "Ensaio: reprodução da apuração de 30/10/2022. Não é resultado de 2026."
   - O link fica só com quem assiste. Um print de "Lula eleito" ou de uma projeção circulando antes de 25/10 seria desinformação.
6. **Velocidade e relógio**:
   - O TSE falso tem relógio próprio. Ele roda das 16:50 às 20:30 de 2022 a **3x** (~75 min) e das 20:30 à totalização final a **30x** (~8 min).
   - O coletor, a CDN e o navegador mantêm a cadência real (20 s, 15 s e 30 s), então o atraso medido é o da noite. A 3x, chegam até ~600 municípios por rodada no pico, o que já serve de carga extra para o coletor.
   - Regras com hora (a hora do evento, a janela de 10 min da virada) usam o `ht` do TSE. Regras contadas em rodadas e o aviso de 3 min usam o relógio real.
7. **A fase vem do coletor**: o que a página mostra (antes das 17h, ao vivo, depois) sai do arquivo de rodada. O "atualização interrompida" compara a hora da rodada com o cabeçalho `Date` da resposta da CDN. O relógio do aparelho não decide nada.
8. **Domínio**: o dono compra `apurador.app` até qua 21/10, para o ensaio medir o caminho principal (R2 com cache, decisão 15 da Arquitetura) e o plano B.
9. **Quem assiste**:
   - O dono opera o coletor e segue o roteiro. Com ele, 3 a 5 pessoas que ele escolhe, com celulares variados (pelo menos um Android barato e um iPhone), alguns no 4G.
   - Cada pessoa recebe uma lista curta do que conferir e reporta com hora e print.
   - O ensaio não é aberto ao público.
10. **Roteiro**: o ensaio 1 usa a lista de testes de falha deste ticket (derrubar o coletor, cortar a internet, passar para o plano B, ligar e desligar chaves). O ensaio 2 segue, passo a passo, o roteiro escrito da [Operação na noite](18-operacao-na-noite.md), que precisa estar resolvida até 22/10.
11. **TSE real, zerado**:
    - De 21 a 24/10, o coletor roda 15 min por dia contra os arquivos reais da eleição `6258`, ainda zerados, publicando só numa pasta local. Isso confere formato, cabeçalhos e ritmo, e pega a tempo qualquer mudança do TSE.
    - Em 24/10, 30 min publicando nos destinos de produção.
12. **Pesquisa retirada**: no trecho antes das 17h, o dono retira uma pesquisa de 2022 do agregado por deploy, o mesmo caminho da noite real. O agregado recalculado, a lista sem ela e as curvas das duas bases aparecem no site em até 10 min, sem tocar no coletor.

*Calibração*

13. **Sem treinar**: a liberação do modelo pela [Segunda consulta jurídica](21-segunda-consulta-juridica.md) depende de ele não usar aprendizagem de máquina. Por isso:
    - **Antes de rodar**, escrevemos os candidatos de cada constante:
      - incerteza regional e nacional: 0,5, 1, 1,5 ou 2 p.p.;
      - peso do próprio município: 1.000, 3.000 ou 10.000 votos;
      - ordem de chegada: "mistura", "1º turno" ou "ritmo da noite".
    - **Rodamos** os candidatos e escolhemos pela regra da decisão 15, também escrita antes.
    - **Publicamos** a tabela na página de metodologia.
14. **Três noites**:
    - **2T de 2022**, com base no 1T de 2022. Os valores provisórios saíram dela, então ela não decide sozinha.
    - **2T de 2018, inteiro**: a divulgação só abriu às 19h, mas o `detalhe_votacao_secao` traz a hora de cada seção antes disso, então a ordem real é conhecida desde a primeira seção. É o segundo 2º turno, com transferência de votos.
    - **1T de 2026**, com 2022 como referência: é a noite mais parecida com 25/10 na ordem de chegada e no desvio das seções tardias. Não testa a transferência de votos.
15. **Regra de escolha**, nesta ordem:
    1. **Cobertura**: o resultado final fica dentro da margem de 95% em pelo menos 95% das rodadas depois de 1% das seções, em cada noite.
    2. **Chance honesta**: quem perdeu nunca passa de 95% de chance de vitória depois de 5% das seções.
    3. **Erro**: entre os valores que passam, fica o de menor erro médio entre 5% e 50% das seções.
    4. **Empate** (menos de 0,05 p.p. de diferença): fica a incerteza mais larga.
16. **Zona**: testada nos 190 municípios com mais de uma, nas três noites. Ela entra no modelo só se reduzir o erro entre 5% e 50% em pelo menos 0,05 p.p. em todas as noites, sem piorar a cobertura. Se não reduzir, ou se o teste não estiver pronto no fim de 21/10, fica o município. O coletor guarda as zonas de qualquer jeito (decisão 20 da Arquitetura).
17. **K das pesquisas**:
    - **Candidatos**: 0,25%, 0,5%, 1% e 2%.
    - **Casos**: o 2T de 2022 com o agregado real e deslocado 2 pontos para cada lado; o 2T de 2018 com o agregado real; e o 1T de 2026 com as pesquisas do 1º turno entre os dois finalistas, que subestimaram Flávio em 2,8 pontos na margem.
    - **Escolha**: fica o K com o menor erro no pior caso entre 0,1% e 5% das seções, desde que mantenha a cobertura de 95% em todos.
18. **Limites do sinal de virada**:
    - **50% fica.**
    - **5% é posto à prova** em todas as rodadas da calibração, nas duas bases e com as pesquisas deslocadas:
      - no Brasil e nas UFs, "sem sinal de virada" nunca aparece antes de uma virada real;
      - nos municípios, no máximo 5% dos momentos com "sem sinal de virada" são seguidos de uma virada.
    - **Se falhar**: o limite cai para 2% e, depois, para 1%.

*Aprovação*

19. **Por bloco, cada um com a sua chave de publicação**. O ensaio 2 aprova ou reprova cada bloco separadamente:
    - **Núcleo mínimo**: placar oficial do TSE, curva real, indicador ao vivo e narração factual. Sem ele, não há bloco ao vivo.
    - **Projeção**: projeção, chance de vitória, curva projetada e sinal de virada.
    - **Base Apuração + pesquisas**: ganha chave própria. Reprovada, a noite vai só com "Só apuração", sem o controle de base.
    - **Simulador**.
    - **Mapa**: reprovado, fica a tabela.
    - **Textos preditivos**: aprovados se funcionarem com a chave ligada, para o caso de a [Confirmação dos textos preditivos](22-confirmacao-dos-textos-preditivos.md) chegar.

    O dono decide no fim do ensaio 2 e assina o veredito de cada bloco.
20. **Critérios do núcleo mínimo** (todos bloqueantes):
    - **Placar oficial idêntico**: em todas as rodadas e lugares, o placar parcial, o % de seções e a hora publicados são iguais aos do arquivo do TSE falso. Um script confere, e a meta é zero divergências.
    - **Atraso**: é o tempo entre o TSE falso gravar um arquivo e ele aparecer para quem está fora da rede do dono. Ele é medido por um script que lê o endereço público como a página lê (a cada 30 s, com `If-None-Match`).
      - **Caminho R2**: mediana de até 35 s e p95 de até 70 s.
      - **Plano B**: mediana de até 75 s e p95 de até 150 s.
    - **Indicador ao vivo**: os seis estados aparecem quando provocados. "Interrompida" aparece entre 3 e 4 min depois de o coletor cair.
    - **Quedas**:
      - coletor derrubado: volta sozinho em menos de 1 min, sem evento repetido nem retroativo;
      - internet cortada: a publicação volta em até 3 min pelo roteador de celular;
      - plano B acionado: os dados voltam em até 5 min.
    - **TSE**: nenhuma violação do limite registrada pelo TSE falso.
    - **Narração factual**: igual à do replay automático da mesma noite, salvo o que as quedas provocadas explicam. No Brasil, uma só virada, às ~18:44, e as 4 viradas em UF (MG duas vezes, AP e AM).
    - **17h e chaves**: todos os celulares passam ao ao vivo sem recarregar. Cada chave ligada ou desligada aparece no site em até 2 rodadas mais o cache.
    - **Celulares**: placar e curva visíveis em até 3 s no Android barato no 4G, sem travamento visível.
21. **Critérios da projeção**:
    - **Porte fiel**: antes do ensaio 1, no CI, o módulo em TypeScript reproduz os números do protótipo no 2T de 2022 com as constantes provisórias, com diferença de até 0,01 p.p.
    - **Reprodutível**: rodar o modelo de novo sobre os mesmos arquivos que o coletor viu (guardados no R2, decisão 18 da Arquitetura) dá exatamente os números publicados.
    - **Qualidade no ensaio**, com as constantes congeladas:
      - erro de até 0,5 p.p. depois de 5% das seções;
      - resultado dentro da margem de 95% depois de 1%;
      - "sem sinal de virada" nunca aparece no Brasil antes das 18:44;
      - "as pesquisas deixaram de pesar" acontece uma vez só.
    - **Antes das 17h**: o painel mostra o agregado de 2022 e as curvas das duas bases.
22. **Critérios do simulador, do mapa e dos textos preditivos**:
    - **Simulador**:
      - abre em até 5 s no Android barato no 4G;
      - com as hipóteses paradas, atualiza a cada rodada;
      - o link compartilhado reproduz a mesma simulação em outro celular;
      - o par simétrico de hipóteses dá resultados espelhados.
    - **Mapa**: desenha todos os municípios em até 2 s no Android barato, sem travar a rolagem. Se falhar em SVG, passa para canvas (decisão 4 da Arquitetura). Se falhar de novo, fica a tabela.
    - **Textos preditivos**:
      - com a chave desligada, nenhum preditivo em nenhum JSON público de nenhuma rodada (um script confere);
      - ligada no meio da noite, eles entram dali em diante, sem nada retroativo;
      - desligada de novo, somem todos, inclusive a frase de projeção da manchete.
23. **Carga**, sem teste de carga contra a Cloudflare (pareceria um ataque e não mediria nada nosso):
    - **Cache**: no caminho R2, pelo menos 90% das respostas dos JSONs ao vivo vêm da borda (`HIT` ou `REVALIDATED`). Bloqueante.
    - **Rodada**: cada rodada do coletor termina em menos de 20 s, mesmo no pico a 3x. Bloqueante.
    - **Dados do visitante**: até 10 MB por visitante das 17h às 20h na página do Brasil. Não é bloqueante: se passar, o JSON é enxugado em 24/10.
    - **Computador do dono**: CPU, memória e rede medidas e registradas.
24. **Se o núcleo mínimo for reprovado**:
    - **No ensaio 2**: corrige em 24/10 e roda um trecho de 30 min a 1x, das 18:30 às 19:00 de 2022, com a virada. Se passar, o núcleo está aprovado.
    - **Se falhar também em 24/10**, vale o **plano zero**. Na noite, o site fica com o explorador histórico, as pesquisas e o painel de antes das 17h. A partir das 17h, mostra "Acompanhe a apuração no app oficial do TSE", com o link. Nenhum dado ao vivo vai ao ar, nunca um placar errado.
25. **Se outro bloco for reprovado**: vai para a noite com a chave desligada. Ainda pode ser aprovado em 24/10, se a correção passar no replay automático e num trecho de 30 min, até as 18h, antes do deploy de congelamento das pesquisas (23h). Depois disso, nada muda até a noite.
26. **Registros**, no repositório, ao lado do código:
    - `docs/calibracao.md`: os candidatos de cada constante, os números por noite e o valor escolhido. Alimenta a [Página de metodologia](20-pagina-de-metodologia.md).
    - `docs/ensaios/2026-10-22.md`, `docs/ensaios/2026-10-23.md` (e `2026-10-24.md`, se houver): números medidos contra os critérios, falhas com hora e o veredito de cada bloco, assinado pelo dono.

**Para a construção**: o TSE falso precisa marcar a indicação do TSE no mesmo campo do EA20 que o TSE usa. O campo ainda não foi conferido no dicionário do EA20.

**Glossário**: entram "Ensaio geral", "Calibração" e "Chave de publicação".
