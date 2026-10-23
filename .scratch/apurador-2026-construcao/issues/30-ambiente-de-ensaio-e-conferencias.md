# 30: Ambiente de ensaio e scripts de conferência

Status: resolved
Blocked by: 11, 19, 20
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O ambiente fechado do ensaio geral: um Worker, um subdomínio e um bucket do R2 próprios, nunca os de produção, com `noindex` e uma tarja fixa. Nele:

- o TSE falso roda como servidor HTTP no computador do dono, a 3x e 30x;
- o coletor, a CDN e o navegador mantêm a cadência real.

Junto, vêm os scripts que medem os critérios de aprovação e o modelo do registro de cada ensaio.

Precisa do dono: a chave de escrita só no bucket do ensaio.

Decisões: [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 3 a 6, 12 e 19 a 23, e comentários) e [Volume de gravações na noite](../../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md) (decisões 4 e 9).

## Critérios de aceite

- [x] **Ambiente**: o Worker, o subdomínio e o bucket do ensaio são separados dos de produção, e o coletor tem o destino "R2 do ensaio" na interface de publicação.
- [x] **Tarja**: todas as páginas do ensaio têm `noindex` e a tarja "Ensaio: reprodução da apuração de 30/10/2022. Não é resultado de 2026."
- [x] **Antes das 17h no ensaio**: o painel usa o agregado das pesquisas de 2022.
- [x] **Retirada de pesquisa**: dá para retirar uma pesquisa de 2022 por deploy, e o agregado recalculado aparece em até 10 min, sem tocar no coletor.
- [x] **Placar idêntico**: compara o placar publicado com o arquivo do TSE falso, em todas as rodadas e lugares. A meta é zero divergências.
- [x] **Atraso visto de fora**: o script lê o endereço público como a página lê (a cada 30 s, com `If-None-Match`) e dá a mediana e o p95. As metas são 35 s e 70 s no caminho R2 e 75 s e 150 s no plano B.
- [x] **Textos preditivos**: com a chave desligada, nenhum preditivo em nenhum JSON público de nenhuma rodada.
- [x] **Narração factual**: igual à do replay automático da mesma noite, salvo o que as quedas provocadas explicam.
- [x] **Cache**: no caminho R2, pelo menos 90% das respostas dos JSONs ao vivo vêm da borda (`HIT` ou `REVALIDATED`).
- [x] **Medições sem meta bloqueante**:
  - o tempo de cada rodada (meta: menos de 20 s no pico a 3x);
  - as gravações por rodada e por hora;
  - o volume da noite;
  - o contador do coletor contra o painel da Cloudflare (até 1% de diferença);
  - os dados por visitante na página do Brasil das 17h às 20h (até 10 MB).
- [x] **Registro de cada ensaio**: traz os números contra os critérios, as falhas com hora e o veredito de cada bloco, para o dono assinar.

## Comments

- 19/10/2026, do [ticket 12](12-coletor-minimo-e-replay.md): a conferência do placar existe: `conferirPlacar(publicados, { noite, cadastro })`, em `packages/ensaio/src/conferencia.ts`. Ela recebe cada arquivo de lugar observado, com a ordem dos candidatos do `rodada.json`, e o compara com o TSE falso na hora publicada. Por isso serve ao ensaio, com o atraso da CDN. `resultadosDoTseFalso` lê o TSE falso sem o limite de pedidos.
- 20/10/2026, do [ticket 20](20-publicacao-r2-e-plano-b.md):
  - **Como apontar para o R2 do ensaio**: `npm run coletor -- --destino ensaio`.
    - Grava no bucket `apurador-ensaio`, com a chave `R2_ENSAIO_ACCESS_KEY_ID`/`R2_ENSAIO_SECRET_ACCESS_KEY` de `packages/coletor/.env` (modelo em `.env.exemplo`). Sem ela, o coletor não começa, mesmo com a de produção no arquivo.
    - O plano B do ensaio é o Worker `apurador-ensaio-plano-b` (`packages/coletor/cloudflare/plano-b-ensaio.jsonc`, pasta `.cache/coletor/plano-b-ensaio/`).
  - **O que falta criar**, com os nomes de `AMBIENTES.ensaio` (`packages/coletor/src/ambientes.ts`), que podem mudar ali:
    - o bucket `apurador-ensaio`;
    - o domínio próprio `ao-vivo-ensaio.apurador.org`, num nível só, para caber no certificado `*.apurador.org` do plano gratuito;
    - o CORS do bucket, com a origem do site do ensaio;
    - a Cache Rule e a Transform Rule do host, como os passos 3 e 4 de `packages/coletor/cloudflare/README.md`;
    - a chave de escrita só nesse bucket.

    O build do site do ensaio leva `PUBLIC_AO_VIVO=https://ao-vivo-ensaio.apurador.org/` e `PUBLIC_AO_VIVO_PLANO_B=https://apurador-ensaio-plano-b.hicampos93.workers.dev/`.
  - **Conferências**:
    - **Entrega**: `npm run conferir-entrega -- --destino ensaio --origem <origem do site do ensaio> --plano-b` confere a entrega no ambiente do ensaio.
    - **Contador**: o do coletor, para comparar com o painel da Cloudflare, é `.cache/coletor/gravacoes.json`, por bucket.
    - **Atraso no plano B**: o script tem de ler como a página, sem cabeçalho próprio e com o cache do navegador. Os static assets não atendem o preflight do CORS.
