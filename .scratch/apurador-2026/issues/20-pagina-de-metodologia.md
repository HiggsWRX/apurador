# Página de metodologia

Type: prototype
Status: open
Blocked by: —
Map: [Apurador 2026](../map.md)

## Question

O que a página de metodologia mostra, em que ordem e com que tom, para que um visitante sem formação em estatística entenda de onde vêm a projeção e a chance de vitória e veja o histórico de acerto do modelo?

Protótipo rápido: um esboço do texto e dos gráficos, para reagir e decidir.

O que já está decidido e precisa entrar:

- **Método da base "Só apuração"**: transferência de votos corrigida pelo próprio município, e o desempenho na noite de 2022. Ver [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md).
- **Agregado de pesquisas**: a regra de inclusão (a lista dos 14 institutos), o estimador, a incerteza e o teste em 2018 e 2022, com a incerteza de cada ano calculada sem aquele ano. Ver [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md).
- **Combinação**: o peso das pesquisas ao longo da noite e o erro das duas bases na noite de 2022, com as pesquisas reais e com as deslocadas 2 pontos. Ver [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md).
- **Avisos** de [Restrições legais à projeção](04-restricoes-legais.md):
  - a projeção não é resultado oficial nem pesquisa;
  - os dados do TSE aparecem sem alteração, com atribuição (CC-BY);
  - a lista das pesquisas traz os seis dados do art. 10.
- **Exigência do advogado**, de [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md) (decisão 5): a metodologia do agregado e da projeção é pública, com os critérios de seleção, os cálculos e as limitações. A página diz que o agregado não é pesquisa própria e que a projeção não é resultado oficial nem garantia do resultado. Pela pesquisa legal, o modelo não é apresentado como "IA".

- **Sino da projeção**, de [Telas da página de lugar](12-telas-da-pagina-de-lugar.md): a distribuição do resultado final, com a área de cada lado de 50% igual à chance de vitória de cada candidato. Saiu da página de lugar, onde a chance aparece numa barra dividida, e serve aqui para explicar de onde vem a chance. Está pronto no protótipo (`svgSino` em `componentes.js`, variante C).

A decidir:

- Ordem e profundidade: um resumo em cima e os detalhes abaixo?
- Quais gráficos entram.
- Se reproduzimos a noite de 2018, para mostrar um caso em que as pesquisas erraram (1,9 ponto). O custo é montar a reprodução de 2018 a partir de `detalhe_votacao_secao`, como foi feito para 2022.
- Se a página oferece os dados ou o código para baixar.
