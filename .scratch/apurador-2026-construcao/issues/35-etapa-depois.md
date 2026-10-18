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
