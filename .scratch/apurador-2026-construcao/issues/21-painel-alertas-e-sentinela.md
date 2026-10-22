# 21: Painel do coletor, alertas e sentinela

Status: resolved
Blocked by: 17, 20
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O dono vê a noite toda no painel do coletor: uma página que o coletor grava como arquivo a cada rodada e que se recarrega a cada 5 s, sem servidor nem porta aberta.

Os alertas chegam em dois níveis, críticos e de atenção, no computador e no celular, pelo ntfy. Uma sentinela na nuvem, um Worker agendado a cada minuto, avisa quando o arquivo de rodada público para. Nenhum alerta age sozinho.

Decisões: [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md) (decisões 5 a 8 e comentários) e [Volume de gravações na noite](../../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md) (decisões 5 e 8).

## Critérios de aceite

- [x] **Seções do painel**, nesta ordem:
  1. **Estado**: fase, cada chave, destino ativo, conexão ativa (cabo ou celular) e alertas ativos.
  2. **Visto de fora**: o arquivo de rodada e o JSON do Brasil lidos pelo endereço público como a página lê, com o atraso do visitante.
  3. **TSE**: a última leitura e a última novidade, o pico de req/s no último minuto contra o limite de 100, os 403, 404 e 5xx nos últimos 10 min e o tempo da rodada.
  4. **Placar conferido**: o placar do Brasil publicado contra o do arquivo do TSE.
  5. **Projeção do Brasil**: nas duas bases, com a chance, o peso das pesquisas e a mudança desde a rodada anterior.
  6. **Gravação**: a última gravação boa em cada destino, as falhas, as gravações do mês nos dois buckets e os MB que passaram pelo celular desde a troca.
  7. **Computador**: CPU, memória, disco, rede e o desvio do relógio contra o `Date` do TSE.
- [x] **Alertas críticos** (som no computador e no celular):
  - 403 ou 429 do TSE;
  - nenhuma rodada completa há 60 s;
  - gravação no destino ativo falhando em 2 rodadas seguidas;
  - arquivo de rodada público com mais de 2 min;
  - placar publicado diferente do arquivo do TSE;
  - arquivo do TSE do Brasil ou de uma UF que o leitor não entende.
- [x] **Alertas de atenção** (no painel, com som curto):
  - TSE sem novidade há 5 min com menos de 99% das seções;
  - projeção do Brasil mudando mais de 1 p.p., ou a chance mais de 20 pontos, numa rodada depois de 5%;
  - pico acima de 50 req/s;
  - rodada com mais de 15 s;
  - relógio desviado mais de 2 s;
  - gravações do mês acima de 70%;
  - arquivo de município que o leitor não entende, caso em que fica o último arquivo bom.
- [x] Os limites dos alertas são parâmetros, conferidos no ensaio 1.
- [x] **ntfy**: o alerta vai por HTTPS de saída, num tópico com nome impossível de adivinhar, guardado no `.env`, fora do Git. As mensagens só dizem o estado.
- [x] **Sentinela**: um Worker com Cron Trigger a cada minuto lê o arquivo de rodada público e manda alerta pelo ntfy se ele passar 3 min parado. Com a fase "encerrada", ele não alerta.
- [x] Os alertas são testados no replay, provocando cada condição.

## Comments

- 19/10/2026, do [ticket 12](12-coletor-minimo-e-replay.md): o registro de cada rodada (`RegistroDaRodada`) já sai no `aoRodar` e em `.cache/coletor/rodadas-*.jsonl`, com duração, processamento, pedidos, respostas por status, baixados, gravações e falhas.
  - As falhas são texto: arquivo que o leitor não entende (`não é JSON`), arquivo sem os candidatos do Brasil, status HTTP e gravação que falhou.
  - O ritmo padrão (45 pedidos/s, nunca acima de 50 num segundo, no máximo 14 s de pedidos por rodada) fica abaixo dos limites de atenção de pico e de duração da rodada.
