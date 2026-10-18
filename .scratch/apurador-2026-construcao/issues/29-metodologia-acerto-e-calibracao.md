# 29: Metodologia: histórico de acerto e calibração (seções 6 e 7)

Status: ready-for-agent
Blocked by: 10, 28
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

As seções 6 ("Como o modelo teria se saído", `#acerto`) e 7 ("Como escolhemos as constantes", `#constantes`) da página de metodologia. Os números saem do mesmo código da noite, rodado no build sobre as noites da calibração: nada vem do protótipo. As seções chegam no build do ensaio 2 (23/10).

Decisões: [Página de metodologia](../../apurador-2026/issues/20-pagina-de-metodologia.md) (decisões 2, 3, 4 e 6) e [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisão 26 e comentário da metodologia).

## Critérios de aceite

- [ ] **Noite reproduzida**: o gráfico alterna "2022 | 2018" e mostra o placar parcial, a projeção, a faixa de 95% e o resultado.
- [ ] **Tabela de erros**: com 5%, 25% e 50% das seções, no placar parcial e nas duas bases, para as duas noites.
- [ ] **Aviso**: a página diz "Este teste é otimista", porque os ajustes provisórios saíram de 2022.
- [ ] **Agregado contra resultado**: o gráfico cobre os seis 2º turnos de 2002 a 2022, com a incerteza de cada ano calculada sem aquele ano, a partir do [ticket 05](05-historico-das-pesquisas.md).
- [ ] **Seção 7**: traz a tabela da calibração (candidatos, números por noite e valor escolhido). O 1º turno de 2026 aparece só nela.
- [ ] **"Em um minuto"**: ganha a frase do teste de 2022.
- [ ] **Para baixar**: a calibração e as noites reproduzidas de 2018 e 2022, momento a momento, em CSV.
- [ ] **Gráficos extras**: o peso das pesquisas ao longo da apuração, o diagrama da transferência de votos e o erro com as pesquisas deslocadas. São os primeiros a sair se atrasar.
