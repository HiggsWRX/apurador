# 08: Base "Apuração + pesquisas"

Status: ready-for-agent
Blocked by: 05, 07
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

A segunda base da projeção no módulo `modelo`: o mesmo modelo da "Só apuração", com outro ponto de partida. Ela parte da indicação das pesquisas, que perde peso conforme o Brasil é apurado.

O módulo diz, para cada lugar, o peso das pesquisas e se as duas bases já coincidem. Também roda a noite de 2022 com o agregado de 2022, real e deslocado, e entrega o erro das duas bases momento a momento para a calibração e a metodologia.

Decisões: [Combinação de pesquisas e apuração](../../apurador-2026/issues/11-combinacao-pesquisas-e-apuracao.md) e [Agregado de pesquisas e erro histórico](../../apurador-2026/issues/10-agregado-de-pesquisas.md) (decisões 5 e 6).

## Critérios de aceite

- [ ] Para o voto que falta de cada município, a estimativa é peso × indicação das pesquisas + (1 − peso) × a estimativa da apuração. A correção pelo próprio município continua por cima.
- [ ] O peso das pesquisas é K ÷ (K + % de seções totalizadas no Brasil), um número só para o país. Com K = 0,5% (parâmetro provisório), um teste confere metade com 0,5% das seções e menos de 10% depois de 5%.
- [ ] Antes da primeira seção, o peso é 100%, e a projeção é a indicação das pesquisas. A incerteza fica em 1,5 no Brasil, ~1,8 na UF média e ~2,5 em Goiás.
- [ ] A incerteza das pesquisas tem duas partes:
  - 1,5 ponto nacional, comum a todos os lugares;
  - uma parte local independente: na UF, 0,13 × a fatia dos eliminados no 1º turno da UF; no município, 0,15 × a fatia dos eliminados no 1º turno do município.

  Durante a apuração, as incertezas das pesquisas entram multiplicadas pelo peso, e as da apuração, pelo restante.
- [ ] Em cada lugar, "as duas bases coincidem" quando a diferença é menor que 0,1 p.p. na projeção e menor que 1 ponto na chance de vitória.
- [ ] Antes da apuração, as duas bases desenham a curva projetada de 0% a 100%, com a virada projetada, usando a ordem de chegada do 1º turno.
- [ ] O executor de noites roda o 2º turno de 2022 com o agregado de 2022 real e deslocado 2 pontos para cada candidato. Ele entrega, momento a momento, o % de seções, o placar parcial e a projeção com a incerteza nas duas bases.
- [ ] Com o agregado deslocado, a base com pesquisas fica a menos de 0,1 p.p. da "Só apuração" a partir de ~7% das seções, como no protótipo da metodologia.
