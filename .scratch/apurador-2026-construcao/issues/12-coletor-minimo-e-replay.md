# 12: Coletor mínimo e replay automático

Status: resolved
Blocked by: 11
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O coletor lê o TSE a partir de uma URL base configurável: o TSE real, os arquivos finais do 1º turno de 2026 ou o TSE falso. A cada rodada de 20 s, ele:

1. lê os índices `-ab.json`;
2. baixa só o que mudou;
3. normaliza pelo leitor ao vivo do `tse`;
4. publica numa pasta local o JSON do Brasil, de cada UF, do Exterior e de cada município, com os dados do TSE do lugar, e o arquivo de rodada.

O leitor do TSE, o relógio e o destino de publicação entram por parâmetro. Com isso, o replay automático do CI roda a noite do 2º turno de 2022 pelo TSE falso, sem rede e na velocidade máxima, e confere o placar publicado.

Decisões: [Arquitetura e tecnologia](../../apurador-2026/issues/08-arquitetura-e-tecnologia.md) (decisões 16, 17, 20 e 21 e comentários), [API ao vivo do TSE](../../apurador-2026/issues/01-api-ao-vivo-tse.md), [Volume de gravações na noite](../../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md) (decisões 1 e 2) e [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 1, 7, 11 e 20).

## Critérios de aceite

- [x] O coletor é um processo Node 24 em TypeScript, sem framework web e sem porta aberta.
- [x] As URLs saem da configuração de municípios e zonas do TSE. O replay não pede nenhuma URL inexistente: zero 404 no registro do TSE falso.
- [x] Cada arquivo é baixado no máximo uma vez por minuto, com ETag e 304. A leitura dos índices fica em ~30 requisições por rodada.
- [x] O JSON de cada lugar traz, sem alteração e com duas casas, o placar parcial, o % de seções totalizadas, "x de y", a hora da última totalização e a curva real. O placar do Brasil sai do arquivo do Brasil, nunca da soma dos municípios.
- [x] O arquivo de rodada traz a hora da rodada, a fase e a hora da última novidade do TSE.
  - A fase passa de "antes das 17h" a "ao vivo" às 17h de Brasília, pelo relógio da fonte do TSE (no TSE falso, o relógio dele).
  - A fase passa a "encerrada" na totalização final do Brasil.
- [x] Cada arquivo é gravado só quando os bytes mudam, com o hash guardado no estado.
- [x] O coletor guarda desde o início as zonas dos 190 municípios com mais de uma, ainda sem usá-las na projeção.
- [x] **Replay automático**: em todas as rodadas e em todos os lugares, o placar, o % de seções e a hora publicados são iguais aos do arquivo do TSE falso. A meta é zero divergências, conferidas pelo mesmo script que o ensaio geral usa.
- [x] O replay roda no CI em cada pull request e push na `main`.
- [x] O tempo de cada rodada fica registrado, inclusive no pico de ~600 municípios por rodada.
- [x] O coletor roda 15 min contra os arquivos reais e ainda zerados da eleição `6258`, publicando só na pasta local, sem erro de formato.

## Comments

**19/10/2026, resolvido:**

- **Leitor ao vivo** (`@apurador/tse`): `lerResultado` (EA20), `lerAcompanhamento` (EA14 e EA15), `eleicaoDaConfiguracao` (`ele-c.json`) e `urlsDaDivulgacao`. Foram conferidos com as amostras reais (6257 final e 6258 zerado) e com as URLs medidas na pesquisa da API.
  - Um arquivo de outro formato vira `ArquivoDoTseInvalido`, inclusive a configuração de municípios.
  - A indicação do TSE é `md = "e"`.
- **Coletor** (`@apurador/coletor`): `criarColetor({ base, eleicao, buscar, relogio, destino })`.
  - `npm run coletor -- [--tse <base>] [--pasta <pasta>] [--pedidos-por-segundo 45] [--minutos 15]` publica na pasta local (padrão: `.cache/coletor/publicado`).
  - O registro de cada rodada vai para `.cache/coletor/rodadas-*.jsonl`: duração, processamento, pedidos, respostas, baixados, gravações e falhas.
  - **Rodada**: lê os 29 índices sempre, com ETag; sem novidade, as 29 respostas são 304.
    - Baixa o resultado de cada lugar cuja hora no índice passou da que o coletor tem.
    - A ordem é Brasil, UFs, municípios (o que mudou há mais tempo primeiro) e zonas.
  - **Uma vez por minuto**: vale para os arquivos de resultado. Os índices são lidos a cada rodada, como pedem a decisão 17 da Arquitetura e os ~30 pedidos por rodada.
  - **Ritmo**: 45 pedidos/s, nunca acima de 50 num segundo, e no máximo 14 s de pedidos por rodada. Assim ficam abaixo dos alertas de atenção da [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md), decisão 7.
    - O que não cabe numa rodada fica para a seguinte. A partida a frio (~6.530 arquivos) leva ~10 rodadas, e a varredura da totalização final também.
    - O `setTimeout(50)` do Windows dura ~60 ms, e o TSE responde em 0,3 a 0,5 s. Por isso a fila recupera até 4 pedidos atrasados e deixa até 40 em voo.
    - Por HTTP, contra o TSE falso local, uma rodada cheia faz 630 pedidos em 14,4 s.
  - **Zonas**: as 725 dos 190 municípios com mais de uma ficam guardadas e não são publicadas. A projeção (17) e o objeto da noite (22) as leem por `coletor.resultado()`.
    - Quando o município muda, as zonas dele são pedidas de novo.
    - Uma zona só sai das pendentes com um pedido feito 1 min depois da mudança, porque o CDN pode ter a cópia velha.
  - **Arquivo que não serve** (o leitor não entende, ou os candidatos não são os do Brasil):
    - fica o último arquivo bom;
    - a falha vai para o registro da rodada;
    - a ETag não fica, e o arquivo é pedido de novo;
    - um erro que escape vira falha da rodada, e o coletor não cai.

    Os alertas são do ticket 21.
  - **Fase**: passa de antes das 17h a ao vivo pelo maior `Date` das respostas do TSE. Passa a encerrada quando o Brasil traz `tf = "s"`.
  - **Hora da rodada**: é a da publicação do arquivo de rodada, no relógio do coletor.
