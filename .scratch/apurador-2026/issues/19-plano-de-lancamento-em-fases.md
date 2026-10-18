# Plano de lançamento em fases

Type: grilling
Status: resolved
Blocked by: —
Map: [Apurador 2026](../map.md)

## Question

O site vai ao ar o quanto antes, em fases. O que entra em cada fase, em que data e com que critério de pronto, até o núcleo ao vivo às 17h de 25/10?

- Candidatas a fase: explorador histórico (estático, sem risco legal), página de metodologia com o histórico de acerto em 2018 e 2022, agregado de pesquisas com projeção e chance de vitória antes da apuração, simulador "e se", núcleo ao vivo e a camada 3D.
- O agregado de pesquisas e a projeção antes das 17h dependem da [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md). O plano precisa de um caminho com e sem o sinal verde.
- Quando o repositório e o site deixam de ser privados, e em qual endereço (`apurador.app` ou `*.workers.dev`, conforme [Contas e acessos](07-contas-e-acessos.md)).
- O que acontece com o site depois de 25/10: o resultado final e o histórico do 2º turno de 2026, quando o TSE publicar os arquivos oficiais (por volta de 26–27/10).

Restrições: o prazo é inegociável só para o núcleo ao vivo; o explorador histórico e o 3D entram no que couber sem atrasá-lo ([Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md), decisão 9). A construção e o ensaio ocupam 20 a 24/10.
- De [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md): a lista das pesquisas, com os seis dados do art. 10, pode ir ao ar sem o sinal verde do advogado. O agregado, a tendência, a projeção e a chance de vitória antes das 17h dependem dele. Cada atualização do agregado é um deploy por dia até as 23h de 24/10, então uma fase com pesquisas só tem uso se entrar no ar antes disso.
- De [Simulador "e se"](13-simulador-e-se.md): o simulador funciona antes da apuração, e as hipóteses prontas sobre as pesquisas só existem nesse período. Por isso, ele pode entrar numa fase anterior à noite, junto com o agregado. O indicador ao vivo é do núcleo ao vivo, porque está no placar oficial.
- De [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md): por escrito, só a lista das pesquisas está liberada antes das 17h. O agregado, a projeção e o simulador antes das 17h são construídos atrás de chaves, desligadas até a [Segunda consulta jurídica](21-segunda-consulta-juridica.md). O plano precisa dos dois caminhos, com e sem as chaves, e uma fase com pesquisas pode ir ao ar só com a lista.
- De [Segunda consulta jurídica](21-segunda-consulta-juridica.md): antes das 17h estão liberados a lista, o agregado, a projeção como painel e o simulador. Uma fase com pesquisas pode ir ao ar completa. Durante a apuração, os textos preditivos ficam desligados até a [Confirmação dos textos preditivos](22-confirmacao-dos-textos-preditivos.md).
- De [Ensaio geral](15-ensaio-geral.md):
  - **Datas fixas**: calibração em 20 e 21/10, ensaio geral 1 em 22/10, ensaio geral 2 (de aprovação) em 23/10 e correções até as 18h de 24/10. Nada de função nova depois do ensaio 2 (decisões 2 e 25 de lá).
  - **A decidir aqui**: essa regra foi pensada para o núcleo ao vivo. Falta dizer se ela vale também para as partes estáticas (explorador histórico, página de metodologia), que vão ao ar por deploy como o resto.
  - **3D**: a decisão 9 da [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md) só deixa construir o 3D depois de o núcleo passar no ensaio. Somada à regra acima, o 3D só entra antes de 25/10 se for feito entre os ensaios 1 e 2 e aprovado no 2. Na prática, ele fica para depois da noite.
  - **Ambiente**: o ensaio roda num ambiente fechado, com Worker, subdomínio e bucket próprios. Nunca toca no site de produção, mesmo que ele já esteja público.
  - **Domínio**: o dono compra `apurador.app` até 21/10 (decisão 8 de lá), então o lançamento pode usar o endereço definitivo.
  - **Plano zero**: se o núcleo mínimo não for aprovado até 24/10, a noite vai sem bloco ao vivo, com link para o app do TSE (decisão 24 de lá). O plano de fases precisa prever esse caminho.
