# 24: Simulador "e se" antes das 17h

Status: ready-for-agent
Blocked by: 08, 09
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O simulador "e se" numa tela própria, aberta pelo link "Simular 'e se' →" na caixa da projeção. Ele é a ilha em Preact que roda o módulo `modelo` no navegador.

O visitante ajusta hipóteses sobre o voto que falta e o comparecimento. A simulação aparece numa moldura pontilhada, sempre ao lado da projeção do Apurador.

Antes das 17h, o simulador roda sobre um arquivo estático gerado no build, a partir da base de 2026 e do agregado. Por isso pode entrar na etapa "Antes da noite", se estiver pronto.

Decisões: [Simulador "e se"](../../apurador-2026/issues/13-simulador-e-se.md) (decisões 1 a 11 e 13) e [Segunda consulta jurídica](../../apurador-2026/issues/21-segunda-consulta-juridica.md).

## Critérios de aceite

- [ ] **Hipóteses**:
  - **Voto**: quanto o voto que falta pende para um candidato além da projeção. No Brasil vai de −5 a +5 e em cada região de −10 a +10, em passos de 0,5. A região soma ao Brasil, e o Exterior segue o Brasil.
  - **Comparecimento**: só por região, de −10 a +10 pontos percentuais, em passos de 1.
- [ ] **No modelo**: as hipóteses mexem só no voto que falta de cada município, por cima da estimativa inteira. O voto desloca o % de válidos que falta, limitado a 0–100%. O comparecimento multiplica os válidos que faltam. A incerteza é a da projeção. Não há segunda cópia do modelo.
- [ ] **Tradução**: ao lado de cada controle, aparece a hipótese em relação ao placar entre finalistas do 1º turno ("isso dá Lula +4,2 sobre o 1º turno no Nordeste").
- [ ] **A simulação mostra**:
  - o resultado ± margem de 95%, a chance de vitória e a curva projetada com a virada projetada, no Brasil;
  - uma tabela das cinco regiões;
  - sem mapa nem resultado por lugar.
- [ ] **Terceiro nível visual**: moldura pontilhada, fundo hachurado leve e o selo "Simulação · com as suas hipóteses, não é a projeção do Apurador". A projeção do Apurador fica sempre ao lado, e na curva a simulada é pontilhada sobre a projetada do site, mais clara.
- [ ] **Base**: o simulador herda a base escolhida na página e mostra o mesmo controle, com "As pesquisas pesam X% na projeção agora".
- [ ] **Hipóteses prontas**: um par simétrico, só antes da apuração e só na base Apuração + pesquisas: "As pesquisas subestimam Flávio como no 1º turno" (Flávio +1,4) e "As pesquisas subestimam Lula na mesma medida" (Lula +1,4). Há sempre um "Zerar".
- [ ] **"O que seria preciso"**:
  - uma frase para quem está atrás no resultado estimado, com um botão "Aplicar", que move o controle do Brasil;
  - fora da faixa, a frase diz "mais de 5 pontos", nunca "impossível".
- [ ] **Link compartilhável**: guarda só a base e as hipóteses mexidas. Ao abrir, recalcula com os dados do momento e mostra "Simulação de outra pessoa · com os dados de agora". A prévia do link é a do site.
- [ ] **Aberto de uma UF ou de um município**: a região daquele lugar já vem expandida.
- [ ] **Desenho**: o do celular e o do computador seguem a decisão 13.
- [ ] **Chave do simulador antes das 17h**: fica no arquivo de chaves.
- [ ] **Testes no `modelo`**:
  - o par simétrico dá resultados espelhados;
  - hipóteses zeradas reproduzem a projeção;
  - "o que seria preciso" leva o resultado a 50%.
- [ ] O simulador abre em até 5 s num Android barato no 4G.
- [ ] A simulação nunca aparece na manchete, na narração nem na página de lugar.

## Comments

- 19/10/2026, do [ticket 08](08-base-apuracao-mais-pesquisas.md):
  - A base que o simulador herda é o `projetar` do `modelo`: sem o agregado, a "Só apuração"; com ele (`{ valor, incerteza }`), a "Apuração + pesquisas".
  - As hipóteses mexem no voto que falta de cada município, que a `Projecao` daquela base dá em `votoQueFalta` e `fatiaDoQueFalta`.
  - O peso das pesquisas é `pesoDasPesquisas` na mesma `Projecao`, e é 0 na "Só apuração".

- 19/10/2026, do [ticket 28](28-calibracao.md):
  - O simulador lê as constantes congeladas do `packages/modelo/constantes.json`. A margem de 95% delas é mais larga que a das provisórias (~3,0 p.p. em média de 5% a 50% das seções nas noites passadas).

- 20/10/2026, do [ticket 09](09-painel-antes-das-17h.md):
  - A projeção de antes das 17h sai no build, em `packages/site/src/lib/projecao-antes-das-17h.ts`: `PROJECAO_ANTES_DAS_17H` traz as bases (`so-apuracao` e `com-pesquisas`, cada uma com `brasil: ResultadoDoLugar`, `curva: CurvaDoLugar` e `pesoDasPesquisas`) e `coincidem`; `BASE_PADRAO` é a que a página abre. O módulo monta a base do modelo de `dados/bases/2026-2.json`, a apuração antes da primeira seção (seções e aptos do 1º turno, nada totalizado) e as constantes congeladas por `lerConstantes`: o arquivo estático do simulador pode partir do mesmo módulo.
  - O controle Base da projeção é `[data-base-botao]` em `components/ProjecaoAntesDas17h.astro`: ao clicar, alterna `data-ativa` em todo elemento `[data-base="so-apuracao"|"com-pesquisas"]` da página. O simulador herda a base lendo o `aria-pressed` dos botões.
  - O link "Simular 'e se' →" ainda não existe: entra na caixa da projeção (`ProjecaoAntesDas17h.astro`), antes de "Como calculamos →".
  - A chave do simulador antes das 17h entra em `dados/chaves.json`, em `ESPERADAS` (`lib/chaves.ts`) e em `test/chaves-desligadas/chaves.json`, como `antesDas17h.projecao`.
  - Peças para reaproveitar: `CurvaProjetada.tsx` (desenha uma `CurvaDoLugar` com faixa de 95%, losango e faixa da virada), `ChanceDeVitoria.tsx` (a barra dividida) e `ValoresDosFinalistas.astro` (com `margem`). A moldura pontilhada da simulação é o terceiro nível visual, depois da `.projecao` tracejada.
  - Peso: a página do Brasil tem ~16 KB de HTML e ~5 KB de CSS com gzip (`test/build/pagina-brasil.test.ts`, orçamento de 200 KB para os dois). O modelo e o arquivo do simulador devem carregar só ao abrir.