- 21/10/2026, da retro do [ticket 20](20-publicacao-r2-e-plano-b.md): a entrega pela borda dos objetos gravados com gzip no R2 (ETag e 304), que a spec deixa "Em aberto", ficou sem medir no ticket 20 por falta da chave de escrita. Antes deste ticket, o dono cola no `.env` do coletor a chave do bucket do ensaio (as "Pendências do dono" da spec), para as conferências daqui rodarem contra o ensaio.
- 22/10/2026, do [ticket 17](17-projecao-ao-vivo.md): no ensaio com o TSE falso, o coletor roda com `--noite 2022-2` (a base e o agregado de 2022). Sem isso, a projeção falha em toda rodada ("os candidatos da noite (13, 22) não são os finalistas da base do modelo (22, 13)"), e só o núcleo mínimo sai. O `noite-local` já passa a opção. A projeção pesa ~20 ms por rodada.
- 22/10/2026, do [ticket 13](13-lancamento-antes-da-noite.md): o site abriu, e o `noindex` saiu do `<meta>` do `Base.astro` (`packages/site/src/layouts/Base.astro`). O `public/_headers` só põe `X-Robots-Tag: noindex` no host `apurador.hicampos93.workers.dev`. O build do ensaio precisa do próprio `noindex`, no `<meta>` e numa regra do `_headers` para o host do Worker do ensaio. Toda página também leva o script do Cloudflare Web Analytics, com o token do site `apurador.org` (`TOKEN_DO_WEB_ANALYTICS`, em `packages/site/src/lib/projeto.ts`): tire-o do build do ensaio, para as visitas dele não entrarem na audiência do site. O teste `packages/site/test/build/pagina-brasil.test.ts` fixa as duas coisas no build de produção.
- 22/10/2026, do [ticket 18](18-projecao-dos-municipios-e-tabelas.md): o `mapa.json` também leva o % de seções e o placar do TSE de cada UF e de cada município (`ArquivoDoMapa`, lido por `lugarNoMapa`). A conferência do placar (`conferirPlacar`) só olha `lugares/*.json`, e o replay compara só o último mapa.json com os últimos JSONs dos lugares: conferir cada mapa.json publicado contra o TSE falso cabe na conferência do ensaio.
- 22/10/2026, do [ticket 19](19-textos-preditivos.md): a conferência dos textos preditivos existe: `conferirPreditivos(publicados)`, em `packages/ensaio/src/conferencia-dos-preditivos.ts` (pelo índice de `@apurador/ensaio`).
  - **A entrada**: os JSONs públicos como `{ caminho, conteudo }` (o conteúdo já lido do JSON), na ordem em que foram gravados ou lidos, com o `rodada.json` de cada rodada antes dos lugares dela: a chave de cada rodada é a do `rodada.json` (`chaves.textosPreditivos`). Ela devolve as divergências em texto, cada uma uma vez. A meta é nenhuma.
  - **O que ela acusa**: no fim de cada rodada com a chave desligada, qualquer preditivo ainda no ar em qualquer caminho, pelo último JSON visto de cada um (um JSON com preditivos que não foi regravado também conta); com a chave ligada, um evento preditivo com hora de antes da rodada em que ela ligou (a hora do TSE mais nova já publicada até ali) e um marco publicado antes disso que ganhou a linha da projeção. É preditivo um evento de tipo `sinal-de-virada` ou `chance` (`TIPOS_PREDITIVOS`, de `@apurador/coletor`), um evento com `base`, um marco com `linhaDaProjecao` e qualquer texto com "projeção do Apurador".
  - **No replay**: `conferirPreditivos(r.gravacoes)`, na noite inteira com a chave desligada e numa noite com ela ligada às 17:10 e desligada às 17:30 (`packages/ensaio/test/replay.test.ts`, "os textos preditivos, pela chave"). As gravações do replay já têm `caminho` e `conteudo`.
  - **No ensaio**: dê ao script as leituras do endereço público na ordem em que foram feitas, o `rodada.json` de cada leitura antes dos lugares lidos com ele. Com a chave desligada a noite inteira, o critério é nenhuma divergência. Se o ensaio ligar e desligar a chave no meio, a CDN pode entregar um lugar da rodada anterior logo depois do `rodada.json` novo: as divergências dos 2 min seguintes a cada comando (duas rodadas e o cache) vêm do atraso, não do coletor, e a conferência do coletor é a do replay.