- De [Operação na noite](18-operacao-na-noite.md):
  - **Fim da noite** (decisão 21 de lá): na totalização final do Brasil, o coletor publica a fase "encerrada" e para sozinho 30 min depois. O site fica com o último estado no R2, e a chave de escrita do R2 é revogada no dia seguinte. Qualquer mudança no site depois de 25/10 vai por deploy, ou por uma chave nova criada para isso.
  - **Plano zero** (decisão 9 de lá): é desligar a chave do núcleo mínimo, e dá para voltar atrás na própria noite.
  - **Congelamento do roteiro**: o [roteiro da noite](18-operacao-na-noite.md) congela às 23h de 24/10, junto com o último deploy das pesquisas.

## Answer

Resolvido em 18/10/2026 em conversa com o dono do projeto, que aceitou todas as recomendações em duas rodadas.

**Em uma linha**: são três etapas de lançamento.
1. **Antes da noite**: histórico, pesquisas, painel de antes das 17h e metodologia, em `apurador.app`, com meta em qui 22/10.
2. **Noite**: o núcleo ao vivo, no build aprovado no ensaio 2.
3. **Depois**: a partir de 26/10, com o balanço da projeção, o 2º turno de 2026 no histórico e o repositório público.

**Por que o painel de antes das 17h pode ir cedo**: ele usa só o agregado e os coeficientes fixos da [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md), sem as constantes da calibração. Por isso, vai ao ar como build estático, sem o coletor.

**Decisões** (aceitas pelo dono do projeto):

1. **Vocabulário**: o plano fala em **etapa de lançamento**. "Fase" fica para o momento da noite que a página mostra (antes das 17h, ao vivo, encerrada). Os dois termos entram no `GLOSSARY.md`.
2. **Etapa "Antes da noite"**: meta qui 22/10, 12h, em `apurador.app`.
   - **Entra**: as páginas de lugar com o histórico (o explorador histórico), a lista das pesquisas, o agregado, o painel de antes das 17h (projeção, chance de vitória e "o que esperar da noite"), a página de metodologia e o rodapé com o responsável.
   - **Simulador**: entra se estiver pronto. Se não, chega com o build aprovado no ensaio 2.
   - **Pesquisas**: um deploy por dia até as 23h de 24/10, como o [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md) já previa.
   - **Se atrasar**: a etapa desliza dia a dia. O limite é ir ao ar com o build aprovado no ensaio 2, na manhã de 24/10, sem código novo, só abrindo o endereço. O que não for necessário ao núcleo ao vivo é o primeiro a sair, como a comparação de turnos e os gráficos extras da metodologia.
3. **Critério de pronto da etapa "Antes da noite"**: o endereço só abre com tudo isto verdadeiro. A conferência fica registrada em `docs/lancamento/antes-da-noite.md`, com o de acordo do dono.
   1. **Build e testes**: as ~5.800 páginas de lugar se constroem, e o CI passa, com o replay automático.
   2. **Histórico**: os totais de cada turno, no Brasil e em cada UF, batem com os arquivos oficiais do TSE por conferência automática. As atribuições do TSE (CC-BY) e do IBGE estão na página.
   3. **Pesquisas**: cada pesquisa da lista tem os seis dados do art. 10, conferidos contra o registro do TSE. O agregado na página é o que a regra calcula sobre o `pesquisas.csv`, conferido por teste.
   4. **Painel de antes das 17h**: os números da página são os do módulo do modelo rodado sobre o mesmo `pesquisas.csv`. Ele traz os avisos "não é pesquisa própria" e "não é resultado oficial nem garantia do resultado", e cada bloco desliga pela sua chave de publicação, sem código novo.
   5. **Metodologia**: no ar, com pelo menos o que a [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md) e a [Segunda consulta jurídica](21-segunda-consulta-juridica.md) exigem: critérios de seleção, cálculos, limitações, "sem IA generativa nem aprendizagem de máquina" e a atribuição da malha. A tabela da calibração e o histórico de acerto podem chegar até o build do ensaio 2.
   6. **Rodapé**: o nome do dono e o e-mail do projeto.
   7. **Celular**: placar e painel visíveis em até 3 s num Android barato no 4G, a mesma meta do [Ensaio geral](15-ensaio-geral.md).
   8. **Revisão do dono**, no celular: o Brasil, uma UF, um município grande e um pequeno.
   9. **Depois de aberto**: um deploy que quebre um destes critérios volta à versão anterior na hora, e a correção vem depois.
