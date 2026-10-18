# Telas da página de lugar

Type: prototype
Status: resolved
Blocked by: —
Map: [Apurador 2026](../map.md)
Protótipo: branch `prototipo/telas-pagina-lugar`, arquivo `prototipos/telas-pagina-lugar/telas-pagina-lugar.html` (abre com dois cliques; variantes em `?variant=A|B|C|D`; a D é a escolhida)

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

## Answer

Resolvido em 18/10/2026 com o protótipo (branch `prototipo/telas-pagina-lugar`), em duas rodadas de conversa com o dono do projeto, que aceitou todas as recomendações. O protótipo usa os votos oficiais por município de 2018, 2022 e 2026 1T e a malha do IBGE, sobre uma noite fictícia do 2º turno. Ele trouxe três variantes de estrutura: A, curva no centro; B, painel com abas; C, mapa e noite. A variante D junta as escolhidas.

**Em uma linha**: uma página por lugar numa rolagem só, celular primeiro. A sequência é manchete, placar oficial compacto, curva, projeção, narração, mapa ou tabela e histórico. O placar do TSE e a estimativa do Apurador nunca se confundem.

**Decisões** (aceitas pelo dono do projeto):

1. **Estrutura**: a da variante D. No celular, a ordem é:
   1. o cabeçalho, com trilha (Brasil › UF › município), nome do lugar, situação da apuração, **manchete** e último evento da narração com link "Narração →";
   2. o placar oficial;
   3. a curva;
   4. a projeção;
   5. a narração;
   6. o mapa ou a tabela;
   7. o histórico e o rodapé.

   No computador, há duas colunas: a principal e a narração, numa coluna fixa à direita. O mapa e o histórico ficam lado a lado embaixo. A busca de município ou estado fica no topo, sempre visível.
2. **Placar oficial** (o compacto de B):
   - **Desenho**: os dois candidatos lado a lado, com foto oficial do TSE sem alteração, nome, partido, % com duas casas, como o TSE, e votos. Embaixo vêm a barra e o % de seções totalizadas (com "x de y"), a hora da última totalização e "Fonte: TSE, sem alteração (CC-BY)".
   - **Moldura**: sólida, com o selo "Placar oficial · TSE".
   - **Linha fixa**: quando o placar sai da tela, uma linha fina fixa no topo mostra só os números oficiais (Flávio %, Lula %, % de seções · TSE), nunca a projeção.
3. **Projeção**: moldura tracejada, fundo próprio e o aviso "Estimativa. Não é resultado oficial nem pesquisa". O conteúdo é este:
   - o resultado final estimado de cada candidato, com uma casa e ± a margem de 95%;
   - a chance de vitória numa **barra dividida**, com os dois números (inteiros, "<1%" e ">99%"; 100% só com a indicação do TSE);
   - o controle **Base da projeção**, com "As pesquisas pesam X% na projeção agora" ou "As duas bases já coincidem aqui";
   - "A projeção, comparada": com o 1º turno, pelo placar entre finalistas, e com a indicação das pesquisas, no formato "Lula +1,8". Durante a apuração, compara a projeção, porque o placar parcial depende da ordem de chegada. Depois do fim, compara o resultado;
   - o link "Simular 'e se' →", que abre uma tela própria do simulador com link compartilhável;
   - o link "Como calculamos →";
   - a partir das 17h, o link para "as 8 pesquisas do agregado".

   O sino da distribuição (variante C) vai para a [Página de metodologia](20-pagina-de-metodologia.md).
4. **Curva**:
   - **O que mostra**: as duas linhas espelhadas em torno de 50%, a curva real cheia e a curva projetada tracejada, com a faixa de 95% e a legenda.
   - **Escala**: ignora o começo instável, até 3% das seções, e recorta o que passa.
   - **Virada projetada**: losango sobre uma faixa cinza onde ela é provável, com frase. Por exemplo: "Lula deve passar à frente com ~88% das seções; provável entre 80% e 95%"; ou "…pode não ocorrer"; ou "Flávio deve seguir à frente; uma virada é possível a partir de ~69% (chance de 25%)".
   - **Virada real**: ponto cheio, com "Virada às 18:45, com 87,3% das seções".
   - **Marcadores**: números na curva que batem com os da lista da narração (virada, marcos, "pesquisas param de pesar", indicação do TSE).
   - **Curva de comparação**: botões com cada turno passado, desligada por padrão.
5. **Manchete**: fica fora das duas caixas e começa sempre pelo placar oficial. Pode ter no máximo uma frase de projeção, atribuída a ela ("A projeção do Apurador indica virada de Lula por volta de 88%"). Com a indicação do TSE, vira "O TSE indica X eleito", sem projeção. Depois da totalização, vira "X foi eleito com Y% dos votos válidos". O protótipo ainda escreve "A projeção indica": o texto certo é o desta decisão.
6. **Matematicamente definido**: só com a indicação do TSE, e só no Brasil. O placar mostra "matematicamente definida: X eleito", a chance vai a 100%, a manchete muda e a narração registra. Na totalização final, a caixa da projeção sai. UFs e municípios mostram só "totalização final".
7. **Narração**:
   - **No celular**: o último evento aparece sob a manchete, e a lista com os 5 últimos vem depois da projeção, com "Ver toda a narração".
   - **No computador**: a lista completa fica na coluna fixa.
   - **Lista**: o evento mais novo vem primeiro, com hora e número.

   O catálogo e os textos ficam com [Narração da noite](14-narracao-da-noite.md).
