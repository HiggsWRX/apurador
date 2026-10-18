# 04: Agregado de pesquisas, tendência e indicação das pesquisas

Status: ready-for-agent
Blocked by: 02, 03
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O módulo `modelo` calcula o agregado de pesquisas do Brasil sobre o `pesquisas.csv`. Ele aparece na página do Brasil com a faixa de incerteza, a linha de tendência desde 05/10 e o aviso. As páginas de UF, do Exterior e de município mostram a indicação das pesquisas do lugar.

Cada atualização do `pesquisas.csv` é um deploy, e a retirada de uma pesquisa recalcula tudo. O bloco liga e desliga por uma chave de publicação. Antes de o coletor existir, as chaves ficam num arquivo de dados publicado com o site, que muda por deploy sem código novo, e este ticket cria esse arquivo.

Decisões: [Agregado de pesquisas e erro histórico](../../apurador-2026/issues/10-agregado-de-pesquisas.md) (decisões 3 a 9 e comentários) e [Consulta a advogado eleitoral](../../apurador-2026/issues/16-consulta-advogado-eleitoral.md) (decisões 2, 5 e 6).

## Critérios de aceite

- [ ] O agregado é a média simples, em votos válidos, da pesquisa mais recente de cada instituto da lista, com campo terminando nos 7 dias anteriores à data do cálculo.
  - Os válidos saem dos votos totais publicados: Flávio ÷ (Flávio + Lula).
  - Com menos de 4 institutos na janela, ela passa a 14 dias.
  - Não há peso por amostra, data ou modo, nem ajuste por instituto.
- [ ] A incerteza é normal: √(1,5² + 0,4² × dias até 25/10), ou seja, 1,5 ponto em 25/10. A chance de vitória é a probabilidade de passar de 50%.
- [ ] Um teste confere os números de 18/10: Flávio 51,0% com 8 institutos, incerteza de 1,84 ponto e chance de ~71%.
- [ ] A tendência desde 05/10 é recalculada dia a dia, com a mesma regra.
- [ ] O agregado congela às 23h de 24/10. Depois disso, retirar uma pesquisa recalcula o agregado; incluir uma nova não é aceito.
- [ ] A página do Brasil mostra o agregado com faixa e tendência, num bloco separado da lista das pesquisas, com o aviso "Média calculada pelo Apurador sobre pesquisas registradas no TSE. Não é uma pesquisa própria."
- [ ] A indicação das pesquisas de cada UF, do Exterior e de cada município é o placar entre finalistas do lugar no 1º turno somado a (agregado − 51,0), limitado a 0–100%.
- [ ] As comparações com o 1º turno usam o placar entre finalistas (Brasil: 51,0 × 49,0), nunca o % sobre todos os válidos.
- [ ] A chave do agregado e da tendência antes das 17h fica no arquivo de chaves. Desligada, ela esconde o agregado e a indicação das pesquisas, que deriva dele, sem código novo.
- [ ] Nenhum texto diz que o modelo "aprende" ou que é "IA".
