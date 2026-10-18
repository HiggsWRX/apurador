# Plano de lançamento em fases

Type: grilling
Status: open
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
