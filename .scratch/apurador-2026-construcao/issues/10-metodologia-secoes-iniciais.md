# 10: Página de metodologia: seções 1 a 5, 8 e 9

Status: ready-for-agent
Blocked by: 04, 05
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

A página de metodologia estática, na estrutura A do protótipo (branch `prototipo/pagina-metodologia`), com o que os advogados exigem para a etapa "Antes da noite". O topo traz o título "Como calculamos a projeção", uma frase, o aviso da projeção, o cartão "Em um minuto" e o índice.

Entram as seções 1 a 5, 8 e 9, cada uma com texto simples e as fórmulas recolhidas em "As contas". A seção 2 traz o sino do agregado do dia. As seções 6 e 7 chegam no [ticket 29](29-metodologia-acerto-e-calibracao.md), e a página não traz "em breve": ela só cresce.

Decisões: [Página de metodologia](../../apurador-2026/issues/20-pagina-de-metodologia.md) (decisões 1, 2, 4, 5, 6, 7, 8 e 9) e [Segunda consulta jurídica](../../apurador-2026/issues/21-segunda-consulta-juridica.md) (decisão 3).

## Critérios de aceite

- [ ] As seções têm âncoras fixas: `#pesquisas`, `#chance`, `#apuracao`, `#juntas`, `#virada`, `#limites` e `#fontes`. As âncoras `#acerto` e `#constantes` ficam reservadas para o ticket 29.
- [ ] "Em um minuto" tem cinco frases e a declaração "sem IA generativa nem aprendizagem de máquina", sem a frase do teste de 2022.
- [ ] Os textos partem do objeto `T` do protótipo, falam com "você", em frases curtas e sem jargão. Fórmulas só aparecem dentro de "As contas".
- [ ] Nenhum texto usa "aprende", "IA" (fora da declaração) ou "previsão".
- [ ] A seção 1 traz os critérios do agregado, os 14 institutos, o estimador, a incerteza, o viés do 1º turno e a indicação das pesquisas.
- [ ] A seção 2 traz o sino, em que a área de cada lado de 50% é a chance de vitória de cada candidato. Ele usa o agregado do dia, com a data e a incerteza daquele dia, muda a cada deploy de pesquisas e fica fixo depois das 23h de 24/10.
- [ ] As seções 3 a 5 explicam a base "Só apuração", como pesquisas e apuração se juntam e a curva projetada com o sinal de virada. O simulador aparece em três linhas, com link.
- [ ] A seção 8 traz as sete limitações:
  - poucas eleições para medir o erro das pesquisas;
  - o viés do 1º turno de 2026;
  - o começo da noite;
  - as seções tardias dentro do município;
  - a ordem de chegada;
  - estados e municípios sem pesquisas estaduais;
  - a dependência do TSE.
- [ ] A seção 9 traz as fontes e os avisos:
  - TSE sem alteração (CC-BY, duas casas);
  - a camada "Cálculo do Apurador com dados do TSE";
  - o link para a lista das pesquisas com os seis dados do art. 10;
  - a atribuição da malha do IBGE;
  - "quem faz";
  - `pesquisas.csv` e `pesquisas-historicas.csv` para baixar;
  - o código "a partir de 26/10".
- [ ] A página não traz narração nem mapa e nunca lê dados ao vivo.
