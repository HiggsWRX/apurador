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
