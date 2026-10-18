# 12: Coletor mínimo e replay automático

Status: ready-for-agent
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

- [ ] O coletor é um processo Node 24 em TypeScript, sem framework web e sem porta aberta.
- [ ] As URLs saem da configuração de municípios e zonas do TSE. O replay não pede nenhuma URL inexistente: zero 404 no registro do TSE falso.
- [ ] Cada arquivo é baixado no máximo uma vez por minuto, com ETag e 304. A leitura dos índices fica em ~30 requisições por rodada.
- [ ] O JSON de cada lugar traz, sem alteração e com duas casas, o placar parcial, o % de seções totalizadas, "x de y", a hora da última totalização e a curva real. O placar do Brasil sai do arquivo do Brasil, nunca da soma dos municípios.
- [ ] O arquivo de rodada traz a hora da rodada, a fase e a hora da última novidade do TSE.
  - A fase passa de "antes das 17h" a "ao vivo" às 17h de Brasília, pelo relógio da fonte do TSE (no TSE falso, o relógio dele).
  - A fase passa a "encerrada" na totalização final do Brasil.
- [ ] Cada arquivo é gravado só quando os bytes mudam, com o hash guardado no estado.
- [ ] O coletor guarda desde o início as zonas dos 190 municípios com mais de uma, ainda sem usá-las na projeção.
- [ ] **Replay automático**: em todas as rodadas e em todos os lugares, o placar, o % de seções e a hora publicados são iguais aos do arquivo do TSE falso. A meta é zero divergências, conferidas pelo mesmo script que o ensaio geral usa.
- [ ] O replay roda no CI em cada pull request e push na `main`.
- [ ] O tempo de cada rodada fica registrado, inclusive no pico de ~600 municípios por rodada.
- [ ] O coletor roda 15 min contra os arquivos reais e ainda zerados da eleição `6258`, publicando só na pasta local, sem erro de formato.
