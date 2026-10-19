# 05: Histórico das pesquisas de 2002 a 2022

Status: resolved
Blocked by: 04
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O `pesquisas-historicas.csv`, só nacional, com as pesquisas finais dos 2º turnos de 2006 a 2022 e a média de 2002 de Jennings e Wlezien. Cada linha traz a fonte, e os resultados oficiais de 2002 a 2018 são conferidos no TSE.

Sobre ele, a regra do agregado é aplicada aos seis 2º turnos, com a incerteza de cada ano calculada sem aquele ano. Isso alimenta:

- o gráfico "agregado contra resultado" da metodologia;
- o agregado de 2022 e o de 2018, que o replay, a calibração e o ensaio usam;
- as pesquisas do 1º turno de 2026 entre os dois finalistas, para o caso do K na calibração.

Decisões: [Agregado de pesquisas e erro histórico](../../apurador-2026/issues/10-agregado-de-pesquisas.md) (decisão 10), [Pesquisas eleitorais: dados atuais e erro histórico](../../apurador-2026/issues/06-pesquisas-eleitorais.md) e [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 3 e 17).

## Critérios de aceite

- [x] O `pesquisas-historicas.csv` cobre os 2º turnos de 2002 a 2022, com uma fonte por linha. Não traz erro por UF nem por instituto.
- [x] Os resultados oficiais de 2002 a 2018 estão conferidos no TSE, e a conferência fica registrada.
- [x] A regra do agregado sai de um só código, o do [ticket 04](04-agregado-de-pesquisas.md), aplicado a cada ano, com a incerteza calculada sem aquele ano.
- [x] Um teste confere a conta prévia: Bolsonaro com ~100% de chance em 2018 (média de 57,0% contra 55,1% real) e Lula com ~75% em 2022 (51,0% contra 50,9%).
- [x] O erro da média nos seis anos dá cerca de 1,2 ponto de raiz do erro quadrático médio na participação, sem lado fixo. Dá 1,30: ver os comentários.
- [x] O agregado de 2022 e o de 2018, congelados na véspera de cada 2º turno, ficam prontos para o replay, a calibração e o ensaio geral.
- [x] As pesquisas do 1º turno de 2026 entre os dois finalistas ficam registradas com fonte, e o erro delas na margem confere com os 2,8 pontos contra Flávio. Confere nas 8 finais; a regra pega 12: ver os comentários.
- [x] O `pesquisas-historicas.csv` está pronto para ser oferecido para baixar na metodologia.

## Comments

**19/10/2026, resolvido na branch `ticket/05-historico-das-pesquisas`, à espera da revisão do dono:**

- **`dados/pesquisas-historicas.csv`**:
  - 34 pesquisas finais dos 2º turnos (2002 a média de Jennings e Wlezien; 2006 3; 2010 5; 2014 6; 2018 7; 2022 12) e 12 do 1º turno de 2026.
  - Cada linha traz a fonte: a reportagem que a Wikipédia cita, a Base dos Dados (banco do Poder360, com o `id_pesquisa` na observação) ou o DOI de Jennings e Wlezien.
  - O registro no TSE está nas de 2014 a 2022 e foi conferido nos CSVs de registro de cada ano (campo e entrevistas).
  - Os votos vêm como a fonte publicou, em `votos_<número no TSE>`, com `base` (totais ou válidos). No 1º turno, `votos_outros` soma os outros candidatos.
  - Sem `divulgacao`, a pesquisa conta como divulgada no fim do campo.
  - Não há erro por UF nem por instituto. O arquivo é UTF-8, com vírgula, como o `pesquisas.csv`, e pronto para o link do [ticket 10](10-metodologia-secoes-iniciais.md).
- **Conferência no TSE**:
  - `npm run historico` soma o `votacao_candidato_munzona` de cada ano (membro `*_BR.csv`) em `dados/resultados-historicos.json`: finalistas na ordem do 1º turno, votos, válidos e o dia da eleição, do próprio arquivo.
  - As fontes de 2002 a 2014 entram no manifesto. As de 2018, 2022 e 2026 são os mesmos arquivos de `dados/turnos/`, sem mudança.
  - O `npm run conferir` do CI refaz a soma sem cache e confere número, nome, partido e votos de cada finalista, os válidos e o dia. Passou em 19/10.
  - O PT tem 61,27 (2002), 60,83 (2006), 56,05 (2010), 51,64 (2014), 44,87 (2018) e 50,90 (2022), os números da tabela 2.3 da pesquisa do ticket 06 do mapa.
- **Um só código**:
  - O `agregadoDePesquisas` do ticket 04 recebe a eleição (`{ dia, incerteza }`). O padrão é o 2º turno de 2026.
  - O `agregadoDaVespera` do `modelo` dá o agregado do dia de uma eleição passada. Dele saem o `historicoDoAgregado` (metodologia) e o `agregadoDaNoite` do `pipeline` (noites).
  - O leitor do TSE passou a aceitar os arquivos de 2002 a 2014, que só têm `QT_VOTOS_NOMINAIS`. Num arquivo de 2018 em diante, sem `QT_VOTOS_NOMINAIS_VALIDOS`, ele para.