- 22/10/2026, do [ticket 21](21-painel-alertas-e-sentinela.md): a sentinela do ensaio é o Worker `apurador-sentinela-ensaio` (`packages/coletor/cloudflare/sentinela.jsonc`, `--env ensaio`). Ela lê `https://ao-vivo-ensaio.apurador.org/` e `https://apurador-ensaio-plano-b.hicampos93.workers.dev/`. Se os nomes do ensaio mudarem aqui, mude também os `ENDERECOS` dela.

**22/10/2026, resolvido:**

- **Costuras** (`/tdd`): o relógio do TSE falso invertido (`momentoReal`), o leitor do ensaio (`criarLeitorDoEnsaio`), a conferência do ensaio com o registro (`conferirEnsaio`, `registroDoEnsaio`) e o build do site do ensaio. Foram as que o ticket nomeia; esta sessão foi aberta por outra, e o dono não as confirmou antes.
- **Ambiente** (`AMBIENTES.ensaio`, em `packages/coletor/src/ambientes.ts`): ganhou `site`, a origem do site que lê cada bucket. No ensaio, `https://apurador-ensaio.hicampos93.workers.dev`; na produção, `https://apurador.org`.
  - Sem `--origem`, o `conferir-entrega` usa a do ambiente.
  - O CORS do bucket do ensaio é `packages/coletor/cloudflare/cors-ao-vivo-ensaio.json`, e um teste confere a origem de cada CORS contra o `site` do ambiente.
  - Os passos do dono estão em "O ambiente do ensaio geral", no fim de `packages/coletor/cloudflare/README.md`.
  - **Na conta, em 22/10 à noite**: a sessão de acompanhamento criou o bucket `apurador-ensaio` e aplicou o CORS com `cors-ao-vivo-ensaio.json` (conferido no `wrangler r2 bucket cors list`). Faltam, do dono: o domínio `ao-vivo-ensaio.apurador.org` (o modo automático barrou o `r2 bucket domain add`), a Cache Rule e a Transform Rule do host, a chave `R2_ENSAIO_*` no `.env` (estava vazia), as sentinelas e, depois da junção, o deploy do Worker `apurador-ensaio`. Sem a chave, as conferências contra o ensaio real ficaram como passo do dono (nota no [ticket 32](32-ensaios-gerais.md)).
- **Site do ensaio** (`packages/site/ensaio/`):
  - `astro.config.mjs` põe `PUBLIC_ENSAIO=1`, os endereços do ensaio e o `_headers` próprio (`/*` com `X-Robots-Tag: noindex`) e sai em `dist-ensaio/`. Com `APURADOR_SEM_DOMINIO=1`, só o plano B.
  - `wrangler.jsonc` é o Worker `apurador-ensaio`, separado do `apurador`.
  - `npm run deploy-ensaio` faz o build e o deploy; `npm run build-ensaio -w @apurador/site`, só o build.
  - **Em toda página** (`Base.astro`, `src/lib/ensaio.ts`): `<meta name="robots" content="noindex, nofollow">`; a tarja dentro do topo, que fica sempre na tela e entra em qualquer print; o título com "Ensaio ·"; e nenhum Web Analytics. O subtítulo das páginas de lugar e do simulador diz "2º turno de 30 de outubro de 2022, reproduzido no ensaio".
  - A coluna da narração, fixa no computador, passou a ficar abaixo da altura medida do topo, que cresce com a tarja. No build da noite, dá os mesmos 4,5 rem de antes.
  - O teste `packages/site/test/build/ensaio.test.ts` lê um quarto build, o do ensaio, no `globalSetup`. São ~50 s a mais no `npm test`.
