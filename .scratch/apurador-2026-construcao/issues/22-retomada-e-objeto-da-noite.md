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
