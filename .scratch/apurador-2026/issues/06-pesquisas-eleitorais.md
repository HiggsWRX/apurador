# Pesquisas eleitorais: dados atuais e erro histórico

Type: research
Status: resolved
Blocked by: —
Map: [Apurador 2026](../map.md)

## Question

O modelo vai usar um agregado de pesquisas de intenção de voto e aprender, com eleições passadas, quanto as pesquisas erraram em relação ao resultado. De onde vêm esses dados e como eles são?

- **2º turno de 2026**: quais pesquisas registradas existem (nacionais e por UF), de quais institutos, com que frequência saem até 24/10, e onde obtê-las em formato legível por máquina (registro PesqEle do TSE, agregadores como os de Estadão, JOTA, Poder360, Pollingdata, Wikipedia). Quais campos estão disponíveis (votos válidos ou totais, margem, amostra, datas de campo, registro).
- **Histórico**: pesquisas dos 2º turnos presidenciais de 2002 a 2022 (e dos 1º turnos de 2018, 2022 e 2026), nacionais e por UF, com os resultados oficiais correspondentes, para medir o erro das pesquisas por eleição, por instituto e por UF. Há conjuntos de dados já compilados? Qual a cobertura real?
- **Métodos de agregação** já documentados para o Brasil (médias ponderadas, ajuste por instituto/"house effect", tratamento de indecisos) e como transformam o agregado e o erro histórico em chance de vitória.

Termine com a lista de fontes que usaríamos, o esforço para montar o conjunto (nacional e por UF) e as lacunas que limitam o modelo.

## Answer

- **2026:** o TSE só publica o registro das pesquisas, num CSV diário com datas, amostra, registro e plano amostral, sem nenhum percentual. Os números estão nas reportagens; a Wikipédia (`?action=raw`) é a melhor fonte legível por máquina. Até 17/10 saíram 19 pesquisas nacionais de 2º turno, e a média passou de Flávio 52,3% para 51,1% dos válidos. Há mais 23 nacionais liberadas de 18 a 23/10, cerca de 4 por dia.
- **UF:** há só 30 registros estaduais de 2º turno, concentrados no RN, DF e TO, e nenhum em SP, PR, RS, PE ou CE. Um agregado por UF não é viável.
- **Histórico:** a Base dos Dados tem o banco do Poder360 (aberto até nov/2023, com download direto), mas faltam o 2º turno de 2002 e toda a campanha de 2018. A cópia do Pindograma cobre 2018, a Wikipédia cobre os 2º turnos nacionais de 2010 a 2022, e Jennings e Wlezien têm uma média para 2002.
- **Erro no 2º turno:** a média das pesquisas finais errou entre −1,9 e +1,8 ponto na participação do PT de 2002 a 2022, sem lado fixo (≈1,2 ponto de raiz do erro quadrático médio, ≈2,5 na margem). Cada instituto, sozinho, erra 1,2 a 2,5 pontos em média. Na UF, em 2022, foram 2,3 pontos.
- **Erro no 1º turno:** as pesquisas subestimaram o candidato bolsonarista em 2018, 2022 e 2026 (−2,8 pontos na margem em 2026). Quanto desse viés levar ao 2º turno muda a chance de vitória em mais de 10 pontos percentuais.
- **Métodos:** os agregadores da imprensa usam médias ponderadas, sem efeito por instituto e sem chance de vitória. Há métodos de avaliação de institutos publicados (Pindograma, BTG) e projetos independentes com filtro de Kalman e efeito por instituto.

Detalhes, tabelas e fontes: [../research/06-pesquisas-eleitorais.md](../research/06-pesquisas-eleitorais.md)
