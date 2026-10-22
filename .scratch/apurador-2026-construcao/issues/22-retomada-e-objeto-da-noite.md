# 22: Retomada, objeto da noite e reprodutibilidade

Status: ready-for-agent
Blocked by: 15, 18
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

A cada rodada, o coletor grava:

- o estado em disco;
- no R2, um único objeto comprimido, o objeto da noite, com o estado de retomada e os arquivos do TSE que chegaram nela.

Se o coletor cair, ele volta sozinho pela tarefa do Agendador do Windows e retoma do disco. Sem disco, numa outra máquina, retoma do último objeto da noite. Ele não repete nem inventa eventos. Rodar o modelo de novo sobre os objetos da noite dá exatamente os números publicados.

Decisões: [Volume de gravações na noite](../../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md) (decisão 3), [Narração da noite](../../apurador-2026/issues/14-narracao-da-noite.md) (decisão 11), [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md) (decisões 3, 4 e 15) e [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 20 e 21).

## Critérios de aceite

- [ ] **Objeto da noite**: um por rodada, comprimido, nunca um por arquivo do TSE. Traz a narração, os hashes, as chaves e o contador de gravações. Dá ~1.800 objetos por noite.
- [ ] **Retomada do disco**: com estado em disco, o coletor retoma dele.
- [ ] **Retomada do R2**: sem disco, o coletor retoma do último objeto da noite e baixa de novo do TSE o que faltar.
- [ ] **Sem reconstruir o passado**: na volta, publica só o marco mais alto cruzado, com o % e a hora observados. Uma virada que aconteceu e se desfez durante a parada não aparece.
- [ ] **Partida a frio**: sem estado no disco nem no R2, o coletor regrava todos os arquivos ao vivo uma vez, ~5.900 gravações.
- [ ] **Supervisor**: um script cria a tarefa do Agendador "ao iniciar o computador", que volta sem login. O dono digita a senha do Windows ao criar a tarefa, e a tarefa fica desligada fora da noite.
- [ ] Derrubado, o coletor volta em menos de 1 min.
- [ ] **Replay com quedas**: o coletor é derrubado em rodadas escolhidas e retoma do disco e do objeto da noite, sem evento repetido nem retroativo.
- [ ] **Reprodutível**: rodar o modelo de novo sobre os objetos da noite do replay dá exatamente os números publicados.
- [ ] **Máquina reserva**: o roteiro para retomar num notebook (repositório, Node e `.env`) fica descrito para o [Roteiro da noite](31-roteiro-da-noite.md).

## Comments

- 19/10/2026, do [ticket 12](12-coletor-minimo-e-replay.md): o estado fica em memória, em `criarColetor` (`packages/coletor/src/coletor.ts`): ETags, a hora de cada pedido, resultados, índices, zonas pendentes, hashes, curvas e novidade. Os resultados guardados saem por `coletor.resultado()`.
- 20/10/2026, do [ticket 20](20-publicacao-r2-e-plano-b.md):
  - **Contador no estado**: o contador de gravações (`criarContadorDeGravacoes(guardado, agora)`, em `packages/coletor/src/contador.ts`) hoje fica num arquivo só dele, `.cache/coletor/gravacoes.json`, que `principal.ts` grava a cada rodada. Ao montar o estado em disco e o objeto da noite, leve o `GravacoesDoMes` para dentro deles e retome dali.
  - **Plano B na retomada**: o destino ativo vem do arquivo de controle (`planoB`), que sobrevive ao reinício. O coletor retomado no plano B regrava tudo ali. A pasta do Worker da mesma noite (o `rodada.json` dela com menos de 6 h) fica, para a republicação não sair sem os lugares que a partida a frio ainda não baixou.
  - **O bucket é público**: tudo em `apurador-ao-vivo` sai por `ao-vivo.apurador.org`. Num prefixo do mesmo bucket, o objeto da noite, com os arquivos do TSE e o estado de retomada, ficaria público. Decida se isso serve ou se ele vai para outro bucket, com outra chave no `.env` e o contador somando os dois.
  - **Gravar no R2**: `destinoR2` (`packages/coletor/src/r2.ts`) já assina e conta, mas grava JSON com `Content-Type: application/json` e `max-age=15`, e o objeto da noite pede outros cabeçalhos.
- 20/10/2026, do [ticket 15](15-narracao-factual.md):
  - **O estado da narração** fica em `criarNarracao` (`packages/coletor/src/narracao.ts`), que o coletor cria uma vez (`narracao`, em `criarColetor`): por lugar, o `LugarNarrado` (o nível mais alto narrado, a última totalização vista, se a indicação do TSE já entrou, o líder, a última virada, o contador dos números na curva e os eventos); `faltam` (as seções que faltam em cada UF, para a frase das regiões nos marcos do Brasil); `noBrasil` (os eventos da narração do Brasil, os dele e os das UFs, na ordem em que entraram) e `totalizacaoFinal` (a hora da final do Brasil, depois da qual nada entra). É tudo JSON, salvo a última virada, que aponta para um evento da lista (a hora e as `trocas` dela estão no próprio evento): guarde-a pelo índice. Para retomar, a narração precisa de um `estado()` e de um `criarNarracao(lugares, estado?)`. O coletor guarda também `porNarrar`, os lugares baixados que a narração ainda não viu: vazio no fim de toda rodada.
  - **Sem estado, a narração já segue a decisão 11**: na primeira leitura de cada lugar, só o nível mais alto cruzado vira evento, com o % e a hora observados (o teste das fases do relógio, em `replay.test.ts`, parte a frio às 18:30: o Brasil ganha só o marco de 50%, sem o começo nem os de 10 e 25%), e o primeiro líder visto não é virada. Com o estado, nada se repete: o nível só sobe, e um arquivo mais velho que o último visto (a CDN) é ignorado. Uma virada que aconteceu e se desfez durante a parada não aparece, porque o líder guardado é o de antes dela e o da volta é o mesmo.
  - Os hashes já cobrem a narração: ela vai no JSON de cada lugar (`narracao`) e no `rodada.json` (`eventosDoBrasil`). Um lugar cuja narração mudou entra em `sujos`, como um resultado novo; o Brasil muda também com os eventos das UFs que entram nele.
- 22/10/2026, do [ticket 17](17-projecao-ao-vivo.md):
  - **Estado da narração**: a narração ganhou `pesquisasNarradas` e `ultimoDoBrasil` (`criarNarracao`, em `packages/coletor/src/narracao.ts`). A retomada tem de recarregar os dois, ou "as pesquisas deixaram de pesar" sai de novo.
  - **Reprodutível**: a projeção é uma função dos resultados que o coletor guarda (`projetar(resultado, ordem)`, em `projecao.ts`), sem estado entre as rodadas. Rodar o modelo de novo sobre os objetos da noite é chamar a mesma função com os arquivos da rodada.
  - **Partida sem estado**: no meio da noite, ela segura a projeção até faltar no máximo 1% dos municípios. São ~10 rodadas: a partir das 18:30 de 2022, a projeção saiu na noite local às 18:43 da noite.