- 20/10/2026, do [ticket 20](20-publicacao-r2-e-plano-b.md):
  - **Destino ativo**: `RegistroDaRodada.destinoAtivo` (`"principal"` ou `"plano B"`) diz onde a rodada gravou. `controle.planoB` é só o comando. Sem destino de plano B, o coletor fica no principal e registra a cada rodada a falha `plano B: o coletor roda sem destino de plano B`.
  - **Gravações do mês**: vêm em `RegistroDaRodada.gravacoesDoMes`, no formato `{ mes: "AAAA-MM", buckets: { "apurador-ao-vivo": n, "apurador-ensaio": m } }`, com o mês em UTC. `somaDoMes` dá o total contra o 1 milhão do plano gratuito, de onde sai o alerta acima de 70%. O contador fica em `packages/coletor/src/contador.ts` e é guardado a cada rodada em `.cache/coletor/gravacoes.json`.
  - **Falhas de gravação**, que o alerta "gravação no destino ativo falhando em 2 rodadas seguidas" lê:
    - no R2: `gravar <caminho>: R2 respondeu <status> em <caminho>: <corpo>`;
    - no plano B: `republicar o plano B: wrangler saiu com <código>: <últimas linhas>`, na rodada seguinte à republicação que falhou.
  - **Última gravação boa**: ainda não tem campo. No R2, é uma rodada com `gravacoes > 0` e sem falha de gravação. No plano B, ela pede que `republicacaoDoWorker` (`plano-b.ts`) exponha a hora da última republicação que terminou bem.
  - **Visto de fora**: o painel lê `https://ao-vivo.apurador.org/rodada.json` e, depois do comando, `https://apurador-plano-b.hicampos93.workers.dev/rodada.json` (`AMBIENTES`, em `packages/coletor/src/ambientes.ts`). Leia com `Origin: https://apurador.org`, e a sentinela também. O R2 só põe o CORS na resposta quando o pedido traz `Origin`. Sem a Transform Rule do passo 4 de `packages/coletor/cloudflare/README.md`, a cópia da borda feita pelo painel chegaria ao navegador sem o CORS.

**22/10/2026, resolvido:**

- **Painel do coletor**: `.cache/coletor/painel.html`, gravado inteiro a cada rodada e a cada 5 s, com `<meta http-equiv="refresh" content="5">` (`criarPainelDoColetor`, em `packages/coletor/src/painel-do-coletor.ts`).
  - O coletor mostra o caminho ao começar. As sete seções vêm na ordem da decisão 6, com a hora do relógio do coletor. O título da aba diz quantos alertas críticos há.
  - **Alimentação**: `registrar(registro)` no `aoRodar` e `atualizar()` num temporizador de 5 s do `principal.ts`. É o temporizador que lê o visto de fora, mede o computador e percebe que as rodadas pararam.
  - **Visto de fora**: `lerPelosEnderecos` (`packages/coletor/src/visto-de-fora.ts`) lê `rodada.json` e `lugares/BR.json` no endereço do destino ativo, com `Origin: https://apurador.org`, e mede a idade pelo `Date`. Com `--destino pasta`, lê os arquivos da pasta.
  - **Placar conferido**: o JSON do Brasil lido de fora contra o arquivo do TSE da mesma totalização. O lado do TSE é lido dos bytes, sem o leitor do pacote `tse` (`placarDoArquivoDoTse`, em `placar-conferido.ts`), porque na noite só o leitor pode mudar (decisão 19). O painel guarda os 30 últimos placares do TSE.
  - **Computador**: CPU, memória e disco pelo Node. A rota padrão, o adaptador e os bytes vêm do PowerShell (`Get-NetRoute`, `Get-NetAdapterStatistics`), a cada 20 s e fora da rodada (`medidorDoComputador`, em `computador.ts`). A primeira leitura levou 2,6 s.
    - A conexão é "celular" quando a descrição do adaptador da rota padrão tem "NDIS", "Android", "iPhone", "Apple Mobile" ou "USB". No computador do dono, hoje, a rota padrão é o "Realtek PCIe GbE Family Controller", e o painel diz "cabo".
    - Os MB pelo celular somam a noite desde a primeira troca. A primeira leitura depois de cada troca só marca o ponto de partida: até 20 s de tráfego ficam de fora.
  - **Desvio do relógio**: o menor da rodada entre o relógio do coletor e o `Date` do TSE. Só é conferido com o TSE de verdade (`--tse` em `resultados.tse.jus.br`), porque o TSE falso dá no `Date` a hora da noite de 2022. No ensaio, este alerta não é conferido; o 24/10, contra o TSE zerado, é a primeira vez.
