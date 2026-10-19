# 02: Explorador histórico: a página de cada lugar com os seus turnos

Status: resolved
Blocked by: 01
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

Todas as páginas de lugar, com o bloco histórico já no HTML: Brasil, cada UF, o Exterior e cada município, cerca de 5.800 páginas estáticas. Cada página mostra um botão por turno (2026 1T, 2022 2T e 1T, 2018 2T e 1T), com as barras de todos os candidatos.

O visitante chega a qualquer lugar pela busca de município ou estado, sempre visível no topo, e pela trilha Brasil › UF › município. As páginas já têm a identidade visual e o rodapé, e servem de casca para o bloco ao vivo dos tickets seguintes.

Decisões: [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisões 1, 10 e 14), [Dados históricos por município e malhas](../../apurador-2026/issues/03-dados-historicos-e-malhas.md) e [Consulta a advogado eleitoral](../../apurador-2026/issues/16-consulta-advogado-eleitoral.md) (decisões 3 e 7).

## Critérios de aceite

- [x] O pipeline gera, por lugar, os resultados de 2018 1T e 2T, 2022 1T e 2T e 2026 1T: votos por candidato, brancos, nulos, comparecimento e aptos.
- [x] Os municípios casam com o IBGE pela tabela `municipio_tse_ibge`.
- [x] O Exterior (`ZZ`) é um lugar no nível das UFs, que entra no total do Brasil.
- [x] Boa Esperança do Norte (MT) aparece a partir de 2026.
- [x] Uma conferência automática no CI compara os totais de cada turno, no Brasil e em cada UF, com os arquivos oficiais do TSE e falha se algo não bater.
- [x] As páginas do Brasil, das 27 UFs, do Exterior e de todos os municípios se constroem.
- [x] O histórico tem um botão por turno. Os 1º turnos mostram os 5 maiores e "demais". O PT vem na cor de Lula, PSL e PL na de Flávio e os demais em cinza.
- [x] A busca de município ou estado fica sempre visível no topo. Os municípios aparecem com a UF entre parênteses ("São Paulo (SP)"), e os estados com "estado".
- [x] A trilha Brasil › UF › município aparece no cabeçalho.
- [x] A identidade visual segue a decisão:
  - laranja para Flávio (`#c2410c`; `#f0793f` no escuro) e roxo para Lula (`#6d28d9`; `#a68bf7` no escuro), em ordem alfabética fixa;
  - tema claro ou escuro conforme o sistema, com botão;
  - Source Serif nos títulos, Inter no resto e algarismos de largura fixa.
- [x] Todo número do TSE aparece com duas casas.
- [x] O rodapé traz o responsável, a independência em relação ao TSE, aos candidatos e aos partidos, a atribuição do TSE (CC-BY) e o aviso sobre a projeção, sem CPF nem endereço. O nome do dono e o e-mail do projeto podem entrar como marcadores até o [Lançamento da etapa "Antes da noite"](13-lancamento-antes-da-noite.md).
- [x] A página funciona no celular primeiro e, no computador, já reserva as duas colunas: a principal e a da narração.

## Comments

**19/10/2026, resolvido:**

- **Dados**: os cinco turnos por lugar em `dados/turnos/`, com aptos, votantes, abstenções, válidos, brancos, nulos (com os técnicos), seções e votos por candidato. O índice `dados/lugares.json` tem 5.789 lugares: o Brasil, as 27 UFs, o Exterior, os 5.571 municípios e 189 cidades do exterior. Todo município do Brasil casa com o IBGE pela `municipio_tse_ibge` e leva o nome do IBGE. O id de um município é o código do TSE com 5 dígitos ("71072"), e o código IBGE vai junto, para a malha.
- **Conferido por teste**: os totais do Brasil de cada turno batem com o resultado oficial (2022 2T: Lula 50,90%, Bolsonaro 49,10%), e o Exterior bate com a medição da pesquisa dos dados históricos. Boa Esperança do Norte (MT) só aparece em 2026. Nos outros turnos, a página diz que o município não teve votação.
- **Conferência automática**: `npm run conferir` baixa de novo, por Range, os arquivos do TSE. Ela compara os totais e os votos por candidato do Brasil, de cada UF e do Exterior com os do repositório e falha se algo não bater. Roda no CI depois dos testes, mas ainda não rodou no GitHub Actions: se o CDN do TSE recusar os IPs do GitHub, o passo falha no primeiro push. A soma é feita à parte, mas sobre os mesmos arquivos e o mesmo leitor do pipeline.
- **Páginas**: 5.789 páginas estáticas, com build de ~20 s: `/`, `/sp/`, `/exterior/`, `/sp/campinas/` e `/exterior/lisboa/`.
  - **Decisão tomada aqui**: as cidades do exterior são lugares no nível dos municípios ("Lisboa (Exterior)"), como no protótipo e na conta de ~5.800 páginas. O `GLOSSARY.md` registra a decisão, e o dono pode revertê-la.
- **Histórico**:
  - Um botão por turno, aberto no mais recente em que o lugar votou.
  - A ordem dos candidatos é a do turno no Brasil e é a mesma em toda página (decisão 10). Nos 1º turnos, aparecem os 5 maiores do Brasil e "demais". Em 2026, Flávio vem antes de Lula, também onde Lula venceu.
  - Cada turno mostra ainda aptos, comparecimento, brancos e nulos.
- **Busca**: o índice `/busca.json` tem 92 KB com gzip e só é baixado quando o visitante usa a busca. Ele põe primeiro o nome exato e, depois, os lugares de maior eleitorado.
- **Identidade**: as fontes são servidas pelo próprio site (Fontsource), sem Google Fonts. O botão de tema guarda a escolha no aparelho.
- **Rodapé**: o nome do dono e o e-mail entram como marcadores em `packages/site/src/lib/projeto.ts`.
- **Ficou para os próximos tickets**:
  - **03**: a lista das pesquisas entra como filho de `<PaginaDeLugar>` em `index.astro`, no conteúdo principal.
  - **14**: o bloco ao vivo entra no mesmo lugar. A ordem alfabética fixa do par Flávio e Lula no placar é dele.
  - **15**: a coluna `#narracao` já existe, com o texto de antes das 17h.
  - **26**: o mapa ou a tabela entra ao lado do histórico, em `.abaixo`, e a atribuição da malha do IBGE entra no rodapé.
  - **34**: a comparação de dois turnos entra em `Historico.astro`.
  - **35**:
    - O `dados/turnos/2026-2.json` vira o primeiro botão sozinho. Como a ordem é a do Brasil, é preciso garantir Flávio antes de Lula.
    - A conferência precisa pular o turno provisório até os arquivos oficiais.
  - **13**: troca os marcadores do rodapé.
- **Para o dono**:
  - O histórico leva "Fonte: TSE (CC-BY)", e não "Cálculo do Apurador com dados do TSE", porque os números são os resultados oficiais somados por lugar. A lista da camada analítica no ticket 12 não cita o histórico.
  - Registrar "votantes" no glossário, pendência do ticket 01, continua em aberto.
