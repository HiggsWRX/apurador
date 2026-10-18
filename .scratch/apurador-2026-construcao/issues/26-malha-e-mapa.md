# 26: Malha e mapa

Status: ready-for-agent
Blocked by: 16, 18
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O pipeline simplifica a malha do IBGE 2024 para a web. O cartão **Mapa | Tabela** ganha o mapa, desenhado com d3-geo e TopoJSON em SVG, sem bibliotecas de mapa com fundo, a partir do `mapa.json` do [ticket 18](18-projecao-dos-municipios-e-tabelas.md).

- **Brasil**: começa por estados e alterna para municípios.
- **UF**: mostra os municípios dela.
- **Município**: mostra a UF, com ele destacado.
- **Antes das 17h**: o mapa mostra o 1º turno de 2026, pelo placar entre finalistas.

O mapa desliga pela sua chave e, se não ficar rápido o bastante, dá lugar à tabela.

Decisões: [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisão 8 e comentários), [Arquitetura e tecnologia](../../apurador-2026/issues/08-arquitetura-e-tecnologia.md) (decisões 4 e 5), [Dados históricos por município e malhas](../../apurador-2026/issues/03-dados-historicos-e-malhas.md), [Segunda consulta jurídica](../../apurador-2026/issues/21-segunda-consulta-juridica.md) e [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisão 22).

## Critérios de aceite

- [ ] **Malha**: a Malha Municipal Digital 2024 do IBGE é simplificada no pipeline. Inclui Boa Esperança do Norte (MT, IBGE 5101837), casa com os códigos do TSE pela `municipio_tse_ibge` e fica em TopoJSON, com 0,4 a 1 MB com gzip. A malha das UFs sai junto.
- [ ] **Atribuição**: o rodapé traz "Malha: IBGE, Malha Municipal Digital 2024, CC BY 4.0, simplificada pelo Apurador".
- [ ] **Cor**: a de quem lidera, mais forte com vantagem maior e mais transparente com menos seções. Cinza quando não há seções.
- [ ] **Modo "Mudança desde o 1º turno"**: usa a projeção enquanto a apuração corre e o resultado depois do fim.
- [ ] **Toque**: abre um cartão com os números (TSE com duas casas) e "Abrir a página →", sem navegar de primeira.
- [ ] **Exterior**: não tem mapa, só a tabela das cidades.
- [ ] **Download sob demanda**: a malha e o `mapa.json` só são baixados quando o cartão entra na tela.
- [ ] **Desempenho**: no Android barato, o mapa desenha todos os municípios em até 2 s, sem travar a rolagem. Se falhar em SVG, passa para canvas. Se falhar de novo, a chave do mapa fica desligada.
- [ ] **Chave do mapa**: desligada, o cartão mostra só a Tabela.
- [ ] O mapa leva "Cálculo do Apurador com dados do TSE".
