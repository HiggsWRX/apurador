# 09: Painel de antes das 17h

Status: ready-for-agent
Blocked by: 04, 08
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

A página do Brasil antes das 17h, como build estático, sem o coletor. A ordem é esta:

1. a manchete;
2. o placar com "A divulgação começa às 17h";
3. o agregado com faixa e tendência;
4. "O que esperar da noite", com a curva projetada de 0% a 100% e a virada projetada;
5. a projeção e a chance de vitória, com o controle **Base da projeção**;
6. a lista das pesquisas, recolhida.

Os outros lugares mostram a indicação das pesquisas. Os números são os do módulo `modelo` rodado no build sobre o mesmo `pesquisas.csv`, e cada bloco desliga pela sua chave de publicação.

Decisões: [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisões 3, 4 e 11 e comentários), [Combinação de pesquisas e apuração](../../apurador-2026/issues/11-combinacao-pesquisas-e-apuracao.md) (decisões 5 e 6), [Segunda consulta jurídica](../../apurador-2026/issues/21-segunda-consulta-juridica.md) e [Consulta a advogado eleitoral](../../apurador-2026/issues/16-consulta-advogado-eleitoral.md) (decisão 2).

## Critérios de aceite

- [ ] A manchete diz "A apuração do 2º turno começa às 17h", sem números.
- [ ] A projeção vem numa moldura tracejada, com fundo próprio e o aviso "Estimativa do Apurador. Não é resultado oficial nem garantia do resultado."
  - O resultado estimado de cada candidato aparece com uma casa e ± a margem de 95%.
  - A chance de vitória aparece numa barra dividida, com inteiros, "<1%" e ">99%".
- [ ] O controle **Base da projeção** oferece "Só apuração" e "Apuração + pesquisas" (padrão), com "As pesquisas pesam 100% na projeção agora".
- [ ] "O que esperar da noite" desenha a curva projetada de 0% a 100% nas duas bases, com faixa, losango e faixa da virada projetada. Não tem frase preditiva nem rótulo do sinal de virada, porque ninguém está atrás antes da primeira seção.
- [ ] A curva e a projeção levam "Cálculo do Apurador com dados do TSE".
- [ ] Um teste confere que os números da página são os do `modelo` sobre o mesmo `pesquisas.csv`.
- [ ] As páginas de UF, do Exterior e de município mostram a indicação das pesquisas, com o 1º turno e o histórico.
- [ ] O link "Como calculamos →" leva à página de metodologia, e a chance de vitória e o peso das pesquisas levam às âncoras `#chance` e `#juntas`.
- [ ] A chave da projeção e da curva antes das 17h fica no arquivo de chaves. Desligada, "O que esperar da noite" fica sem números de projeção, só com o texto da ordem de chegada típica, e nenhuma base mostra projeção antes das 17h.
- [ ] Placar e painel ficam visíveis em até 3 s num Android barato no 4G.