- **`RegistroDaRodada`** ganhou, para o painel, `placarDoTse`, `novidade`, `picoDePedidos`, `desvioDoRelogio`, `ilegiveis` (com o tipo: `brasil`, `uf`, `municipio`, `zona` ou `configuracao`) e `projecaoDoBrasil`, com as chaves ou sem elas. Os campos vão também no `rodadas-*.jsonl`. `publicar()` e `narrar()` não mudaram.
- **Alertas** (`packages/coletor/src/alertas.ts`): os 13 da decisão 7, cada um com um id (`IdDoAlerta`). Os limites ficam em `LIMITES_DOS_ALERTAS`, num lugar só, e a conferência deles é do ensaio 1 ([ticket 32](32-ensaios-gerais.md)).
  - **Quando alertam**: um alerta está ativo enquanto a condição vale, e o dono é alertado quando ele começa.
    - O 403/429 e os arquivos que o leitor não entende valem por 10 min, a janela do TSE no painel. Sem a janela, o mesmo arquivo estragado, pedido a cada minuto, tocaria a cada minuto.
    - Quando a janela acaba, eles não vão ao celular, porque o fim dela não diz que o problema acabou: depois do 403, o coletor para de pedir.
  - **Aonde vão** (`despacharAlertas`):
    - o crítico vai ao ntfy com prioridade 5 e toca no computador, com três bipes e a notificação do Windows (`tocarNoComputador`, em `computador.ts`);
    - o de atenção só toca, curto (o "Asterisk" do Windows), sem ir ao celular. É o que dizem as decisões 7 ("só no painel") e 21 ("só com os alertas críticos no celular"); a frase de cima deste ticket, "no computador e no celular", vale só para os críticos;
    - o crítico que termina vai ao celular com prioridade 2, sem som, para o dono que dorme saber que voltou. A decisão 8 não pede isso; foi acrescentado.
  - **Rodada completa** é a que chegou ao TSE: pediu e teve alguma resposta, ou não tinha o que pedir. Com a internet fora, os pedidos falham na hora e as rodadas seguem a cada 20 s, e o sinal da queda é o "nenhuma rodada" (decisão 13).
  - **Gravação falhando** conta as tentativas com resultado, e não as rodadas: as falhas `gravar …` ou `republicar o plano B: …` e, no plano B, a republicação boa (`ultimaRepublicacaoBoa`). A republicação leva até 2 min para falhar, e a falha chega numa rodada qualquer.
  - **Projeção mudando**: só nas bases no ar, com a fase ao vivo e pelo menos 5% das seções, entre as duas últimas rodadas com projeção. Desligada depois de um salto sem explicação, ela não volta na noite (decisão 18), e o alerta dela seria barulho.
  - **TSE sem novidade**: na fase ao vivo e abaixo de 99%, desde a última novidade vista. Antes da primeira totalização, conta desde a primeira rodada ao vivo.
  - **Arquivo de rodada público com mais de 2 min**: um arquivo de antes deste coletor, como o do 24/10 ou o de antes de um reinício, não conta contra ele. Na partida, o alerta só vem se em 2 min as rodadas dele não chegarem ao endereço público.
- **ntfy** (`packages/coletor/src/ntfy.ts`): um POST de JSON em `https://ntfy.sh`, com o tópico, o título, a mensagem e a prioridade, porque os cabeçalhos não levam o "í" de "crítico".
  - O tópico é `NTFY_TOPICO` no `packages/coletor/.env` (veja `.env.exemplo`). Sem ele, os alertas ficam no computador.
  - `npm run alerta-de-teste` manda um crítico de teste ao celular e toca no computador.