8. **Mapa**:
   - **Alternância**: o cartão alterna **Mapa | Tabela**. A tabela é a alternativa exigida pela decisão 9 da arquitetura. Ela traz estados ou municípios, com % de seções, placar e, no Brasil, a projeção, e dá para ordenar.
   - **Brasil**: começa por estados e alterna para municípios.
   - **Cor**: a de quem lidera, mais forte com vantagem maior e mais transparente com menos seções. Cinza quando não há seções.
   - **Modo "Mudança desde o 1º turno"**: usa a mesma conta das comparações da decisão 3, ou seja, a projeção enquanto a apuração corre.
   - **Toque**: abre um cartão com os números e "Abrir a página →", sem navegar de primeira.
   - **Por lugar**: a página da UF mostra os municípios dela, a do município mostra a UF com ele destacado e o Exterior mostra uma tabela de cidades, sem mapa.
9. **3D e efeitos**:
   - **3D**: só no botão 2D/3D do cartão do mapa, com 2D como padrão. É o mapa de picos, com altura **linear** nos votos válidos já totalizados, cor de quem lidera e câmera ortográfica com giro e inclinação limitados. Valem as salvaguardas da decisão 9 da arquitetura. No protótipo, a altura pela raiz dos votos mostrava mais picos, mas distorce a comparação.
   - **Parallax**: no cabeçalho (a abertura) e na passagem para o histórico.
   - **Brilho**: só na faixa de incerteza.
   - Tudo desliga com movimento reduzido, e a página funciona inteira sem os efeitos.
10. **Identidade visual**:
    - **Paleta**: laranja para Flávio (`#c2410c`; `#f0793f` no escuro) e roxo para Lula (`#6d28d9`; `#a68bf7` no escuro).
    - **Tema**: claro ou escuro, conforme o sistema, com botão.
    - **Ordem dos candidatos**: alfabética e fixa em toda a página (Flávio primeiro), sem trocar na virada.
    - **Tipografia**: Source Serif nos títulos e na manchete, Inter no resto, números com algarismos de largura fixa.
    - **Rodapé**: com o responsável identificado, a atribuição do TSE e do IBGE e o aviso sobre a projeção.
11. **Antes das 17h**, com o sinal verde do advogado (comentário em [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md)):
    - **Brasil**:
      1. a manchete;
      2. o placar com "A divulgação começa às 17h";
      3. o agregado com faixa e tendência desde 05/10;
      4. "O que esperar da noite", com a curva projetada de 0% a 100% e a virada projetada;
      5. a projeção e a chance;
      6. a lista das pesquisas, recolhida, com os seis dados do art. 10.
    - **Outros lugares**: mostram a indicação das pesquisas.
    - O caminho "sem sinal verde" sai do desenho.
12. **Durante**: se os dados passam 3 min sem atualizar, um aviso no topo diz "Atualizado às HH:MM, atualização interrompida", como na decisão 19 da arquitetura.
13. **Depois** (a partir de 26/10):
    - fica o placar final do TSE e a curva real completa;
    - entra "Como a projeção se saiu", com o erro das duas bases ao longo da noite e a frase "com 5% das seções, a projeção errava X";
    - o 2º turno de 2026 entra no histórico, com aviso até os arquivos oficiais, por volta de 27/10.
14. **Histórico**:
    - **Turnos**: um botão por turno (2026 1T, 2022 2T e 1T, 2018 2T e 1T, e 2026 2T depois da noite), com barras de todos os candidatos. Nos 1º turnos, entram os 5 maiores mais "demais".
    - **Comparação**: "Comparar dois turnos" só entre PT e o partido de Bolsonaro (PSL em 2018, PL depois), rotulados pelo partido. Nos 1º turnos, usa o placar entre finalistas. Mostra também "onde mais mudou" (UFs ou municípios).
    - **Cores**: PT na cor de Lula, PSL/PL na de Flávio e os demais em cinza.

**Para a implementação**: o protótipo é a referência visual, mas não é código de produção. Os blocos estão em `componentes.js`, o mapa em `mapa.js` (d3-geo e TopoJSON em SVG, com o mapa de municípios do Brasil em 5.570 caminhos) e os picos em `picos3d.js` (three.js r128, carregado sob demanda). A noite e a projeção dele (`noite.js`) são imitações e não devem ser portadas: o modelo é o de [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md) e [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md).

**Glossário**: entram "Página de lugar" e "Manchete".

## Comments