- **Contrato dos arquivos**, aprovado pelo dono em 19/10:
  - `rodada.json`: `{ rodada, fase: "antes-das-17h" | "ao-vivo" | "encerrada", novidade: { totalizacao, vista }, candidatos: [{ numero, nome, partido, sequencial }] }`. Os candidatos vão em ordem alfabética do nome de urna e vêm do arquivo do Brasil, porque nada deles pode ficar no código (o TSE falso serve 2022).
  - `lugares/<id>.json` (`BR`, a sigla da UF, `ZZ` ou o código do TSE do município): `{ lugar, tse: { totalizacao, secoes: { totalizadas, total, percentual }, votos, percentuais, final }, curva }`. Os votos e os percentuais vão na ordem dos candidatos do arquivo de rodada.
  - A curva real é `[% de seções, % de cada candidato]`, com um ponto novo só quando algum número muda.
- **Conferência do placar** (`@apurador/ensaio`): `conferirPlacar` compara cada arquivo de lugar publicado com o arquivo do TSE falso daquele lugar na hora publicada. É o script que o ensaio geral (ticket 30) vai usar sobre o endereço público. Um teste mostra que ele acusa uma divergência plantada.
- **Replay automático**: está em `packages/ensaio/test/replay.test.ts`, entra no `npm test` (CI em cada pull request e push na `main`) e também roda sozinho com `npm run replay`.
  - **Noite inteira** (16:50 até 30 min depois da final, ~42 s):
    - 1.435 rodadas, 206.709 pedidos e 101.572 gravações (96.236 de municípios, contra ~93 mil nas contas do ticket 24);
    - zero divergências, zero 404 e zero violações do limite;
    - termina com o resultado oficial em todos os lugares;
    - o pico é de 413 municípios numa rodada, com 12,5 s de pedidos e 129 ms de processamento. A regra de uma vez por minuto espalha os ~640 por rodada do ticket 24.
    - Nenhuma rodada passa de 13,9 s.
  - **Com o cache de 60 s do CDN** do TSE na frente do TSE falso, das 16:50 às 21:00: zero divergências, e os lugares e as zonas ficam em dia em até 5 min. O ensaio geral não tem essa borda; só o replay põe o coletor diante dela.
  - Os outros testes do replay cobrem:
    - a passagem das 17h;
    - os 304;
    - a gravação só do que muda;
    - a curva real;
    - um arquivo estragado e um arquivo sem um dos candidatos.
- **TSE real**: em 19/10, das 14:18 às 14:33, o coletor rodou contra a eleição 6258 zerada, a 20 pedidos/s, publicando só na pasta local.
  - Foram 42 rodadas e 7.731 pedidos, com zero falhas e nenhum erro de formato.
  - Baixou o Brasil, as 28 UFs, os 5.757 municípios e as 725 zonas. A partida a frio levou 18 rodadas.
  - Depois, cada rodada fez 29 pedidos, todos 304, e só gravou o arquivo de rodada.
  - Candidatos: FLAVIO BOLSONARO e LULA. 499.248 seções.
- **Scripts**: os da raiz `tse-falso` e `coletor` agora repassam as opções (faltava o `--`).
- **Para o 14**:
  - `totalizacao` é a hora do TSE, em Brasília.
  - `rodada` e `novidade.vista` são ISO, no relógio do coletor.
  - Para desenvolver, a pasta local sai de `npm run tse-falso` mais `npm run coletor -- --tse http://127.0.0.1:8022/oficial`.
- **Para o 20**: `Destino { gravar(caminho, bytes) }` é a interface única. Hoje só existe `pastaLocal`.
- **Para o 22**: o estado fica em memória, em `coletor.ts`: ETags, hashes, curvas, novidade e resultados.
- **Para o 23**: num 403, o coletor hoje só registra a falha e segue pedindo. O teto de gravações e a parada 30 min depois da final também ficam para lá.