- **Painel de antes das 17h no ensaio** (`packages/site/src/lib/pesquisas.ts`):
  - Os exportados soltos (`TURNO`, `AGREGADO`, `TENDENCIA`, `CALENDARIO`, `FINALISTAS` e as contas entre eles) são os da noite do painel. No ensaio, são o 1º turno de 2022 e as 12 pesquisas finais do 2º turno de 2022 do `pesquisas-historicas.csv`.
  - O agregado de 2022 é o congelado na véspera, o mesmo do coletor com `--noite 2022-2`: Lula com 50,98% dos válidos, 51,0% na página. A tendência vai de 03/10 a 30/10 de 2022, com o congelamento às 23h de 29/10. A projeção antes das 17h usa a base de 2022, e a lista mostra as pesquisas de 2022.
  - A metodologia é sempre a de 2026 e lê `PESQUISAS_DE_2026`. O teste confere que a página dela no build do ensaio é igual à do build da noite.
  - O simulador de antes das 17h segue a noite do build. As hipóteses prontas usam o viés do 1º turno de 2026, que a metodologia cita, e vão para o mesmo candidato pelo número: no ensaio, "As pesquisas subestimam JAIR BOLSONARO como no 1º turno". Sem isso, iriam para Lula, o 1º finalista de 2022.
  - Para isso, `tendenciaDoAgregado` (`modelo`) ganhou a eleição e o dia de partida, e o `pipeline` exporta `pesquisasDaNoitePassada`.
- **Retirada de pesquisa**: o registro vai em `packages/site/ensaio/pesquisas-retiradas.json`, seguido de `npm run deploy-ensaio`. Sem a Datafolha (`BR-08297/2022`), são 11 pesquisas, e o agregado vai a 50,88% (50,9%), pela conta à mão sobre os votos publicados. Um registro que não é pesquisa do 2º turno de 2022 quebra o build. O coletor não muda. Os "até 10 min" se medem no ensaio: o build leva ~50 s.
- **TSE falso**: grava a partida e o ritmo do relógio em `.cache/tse-falso/relogio.json`. `momentoReal` dá a hora real em que a noite chega a um instante: as 17:00 chegam 3 min 20 s depois da partida das 16:50, e as 21:00, 74 min 20 s depois.
- **Leitor** (`npm run ler-ensaio`, `packages/ensaio/src/leitor-do-ensaio.ts`):
  - **Como lê**: a cada 30 s, o `rodada.json` no endereço em que está, com o `Origin` do site do ensaio e o `If-None-Match`. Passa ao plano B pela regra da página (erro ou rodada de mais de 2 min pelo `Date`, ficando com a mais nova, e nele depois).
  - **O que lê**: o Brasil, as 27 UFs, o Exterior, o `mapa.json` e 60 municípios em rodízio, todos a cada ~45 min. São ~3 pedidos por segundo à borda.
  - **O que grava**: cada resposta em `.cache/ensaio/leituras-*.jsonl`, com a hora, o endereço, o status, o `CF-Cache-Status`, os bytes e o JSON. Os bytes são o `Content-Length`, com a compressão; sem ele, o corpo comprimido de novo pelo `Content-Encoding` da resposta, porque o `fetch` o entrega descomprimido.
  - `--endereco`, `--plano-b` e `--origem` trocam os endereços (o `noite-local`), e `--sem-dominio` lê só o plano B.
- **Conferência** (`npm run conferir-ensaio`, `conferencia-do-ensaio.ts` e `registro-do-ensaio.ts`):
  - **Placar**: `conferirPlacar` sobre todo arquivo de lugar lido, com os candidatos do último `rodada.json`.
  - **Preditivos**: `conferirPreditivos` sobre os JSONs lidos, na ordem.
  - **Atraso**: por endereço, de cada totalização do Brasil mais nova que a última vista, desde o `momentoReal` dela. Dá a mediana e o p95 pelo posto mais próximo. `--excluir HH:MM-HH:MM` tira as quedas provocadas.
  - **Cache**: as respostas 200 e 304 do caminho R2 aos arquivos da página do Brasil (o `rodada.json`, o Brasil e o `mapa.json`); da borda, `HIT` e `REVALIDATED`. Os municípios do rodízio ficam fora, porque só o leitor os pede.
  - **Narração**: a do último JSON do Brasil contra a do replay da mesma noite, sem os preditivos, casando lugar, tipo e marco, com até 2 min de diferença na hora. O replay é `narracaoDoReplay` (`replay-da-noite.ts`), o coletor inteiro sobre o TSE falso sem rede, como o teste do replay; a noite toda leva ~1 min. `--sem-replay` pula.
  - **Rodadas do coletor**: lidas dos `rodadas-*.jsonl` do tempo das leituras, um por partida do coletor. Dão a duração (máxima, p95 e a do pico de municípios) e as gravações por rodada e por hora.
  - **Contador**: o do bucket do ensaio em `.cache/coletor/gravacoes.json` contra o `--painel-da-cloudflare`, nunca a soma dos dois buckets, porque o painel conta cada um à parte.
  - **Dados por visitante**: o `rodada.json` e o Brasil (e o `mapa.json`, à parte) lidos das 17h às 20h da noite, pelo relógio do TSE falso, levados à noite real pela velocidade (x3 com a partida às 16:50).
  - **Saída**: a tabela dos critérios com a meta e o veredito do número, e as divergências, até 20 de cada. Vai para a tela e para `.cache/ensaio/conferencia-*.md`, e os números inteiros, para o `.json` ao lado.
