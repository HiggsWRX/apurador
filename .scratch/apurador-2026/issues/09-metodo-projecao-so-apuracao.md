# Método de projeção só com a apuração

Type: prototype
Status: resolved
Blocked by: 02, 03, 05
Map: [Apurador 2026](../map.md)
Protótipo: branch `prototipo/metodo-projecao`, arquivo `prototipos/metodo-projecao/metodo-projecao-2t-2022.html` (abre com dois cliques)

## Question

Na base "Só apuração", que método estima o voto das seções ainda não totalizadas e produz a projeção, a margem, a chance de vitória e a curva projetada?

Testar de 2 a 3 métodos candidatos, vindos de *Métodos de projeção da apuração*, num protótipo descartável que reproduz o 2º turno de 2022 (e, se der, o de 2018) na ordem real de chegada. Para cada método, ver:

- quando a projeção passa a acertar o vencedor e com que erro, ao longo do % de seções totalizadas;
- se a margem e a chance de vitória são honestas (calibração);
- se a curva projetada antecipa a virada de 2022 e em que ponto.

Insumos já conhecidos, por [Dados históricos por município e malhas](03-dados-historicos-e-malhas.md): `detalhe_votacao_secao` traz a hora de primeira totalização de cada seção, base para reproduzir a ordem real de chegada. Só 92,4% das seções de 2026 têm a mesma chave de 2022, então é preciso uma regra para as que não casam. Há 5.246 votos "nulos técnicos" no 1T de 2026 nos arquivos por seção, que devem ser tratados como nulos.

Achados de [Linha do tempo de apurações passadas](02-linha-do-tempo-apuracoes-passadas.md) que restringem o método:

- Centro-Oeste e Sul chegam cedo, e Sudeste e Nordeste chegam tarde. No 1T de 2026, a fatia de Lula contra Flávio subiu de 44% no primeiro décimo das seções para 59% no último.
- O que falta apurar não se parece com o que já chegou: até ±10 p.p. entre metades de uma UF, e 2,4 p.p. em média dentro do município, com seções tardias +1,4 p.p. a favor de Lula em 2022. Variação uniforme por UF erra de forma sistemática; a base precisa ser no mínimo o município, com folga para essa deriva.
- A ordem por seção quase não se repete entre turnos (correlação de 0,15 a 0,55); o padrão por UF e região se repete. A curva projetada precisa de incerteza na ordem de chegada.
- O 2º turno anda bem mais rápido que o 1º (em 2022, chegou a 50% 69 minutos antes).

Pontos a decidir levantados por [Métodos de projeção da apuração](05-metodos-de-projecao.md):

- unidade do modelo (município, zona ou seção), conforme o que o TSE divulga ao vivo;
- forma: variação aditiva entre os dois finalistas, transferência dos votos dos demais candidatos, ou as duas comparadas no teste;
- hierarquia de recuo e limiares mínimos de dados por nível;
- incerteza: fórmula analítica com termo de viés comum, ou simulação hierárquica;
- a partir de que % de seções exibir a chance de vitória, e se adotar "matematicamente definido";
- modelo de ordem de chegada para a curva projetada (ordem do 1T 2026, de 2022, ou curvas por UF). A votação termina às 17h de Brasília em todo o país, como em 2022 (Res. 23.751, art. 160), então a ordem de 2022 é comparável e a de 2018 não;
- validação: reproduzir o 2T de 2022 com base no 1T de 2022, e o 1T de 2026 com base em 2022, medindo erro, cobertura do intervalo, calibração da chance e erro no ponto da virada.

Decidir o método, as unidades que ele usa internamente (seção ou município) e o que mostrar antes da primeira seção ser totalizada nesta base. O protótipo e seus gráficos ficam linkados aqui como asset.

## Answer

Resolvido em 18/10/2026 com o protótipo (branch `prototipo/metodo-projecao`), que reproduz o 2T de 2022 seção por seção em 106 fotografias e compara quatro métodos e quatro modelos de ordem de chegada.

**O que a noite de 2022 mostrou** (uma noite só, com ajustes testados nela mesma; vale como indício):

| Método | Erro com 5% / 25% / 50% | Acerta o vencedor desde | Chance ≥ 95% desde | Resultado na margem de 95% | Brier |
|---|---|---|---|---|---|
| Placar parcial | 4,19 / 2,17 / 1,21 p.p. | 68% | — | — | — |
| Variação por UF | 0,33 / 0,56 / 0,46 | 0,1% | 67% | 98% | 0,051 |
| Variação por município | 0,16 / 0,52 / 0,54 | 0,1% | 69% | 98% | 0,048 |
| Transferência de votos | 0,11 / 0,37 / 0,47 | 0,1% | 68% | 98% | 0,032 |

- Projeção sistematicamente ~0,4 p.p. abaixo do final: as seções tardias de cada município pendiam para Lula, o que um modelo por município não enxerga.
- A virada projetada depende mais da ordem de chegada que do método. Com os votos reais do que faltava: "como no 1º turno" põe a virada em ~90%, "ritmo da noite" e "proporcional" em 45–63%, "mistura" em 69–72% (real: 68,3%). Com os votos projetados, a "mistura" dá ~77–83%. Perto de 50% a curva é quase plana, então meio ponto de erro na projeção move a virada por dezenas de pontos.

**Decisões** (aceitas pelo dono do projeto):

1. **Método**: Transferência de votos corrigida pelo próprio município. A fração dos votos dos demais candidatos do 1T que vai para cada finalista é estimada por UF nos municípios já apurados, com recuo UF → região → Brasil → 1º turno (mínimo de 2.000 votos válidos por nível). Cada município mistura essa estimativa com o próprio placar parcial, pesando metade-metade com 3.000 votos apurados. "Variação por município" fica como comparação nos testes.
2. **Unidade**: município. Revisar se a pesquisa *API ao vivo do TSE* mostrar boletins por seção publicados ao vivo, porque isso atacaria o desvio das seções tardias.
3. **Incerteza**: fórmula analítica com erro estatístico da referência de cada UF; UFs que herdam a mesma referência erram juntas. Somam-se a incerteza regional (1 p.p.), a nacional comum a todo o voto que falta (1 p.p.) e a dispersão dos municípios. Chance de vitória = probabilidade normal de passar de 50%.
4. **Virada**: mostrada como ponto mais faixa ("deve passar à frente com ~X% das seções; provável entre A% e B%", ou "pode não ocorrer"), nunca como ponto exato. Ordem padrão: "mistura" (média entre o ritmo do 1º turno e o ritmo observado de cada UF na noite).
5. **Desvio das seções tardias**: sem correção numa direção fixa. Fica na incerteza nacional e é medido no ensaio.
6. **Calibração**: os ajustes acima (1 p.p., 1 p.p., 3.000 votos, ordem "mistura") são provisórios. A calibração numa segunda noite (1T de 2026 com base em 2022) vai para o [Ensaio geral](15-ensaio-geral.md).

**Provisório, conforme o protótipo**: antes da primeira seção, a base "Só apuração" projeta a fatia de Lula entre os dois no 1T, com a incerteza mais larga (referência "1º turno"). A forma de mostrar "matematicamente definido" segue a indicação oficial do TSE (ver *Restrições legais à projeção*) e fica com *Telas da página de lugar* e *Narração da noite*.

**Para a implementação**: o módulo puro `Projecao` em `template.html` (funções sobre dados simples, sem DOM) é o ponto de partida. Uma projeção completa com curva sobre os 5.751 municípios leva poucos milissegundos no navegador.
