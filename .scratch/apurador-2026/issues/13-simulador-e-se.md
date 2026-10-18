# Simulador "e se"

Type: grilling
Status: resolved
Blocked by: 11, 12
Map: [Apurador 2026](../map.md)

## Question

Que hipóteses o visitante pode ajustar no simulador "e se", como cada uma entra no modelo e como o resultado aparece na tela?

- Candidatas a ajuste: desempenho de um candidato numa região ou UF em relação ao 1º turno, confiança nas pesquisas, comparecimento, transferência dos votos de quem não foi ao 2º turno.
- O simulador funciona antes e durante a apuração? Durante, os ajustes valem só para o que ainda não foi totalizado?
- Fato útil de [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md): uma projeção completa, com curva, sobre os 5.751 municípios leva poucos milissegundos no navegador, então o simulador pode recalcular a cada ajuste.
- Como evitar que a simulação seja confundida com a projeção oficial do site, e se ela pode ser compartilhada por link.
- De [Telas da página de lugar](12-telas-da-pagina-de-lugar.md): a entrada é o link "Simular 'e se' →" na caixa da projeção (moldura tracejada) da página de lugar. Ele abre uma **tela própria**, com link compartilhável. A página usa a paleta laranja (Flávio) × roxo (Lula), a ordem alfabética fixa e a curva com as duas linhas espelhadas em torno de 50%. A distinção visual entre placar oficial (moldura sólida) e estimativa (moldura tracejada) precisa ganhar um terceiro nível para a simulação.
- De [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md): o simulador é o único lugar onde o modelo roda no navegador. Ele baixa, ao abrir, um arquivo completo com os dados por município, que o coletor republica a cada rodada (decisões 1 e 18).
- De [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md): o site não desloca o centro pelo viés do 1º turno (as pesquisas subestimaram Flávio em 1,4 ponto na participação). Por isso, "e se o viés do 1º turno se repetir?" é um ajuste natural. Com o agregado em 51,0 e incerteza de 1,5, a chance de Flávio vai de ~75% a ~84% com 40% do viés e a ~95% com ele inteiro. "Confiança nas pesquisas" pode ser a própria mudança nacional do agregado.
- De [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md): a base com pesquisas parte da indicação das pesquisas, com um peso das pesquisas que cai com a apuração (K ÷ (K + % de seções totalizadas)). Assim, "confiança nas pesquisas" pode ser o próprio K: quanto as pesquisas valem em seções apuradas. Durante a apuração, um ajuste nas pesquisas mexe pouco, porque o peso delas já caiu. O simulador precisa deixar isso visível.

## Answer

Resolvido em 18/10/2026 em conversa com o dono do projeto, que aceitou todas as recomendações em quatro rodadas e pediu o indicador ao vivo da decisão 14.

**Em uma linha**: o visitante ajusta quanto o voto que falta pende para um candidato, no Brasil e por região, e o comparecimento por região, sempre em relação à projeção do Apurador. A simulação fica ao lado da projeção, numa moldura própria, e se atualiza sozinha durante a noite.

**Decisões** (aceitas pelo dono do projeto):

1. **Hipóteses**: são duas.
   - **Voto**: quanto o voto que falta pende para um candidato além do que a projeção espera, no Brasil e em cada uma das cinco regiões do IBGE. O controle de cada região soma ao do Brasil. O Exterior segue o Brasil. Não há controle por UF.
   - **Comparecimento**: quantos pontos percentuais de comparecimento a mais ou a menos do que o modelo espera, só por região. Um aumento igual no país inteiro não muda os percentuais.
   - Ficam de fora o peso das pesquisas (K) e a transferência de votos. K é um parâmetro de calibração e quase não pesa depois de ~5% das seções. Com 7,8% dos votos nos eliminados, mexer na transferência dá praticamente o mesmo que mexer no voto, só que é mais difícil de explicar. Goiás (Caiado com 15%) cabe no voto do Centro-Oeste.
