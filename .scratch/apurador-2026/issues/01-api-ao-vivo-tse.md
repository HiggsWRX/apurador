# API ao vivo do TSE

Type: research
Status: resolved
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

## Answer

- Tudo são arquivos JSON estáticos num CDN Akamai, em `https://resultados.tse.jus.br/oficial/ele2026/`, sem API nem índice de mudanças. O 2º turno presidencial é a eleição `6258` (cargo `1`, pleito `3221`). Os códigos saem de `oficial/comum/config/ele-c.json`, e os arquivos do 2º turno já estão no ar, zerados (`6258/dados/br/br-c0001-e006258-u.json`).
- Brasil, UF, Exterior (`zz`), município (5.757) e zona (6.292 pares) têm o mesmo arquivo: votos por candidato, brancos, nulos, comparecimento e abstenção, eleitorado das seções totalizadas, seções totalizadas e total, e a hora da última totalização. `br-e…-ab.json` e `<uf>-e…-ab.json` resumem o andamento por UF e por município (sem votos) e servem de índice do que mudou.
- Seção: o TSE publica os boletins (binário ASN.1, ~500 mil seções) durante a apuração. No 1º turno, eles chegaram ao CDN com mediana de 19 min de atraso em AC, DF e RR e de 117 min (máximo de 5 h) em SP. Não servem para projetar na noite. A zona serve e custa só ~535 arquivos a mais que o município.
- CORS está liberado (a origem é refletida). `HEAD` dá 403. O limite é de 100 req/s por IP, com bloqueio de 10 min, e 404 e 304 contam. O CDN guarda cada arquivo por ~60 s, ignora a query string e aceita ETag/304 e gzip.
- Não há simulado público agora (os de setembro estão fechados). Os arquivos finais do 1º turno (`6257`) continuam no mesmo formato, mas sem as versões parciais. O ensaio da noite terá de ser gerado por nós.

Detalhes, URLs, dicionário de campos e lacunas: [../research/01-api-ao-vivo-tse.md](../research/01-api-ao-vivo-tse.md).
