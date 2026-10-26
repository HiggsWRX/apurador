# Volume de gravações na noite

Type: grilling
Status: resolved
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

## Answer

Resolvido em 18/10/2026 em conversa com o dono do projeto, que aceitou todas as recomendações em duas rodadas.

**Em uma linha**: o JSON do município guarda só o que vem do TSE dele e a narração dele. As projeções dos municípios vão para uma tabela por UF, e o que é nacional vai para o arquivo de rodada. Assim, só se grava o que mudou: **~135 mil gravações por noite e ~370 mil no mês**, com ~500 MB por noite se ela inteira passar pelo celular.

**Como foi medido**: o módulo `Projecao` do protótipo (branch `prototipo/metodo-projecao`) rodou a noite do 2T de 2022 em 1.315 rodadas de 20 s, das 17:00 às 00:18. Em cada rodada, ele contou os lugares cujo arquivo mudaria. Os tamanhos vêm de JSONs de exemplo com números plausíveis, comprimidos com gzip. Os scripts são descartáveis e ficaram fora do repositório.

| Regra de gravação | Noite | 1ª hora |
|---|---|---|
| Todo lugar não terminado, toda rodada | 1,97 milhão | ~1 milhão |
| JSON de lugar completo, gravado só quando muda o que a página exibe | 534 mil | 378 mil |
| Idem, regravando no máximo a cada 5 min quem não tem novidade do TSE | 173 mil | 82 mil |
| Só os lugares com novidade do TSE | 93 mil | 27 mil |

- **Novidades do TSE**: cada município muda ~15 vezes na noite (mediana 9, máximo 177). No pico, 642 municípios mudam na mesma rodada. Com o cache de 60 s do TSE, o total quase não muda (92 mil), porque as atualizações de um município raramente ficam a menos de 60 s.
- **Por que arredondar não basta**: um município sem novidade muda do mesmo jeito, porque a referência da UF anda a cada rodada e o peso das pesquisas cai de 100% para menos de 10% nos primeiros 15 min. Três quartos dessas mudanças são antes das 18h30.
- **Ensaio geral**: a 3x, ele grava quase o mesmo que a noite (~92 mil municípios com novidade em ~245 rodadas). Com o JSON completo, dois ensaios e a noite somariam ~1,4 milhão no mês.
- **Tamanhos com gzip**:
  - município com dados do TSE e narração: 0,4 a 0,6 KB (1,4 KB com 177 pontos de curva real);
  - município completo: 0,8 KB;
  - tabela de projeções dos municípios: 9,7 KB em MG, 7,5 KB em SP e 68 KB somando as 28;
  - UF: 2 a 3 KB; Brasil: 3 a 8 KB; arquivo de rodada: 0,3 KB.
- **Plano B**: são ~5.820 arquivos ao vivo, dentro dos 20.000 por versão.

**Decisões** (aceitas pelo dono do projeto):

1. **Três tipos de arquivo** (revê a decisão 18 da [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md)):
   - **JSON do município**: só o que vem do arquivo do TSE dele (placar parcial, % de seções totalizadas, hora, curva real) e a narração dele, com os eventos factuais e, com a chave ligada, os preditivos. É gravado quando chega novidade do TSE ou quando sai um evento.
   - **Tabela de projeções por UF**: uma para cada UF e uma para o Exterior, 28 no total. Traz, para cada município, projeção, margem, chance de vitória e virada projetada nas duas bases, mais os votos válidos projetados.
     - A página de município desenha a própria curva projetada com o placar e a projeção. Num município só, a curva é a ligação entre esses dois pontos, sem modelo no navegador.
     - A mesma tabela serve à tabela de municípios da página de UF.
   - **Arquivo de rodada**: tudo o que é nacional e vale para todo lugar. São o peso das pesquisas, os quatro eventos do Brasil intercalados nas outras narrações, a fase e as chaves.
   - **UF e Brasil**: continuam com JSON completo. O `mapa.json` e o arquivo do simulador não mudam.
2. **Grava só o que mudou, na precisão exibida**:
   - Cada arquivo ao vivo é gravado só quando os bytes mudam, e o coletor guarda o hash de cada um no estado.
   - Os números vão como a página os mostra: TSE com duas casas, projeção e margem com uma, chance inteira e % da virada inteiro. O arquivo do simulador é a exceção e leva a precisão do modelo.
   - Uma partida a frio, sem estado no disco nem no R2, regrava tudo uma vez, ~5.900 gravações.
3. **Arquivo da noite**: um único objeto comprimido por rodada, nunca um por arquivo do TSE.
   - Leva o estado de retomada (narração, hashes, chaves e contador de gravações) e os arquivos do TSE que chegaram na rodada.
   - Dá ~1.800 gravações por noite, das 15h ao fim, e 150 a 200 MB enviados.
   - A retomada em outra máquina lê só o último objeto e baixa de novo do TSE o que faltar.
4. **Orçamento do mês** (1 milhão de operações classe A, somando os dois buckets da conta):

   | Uso | Gravações |
   |---|---|
   | Ensaios gerais 1 e 2 | ~230 mil (~115 mil cada) |
   | 24/10, publicando na produção | ~6 mil |
   | Noite de 25/10 | ~135 mil |
   | **Total** | **~370 mil (37%)** |

   Os testes da construção publicam na pasta local. No R2 entram só os dois ensaios gerais e testes de até 10 min.
