# Volume de gravações na noite

Type: grilling
Status: claimed
Blocked by: —
Map: [Apurador 2026](../map.md)

## Question

Com um JSON ao vivo por lugar, quantas gravações no R2 e quantos bytes enviados o coletor faz por rodada, e como isso cabe no plano gratuito (1 milhão de operações classe A por mês, somando ensaios e noite) e na franquia do celular de reserva?

- **Origem**: a [pesquisa de limites](../research/08-limites-cloudflare-e-github.md) contou 240 `PutObject` por noite, para um JSON só. A decisão 18 da [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md) passou a um JSON por lugar (~5.800) e não refez a conta. O [Ensaio geral](15-ensaio-geral.md) não mede gravações.
- **Pior caso**: se o peso das pesquisas e a incerteza nacional mudam o JSON de todo lugar a cada rodada, são ~5.800 gravações por rodada, ou ~1 milhão na primeira hora. Com ~10 KB por JSON, seriam ~10 GB enviados por hora, impossível pelo celular de reserva.
- **Melhor caso**: só mudam os lugares com dado novo do TSE. Seriam ~160 mil gravações na noite (cada município atualizado ~20 vezes, mais Brasil, UFs e Exterior a cada rodada).
- **Também contam**:
  - o estado de cada rodada guardado no R2 (decisão 18 da Arquitetura);
  - o arquivo de rodada;
  - o estado da narração (decisão 11 da [Narração da noite](14-narracao-da-noite.md));
  - os ensaios, com bucket próprio mas na mesma conta;
  - o 24/10, publicando na produção.
- **Plano B**: o Worker com static assets não conta operações, mas cada deploy sobe os arquivos que mudaram. O volume em bytes é o mesmo, e o limite é de 20.000 arquivos por versão.
- **Caminhos a pesar**:
  - separar o que muda com o lugar do que muda com o Brasil;
  - gravar um lugar só quando muda o que a página exibe dele;
  - gravar com menos frequência os municípios sem novidade do TSE;
  - agrupar arquivos;
  - um modo para a reserva de internet.
- **Restrição**: só os planos gratuitos. Passar de 1 milhão vira cobrança, o que o mapa não admite.
- **De [Operação na noite](18-operacao-na-noite.md)**: o painel do coletor mostra as gravações do mês, com alerta de atenção acima de 70%. A franquia do celular precisa de pelo menos o dobro do volume de uma noite.
- **Prazo**: até 20/10, antes da construção do coletor.
