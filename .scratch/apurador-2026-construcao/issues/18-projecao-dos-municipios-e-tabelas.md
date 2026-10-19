# 18: Projeção dos municípios e tabelas de lugares

Status: ready-for-agent
Blocked by: 17
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O coletor publica a projeção dos municípios numa tabela de projeções por UF (27 UFs mais o Exterior), sem inchar o JSON de cada município. Publica também o `mapa.json` compacto, com o placar e o % de seções de cada município e de cada UF.

A página de município mostra a própria projeção e desenha a própria curva projetada ligando o placar parcial à projeção, sem modelo no navegador. O cartão do mapa ganha a **Tabela** de lugares, ordenável. O mapa desenhado chega no [ticket 26](26-malha-e-mapa.md).

Decisões: [Volume de gravações na noite](../../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md) (decisões 1, 2 e 4), [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisão 8) e [Arquitetura e tecnologia](../../apurador-2026/issues/08-arquitetura-e-tecnologia.md) (decisão 18).

## Critérios de aceite

- [ ] **Tabela de projeções por UF**: há uma para cada UF e uma para o Exterior, 28 no total. Para cada município, traz, nas duas bases, a projeção, a margem, a chance de vitória, a virada projetada e os votos válidos projetados. Cada tabela é gravada só quando os bytes mudam.
- [ ] **JSON do município**: continua só com o que vem do arquivo do TSE dele e a narração dele.
- [ ] **Página de município**: mostra o bloco da projeção e o rótulo do sinal de virada a partir da linha da tabela da UF. A curva projetada liga o placar parcial à projeção.
- [ ] **`mapa.json`**: traz o placar e o % de seções de cada UF e de cada município, com duas casas, e fica em ~25 KB com gzip. Só é baixado quando o cartão do mapa ou da tabela entra na tela.
- [ ] **Tabela**: no Brasil, traz os estados; na UF, os municípios; no Exterior, as cidades, sem mapa. As colunas são % de seções, placar e projeção, e dá para ordenar por qualquer uma.
- [ ] Antes das 17h, a tabela mostra o placar entre finalistas do 1º turno de 2026.
- [ ] A tabela leva "Cálculo do Apurador com dados do TSE" na projeção, e os números do TSE vão com duas casas.
- [ ] **Replay de 2022**: as gravações da noite ficam na ordem das contas do ticket 24 (~135 mil), e o teto de 1.500 por rodada nunca é atingido.

## Comments

- 19/10/2026, do [ticket 28](28-calibracao.md):
  - O ticket 07 mediu a margem dos municípios estreita com as constantes provisórias: ela cobria o resultado em 72% dos momentos com 50% das seções e em 55% com 90%. As congeladas (incertezas de 2 e 2 p.p. e peso do próprio município de 10.000 votos) alargam a margem, mas a calibração mede só o Brasil. Vale medir de novo nos municípios antes de mostrar a margem deles.
  - A zona não entra: a projeção é por município.
