# Método de projeção só com a apuração

Type: prototype
Status: open
Blocked by: 02, 03, 05
Map: [Apurador 2026](../map.md)

## Question

Na base "Só apuração", que método estima o voto das seções ainda não totalizadas e produz a projeção, a margem, a chance de vitória e a curva projetada?

Testar de 2 a 3 métodos candidatos, vindos de *Métodos de projeção da apuração*, num protótipo descartável que reproduz o 2º turno de 2022 (e, se der, o de 2018) na ordem real de chegada. Para cada método, ver:

- quando a projeção passa a acertar o vencedor e com que erro, ao longo do % de seções totalizadas;
- se a margem e a chance de vitória são honestas (calibração);
- se a curva projetada antecipa a virada de 2022 e em que ponto.

Insumos já conhecidos, por [Dados históricos por município e malhas](03-dados-historicos-e-malhas.md): `detalhe_votacao_secao` traz a hora de primeira totalização de cada seção, base para reproduzir a ordem real de chegada. Só 92,4% das seções de 2026 têm a mesma chave de 2022, então é preciso uma regra para as que não casam. Há 5.246 votos "nulos técnicos" no 1T de 2026 nos arquivos por seção, que devem ser tratados como nulos.

Pontos a decidir levantados por [Métodos de projeção da apuração](05-metodos-de-projecao.md):

- unidade do modelo (município, zona ou seção), conforme o que o TSE divulga ao vivo;
- forma: variação aditiva entre os dois finalistas, transferência dos votos dos demais candidatos, ou as duas comparadas no teste;
- hierarquia de recuo e limiares mínimos de dados por nível;
- incerteza: fórmula analítica com termo de viés comum, ou simulação hierárquica;
- a partir de que % de seções exibir a chance de vitória, e se adotar "matematicamente definido";
- modelo de ordem de chegada para a curva projetada (ordem do 1T 2026, de 2022, ou curvas por UF). A votação termina às 17h de Brasília em todo o país, como em 2022 (Res. 23.751, art. 160), então a ordem de 2022 é comparável e a de 2018 não;
- validação: reproduzir o 2T de 2022 com base no 1T de 2022, e o 1T de 2026 com base em 2022, medindo erro, cobertura do intervalo, calibração da chance e erro no ponto da virada.

Decidir o método, as unidades que ele usa internamente (seção ou município) e o que mostrar antes da primeira seção ser totalizada nesta base. O protótipo e seus gráficos ficam linkados aqui como asset.
