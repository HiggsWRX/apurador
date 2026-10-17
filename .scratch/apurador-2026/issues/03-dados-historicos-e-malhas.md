# Dados históricos por município e malhas

Type: research
Status: resolved
Blocked by: —
Map: [Apurador 2026](../map.md)

## Question

De onde vêm, e em que formato e tamanho, os dados que o explorador histórico e o modelo de projeção precisam no nível de município?

- Resultados presidenciais por município para 2018 (1T/2T), 2022 (1T/2T) e 2026 (1T), com votos por candidato, brancos, nulos, comparecimento e eleitorado. Indique a fonte oficial (TSE) e versões já tratadas (ex.: Base dos Dados), com tamanho e esforço de preparo.
- O mesmo no nível de seção, quando existir e for leve o bastante para o modelo usar internamente.
- A tabela de correspondência entre o código de município do TSE e o código do IBGE.
- Como aparecem os votos do exterior (ZZ / municípios do exterior) e como tratá-los.
- Malhas geográficas de municípios e UFs adequadas à web (fonte IBGE ou derivados, licença, tamanho em TopoJSON/GeoJSON depois de simplificadas).
- Mudanças de municípios entre 2018 e 2026 (criação, fusão) que afetem a comparação entre anos.

## Answer

- **Município:** o portal de dados abertos do TSE (licença CC-BY) basta. Por ano, são dois arquivos: `votacao_candidato_munzona`, com os votos por candidato, e `detalhe_votacao_munzona`, com aptos, comparecimento, brancos e nulos. Os zips têm até 582 MB, mas o membro `*_BR.csv` (só Presidente) tem 0,3 a 2,4 MB comprimidos e pode ser baixado sozinho, por HTTP *Range*. Os totais batem com o resultado oficial. A Base dos Dados tem tabelas equivalentes, mas exige BigQuery e não acrescenta nada.
- **Correspondência TSE→IBGE:** existe uma tabela oficial do TSE (`municipio_tse_ibge`, 5.571 linhas) que casa 100% dos códigos de 2018 a 2026. A configuração da divulgação ao vivo de 2026 também traz o código IBGE (`cdi`).
- **Exterior:** vem como `SG_UF = "ZZ"`, com uma "cidade" por posto (186 em 2026), sem código IBGE e sem país. Entra no total Brasil, fica fora do mapa e pode virar o lugar "Exterior".
- **Mudanças de municípios:** só uma, Boa Esperança do Norte (MT, IBGE 5101837), que vota a partir de 2026 e saiu de Nova Ubiratã e Sorriso, segundo a imprensa. O resto mantém o código desde 2018.
- **Malhas:**
  - A API do IBGE dá TopoJSON pronto (412 KB com gzip), mas só da malha de 2022, que não tem esse município.
  - A malha IBGE 2024/2025 (shapefile de 199 a 226 MB) precisa ser simplificada com mapshaper na construção.
- **Seções:** dá para usar internamente (cerca de 6 a 7 MB com gzip por eleição e turno). O `detalhe_votacao_secao` traz a hora de totalização de cada seção, o que permite reconstruir as apurações passadas.
- **Tamanho do site estático:** cerca de 0,7 MB com gzip para os resultados por município das 6 eleições e turnos, mais 0,4 a 1,0 MB para a malha.

Detalhes, tabelas e fontes: [research/03-dados-historicos-e-malhas.md](../research/03-dados-historicos-e-malhas.md)
