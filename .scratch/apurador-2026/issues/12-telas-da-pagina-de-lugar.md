# Telas da página de lugar

Type: prototype
Status: claimed
Blocked by: —
Map: [Apurador 2026](../map.md)

## Question

Como é a página de um lugar (Brasil, UF, município) no celular e no computador, antes, durante e depois da apuração?

Protótipo visual rápido com dados fictícios, para reagir e decidir:

- O bloco ao vivo: placar parcial, curva real com a curva projetada e sua faixa de incerteza, projeção, chance de vitória e o controle **Base da projeção** (Só apuração / Apuração + pesquisas).
- A **curva de comparação**: escolher qualquer turno passado (2018, 2022, 2026 1T) para sobrepor à curva real. Fica desligada por padrão.
- Como mostrar a **virada projetada**: ponto mais faixa ("deve passar à frente com ~X% das seções; provável entre A% e B%", ou "pode não ocorrer"), conforme [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md). Como mostrar "matematicamente definido" usando a indicação oficial do TSE.
- Onde fica a **narração da noite** e como ela aparece.
- O mapa (Brasil por UF e por município) e como se navega por ele e pela busca de município.
- O bloco histórico do lugar: resultados de cada turno e comparação entre quaisquer dois.
- Os estados da página: antes da apuração (só pesquisas), durante, depois.
- Identidade visual: cores dos candidatos, tipografia, tom neutro. Pela pesquisa de [Restrições legais à projeção](04-restricoes-legais.md): cores neutras (nada de vermelho do PT nem verde-amarelo), tratamento visual idêntico aos dois candidatos, fotos oficiais do TSE sem alteração, placar oficial separado dos cálculos do site, avisos e rodapé com responsável identificado.

- **3D**, pela decisão 9 de [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md): o mapa de picos do Brasil (com os picos crescendo na noite), parallax na abertura e na passagem do bloco ao vivo para o histórico, e shaders sutis em fundos e na faixa de incerteza. Nunca no placar parcial, na curva projetada, na projeção ou na chance de vitória. Câmera ortográfica e vista inicial que não favorece região. Testar no celular se impressiona sem atrapalhar a leitura.
- De [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md): o placar parcial oficial vem sem alteração do arquivo do TSE do lugar, com a hora da última totalização, separado dos cálculos do site (decisão 21). Se os dados passarem 3 min sem atualizar, a página mostra "atualizado às HH:MM, atualização interrompida" (decisão 19). O mapa ao vivo por município lê um `mapa.json` compacto, baixado só com o mapa na tela (decisão 18).
- De [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md): **antes da apuração**, o Brasil mostra três coisas: a lista das pesquisas do agregado, cada uma com os seis dados do art. 10; o agregado com faixa e a linha de tendência desde 05/10; e a projeção e a chance de vitória na base "Apuração + pesquisas". Sem o sinal verde do advogado, até as 17h só aparece a lista. Cada lugar mostra a **indicação das pesquisas**, e toda comparação com o 1º turno usa o **placar entre finalistas** (Brasil: 51,0 × 49,0), não o % sobre todos os válidos.
- De [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md): ao lado do controle **Base da projeção**, a página mostra "As pesquisas pesam X% na projeção agora" e, quando as bases coincidem naquele lugar, "As duas bases já coincidem". **Antes das 17h**, a curva projetada já aparece de 0% a 100%, com a virada projetada: é o "o que esperar da noite". Na base com pesquisas, ela depende do sinal verde do advogado.

O protótipo fica linkado aqui como asset.