4. **Etapa "Noite"**: o núcleo ao vivo vai no build aprovado no ensaio 2, com as correções até as 18h de 24/10.
   - Às 16h de 25/10, cada chave fica igual ao veredito do ensaio, e às 17h a página muda de fase pelo arquivo de rodada.
   - **Plano zero**: o site fica com o conteúdo da etapa "Antes da noite" e o link para o app do TSE, como decidiu o [Ensaio geral](15-ensaio-geral.md) (decisão 24 de lá).
5. **Congelamento do site todo**: depois do ensaio 2, nada de função nova também no histórico e na metodologia, porque eles vão no mesmo deploy das páginas do bloco ao vivo.
   - **Exceções**: correções até as 18h de 24/10, os dados das pesquisas até as 23h de 24/10 e correções de texto da metodologia até as 18h de 24/10.
   - **Já decididos pela [Operação na noite](18-operacao-na-noite.md)**: a retirada de pesquisa e a exceção para formato novo do TSE.
   - **Das 23h de 24/10 ao fim da noite**: só esses dois casos.
6. **Endereço**: o site abre já em `apurador.app`, para não divulgar um endereço que depois muda.
   - **Até lá**: a produção roda em `*.workers.dev`, com `noindex` e sem divulgação.
   - **Depois**: o `*.workers.dev` segue só como endereço do plano B, nunca divulgado.
7. **Repositório público só em 26/10**: o "privado até o lançamento" de [Contas e acessos](07-contas-e-acessos.md) passa a valer até a etapa "Depois".
   - **Por quê**: abrir antes exporia, na semana crítica, o endereço do ambiente de ensaio, os nomes do tópico do ntfy e da sentinela e o código do coletor.
   - **Já coberto**: a página de metodologia cumpre a transparência exigida pelo advogado.
   - **Custo**: o CI privado cabe nos 2.000 min/mês do GitHub Free.
8. **Etapa "Depois"**, em ordem:
   1. **26/10, manhã**: entra "Como a projeção se saiu", calculado com o mesmo código sobre o arquivo da noite guardado no R2. O 2º turno de 2026 entra no histórico, a partir do último estado da noite, com o aviso "provisório, até os arquivos oficiais do TSE". A chave de escrita do R2 é revogada.
   2. **26/10, tarde**: o Worker e o bucket do ensaio são apagados. Uma varredura procura segredos e endereços de ensaio em todo o histórico do Git, e, limpo, o repositório fica público.
   3. **Arquivos oficiais do TSE** (por volta de 27/10): o pipeline passa o 2º turno de 2026 aos dados oficiais. A conferência de totais da decisão 3 roda de novo, e o aviso sai.
   4. **Daí em diante**: o site fica no ar como registro e muda só por deploy.
9. **3D**: não entra antes de 25/10. Depois da noite, construí-lo ou não fica fora deste mapa, como decisão futura do dono.

**Do dono**:

- Comprar o domínio já em 19/10, se der. O limite segue 21/10, mas a meta de 22/10 depende dele.
- Criar o e-mail do projeto antes de 22/10, porque o rodapé é critério de pronto da etapa "Antes da noite".
- Dar o de acordo no registro de `docs/lancamento/antes-da-noite.md`.

**Glossário**: entram "Fase" e "Etapa de lançamento".
