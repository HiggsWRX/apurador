# 19: Textos preditivos atrás da chave

Status: ready-for-agent
Blocked by: 16, 17
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

Os eventos preditivos da narração e as frases de projeção da manchete, prontos para ir ao ar se a [Confirmação dos textos preditivos](../../apurador-2026/issues/22-confirmacao-dos-textos-preditivos.md) chegar, até na própria noite.

O coletor calcula os preditivos sempre, para manter as travas, mas só os põe nos JSONs públicos com a chave de textos preditivos ligada. Esconder no navegador não basta. Um script de conferência, o mesmo do ensaio geral, prova isso no replay.

Decisões: [Narração da noite](../../apurador-2026/issues/14-narracao-da-noite.md) (decisões 5, 6, 8 e 9), [Sinal de virada](../../apurador-2026/issues/23-sinal-de-virada.md) (decisão 4), [Segunda consulta jurídica](../../apurador-2026/issues/21-segunda-consulta-juridica.md) (decisão 5) e [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisão 22).

## Critérios de aceite

- [ ] **Eventos preditivos**, por lugar:
  - a mudança do sinal de virada entre "sem sinal", "possível" e "projetada", publicada só depois de durar 3 rodadas;
  - a chance de vitória passando de 90% e de 99%, que só disparam de novo depois de a chance cair abaixo de 80% e de 95%;
  - a linha da projeção em cada marco.
- [ ] Os eventos preditivos começam com "Projeção do Apurador:" e seguem os modelos da decisão 8 do ticket da narração.
- [ ] O coletor gera os preditivos das duas bases, e a página mostra os da base escolhida. Os números na curva nunca marcam um evento preditivo.
- [ ] Com a chave ligada, a manchete ganha uma frase de projeção por estado do sinal de virada ("A projeção do Apurador indica virada de Lula por volta de 88% das seções.", e as outras da decisão 9).
- [ ] **Chave desligada**: nenhum evento preditivo nem frase de projeção da manchete em nenhum JSON público de nenhuma rodada. Um script confere isso no replay.
- [ ] **Ligada no meio da noite**: os preditivos entram só dali em diante, sem publicação retroativa.
- [ ] **Desligada de novo**: somem dos JSONs todos os preditivos, inclusive os passados, e a frase de projeção da manchete.
- [ ] Com a chave desligada, o marco continua factual, sem a linha da projeção.
- [ ] A simulação nunca entra na narração nem na manchete.

## Comments

- 20/10/2026, do [ticket 16](16-comandos-chaves-e-plano-zero.md):
  - **A chave** é `textosPreditivos` (`NOMES_DAS_CHAVES`, em `packages/coletor/src/chaves.ts`). O dono a liga com `npm run noite -- ligar textos-preditivos`, digitando `textos-preditivos` para confirmar; `desligar textos-preditivos` desfaz. Ela é a única desligada no controle inicial (`CONTROLE_INICIAL`) e em `dados/chaves.json` (`noite.textosPreditivos: false`); o teste do build (`packages/site/test/build/bloco-ao-vivo.test.ts`) fixa esse `false` até a confirmação.
  - **No coletor**, leia `controle.chaves.textosPreditivos` em `publicar()` (`packages/coletor/src/coletor.ts`), onde `controle` é o da rodada, lido do arquivo de controle no começo dela. O coletor grava cada arquivo só quando os bytes mudam (`gravarSeMudou`, com um hash por caminho): para "desligada de novo, somem todos", basta montar os JSONs sem os preditivos, e os que mudarem são regravados. "Ligada no meio da noite vale dali em diante" é o coletor só pôr nos JSONs os preditivos gerados nas rodadas em que a chave estava ligada.
  - **Na página**, a frase de projeção da manchete lê `quadro.chaves.textosPreditivos` (`QuadroAoVivo`, `packages/site/src/lib/leitor-ao-vivo.ts`); a manchete é `manchete()` em `lib/textos-ao-vivo.ts`. Mas esconder no navegador não basta: a regra é a do coletor.
  - **No replay**, `OpcoesDoReplay.controle` (`packages/ensaio/test/replay.test.ts`) liga e desliga a chave em rodadas escolhidas, pelo relógio do coletor, e `r.gravacoes` tem todo JSON publicado com a hora: o script de conferência ("nenhum preditivo em nenhum JSON público") varre essa lista. O último `describe` do arquivo mostra o jeito.
