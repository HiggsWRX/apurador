# API ao vivo do TSE

Type: research
Status: claimed
Blocked by: —
Map: [Apurador 2026](../map.md)

## Question

Como o TSE divulga os resultados durante a apuração da eleição presidencial, e como um site de terceiros pode consumi-los na noite de 25/10/2026 (2º turno)?

Precisamos saber:

- Endpoints e estrutura dos arquivos de divulgação (ex.: `resultados.tse.jus.br/oficial/...`) nos níveis Brasil, UF e município. Quais códigos de eleição e de pleito valem para o 2º turno presidencial de 2026, e como descobri-los antes da noite (arquivos de configuração/índice).
- Campos disponíveis em cada nível: % de seções totalizadas, votos por candidato, brancos, nulos, comparecimento, horário da última totalização.
- Frequência de atualização, cache/CDN e comportamento sob carga.
- CORS e limites de acesso: um navegador pode buscar direto? Um servidor pode consultar a cada N segundos sem bloqueio?
- Se existe ambiente de simulação ou teste antes da eleição, e se os arquivos do 1º turno de 2026 (04/10) continuam acessíveis no mesmo formato, para desenvolver contra eles.
