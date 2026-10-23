# 35: Etapa "Depois": como a projeção se saiu e 2º turno de 2026 no histórico

Status: ready-for-agent
Blocked by: 02, 22
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

A partir da manhã de 26/10, o site vira registro da noite:

- a página de lugar ganha "Como a projeção se saiu", calculado com o mesmo código sobre os objetos da noite guardados no R2;
- o 2º turno de 2026 entra no histórico a partir do último estado da noite, com aviso de provisório. Quando o TSE publicar os arquivos oficiais, por volta de 27/10, o pipeline passa a usá-los, e o aviso sai.

O ticket inclui também a preparação para abrir o repositório. O dono confirma cada passo que apaga recursos ou torna algo público.

Decisões: [Plano de lançamento em fases](../../apurador-2026/issues/19-plano-de-lancamento-em-fases.md) (decisões 7 e 8), [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisão 13 e comentários) e [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md) (decisão 21).

## Critérios de aceite

- [ ] **Depois da noite, na página de lugar**: ficam o placar final do TSE, a curva real completa e a narração como registro.
- [ ] **"Como a projeção se saiu"**: mostra o erro das duas bases ao longo da noite, com a frase "com 5% das seções, a projeção errava X". É calculado pelo executor de noites sobre os objetos da noite.
- [ ] **2º turno de 2026 no histórico**: entra a partir do último estado da noite, com o aviso "provisório, até os arquivos oficiais do TSE".
- [ ] **Arquivos oficiais**: quando eles saem, o pipeline passa o 2º turno de 2026 a eles, a conferência de totais roda de novo, e o aviso sai.
- [ ] **Preparação do repositório público**, com o de acordo do dono:
  - uma varredura procura segredos e endereços de ensaio em todo o histórico do Git (endereço do ensaio, tópico do ntfy, nomes da sentinela);
  - o Worker e o bucket do ensaio são apagados;
  - a chave de escrita do R2 é revogada.
- [ ] Depois disso, o site só muda por deploy.

## Comments

- 20/10/2026, do [ticket 33](33-curva-de-comparacao.md): os turnos passados da curva de comparação são os arquivos de `dados/curvas/`, que o `npm run noites` gera de cada noite reconstruída da lista `NOITES` (`packages/pipeline/src/gerar-noites.ts`). O site os lê todos (`lib/curvas-passadas.ts`).
  - Se o 2º turno de 2026 for reconstruído e entrar nessa lista, o botão "2026 2T" aparece sozinho em toda página de lugar.
  - Decida se ele entra: depois da noite, a curva real da própria página já é esse turno.
- 21/10/2026, do [ticket 34](34-comparacao-de-dois-turnos.md), que deixou a nota só no próprio registro: com o `dados/turnos/2026-2.json`, a comparação de dois turnos passa a 15 pares, e a de partida vira 2026 1T e 2026 2T sem mudar o código. O aviso de provisório precisa aparecer também nela enquanto o turno vier do último estado da noite.

- 22/10/2026, do [ticket 29](29-metodologia-acerto-e-calibracao.md): a seção 6 da metodologia já mede uma noite passada como o "Como a projeção se saiu" vai medir a de 25/10. Em `packages/site/src/lib/metodologia.ts`, `errosDaNoite` dá o erro em módulo do placar parcial e das duas bases no momento mais perto de 5%, 25% e 50% das seções, e a página escreve "menos de 0,1 ponto" quando a uma casa dá 0,0. Em `lib/graficos-da-metodologia.ts`, `graficoDaNoite` desenha o placar parcial, a projeção da base Apuração + pesquisas com a faixa de 95% e o resultado, a partir de uma `NoiteReproduzida` (os momentos no 1º finalista); para a outra base, é dar a ela o seletor da base. As noites de lá vêm do CSV momento a momento do executor (`docs/calibracao/noite-*.csv`); os objetos da noite de 25/10 precisam virar o mesmo formato.

- 22/10/2026, do [ticket 30](30-ambiente-de-ensaio-e-conferencias.md): o ambiente do ensaio tem três Workers, não dois: o site `apurador-ensaio` (`packages/site/ensaio/wrangler.jsonc`), o plano B `apurador-ensaio-plano-b` e a sentinela `apurador-sentinela-ensaio`, além do bucket `apurador-ensaio` e do domínio `ao-vivo-ensaio.apurador.org`. Os comandos para apagar estão no fim de "O ambiente do ensaio geral" (`packages/coletor/cloudflare/README.md`). Os endereços do ensaio ficam no código (`AMBIENTES.ensaio`, `packages/site/ensaio/`, `cors-ao-vivo-ensaio.json`, `sentinela.jsonc`), então a varredura do histórico vai achá-los: depois de apagados, eles não levam a nada.
- 22/10/2026, do [ticket 22](22-retomada-e-objeto-da-noite.md):
  - **Os objetos da noite** ficam no bucket privado `apurador-noite`, sem domínio nem endereço público (decisão do dono em 22/10, registrada no ticket 22). A leitura vai pela API S3, assinada com a chave `R2_NOITE_*` do `packages/coletor/.env`, como em `objetosDaNoiteNoR2` (`packages/coletor/src/r2.ts`). Cada objeto, `noite/<hora em UTC, sem os dois-pontos>-r<rodada>.json.gz`, um por rodada, ~1.800 e ~1,7 GB na noite. Cada um é um `EstadoGuardado` (`packages/coletor/src/retomada.ts`) em JSON com gzip: o estado de retomada da rodada e os arquivos de resultado do TSE que chegaram nela, como texto, com a abrangência e a ETag. O primeiro objeto de cada coletor diz de onde ele partiu (`partida`).
  - **Rodar a projeção de novo**: `reproduzirAProjecao(objetos, entrada)` dá, para cada objeto em ordem, a `ProjecaoDaRodada` que o coletor publicou, com as retomadas. O replay com quedas confere que ela bate com os JSONs publicados (`packages/ensaio/test/retomada.test.ts`). "Como a projeção se saiu" e o CSV momento a momento do [ticket 29](29-metodologia-acerto-e-calibracao.md) saem dela. Ela supõe que a retomada do objeto da noite partiu do objeto anterior: com dois coletores na mesma noite (o computador principal de volta ao lado do notebook), o trecho deles não se reproduz. A leitura só tem o último objeto (`objetosDaNoiteNoR2(...).ultimo`): ler todos pede uma lista sem `start-after` e o GET de cada um.
  - **A chave**: o roteiro revoga a chave de escrita no dia seguinte. A do bucket da noite é também a de leitura: baixe os objetos antes, ou crie uma só de leitura.
  - **O último estado da noite**: o estado em disco, `.cache/coletor/estado-producao.json`, tem todos os arquivos do TSE da última rodada, e não só os que chegaram nela.