- **Sentinela** (`packages/coletor/cloudflare/sentinela.ts` e `sentinela.jsonc`):
  - **O que faz**: Cron Trigger a cada minuto, sem endereço público. Lê o `rodada.json` do principal e do plano B, fica com o mais novo, como a página, e mede a idade pelo `Date`.
  - **Quando alerta**:
    - uma vez, quando a rodada passa de 3 min parada;
    - uma vez, quando os dois endereços dão erro (não 404) por mais de 3 min.

    Avisa de novo, sem som, quando cada um acaba.
  - **Quando fica quieta**: com a fase "encerrada", ou com uma rodada de mais de 6 h, de outra noite ou de um ensaio. Assim pode ficar ligada desde o ensaio.
  - **Estado**: o que já foi alertado fica num KV, gravado só quando muda.
  - **`global_fetch_strictly_public`**: sem ela, um Worker não lê outro Worker nem um domínio da mesma conta por `fetch` (erro 1042).
  - **Ensaio**: `--env ensaio` é `apurador-sentinela-ensaio`, com os endereços do ensaio.
  - **Tamanho**: 5,1 KiB no `wrangler deploy --dry-run`, sem nada do Node.
- **Plano B**: `republicacaoDoWorker` dá `ultimaRepublicacaoBoa()`, a hora em que terminou a última republicação boa. Uma que falha não a muda.
- **Testes**:
  - **No replay**: `packages/ensaio/test/painel-e-alertas.test.ts` provoca cada alerta, com o painel alimentado como no `principal.ts` e o temporizador de 5 s no relógio do coletor. Como no ensaio, o relógio do coletor fica em 25/10/2026 e o TSE falso em 2022.
    - Provoca o 403 e o 429, a rodada presa por 80 s, a internet fora (o TSE e o R2 falhando juntos) e 3 rodadas com o R2 falhando.
    - Provoca a republicação do plano B falhando e dando certo, a borda entregando a mesma cópia, o JSON do Brasil com os candidatos trocados e o arquivo do Brasil e o de SP estragados.
    - Provoca também o TSE parado às 17:10, São Paulo inteira num candidato às 17:38, 60 pedidos/s e uma gravação de 16 s.
    - Fecham a lista o `Date` do TSE deslocado em 3 s para cada lado (e 1 s, sem alerta), 699.900 gravações no mês e o arquivo da capital de SP estragado.
    - Das 16:58 às 17:20 de 2022, uma noite sem nada errado não dá alerta nenhum. O pico de pedidos fica em 50 por segundo, no limite, sem passar. O Brasil no painel é conferido contra o TSE falso (`resultadosDoTseFalso`).
  - **Unitários**: o ntfy, o despacho, o visto de fora, a sentinela e a republicação boa do plano B estão em `packages/coletor/test/`.
- **Noite local** (22/10, 2 min a partir das 16:58): 6 rodadas, a partida a frio com rodada de 14,3 s, pico de 49 pedidos/s, placar conferido igual e conexão "cabo".
- **Revisão** (`/code-review` contra `main`):
  - **Corrigido**:
    - a rodada completa com a internet fora;
    - a gravação falhando no plano B;
    - o fim da janela sem ir ao celular;
    - a sentinela com os dois endereços dando erro;
    - o arquivo público de antes do coletor;
    - os relógios separados no teste;
    - "alertar" no lugar de "avisar";
    - os nomes com "painel do coletor";
    - o `formatos.ts`, sem nada do Node, que a sentinela também usa.
  - **Ficou**:
    - a chance mudando mais de 20 pontos não é provocada sozinha no replay: o teste provoca a projeção mudando mais de 1 p.p., e as duas são a mesma condição e o mesmo alerta;
    - os limites de 5% e 99% não têm um caso negativo no replay.
- **Pendências do dono**, todas em `packages/coletor/cloudflare/README.md`, na seção "Os alertas e a sentinela". Nada disso foi feito:
  - criar o tópico, colá-lo no `.env` e assiná-lo no celular;
  - rodar `npm run alerta-de-teste`;
  - criar o KV e colar o `id` no `sentinela.jsonc`;
  - fazer o deploy da sentinela e o `secret put` do tópico, na produção e no ensaio.