2. **Medida**: em relação à projeção, em pontos de votos válidos, no formato "Lula +2". O zero é sempre a projeção do Apurador. Ao lado de cada controle aparece a tradução em relação ao placar entre finalistas do 1º turno ("isso dá Lula +4,2 sobre o 1º turno no Nordeste").
   - Por quê: o controle não anda sozinho quando os dados mudam, o link continua fazendo sentido mais tarde, e o efeito encolhe conforme a apuração avança, o que mostra quanto ainda pode mudar.
3. **Faixas e passos**: o voto vai de −5 a +5 no Brasil (mais de três vezes a incerteza das pesquisas) e de −10 a +10 em cada região, em passos de 0,5. O comparecimento vai de −10 a +10 pontos percentuais, em passos de 1.
4. **Como entra no modelo**: as hipóteses mexem só no voto que falta de cada município, por cima da estimativa do modelo, inclusive da correção pelo próprio município.
   - O voto desloca o % de votos válidos que falta, limitado a 0–100%.
   - O comparecimento multiplica os votos válidos que faltam.
   - O que já foi totalizado é oficial e não muda.
   - A incerteza é a mesma da projeção.
5. **Quando funciona**:
   - **Antes das 17h**: nas duas bases, com o mesmo sinal verde da projeção com pesquisas, salvo ressalva do advogado ao item 4 da [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md).
   - **Durante a apuração**: só sobre o voto que falta.
   - **Fim**: fecha com a indicação do TSE de eleição matematicamente definida ("O TSE indica X eleito. O voto que falta não muda mais o resultado") e com a totalização final ("A apuração terminou"), sempre com link de volta.
6. **Base da projeção**: o simulador herda a base escolhida na página e mostra o mesmo controle, com "As pesquisas pesam X% na projeção agora".
7. **O que a simulação mostra**: o resultado final estimado de cada candidato com ± a margem de 95%, a chance de vitória e a curva projetada com a virada projetada, no Brasil, e uma tabela das cinco regiões.
   - Não há mapa nesta versão nem resultado por lugar.
   - Quando é aberto da página de uma UF ou de um município, o simulador já vem com a região daquele lugar expandida.
8. **Terceiro nível visual**: moldura pontilhada, fundo hachurado leve e o selo "Simulação · com as suas hipóteses, não é a projeção do Apurador".
   - A projeção do Apurador fica sempre ao lado.
   - Na curva, a simulada é pontilhada, sobre a curva projetada do site, mais clara.
   - Sólido é oficial, tracejado é a estimativa do Apurador e pontilhado é a simulação.
   - A simulação nunca aparece na manchete, na narração nem na página de lugar.
9. **Hipóteses prontas**: um par simétrico, em ordem alfabética, só antes da apuração e só na base Apuração + pesquisas:
   - "As pesquisas subestimam Flávio como no 1º turno" (Flávio +1,4);
   - "As pesquisas subestimam Lula na mesma medida" (Lula +1,4).

   Depois da primeira seção, a projeção já aprendeu com os dados, e um atalho com esse nome mentiria sobre o que faz. Há sempre um "Zerar".
10. **"O que seria preciso"**: uma frase calculada sobre a simulação atual, para quem está atrás no resultado final estimado: "Para Lula passar à frente, o voto que falta precisaria pender mais 3,2 pontos para ele no país".
    - O botão "Aplicar" move o controle Brasil para esse valor.
    - Fora da faixa do controle, a frase diz "mais de 5 pontos", nunca "impossível": o voto que falta também é estimado, e só o TSE indica eleição matematicamente definida.
    - O custo é de umas 20 projeções de poucos milissegundos.
