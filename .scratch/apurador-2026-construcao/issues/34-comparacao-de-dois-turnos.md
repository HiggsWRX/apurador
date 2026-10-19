# 34: Comparação de dois turnos no histórico

Status: resolved
Blocked by: 02
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

No bloco histórico de cada página de lugar, "Comparar dois turnos" permite escolher quaisquer dois turnos e ver a mudança entre o PT e o partido de Bolsonaro, mais onde mais mudou. É o primeiro corte se faltar tempo para a etapa "Antes da noite".

Decisões: [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisão 14) e [Plano de lançamento em fases](../../apurador-2026/issues/19-plano-de-lancamento-em-fases.md) (decisão 2).

## Critérios de aceite

- [x] O visitante escolhe quaisquer dois turnos (2018 1T e 2T, 2022 1T e 2T, 2026 1T) para comparar.
- [x] A comparação é só entre o PT e o partido de Bolsonaro (PSL em 2018, PL depois), rotulados pelo partido.
- [x] Nos 1º turnos, a comparação usa o placar entre finalistas.
- [x] O bloco mostra "onde mais mudou": as UFs, na página do Brasil, ou os municípios, na página da UF.
- [x] O PT vem na cor de Lula, PSL e PL na de Flávio, e os números do TSE com duas casas.

## Comments

**19/10/2026, resolvido** na branch `ticket/34-comparacao-de-dois-turnos`, à espera da revisão do dono:

- **Onde está**: as contas ficam em `packages/site/src/lib/comparacao.ts` (`compararTurnos` e `ondeMaisMudou`), e o bloco é o `ComparacaoDeTurnos.astro`, dentro de `Historico.astro`, depois dos turnos.
- **Escolha**:
  - Duas listas com os cinco turnos. De partida, os dois mais recentes: 2022 2T e 2026 1T.
  - Os 10 pares vão no HTML, e um script mostra o escolhido. Sem JavaScript, ficam todos à vista, cada um com o seu título.
  - A comparação vai sempre do turno mais antigo ao mais recente, em qualquer ordem de escolha. O mesmo turno nas duas listas dá "Escolha dois turnos diferentes.".
- **Números** (decisão tomada aqui, o dono pode mudar):
  - Nos 2º turnos, o % dos votos válidos, como o TSE publica, com duas casas: é o mesmo número das barras do turno.
  - Nos 1º turnos, o placar entre finalistas, com uma casa, como na indicação das pesquisas. É cálculo do Apurador e não pode parecer número do TSE (decisão 3 da [Consulta a advogado eleitoral](../../apurador-2026/issues/16-consulta-advogado-eleitoral.md)). O PT fica com o que falta para 100,0, e o mesmo lugar mostra o mesmo placar nos dois blocos.
  - A mudança é cálculo, com uma casa, e sai dos % como a página os mostra. O PT tem sempre a mesma mudança do partido de Bolsonaro, com o sinal trocado.
  - O bloco leva "Cálculo do Apurador com dados do TSE (CC-BY)", a marca da camada analítica.
  - O build recusa um 1º turno em que o PT ou o partido de Bolsonaro não tenha ido ao 2º turno, porque aí a conta não seria o placar entre finalistas. De 2018 a 2026, os dois sempre foram.
- **Onde mais mudou**:
  - Os 5 lugares logo abaixo com a maior mudança e o partido que ganhou terreno. No Brasil, entram as UFs e o Exterior, que está no nível delas. Numa UF, os municípios, e no Exterior, as cidades. Não aparece nos municípios nem no Distrito Federal, que tem um só.
  - **Decisão tomada aqui**: só entram lugares com ao menos 3.000 votos nos dois partidos em cada turno, como no protótipo, e a página diz isso. Sem o piso, a lista do Exterior de 2022 2T a 2026 1T abriria com Puerto Iguazú, que teve 5 votos, e a de MT com Novo Santo Antônio, que teve 1.224.
  - Conferido com os resultados oficiais: do 2º turno de 2018 ao de 2022, o Brasil lista Exterior (PT +22,3), São Paulo (+12,7), Rio de Janeiro (+11,4), Distrito Federal (+11,2) e Minas Gerais (+8,4).
- **Peso**: os 10 pares acrescentam ~7 KB de HTML a uma página de município (~1 KB com gzip) e ~13 KB a uma de UF (~1,8 KB com gzip). O `dist` passa de 94 para 139 MB, e o build, de ~24 para ~29 s.
- **Revisão** (`/code-review`): corrigidos o placar entre finalistas que somava 100,1 em lugares pequenos (Dar es Salaam, 31,3 × 68,8), as mudanças dos dois lados que podiam diferir em 0,1, o aviso que citava só um turno quando o lugar não votou em nenhum dos dois, o aviso de turno repetido sem leitor de tela e o espaço acima do par que mudava com a escolha. Ficaram de fora:
  - o peso dos pares no HTML, acima;
  - o 2º turno de 2026 provisório, que é do ticket 35.
- **Para os próximos tickets**:
  - **35**: com o `dados/turnos/2026-2.json`, a comparação passa a 15 pares, e a de partida vira 2026 1T e 2026 2T sem mudar o código. O aviso de provisório precisa aparecer também aqui enquanto o turno vier do último estado da noite.
  - **26 e 18**: `lugaresAbaixo` (em `lib/lugares.ts`) dá os lugares do mapa e da tabela de cada página. `PT` e `PARTIDO_DE_BOLSONARO` ficam em `lib/identidade.ts`.
- **Para o dono**: Sorriso e Nova Ubiratã (MT) perderam eleitorado para Boa Esperança do Norte em 2026. Nas comparações que cruzam 2022 e 2026, a mudança delas mistura a troca de território: Nova Ubiratã aparece em "onde mais mudou" de MT (PL +8,0). A pesquisa dos dados históricos sugeria um aviso, que não entrou.
