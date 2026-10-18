# Telas da página de lugar

Type: prototype
Status: open
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

O protótipo fica linkado aqui como asset.
