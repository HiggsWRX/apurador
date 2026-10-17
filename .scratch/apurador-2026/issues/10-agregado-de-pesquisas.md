# Agregado de pesquisas e erro histórico

Type: grilling
Status: open
Blocked by: 04, 06
Map: [Apurador 2026](../map.md)

## Question

Como montamos o agregado de pesquisas do 2º turno de 2026 e como transformamos o erro histórico das pesquisas (2º turnos de 2002 a 2022) em projeção e chance de vitória antes da apuração?

- Critério exato de inclusão: registro no TSE, institutos com histórico em 2018/2022, pesquisas nacionais e por UF.
- Método de agregação: pesos por data, amostra e instituto, ajuste por viés de instituto, tratamento de brancos, nulos e indecisos.
- Como o erro histórico vira incerteza: por eleição, por instituto, por UF, e a correlação entre UFs.
- Como o agregado se atualiza até 24/10 (coleta manual ou automática de pesquisas novas).
- O que o site mostra das pesquisas, dentro do que *Restrições legais à projeção* permitir.

Achados de [Pesquisas eleitorais: dados atuais e erro histórico](06-pesquisas-eleitorais.md) que moldam as decisões:

- **Coleta**: não há fonte oficial dos percentuais (o TSE só tem metadados). As opções são um agregado mantido à mão a partir das reportagens ou um leitor do texto da Wikipédia, conferido contra o registro do TSE.
- **UF**: não há pesquisas do 2T por UF em volume útil. Pela regra "por UF se houver volume", o agregado fica só nacional. A estimativa inicial por UF teria de vir do 1T de 2026 mais a mudança nacional medida nas pesquisas.
- **Viés do 1T de 2026** (pesquisas −2,8 pontos na margem contra Flávio): quanto dele levar para o 2T é a decisão que mais mexe na chance de vitória. Em 2018 e 2022, o viés do 1T foi maior e quase sumiu no 2T.
- **Por instituto**: o efeito de cada instituto se apoia em 1 a 3 eleições, e metade dos institutos de 2026 é nova. Uma média simples com a incerteza histórica é defensável; o ajuste por instituto seria frágil. Isso conflita com o critério "institutos com histórico em 2018/2022": aplicá-lo à risca descartaria metade das pesquisas de 2026.
- **Histórico**: há buracos (2T 2002 sem institutos; Base dos Dados sem toda a campanha de 2018 e com trecho pago) e sujeira (boca de urna misturada, válidos rotulados como totais). O erro por UF exige 1 a 2 dias de limpeza. Os resultados de 2002–2018 vindos de tabelas secundárias precisam ser conferidos no TSE.
- **Legal**: a Res. 23.600, art. 11, permite divulgar no dia da eleição as pesquisas registradas feitas antes dele (ver [Restrições legais à projeção](04-restricoes-legais.md)).
