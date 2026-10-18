# 02: Explorador histórico: a página de cada lugar com os seus turnos

Status: ready-for-agent
Blocked by: 01
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

Todas as páginas de lugar, com o bloco histórico já no HTML: Brasil, cada UF, o Exterior e cada município, cerca de 5.800 páginas estáticas. Cada página mostra um botão por turno (2026 1T, 2022 2T e 1T, 2018 2T e 1T), com as barras de todos os candidatos.

O visitante chega a qualquer lugar pela busca de município ou estado, sempre visível no topo, e pela trilha Brasil › UF › município. As páginas já têm a identidade visual e o rodapé, e servem de casca para o bloco ao vivo dos tickets seguintes.

Decisões: [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisões 1, 10 e 14), [Dados históricos por município e malhas](../../apurador-2026/issues/03-dados-historicos-e-malhas.md) e [Consulta a advogado eleitoral](../../apurador-2026/issues/16-consulta-advogado-eleitoral.md) (decisões 3 e 7).

## Critérios de aceite

- [ ] O pipeline gera, por lugar, os resultados de 2018 1T e 2T, 2022 1T e 2T e 2026 1T: votos por candidato, brancos, nulos, comparecimento e aptos.
- [ ] Os municípios casam com o IBGE pela tabela `municipio_tse_ibge`.
- [ ] O Exterior (`ZZ`) é um lugar no nível das UFs, que entra no total do Brasil.
- [ ] Boa Esperança do Norte (MT) aparece a partir de 2026.
- [ ] Uma conferência automática no CI compara os totais de cada turno, no Brasil e em cada UF, com os arquivos oficiais do TSE e falha se algo não bater.
- [ ] As páginas do Brasil, das 27 UFs, do Exterior e de todos os municípios se constroem.
- [ ] O histórico tem um botão por turno. Os 1º turnos mostram os 5 maiores e "demais". O PT vem na cor de Lula, PSL e PL na de Flávio e os demais em cinza.
- [ ] A busca de município ou estado fica sempre visível no topo. Os municípios aparecem com a UF entre parênteses ("São Paulo (SP)"), e os estados com "estado".
- [ ] A trilha Brasil › UF › município aparece no cabeçalho.
- [ ] A identidade visual segue a decisão:
  - laranja para Flávio (`#c2410c`; `#f0793f` no escuro) e roxo para Lula (`#6d28d9`; `#a68bf7` no escuro), em ordem alfabética fixa;
  - tema claro ou escuro conforme o sistema, com botão;
  - Source Serif nos títulos, Inter no resto e algarismos de largura fixa.
- [ ] Todo número do TSE aparece com duas casas.
- [ ] O rodapé traz o responsável, a independência em relação ao TSE, aos candidatos e aos partidos, a atribuição do TSE (CC-BY) e o aviso sobre a projeção, sem CPF nem endereço. O nome do dono e o e-mail do projeto podem entrar como marcadores até o [Lançamento da etapa "Antes da noite"](13-lancamento-antes-da-noite.md).
- [ ] A página funciona no celular primeiro e, no computador, já reserva as duas colunas: a principal e a da narração.
