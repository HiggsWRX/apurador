# 03: Lista das pesquisas conferida no TSE

Status: resolved
Blocked by: 01
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O `pesquisas.csv` no repositório, com uma linha por pesquisa nacional do 2º turno de 2026, preenchido com as pesquisas já divulgadas. Um verificador confere cada linha contra o CSV diário de registros do TSE e faz o CI falhar se algo não bater. A página do Brasil mostra a lista das pesquisas, cada uma com os seis dados do art. 10 e o link para a fonte.

A lista é liberada antes das 17h, sem chave de publicação.

Decisões: [Agregado de pesquisas e erro histórico](../../apurador-2026/issues/10-agregado-de-pesquisas.md) (decisões 2, 8 e 9) e [Consulta a advogado eleitoral](../../apurador-2026/issues/16-consulta-advogado-eleitoral.md) (decisões 5 e 6).

## Critérios de aceite

- [x] Cada linha traz:
  - registro, instituto, contratante e campo;
  - entrevistas, margem, nível de confiança e modo;
  - votos totais, brancos e nulos e indecisos;
  - URL da fonte e data de divulgação.
- [x] Só entram pesquisas nacionais de Presidente do 2º turno, com campo a partir de 05/10, de um instituto da lista fechada de 14, identificado pelo CNPJ. Boca de urna nunca entra.
- [x] O verificador confere, para cada linha:
  - que o registro existe no CSV do TSE;
  - que o CNPJ está na lista;
  - que as datas e as entrevistas batem;
  - que a divulgação está liberada.

  Qualquer divergência faz o CI falhar.
- [x] A cada execução, o verificador grava em `pesquisas-verificacoes.csv` um registro datado do que conferiu, com a fonte e o resultado. Esse arquivo não aparece no site.
- [x] A página do Brasil mostra a lista recolhida, num bloco próprio. Cada pesquisa traz os seis dados do art. 10 (período de coleta, margem de erro, nível de confiança, número de entrevistas, instituto e contratante, número de registro) e o link para a fonte.
- [x] Uma pesquisa fora do critério nunca aparece.
- [x] Retirar uma pesquisa do `pesquisas.csv` e fazer deploy a tira da lista, sem mexer em código.
- [x] O arquivo vem preenchido com as pesquisas divulgadas até a data da construção.

## Comments

**19/10/2026, resolvido:**

- **Lista**: o `dados/pesquisas.csv` tem 17 pesquisas nacionais do 2º turno, de 9 institutos da lista, com campo de 05/10 a 18/10 e divulgadas até 19/10.
  - Cada número foi lido na fonte citada na linha (relatório do instituto ou reportagem), nunca na Wikipédia, que em alguns casos troca a espontânea pela estimulada.
  - Os votos são os totais, como a fonte divulgou, pelo número do candidato (`votos_22`, `votos_13`).
  - Brancos e nulos e indecisos ficam vazios quando a fonte não os separa: Quaest de 10 a 13/10 e Gerp de 8 a 12/10.
- **Conferência no TSE**: o `npm run pesquisas` faz quatro coisas.
  - Lê por Range o `pesquisa_eleitoral_2026_BRASIL.csv` do dia.
  - Confere cada linha.
  - Grava o extrato do TSE em `dados/pesquisas-tse.json`, com os registros conferidos, a URL, a data de geração e o hash.
  - Acrescenta uma linha datada por pesquisa ao `dados/pesquisas-verificacoes.csv`, com a fonte e o resultado.

  O CI e o build conferem de novo, sem rede, contra esse extrato. Uma linha nova que não passou pela conferência, ou que diverge, quebra os dois. A conferência de hoje usou o CSV gerado pelo TSE em 18/10 às 05:46, o mais novo publicado.
- **Regras fixadas na construção** (para o dono confirmar):
  - **Datas**: as datas batem quando o campo divulgado cabe no registrado.
  - **Entrevistas**: as entrevistas batem até 5% das registradas, porque o registro traz a amostra prevista. A AtlasIntel de 3 a 8/10 registrou 5.000 e divulgou 5.026.
  - **Campo a partir de 05/10**: conta o início do campo.
  - **Nacional**: o TSE registra toda pesquisa de Presidente com UF "BR". A abrangência sai do texto da metodologia e do plano amostral, e uma UF citada como universo vence.
  - **Conferências a mais**, contra erro de digitação: finalistas, soma perto de 100%, margem e confiança plausíveis, linha repetida, nome do instituto contra o CNPJ e divulgação até 24/10.
- **Achados no TSE**:
  - A Paraná Pesquisas de 14 a 17/10 (BR-09051/2026), que a pesquisa do ticket 06 do mapa contava como nacional, é do Tocantins.
  - A CNN e o g1 publicaram o Datafolha de 6 a 8/10 como "BR-0949/2026". O registro é BR-02949/2026.
- **Lista fechada por CNPJ**: o `dados/pesquisas-institutos.csv` tem uma linha por CNPJ, com a origem de cada um. Três institutos mudaram de CNPJ desde 2018/2022 e entram pelos dois:
  - a Futura, pela 100% Cidades, contratada pela Futura Consultoria, o CNPJ da Futura em 2022;
  - a Gerp, pela Gerp Mercadologia;
  - a Real Time Big Data, pela Real Time Mídia.
- **Nexus é a FSB**: o CNPJ da FSB de 2018 (IPRI) registra desde 2024 as pesquisas da Nexus (BTG/Nexus), e o dono decidiu hoje que a Nexus conta como FSB.
  - As duas BTG/Nexus (BR-07997/2026 e BR-04499/2026) entram na lista.
  - O agregado de 18/10 passa a 9 institutos e 51,09%, não 51,0% com 8. A decisão ficou registrada no [ticket 10](../../apurador-2026/issues/10-agregado-de-pesquisas.md) e no [ticket 04](04-agregado-de-pesquisas.md).
- **Fora por enquanto**: as duas entram na atualização de amanhã, se as fontes trouxerem os números.
  - **AtlasIntel de 13 a 18/10** (BR-02418/2026), divulgada hoje: os votos totais só aparecem em gráfico no relatório, e nenhuma reportagem os trouxe em texto.
  - **Futura de 16 a 17/10** (BR-06715/2026): liberada hoje e ainda não divulgada.
- **Site**: a lista fica num bloco próprio e recolhido na página do Brasil. Cada pesquisa traz os votos totais, os seis dados do art. 10 e o link para a fonte. O registro das conferências e o extrato não vão ao site.
- **Para o ticket 04**: o `pesquisas.csv` não traz o CNPJ. O instituto da lista de cada pesquisa sai do CNPJ do registro no extrato, cruzado com o `pesquisas-institutos.csv`. A Futura e a Gerp têm dois CNPJs com o mesmo nome, e a Nexus conta como FSB.
- **Depois que 02 e 06 entrarem na `main`**:
  - registrar o extrato no `manifesto.json`. Ele ficou com a origem dentro do próprio arquivo para não mexer no manifesto em paralelo;
  - juntar os dois leitores de CSV (`tse/src/csv.ts` e `pipeline/src/csv.ts`).
- **Não feito**: uma conferência ao vivo no CSV do TSE dentro do CI. Ela depende de o CDN do TSE aceitar IPs do GitHub, o que nunca foi testado ([Acesso ao TSE a partir da nuvem](../../apurador-2026/issues/17-acesso-ao-tse-pela-nuvem.md)).