- **Registro de cada ensaio**: o modelo é `docs/ensaios/modelo.md`. Traz os comandos, a saída da conferência, os critérios medidos à mão (núcleo mínimo, projeção, simulador, mapa, preditivos, carga), as falhas com hora e o veredito de cada bloco, com a assinatura do dono.
- **Revisão** (`/code-review`): padrões e spec, em paralelo. Corrigido:
  - o teste do contador, que passava por construção: agora a conferência escolhe o bucket do ensaio;
  - a tolerância da virada no teste do replay, a mesma conta do `replay.test.ts` (até 18:45:50);
  - "painel" sozinho nos comentários (o glossário o reserva ao painel do coletor);
  - a tarja repetida no CSS do computador;
  - o `rodada.json` que não é JSON, que agora conta como erro do endereço, como na página;
  - o `"6258"` do replay, que agora vem de `ELEICAO`;
  - o agregado do ensaio, que agora sai de `agregadoDaNoite`, a mesma função do coletor;
  - o cache e os bytes;
  - o sinal das hipóteses prontas;
  - as mensagens do comando.

  Ficaram, por juízo:
  - a escolha do endereço repetida no leitor, porque o site importa sem extensão e o `tsc` da raiz não o lê;
  - o `ORIGEM_DO_SITE` ao lado de `AMBIENTES.producao.site`, porque a sentinela não carrega o `ambientes.ts`, que usa o Node;
  - os `ENSAIO ?` espalhados no site.
- **Teste de ponta a ponta local** (22/10, 21:07 a 21:11): o TSE falso desde as 18:38 a 3x, o coletor publicando numa pasta, um servidor com ETag no lugar da borda e o leitor a cada 10 s, sem o replay.
  - **Placar**: 23 leituras e 477 arquivos de lugar conferidos, nenhuma divergência.
  - **Atraso**: mediana de 19 s, em 3 totalizações. O coletor pede o Brasil no máximo uma vez por minuto, então sai ~1 amostra por minuto.
  - **Rodadas**: até 14,6 s, com 601 municípios na partida a frio.
- **O que ficou de fora**:
  - **mapa.json**: a conferência do `mapa.json` contra o TSE falso, que a nota do ticket 18 sugeria, não foi feita. O `mapa.json` não traz a hora de cada lugar, e o placar de cada lugar já é conferido no arquivo dele.
  - **Volume da noite**: o coletor não conta bytes, e contar pede mexer no `coletor.ts`, do ticket 22. No ensaio, o envio se mede pelo `SentBytes` do `Get-NetAdapterStatistics`, antes e depois. O TSE falso é local e serve sem compressão, então o que vem do TSE fica com a conta do ticket 24.
  - **Gravações levadas à noite**: sai só o total do ensaio. O ticket 24 (decisão 9 e a conta de lá) diz que a 3x o ensaio grava quase o mesmo que a noite.
  - **Retirada pelo caminho da noite**: no ensaio, ela é um deploy local do site do ensaio. Na noite, é uma linha a menos no `dados/pesquisas.csv`, na `main`, com o deploy do CI. O tempo do CI se mede à parte.
  - **Placar do rodízio**: cada município é conferido no arquivo dele umas duas vezes no ensaio, não em toda rodada. Toda rodada e todo lugar ficam com o replay automático.
  - **Visto de fora**: o painel do coletor e a sentinela leem o ensaio com `Origin: https://apurador.org` (`ORIGEM_DO_SITE`). A borda guarda uma cópia por `Origin`, então não estraga a dos visitantes. Trocar pede mexer no `principal.ts`, do ticket 22.
- **Arquivos do ticket 22**: nenhum. `coletor.ts`, `r2.ts`, `narracao.ts` e `principal.ts` não mudaram. Mudaram `ambientes.ts`, `conferir-entrega.ts` e o índice do coletor, que exporta `AMBIENTES`, `ARQUIVO_DO_CONTADOR` e `lerContadorDeGravacoes`.