11. **Link compartilhável**: guarda só a base e as hipóteses mexidas, sem dado pessoal. Ao abrir, recalcula com os dados do momento e mostra "Simulação de outra pessoa · com os dados de agora". A prévia do link é a do site, sem imagem por simulação.
12. **Atualização**: durante a apuração, o simulador relê o arquivo completo no ritmo da página de lugar (30 s). As hipóteses ficam paradas, e só o resultado se move.
13. **Desenho**:
    - **No celular**, de cima para baixo:
      1. barra fixa com a simulação compacta (barra de chance e resultado de cada um) e a projeção do Apurador ao lado;
      2. a curva;
      3. "o que seria preciso";
      4. as hipóteses prontas;
      5. o controle Brasil;
      6. "Ajustar por região", com um bloco por região que traz voto, comparecimento e a tradução em relação ao 1º turno;
      7. a tabela das regiões;
      8. "Zerar" e "Copiar link".
    - **No computador**: controles à esquerda e resultado fixo à direita.
14. **Indicador ao vivo, no site todo** (pedido do dono): o visitante precisa ver que os dados estão ao vivo e que não precisa recarregar a página. É um componente só, usado onde há dados ao vivo: no cartão do placar oficial e na linha fixa da página de lugar, e na barra fixa do simulador.
    - **Forma**:
      - ponto pulsante com "Ao vivo" e um anel que se completa em 30 s até a próxima leitura;
      - durante a leitura, o anel vira uma rodinha;
      - os números que mudaram piscam uma vez (1 s), e a curva se estende;
      - ao lado vem "Atualiza sozinho, sem recarregar". No celular, o texto fica no cartão do placar, e a linha fixa leva só o ponto e o anel;
      - um toque abre o detalhe: "Lemos os dados a cada 30 s. Última leitura há 12 s. Última totalização do TSE às 19:42:10. Não precisa recarregar a página.";
      - com movimento reduzido, não há pulso nem pisca, e o anel vira o texto "próxima leitura em 18 s".
    - **Estados**:
      1. **Antes das 17h**: sem "Ao vivo". Aparece "A divulgação começa às 17h", com contagem regressiva na última hora, e às 17h a página passa sozinha para o ao vivo, sem recarregar.
      2. **Ao vivo**: o normal.
      3. **TSE sem novidade**: continua ao vivo, e o detalhe diz "TSE sem novidade desde HH:MM".
      4. **Interrompido**: o ponto fica cinza, sem anel, com o aviso "Atualizado às HH:MM, atualização interrompida".
      5. **Sem conexão** (a internet do visitante caiu): "Sem conexão · tentando de novo".
      6. **Encerrada**: depois da totalização final, "Apuração encerrada", sem anel.
    - **Arquivo de rodada**: a cada rodada (20 s), o coletor publica um arquivo minúsculo com a hora da rodada. É ele que separa o estado 3 do 4. Os 3 min da decisão 19 da [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md) passam a contar desde a última rodada do coletor, e não desde a última novidade do TSE.
    - **Cor**: neutra, grafite (clara no tema escuro). O vermelho dos portais de notícia remete ao PT, e o verde e amarelo, ao bolsonarismo.

**Para a implementação**: o simulador é a ilha em Preact que roda o módulo `modelo` sobre o arquivo completo da decisão 18 da [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md). As hipóteses entram como ajustes no voto que falta de cada município, sem uma segunda cópia do modelo.

**Glossário**: entram "Voto que falta", "Hipótese", "Simulação" e "Comparecimento". A definição de "Simulador 'e se'" passa a falar em simulação, e não em projeção.

## Comments

- 18/10/2026, de [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md): o simulador antes das 17h (decisões 5 e 9 daqui) fica atrás de uma chave, desligada até a [Segunda consulta jurídica](21-segunda-consulta-juridica.md) liberar. Desligada, o simulador abre às 17h, e as hipóteses prontas, que só existem antes da apuração, não aparecem. Se o modelo for enquadrado na regra de IA, outra chave desliga o simulador inteiro.
- 18/10/2026, de [Segunda consulta jurídica](21-segunda-consulta-juridica.md): o simulador foi liberado, inclusive antes das 17h, e a chave fica ligada. O plano B da regra de IA sai. O "o que seria preciso" (decisão 10 daqui) fica no ar, mas entra no pedido de [Confirmação dos textos preditivos](22-confirmacao-dos-textos-preditivos.md). Se o advogado não confirmar, ele sai do simulador.
