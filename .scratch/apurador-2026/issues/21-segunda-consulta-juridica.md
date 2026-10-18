# Segunda consulta jurídica

Type: task
Status: resolved
Blocked by: —
Map: [Apurador 2026](../map.md)

Tarefa do dono (HITL). O primeiro advogado respondeu só parte das perguntas, como registrado em [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md), e repassou seis itens a um segundo advogado. O dono aguarda a resposta por escrito. As perguntas são as da mensagem [consulta-advogado.md](../consulta-advogado.md), com a mesma numeração.

## Question

O que o segundo advogado responde, por escrito, aos itens em aberto, e quais chaves de publicação isso liga?

| Item | Pergunta | Até a resposta | Se a resposta for "não" |
|---|---|---|---|
| **7.1** (prioridade) | Atualizar o placar, a projeção e os textos automáticos em 25/10 se enquadra no art. 39, § 5º, IV, da Lei 9.504? | A construção segue | Sem plano B: é a premissa do projeto |
| **1.1(b) e (c)** (prioridade) | O agregado, a tendência, a projeção, a chance de vitória e a curva projetada com pesquisas podem ficar no ar antes das 17h, inclusive em 25/10? | Chave desligada | Entram às 17h |
| 2.1 | Arredondar, reformatar e calcular campos derivados respeita o art. 267, § 4º, da Res. 23.751? | Números do TSE com duas casas em todo o site | Nada muda |
| 4.1 | O modelo ou o simulador podem ser enquadrados no art. 28, § 1º-C, da Res. 23.610? | A construção segue | Uma chave desliga o bloco da projeção e o simulador |
| 4.2 | O simulador pode funcionar antes das 17h, inclusive em 25/10? | Chave desligada | O simulador abre às 17h |
| 6.1 | A malha de municípios do IBGE pode ser simplificada, redistribuída e exibida com atribuição? | A construção segue com o mapa | O cartão do mapa mostra só a Tabela |

As chaves, os planos B e o que aparece com cada chave desligada estão nas decisões 2 a 4 de [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md).

Resolvido quando houver resposta por escrito aos seis itens, registrada aqui em resumo, com o estado final de cada chave. As chaves podem ser ligadas até a manhã de 25/10. O item 7.1 precisa de resposta antes disso.

## Answer

Resolvido em 18/10/2026 com a resposta por escrito do segundo advogado, trazida pelo dono do projeto, que aceitou todas as recomendações.

**Em uma linha**: estão liberados, inclusive antes das 17h, o agregado, o modelo, o simulador e a malha do IBGE, e também a atualização do placar e dos painéis em 25/10. Os textos preditivos automáticos durante a apuração esperam confirmação expressa, que segue na [Confirmação dos textos preditivos](22-confirmacao-dos-textos-preditivos.md).

**Orientação recebida por escrito** (resumo):

- **1.1(b)**: pesquisas registradas, com os dados do art. 10, podem ser divulgadas inclusive da 0h às 17h de 25/10. A média de pesquisas já divulgadas e registradas, sem coleta própria nem participação dos visitantes, é um agregado estatístico, e não uma nova pesquisa sujeita a registro.
- **1.1(c)**: a resposta remete a projeção derivada do agregado ao item de IA, que não trata do risco de "pesquisa sem registro". A leitura registrada aqui é a da decisão 1.
- **2.1**: o art. 267, § 4º, é respeitado se o placar oficial mantiver intacto o conteúdo do TSE e se arredondamentos, gráficos, mapas, comparações e projeções ficarem numa camada analítica separada, identificada como do Apurador. Os cálculos próprios nunca aparecem como dados do TSE.
- **4.1**: considerando a definição do art. 37, XXXIV, um modelo sem IA generativa nem aprendizagem de máquina não é alcançado pelo art. 28, § 1º-C.
- **4.2**: a recomendação é manter o simulador, inclusive antes das 17h de 25/10. O argumento dado é que o próprio visitante define as hipóteses. Pelo [levantamento legal](../research/04-restricoes-legais.md), porém, o § 1º-C vale "mesmo a pedido do usuário", então a liberação se apoia no 4.1.
- **6.1**: só se usa uma versão da malha cujas condições permitam adaptar e publicar. A atribuição não substitui licença, e, na dúvida, confirma-se com o IBGE.
  - **Fato conferido pelo Claude**: a nota técnica da [Malha Municipal Digital 2024](https://biblioteca.ibge.gov.br/visualizacao/livros/liv102169.pdf) põe a malha e todos os produtos derivados sob CC BY 4.0, que permite distribuir, remixar e adaptar, com crédito. A condição está cumprida.
- **7.1**: o art. 87, IV, da Res. 23.610, que reproduz o art. 39, § 5º, IV, da Lei 9.504, trata de conteúdo de propaganda e não proíbe toda atualização informativa.
  - Atualizar o placar oficial e as visualizações de resultados tem fundamento.
  - Textos preditivos novos, como "A projeção do Apurador indica que o candidato A deve passar à frente com cerca de 88% das seções", não ficam autorizados só por serem neutros ou gerados por um modelo estatístico.
  - A recomendação é não publicá-los automaticamente durante a apuração até a confirmação expressa.

**Decisões** (aceitas pelo dono do projeto):

1. **Projeção com pesquisas antes das 17h (c)**: fica ligada como painel, com números e rótulos e sem textos preditivos. O agregado e o simulador com chance de vitória já foram liberados antes das 17h, e o modelo também. A confirmação expressa é pedida na [Confirmação dos textos preditivos](22-confirmacao-dos-textos-preditivos.md), para o registro.
2. **Chaves**:
   - **Ligadas**: o agregado e a tendência antes das 17h (b), a projeção antes das 17h (c) e o simulador antes das 17h.
   - **Mapa do IBGE**: liberado, com a atribuição "Malha: IBGE, Malha Municipal Digital 2024, CC BY 4.0, simplificada pelo Apurador".
   - **Plano B da regra de IA** (decisão 4 de [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md)): sai.
3. **Sem aprendizagem de máquina, de fato e no texto**:
   - O modelo usa fórmulas fixas, com parâmetros escolhidos e documentados. A calibração no ensaio escolhe constantes e não treina nada.
   - Nenhum texto do site diz que o modelo "aprende" ou que é "IA".
   - A página de metodologia declara "sem IA generativa nem aprendizagem de máquina".
4. **Camada analítica identificada**: tudo o que fica fora do placar oficial (curva, mapa, tabela, comparações e projeção) leva a marca "Cálculo do Apurador com dados do TSE". Os números do TSE continuam com duas casas em todo o site.
5. **Chave de textos preditivos**: fica desligada até a confirmação expressa. Desligada, ela faz o seguinte:
   - **Manchete**: só o placar oficial, sem frase de projeção.
   - **Narração**: só eventos factuais (virada real, marcos de % de seções, UF que terminou, indicação do TSE e "as pesquisas deixaram de pesar"). Chance cruzando limiares e projeção mudando ficam atrás da chave.
   - **Curva e "O que esperar da noite"**: só gráfico e rótulos curtos do painel, como no [Sinal de virada](23-sinal-de-virada.md).
   - **Simulador**: o "o que seria preciso" fica e entra no pedido de confirmação.

**Glossário**: entra "Texto preditivo".
