# 14: Bloco ao vivo: placar oficial, curva real, fase e indicador ao vivo

Status: ready-for-agent
Blocked by: 02, 12
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

A ilha em Preact do bloco ao vivo, em cada página de lugar. Ela lê o JSON do lugar e o arquivo de rodada a cada 30 s, com `If-None-Match`, e mostra:

- o placar oficial e a linha fixa;
- a manchete factual;
- a curva real;
- o indicador ao vivo.

A fase vem do arquivo de rodada: a página passa sozinha de "antes das 17h" a "ao vivo", sem recarregar. O "interrompido" compara a hora da rodada com o cabeçalho `Date` da resposta, nunca com o relógio do aparelho. No desenvolvimento, a ilha lê a pasta local que o coletor publica sobre o TSE falso.

Decisões: [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisões 1, 2, 4, 5 e 12), [Simulador "e se"](../../apurador-2026/issues/13-simulador-e-se.md) (decisão 14: indicador ao vivo), [Narração da noite](../../apurador-2026/issues/14-narracao-da-noite.md) (decisão 9: manchete), [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisão 7) e [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md) (decisão 11).

## Critérios de aceite

- [ ] **Cartão do placar oficial**: os dois candidatos lado a lado, com a foto oficial do TSE sem alteração, nome, partido, % com duas casas e votos.
  - Embaixo vêm a barra, o % de seções com "x de y", a hora da última totalização e "Fonte: TSE, sem alteração (CC-BY)".
  - A moldura é sólida, com o selo "Placar oficial · TSE".
- [ ] **Linha fixa**: quando o placar sai da tela, uma linha fina no topo mostra só os números oficiais (Flávio %, Lula %, % de seções · TSE).
- [ ] **Manchete factual**: começa sempre pelo placar oficial.
  - Antes das 17h: "A apuração do 2º turno começa às 17h".
  - Lugar sem seções: "A apuração ainda não começou neste estado" (ou "neste município").
  - Durante: "Flávio lidera com X% dos votos válidos e Y% das seções totalizadas".
  - Com diferença menor que 0,10 ponto, a diferença vai em votos.
  - Nunca há frase de projeção.
- [ ] **Curva real**: as duas linhas espelhadas em torno de 50%. A escala ignora o começo instável, até 3% das seções, e a curva se estende a cada leitura.
- [ ] **Os seis estados do indicador ao vivo**, como decidido:
  1. **Antes das 17h**: "A divulgação começa às 17h", com contagem regressiva na última hora.
  2. **Ao vivo**: ponto pulsante, anel de 30 s e "Atualiza sozinho, sem recarregar".
  3. **TSE sem novidade**: continua ao vivo, com "TSE sem novidade desde HH:MM" no detalhe.
  4. **Interrompido**: depois de 3 min sem rodada, "Atualizado às HH:MM, atualização interrompida". Depois de 10 min, entra o link para o app oficial do TSE, com os últimos dados à vista.
  5. **Sem conexão**: "Sem conexão · tentando de novo".
  6. **Encerrada**: "Apuração encerrada". Com essa fase, o "interrompido" nunca aparece.
- [ ] **Indicador, forma**: um toque abre o detalhe com a última leitura e a última totalização. A cor é grafite. Com movimento reduzido, não há pulso nem pisca, e o anel vira "próxima leitura em N s".
- [ ] Os números que mudaram piscam uma vez (1 s).
- [ ] A passagem para o ao vivo acontece sem recarregar e só pelo arquivo de rodada.
- [ ] **Leitor ao vivo**: a lógica da ilha que decide o que mostrar é testada com respostas simuladas (status, `Date`, ETag e corpo) e relógio injetado, cobrindo os seis estados e os 3 e 10 min.
- [ ] Placar e curva ficam visíveis em até 3 s num Android barato no 4G.

## Comments

- 19/10/2026, do [ticket 12](12-coletor-minimo-e-replay.md): o coletor publica `rodada.json` e `lugares/<id>.json`. O contrato está no comentário de resolução do 12.
  - `totalizacao` é a hora do TSE, em Brasília (`AAAA-MM-DD HH:MM:SS`). `rodada` e `novidade.vista` são ISO, no relógio do coletor: é `rodada` que se compara com o `Date` da resposta.
  - Os votos e os percentuais de cada lugar vão na ordem de `candidatos` do `rodada.json`: alfabética pelo nome de urna, com `sequencial` para a foto oficial.
  - A curva real é `[% de seções, % de cada candidato]`, com um ponto novo só quando algum número muda.
  - A pasta local do desenvolvimento sai de dois terminais: `npm run tse-falso -- --partida 16:58` e `npm run coletor -- --tse http://127.0.0.1:8022/oficial`. Sem `--pasta`, ela fica em `.cache/coletor/publicado`.
