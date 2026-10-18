# 16: Comandos da noite, chaves de publicação, avisos prontos e plano zero

Status: ready-for-agent
Blocked by: 14
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O dono age na noite por comandos de terminal (`npm run noite -- <comando>`). Cada comando pede para digitar o nome do bloco como confirmação e grava um arquivo de controle, que o coletor lê a cada rodada.

O coletor leva o estado das chaves e o aviso pronto ativo no arquivo de rodada, e a página reage sem recarregar. Este ticket entrega:

- o mecanismo;
- a chave do núcleo mínimo, que é o plano zero;
- os três avisos prontos.

Os tickets de cada bloco (projeção, base, simulador, mapa e textos preditivos) ligam a própria chave nesse mecanismo.

Decisões: [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md) (decisões 5, 9, 10 e 17), [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 19, 20 e 24) e [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (comentários do ensaio e da operação).

## Critérios de aceite

- [ ] O conjunto de comandos é fechado:
  - ligar e desligar cada chave (núcleo mínimo, projeção, base Apuração + pesquisas, simulador, mapa e textos preditivos);
  - publicar e retirar um dos três avisos prontos;
  - trocar o destino para o plano B, cujo efeito vem no [ticket 20](20-publicacao-r2-e-plano-b.md).

  Não há texto livre, pausa da publicação nem volta a um estado anterior.
- [ ] Todo comando pede para digitar o nome do bloco antes de gravar o arquivo de controle.
- [ ] O arquivo de rodada traz o estado de cada chave e o aviso pronto ativo. Antes de o coletor rodar, a página usa o arquivo de chaves estático do [ticket 04](04-agregado-de-pesquisas.md).
- [ ] Uma chave ligada ou desligada aparece no site em até 2 rodadas mais o cache, sem recarregar a página.
- [ ] Desligar a projeção desliga junto o simulador.
- [ ] **Plano zero**: com o núcleo mínimo desligado, o coletor não publica nenhum dado ao vivo, só o arquivo de rodada. A partir da fase ao vivo, o bloco ao vivo dá lugar a "Acompanhe a apuração no app oficial do TSE", com o link, e o resto da página fica como está. Religar a chave traz o bloco de volta.
- [ ] **Avisos prontos**: aparecem numa faixa abaixo da manchete, em todas as páginas, com os textos exatos:
  1. "O TSE está demorando a divulgar novos dados. Os números abaixo são os mais recentes divulgados."
  2. "O Apurador está com instabilidade. Acompanhe também no app oficial do TSE." (com o link)
  3. "A projeção do Apurador está suspensa. O placar oficial do TSE continua atualizado."
- [ ] O replay liga e desliga chaves e avisos em rodadas escolhidas e confere o efeito no arquivo de rodada e nos JSONs publicados.