- 18/10/2026, de [Simulador "e se"](13-simulador-e-se.md): a página de lugar ganha o **indicador ao vivo** (decisão 14 de lá) no cartão do placar oficial e na linha fixa do topo. Ele tem seis estados, e o estado "interrompido" é o aviso da decisão 12 daqui.
- 18/10/2026, de [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md): **o sinal verde da decisão 11 não veio por escrito.** O agregado e a projeção antes das 17h ficam atrás de uma chave, desligada até a [Segunda consulta jurídica](21-segunda-consulta-juridica.md). Com a chave desligada, o **caminho "sem sinal verde" volta** (decisão 2 de lá): no Brasil, a lista das pesquisas aberta e "O que esperar da noite" sem números de projeção; nos outros lugares, sem indicação das pesquisas. Além disso:
  - todo número do TSE aparece com duas casas, também em tabelas, cartões do mapa e linha fixa (decisão 3 de lá);
  - o aviso da projeção da decisão 3 daqui passa a ser "Estimativa do Apurador. Não é resultado oficial nem garantia do resultado." (decisão 5 de lá);
  - o rodapé da decisão 10 daqui traz o nome do dono, um e-mail dedicado ao projeto e a independência em relação ao TSE, aos candidatos e aos partidos, sem CPF nem endereço (decisão 7 de lá);
  - se o mapa do IBGE não for liberado, o cartão do mapa mostra só a Tabela (decisão 4 de lá).
- 18/10/2026, de [Segunda consulta jurídica](21-segunda-consulta-juridica.md): **o agregado, a projeção e o simulador antes das 17h voltam a ser liberados**, e o desenho da decisão 11 daqui volta a valer, só como painel. O que muda:
  - **Textos preditivos** ficam desligados durante a apuração até a [Confirmação dos textos preditivos](22-confirmacao-dos-textos-preditivos.md). A manchete da decisão 5 daqui fica só com o placar oficial, sem frase de projeção.
  - **Virada**: as frases da decisão 4 daqui dão lugar aos rótulos curtos do [Sinal de virada](23-sinal-de-virada.md) ("Sem sinal de virada · chance de virada 3%").
  - **Camada analítica**: a curva, o mapa, a tabela, as comparações e a projeção levam "Cálculo do Apurador com dados do TSE".
  - **Mapa do IBGE**: liberado, com a atribuição "Malha: IBGE, Malha Municipal Digital 2024, CC BY 4.0, simplificada pelo Apurador" no rodapé. O plano B só com a Tabela sai.
- 18/10/2026, de [Narração da noite](14-narracao-da-noite.md):
  - **Manchete**: os textos da decisão 5 daqui estão detalhados na decisão 9 de lá. Isso inclui a diferença em votos quando ela fica abaixo de 0,10 ponto e a manchete de virada por 10 minutos.
  - **Narração**: as decisões 4 e 7 daqui ficam assim:
    - a linha sob a manchete mostra o último evento do **próprio lugar**;
    - nas páginas de UF, Exterior e município, a lista intercala quatro eventos do Brasil, marcados como "Brasil" e sem número na curva;
    - os números na curva marcam só os eventos factuais do lugar, nunca os preditivos;
    - o bloco leva o selo "Narração do Apurador com dados do TSE".
- 18/10/2026, de [Ensaio geral](15-ensaio-geral.md):
  - **Plano zero** (decisão 24 de lá): se o núcleo mínimo não for aprovado até 24/10, a partir das 17h o bloco ao vivo dá lugar a "Acompanhe a apuração no app oficial do TSE", com o link, e nenhum dado ao vivo vai ao ar. O resto da página fica como está.
  - **Mapa** (decisões 19 e 22 de lá): volta a ter um plano B, agora por desempenho. Se o mapa não desenhar todos os municípios em até 2 s no Android barato, nem em canvas, a chave do mapa fica desligada e o cartão mostra só a Tabela.
  - **Base da projeção** (decisão 19 de lá): se a base Apuração + pesquisas for reprovada, o controle de base some e a página mostra só "Só apuração".
  - **Fase** (decisão 7 de lá): a página passa das 17h para o ao vivo pelo arquivo de rodada, nunca pelo relógio do aparelho.
- 18/10/2026, de [Operação na noite](18-operacao-na-noite.md):
  - **Avisos prontos** (decisão 10 de lá): uma faixa abaixo da manchete, em todas as páginas, mostra um de três avisos prontos quando o dono publica. Não há texto livre.
  - **Interrupção longa** (decisão 11 de lá): depois de 10 min de "interrompida", a página acrescenta "Acompanhe no app oficial do TSE", com o link, e mantém os últimos dados à vista.
  - **Plano B** (decisão 14 de lá): a página lê o endereço principal dos JSONs ao vivo e passa ao do plano B se o principal der erro ou tiver rodada com mais de 2 min.
- 18/10/2026, de [Plano de lançamento em fases](19-plano-de-lancamento-em-fases.md):
  - **Antes das 17h** (decisão 2 de lá): o conteúdo da decisão 11 daqui vai ao ar na etapa "Antes da noite", com meta em 22/10, como build estático, sem o coletor.
  - **Depois** (decisão 8 de lá, detalha a decisão 13 daqui): "Como a projeção se saiu" entra na manhã de 26/10. O 2º turno de 2026 entra no histórico, a partir do último estado da noite, com o aviso "provisório, até os arquivos oficiais do TSE", que sai quando eles chegam.