5. **Trava no coletor**:
   - **Contagem**: o coletor conta toda gravação, nos dois buckets, e guarda o contador no estado. O alerta de atenção acima de 70% continua.
   - **Em 90%**: ele passa sozinho a gravar só Brasil, UFs, tabelas de projeções e arquivo de rodada, mais cada município no máximo a cada 5 min, e manda um alerta crítico. É a única ação automática do coletor por limite, porque a alternativa é cobrança.
   - **Teto por rodada**: no máximo 1.500 gravações, para a rodada caber nos 20 s (o pico esperado é ~700). O excedente fica para a rodada seguinte, nesta ordem: arquivo de rodada, Brasil, UFs, tabelas e os municípios mais antigos.
6. **Gravação comprimida**: cada JSON vai com gzip (`Content-Encoding: gzip`), o que corta o envio de 2 a 3 vezes. A documentação não garante que a borda entregue certo um objeto assim do R2, com ETag e 304. O ensaio 1 confere, e, se falhar, o coletor grava sem compressão.
7. **Volume pelo celular**: uma noite inteira dá ~500 MB.
   - **Composição**: ~180 MB de JSONs ao vivo, 150 a 200 MB do arquivo da noite e 150 a 200 MB baixados do TSE.
   - **Pico**: ~170 MB por hora e ~0,5 Mbit/s de envio.
   - **Franquia**: o dono confirma pelo menos 1 GB livre em 25/10, com ancoragem liberada, o que cumpre o dobro pedido pela [Operação na noite](18-operacao-na-noite.md). Se faltar, ele compra um pacote extra até 24/10.
8. **Sem modo especial para a reserva de internet**:
   - O coletor faz o mesmo no cabo e no celular, e o painel do coletor mostra os MB que passaram pelo celular desde a troca.
   - **Plano pronto, não construído**: se o ensaio 1 medir mais de 500 MB por noite, o arquivo da noite fica no disco enquanto a conexão for o celular e sobe quando o cabo voltar ou no dia seguinte.
9. **Metas no ensaio 1**: nenhuma bloqueia a aprovação, e o ajuste é feito até o ensaio 2.
   - As gravações do ensaio, levadas para a noite, ficam abaixo de 200 mil, e o teto por rodada nunca é atingido.
   - O volume fica em ~500 MB por noite, somando o envio e o que vem do TSE.
   - O contador do coletor bate com o painel da Cloudflare, com até 1% de diferença.
   - A gravação comprimida funciona (decisão 6).

**Do dono**: conferir a franquia livre do celular antes de 24/10 e, se faltar 1 GB, comprar um pacote extra. A operadora e o plano não foram informados.

## Comments

- 22/10/2026, do [ticket 22](../../apurador-2026-construcao/issues/22-retomada-e-objeto-da-noite.md):
  - **Arquivo da noite maior que a conta** (decisões 3 e 7): construído como a decisão 3 pede, com o estado de retomada inteiro em cada objeto, ele mediu ~1,2 MB por rodada no fim da noite e ~1,7 GB no replay da noite de 2022 inteira (16:50–00:50, 1.440 rodadas), e não 150 a 200 MB. O grosso é a narração dos 5.789 lugares (~670 KB com gzip no fim) e as curvas reais (~580 KB). As gravações seguem uma por rodada. A conta de ~500 MB por noite pelo celular (decisão 7) passa a ~2 GB. O que fazer com isso ficou com o dono, em 22/10.
  - **Onde fica** (decisão do dono em 22/10): num bucket privado por ambiente, `apurador-noite` e `apurador-ensaio-noite`, sem domínio, com chave própria. O contador soma esse bucket aos outros.
  - **Partida a frio** (decisão 2): no replay de 2022, 5.838 arquivos ao vivo (5.780 lugares do TSE falso, 28 tabelas de projeções, os municípios delas, o mapa.json e o arquivo de rodada), ~6.050 gravações até o último lugar, contando os que tiveram novidade do TSE nessas ~10 rodadas.
- 23/10/2026, do [ticket 23](../../apurador-2026-construcao/issues/23-protecoes-e-fim-da-noite.md):
  - **O plano pronto da decisão 8 foi construído**: enquanto a rota padrão do Windows for o celular, o objeto da noite fica no disco, e o primeiro com o cabo leva os arquivos do TSE que esperavam. A última rodada da noite grava um mesmo pelo celular, no lugar do "dia seguinte". Entrou porque o objeto da noite mediu ~1,7 GB por noite no replay do ticket 22, acima dos 500 MB. A seção "Fora do escopo" da [especificação](../../apurador-2026-construcao/spec.md) ainda o diz não construído.
  - **Decisão 5, o que ela não dizia**: no teto por rodada, a ordem é o arquivo de rodada, o Brasil, as UFs e o Exterior, as tabelas com os municípios delas, o mapa.json e os municípios, os que esperam há mais tempo primeiro. Na trava de 90%, o mapa.json vai como os municípios, no máximo a cada 5 min, e o objeto da noite segue um por rodada.
- 23/10/2026, do [ticket 25](../../apurador-2026-construcao/issues/25-simulador-ao-vivo.md):
  - **O arquivo do simulador** (decisão 1, "o arquivo do simulador não muda"; decisão 2, "leva a precisão do modelo"): o coletor publica `simulador.json` com a apuração de cada município (seções, aptos e os votos dos dois finalistas, em colunas) e o agregado da noite, gravado só quando muda, e sem a base do modelo, que não muda na noite e vem do arquivo do build. Na noite de 2022: 755 gravações em 1.335 rodadas, até 58 KB com gzip e ~36 MB enviados, ~7% dos ~500 MB da decisão 7.
  - **Decisão 5, o que ela não dizia**: no teto por rodada, ele vai com o que é de todo lugar, depois do mapa.json e antes dos municípios; com a trava de 90%, no máximo a cada 5 min, como o mapa.json.