- **Histórico (no primeiro finalista do 1º turno)**:

  | Ano | Agregado | Resultado | Erro | Incerteza sem o ano | Chance |
  |---|---|---|---|---|---|
  | 2002 | 63,02 | 61,27 | +1,75 | 1,19 | ~100% |
  | 2006 | 61,98 | 60,83 | +1,15 | 1,33 | ~100% |
  | 2010 | 55,80 | 56,05 | −0,25 | 1,42 | ~100% |
  | 2014 | 50,16 | 51,64 | −1,48 | 1,26 | 55% |
  | 2018 | 57,01 | 55,13 | +1,88 | 1,15 | ~100% |
  | 2022 | 50,98 | 50,90 | +0,08 | 1,43 | 75,5% |

  - A incerteza sem o ano é a raiz do erro quadrático médio dos outros cinco. Os seis resultados caem na faixa de 95%. A conta prévia confere: 57,0 contra 55,1 com ~100% em 2018, e 51,0 contra 50,9 com ~75% em 2022 (74,4% com 1,5).
  - 2006 e 2002 passam à janela de 14 dias (menos de 4 institutos), sem pesquisa nova.
- **Raiz do erro quadrático médio: 1,30, não 1,2.**
  - A Veritá de 17 a 20/10/2014 (BR-01144/2014, n = 7.700, nacional pelo plano amostral registrado) cabe na janela de 7 dias e faltou na tabela 2.3. Com ela, 2014 erra −1,5, não −0,8.
  - O erro segue sem lado fixo: o PT foi superestimado em 2002, 2006 e 2022 e subestimado em 2010, 2014 e 2018.
  - A incerteza de 1,5 da noite (decisão 5 do ticket 10 do mapa) continua de pé: √(1,3² + 0,7²) = 1,48. Ela só perde quase toda a folga.
- **Agregados das noites** (`agregadoDaNoite`, no primeiro finalista da base da noite, com 1,5 de incerteza):
  - 2022: Lula 50,98, 12 pesquisas.
  - 2018: Bolsonaro 57,01, 7 pesquisas.
  - 2026-1: Flávio 48,87 entre os dois.
  - O "deslocado 2 pontos" dos tickets 08 e 28 é `valor ± 2`.
- **1º turno de 2026: decisão do dono.**
  - Pela regra (campo terminando de 27/09 a 03/10), entram 12 institutos, não os 8 da seção 2.4 da pesquisa: também Real Time Big Data, Indexa, Ideia e Nexus.
  - As 8 com campo terminando de 1 a 3/10 conferem os −2,8 na margem nos válidos.
  - Com as 12, o erro na margem é −3,8, e Flávio fica em 48,9 entre os dois, contra 51,0.
  - O `agregadoDaNoite` de 2026-1 usa as 12, pela regra. Se o caso do K no [ticket 28](28-calibracao.md) deve ser o de −2,8, basta tirar do CSV as 4 com campo terminando antes de 01/10.
  - **Decidido pelo dono em 19/10**: ficam as 12, pela regra do agregado. A calibração testa o agregado que o site calcula, e o erro maior (−3,8) é o caso mais duro para o K.
- **Dados a conferir, se der tempo**:
  - O Ibope de 28/10/2006 vem do banco do Poder360 com registro no TRE-RN e 812 entrevistas. Os dados de Jennings e Wlezien trazem a mesma pesquisa como nacional, e ela fica. Sem ela, 2006 erraria +1,29, e a raiz, 1,32.
  - A Quaest final de 2022 tem campo de 27 a 29/10 e 45 × 42 na Wikipédia, mas 28 a 29/10 e 46 × 43 no Poder360 e no registro do TSE. Ficam os do registro: a diferença é de 0,03 ponto.
  - A MDA de 2018 entra com os 48,5 de Bolsonaro publicados, que a Wikipédia arredonda para 49.
- **Seams dos testes**: o `agregadoDePesquisas` com a eleição, o `historicoDoAgregado`, o leitor do TSE de 2002 a 2014, o `resultadoHistorico` com a conferência, e o leitor do CSV com os agregados das noites, sobre os dados do repositório.
- **Revisão** (`/code-review`). Corrigidos:
  - a coluna dos válidos achada sem espaços, e o erro em vez de cair calado nos nominais de 2018 em diante;
  - a pesquisa de uma eleição sem resultado, que sumia da conta calada;
  - o histórico com menos de dois anos, que dava NaN;
  - o agregado da véspera, que tinha duas cópias;
  - a soma por candidato, compartilhada com os turnos;
  - os downloads do `conferir`, agora em paralelo;
  - a conferência do nome e do partido dos finalistas.

  Ficou de fora a tendência das eleições passadas: nenhum ticket a usa.
