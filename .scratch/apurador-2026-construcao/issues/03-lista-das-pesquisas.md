# 03: Lista das pesquisas conferida no TSE

Status: ready-for-agent
Blocked by: 01
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O `pesquisas.csv` no repositório, com uma linha por pesquisa nacional do 2º turno de 2026, preenchido com as pesquisas já divulgadas. Um verificador confere cada linha contra o CSV diário de registros do TSE e faz o CI falhar se algo não bater. A página do Brasil mostra a lista das pesquisas, cada uma com os seis dados do art. 10 e o link para a fonte.

A lista é liberada antes das 17h, sem chave de publicação.

Decisões: [Agregado de pesquisas e erro histórico](../../apurador-2026/issues/10-agregado-de-pesquisas.md) (decisões 2, 8 e 9) e [Consulta a advogado eleitoral](../../apurador-2026/issues/16-consulta-advogado-eleitoral.md) (decisões 5 e 6).

## Critérios de aceite

- [ ] Cada linha traz:
  - registro, instituto, contratante e campo;
  - entrevistas, margem, nível de confiança e modo;
  - votos totais, brancos e nulos e indecisos;
  - URL da fonte e data de divulgação.
- [ ] Só entram pesquisas nacionais de Presidente do 2º turno, com campo a partir de 05/10, de um instituto da lista fechada de 14, identificado pelo CNPJ. Boca de urna nunca entra.
- [ ] O verificador confere, para cada linha:
  - que o registro existe no CSV do TSE;
  - que o CNPJ está na lista;
  - que as datas e as entrevistas batem;
  - que a divulgação está liberada.

  Qualquer divergência faz o CI falhar.
- [ ] A cada execução, o verificador grava em `pesquisas-verificacoes.csv` um registro datado do que conferiu, com a fonte e o resultado. Esse arquivo não aparece no site.
- [ ] A página do Brasil mostra a lista recolhida, num bloco próprio. Cada pesquisa traz os seis dados do art. 10 (período de coleta, margem de erro, nível de confiança, número de entrevistas, instituto e contratante, número de registro) e o link para a fonte.
- [ ] Uma pesquisa fora do critério nunca aparece.
- [ ] Retirar uma pesquisa do `pesquisas.csv` e fazer deploy a tira da lista, sem mexer em código.
- [ ] O arquivo vem preenchido com as pesquisas divulgadas até a data da construção.
