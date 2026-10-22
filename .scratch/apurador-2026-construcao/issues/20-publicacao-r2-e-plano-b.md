# 20: Publicação no R2 e plano B

Status: resolved
Blocked by: 12, 14
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O coletor publica por uma única interface com quatro destinos: o R2 de produção, o R2 do ensaio, a republicação do Worker do plano B e a pasta local.

- **Caminho principal**: JSONs comprimidos no R2, servidos em `ao-vivo.apurador.org` com cache da CDN.
- **Plano B**: um Worker só com os JSONs ao vivo como static assets, republicado a cada minuto, que funciona em `*.workers.dev`.

A página conhece os dois endereços e passa ao outro se o principal falhar.

Precisa do dono: o domínio, a chave de escrita do R2 no `.env` do coletor e, se não der por API, os ajustes de cache no painel da Cloudflare.

Decisões: [Arquitetura e tecnologia](../../apurador-2026/issues/08-arquitetura-e-tecnologia.md) (decisão 15), [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md) (decisão 14), [Volume de gravações na noite](../../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md) (decisão 6) e a [pesquisa de limites](../../apurador-2026/research/08-limites-cloudflare-e-github.md).

## Critérios de aceite

- [x] **Interface**: o coletor publica por uma só interface, com os quatro destinos trocáveis por configuração. O destino do ensaio nunca é o de produção.
- [x] **Gravação no R2**: os JSONs vão com `Content-Encoding: gzip`, ETag e `Cache-Control`, para a CDN guardar por 15 s.
- [x] **Configuração de `ao-vivo.apurador.org`**: Cache Rule que respeita o `Cache-Control` da origem, Tiered Cache e TTL do navegador em "Respect Existing Headers". O que não der para configurar por API vira um passo descrito ao dono.
- [x] **Conferência do gzip**: um objeto gravado com gzip chega certo ao navegador pela borda, com ETag e 304. Se não chegar, uma opção de configuração faz o coletor gravar sem compressão.
- [x] **Plano B**: o Worker é republicado a cada minuto com os ~5.820 arquivos ao vivo, dentro dos 20.000 por versão. O coletor só publica nele por comando do dono e fica nele até o fim da noite.
- [x] **Leitura da página**: ela lê o endereço principal. Se ele der erro, ou se o arquivo de rodada dele tiver mais de 2 min, tenta o outro e fica com a rodada mais nova.
- [x] **Sem domínio**: só existe o caminho do Worker, e a página funciona com ele.
- [x] **Credenciais**: as chaves de escrita ficam no `.env` local do coletor, nunca no Git.
- [x] **Contador de gravações**: o coletor conta cada gravação nos dois buckets e guarda o contador no estado, para o [ticket 23](23-protecoes-e-fim-da-noite.md).

## Comments

- 19/10/2026, do [ticket 12](12-coletor-minimo-e-replay.md): `Destino { gravar(caminho, bytes) }` (`packages/coletor/src/destino.ts`) é a interface única, e hoje só existe `pastaLocal`. O coletor já grava só quando os bytes mudam (um hash por caminho) e conta `gravacoes` no registro de cada rodada.
- 19/10/2026, do [ticket 14](14-bloco-ao-vivo.md):
  - A página lê `<base>rodada.json` e `<base>lugares/<id>.json`. A `base` vem de `PUBLIC_AO_VIVO` no build, com a barra no fim; sem ela, a ilha não lê nada.
  - Ela pede com o `If-None-Match` posto à mão e `cache: "no-store"`, para o 304 chegar ao código, e lê o cabeçalho `Date` de cada resposta: é ele que dá a interrupção.
  - Lidas de `apurador.org` em `ao-vivo.apurador.org`, as duas coisas pedem CORS no R2:
    - `GET` e `OPTIONS`, com o cabeçalho `If-None-Match` permitido, porque o pedido tem preflight;
    - `Date` e `ETag` em `Access-Control-Expose-Headers`. Sem isso, o `Date` chega `null` à página, e a interrupção nunca aparece;
    - um `Access-Control-Max-Age` longo, para o preflight não se repetir a cada 30 s.
  - A troca para o plano B entra em `criarLeitorAoVivo` (`packages/site/src/lib/leitor-ao-vivo.ts`), que hoje conhece um endereço só.
- 20/10/2026, do [ticket 16](16-comandos-chaves-e-plano-zero.md):
  - **O comando** `npm run noite -- plano-b` (confirmado digitando `plano-b`) grava `planoB: true` no arquivo de controle (`.cache/coletor/controle.json`). O coletor o lê no começo de cada rodada e o guarda em `controle.planoB` (`criarColetor`, em `packages/coletor/src/coletor.ts`; também em `registro.controle.planoB`), sem fazer nada com ele ainda: a troca do destino entra aqui, lendo `controle.planoB` antes de gravar. Só vai: não há comando de volta, e o arquivo de controle sobrevive a um reinício do coletor, então o coletor retomado continua no plano B (Operação na noite, decisão 14).
  - `planoB` não vai no `rodada.json`: a página troca de endereço sozinha (decisão 14), pelo erro ou pela rodada velha. O `rodada.json` ganhou `chaves` e `aviso` (`ArquivoDeRodada`, em `packages/coletor/src/arquivos.ts`); o Worker do plano B republica os arquivos como estão.
  - `criarLeitorAoVivo` (`packages/site/src/lib/leitor-ao-vivo.ts`) agora recebe `chaves`, as do arquivo de chaves do site, que valem até a primeira rodada: ao pôr o segundo endereço, mantenha a opção. O quadro expõe `chaves` e `aviso` da rodada mais nova com que a página ficou.
  - O caminho do arquivo de controle é por checkout (`--controle` no coletor e no comando mudam o padrão). No computador do dono, o ensaio e a noite usam o mesmo arquivo; o roteiro ([ticket 31](31-roteiro-da-noite.md)) confere e apaga antes da noite.
  - No plano zero, o coletor para de gravar os `lugares/*.json`, mas os velhos ficam no destino: a página os esconde pelo `rodada.json`. Se o R2 ou o Worker precisarem apagá-los, é aqui.

**20/10/2026, resolvido:**

- **Interface**: `Destino { gravar(caminho, bytes); fimDaRodada?() }` (`packages/coletor/src/destino.ts`). O `fimDaRodada` é dos destinos que publicam em lote, como o plano B, e devolve as falhas. Os destinos saem do `--destino` do coletor (`destinosDoColetor`, em `ambientes.ts`):
  - `producao`: o R2 `apurador-ao-vivo` (`destinoR2`, em `r2.ts`) e, como plano B, o Worker `apurador-plano-b` (`republicacaoDoWorker`, em `plano-b.ts`; configuração em `packages/coletor/cloudflare/plano-b.jsonc`, pasta `.cache/coletor/plano-b/`).
  - `ensaio`: o R2 `apurador-ensaio` e o Worker `apurador-ensaio-plano-b`, com a chave do ensaio (`R2_ENSAIO_*`). Sem ela, o coletor não começa, mesmo com a de produção no `.env`. Nenhum nome, pasta ou chave do ensaio é de produção.
  - `pasta`, o padrão: `.cache/coletor/publicado/`, com o plano B em `publicado-plano-b/` e sem republicação. O `astro dev` serve as duas pastas.
  - `--sem-dominio`: só o Worker, como principal e plano B, sem a chave do R2.
- **R2**:
  - a gravação vai pela API S3, porque a API REST tem limite de 1.200 pedidos a cada 5 min;
  - a assinatura SigV4 é feita com o `node:crypto` e testada contra os dois exemplos da AWS;
  - cada JSON vai com `Content-Encoding: gzip`, `Content-Type: application/json` e `Cache-Control: public, max-age=15`. A ETag é a do R2, e `--sem-gzip` grava sem compressão;
  - vão até 32 gravações ao mesmo tempo. Uma por vez, a ~0,1 s cada, o pico de ~700 numa rodada levaria 70 s.
- **Plano B**:
  - **Republicação**: no fim da rodada, quando já passaram 50 s da anterior, o coletor republica o Worker com `wrangler deploy --config`, pelo login do wrangler ou pelo `CLOUDFLARE_API_TOKEN` do `.env`. A republicação não segura a rodada. No replay de 2022, sai uma por minuto, das 17:00 às 17:07. Uma falha aparece na rodada seguinte, que tenta de novo.
  - **Troca**: o coletor passa ao plano B na primeira rodada que lê `controle.planoB`, regrava ali todos os lugares com resultado e não volta (`registro.destinoAtivo`).
  - **Pasta**: a de outra noite (`rodada.json` com mais de 6 h) é esvaziada na primeira gravação. A da mesma noite fica, para o coletor reiniciado não republicar o Worker sem parte dos lugares.
  - **Tamanho**: cada versão leva a pasta inteira. Em 2026, são os 5.789 lugares, o `rodada.json` e o `_headers`: 5.791 arquivos, ~5.820 quando entrarem as tabelas, o mapa e o simulador, dentro dos 20.000. Um `wrangler deploy --dry-run` com 5.801 arquivos levou ~8,6 s.
- **Medido em 20/10/2026**: o Worker do site, que só tem static assets, responde 405 a um `OPTIONS`. Os static assets não atendem o preflight do CORS. Por isso, a página lê o plano B sem cabeçalho próprio, com `cache: "no-cache"`, e o navegador revalida com a ETag. O `_headers` da pasta dá `Access-Control-Allow-Origin: *`, `Access-Control-Expose-Headers: Date, ETag` e `X-Robots-Tag: noindex`.
- **Página** (`packages/site/src/lib/enderecos-ao-vivo.ts`, chamado por `criarLeitorAoVivo`, que recebe `enderecos` no lugar de `base` e mantém `chaves`):
  - **Troca**: ela lê o arquivo de rodada no endereço em que está. Com erro ou com a rodada de mais de 2 min pelo `Date` da resposta, lê o outro, fica com a rodada mais nova e lê o lugar de lá. Nas leituras seguintes, começa por esse endereço e só volta ao principal se o plano B parar.
  - **Pedidos**: o principal vai com o `If-None-Match` à mão e `no-store`, como antes.
  - **Build**: lê `PUBLIC_AO_VIVO` e `PUBLIC_AO_VIVO_PLANO_B` (`enderecosDoBuild`). Sem o primeiro, só o Worker.
  - **Visto na página**: no `astro dev` com a noite local, depois de `npm run noite -- plano-b`, a página passou sozinha de `/ao-vivo/` a `/ao-vivo-plano-b/` quando o principal envelheceu, e a leitura seguinte foi direto ao plano B.
- **Contador** (`contador.ts`):
  - cada gravação que o R2 aceitou conta uma no bucket dela, por mês em UTC;
  - o contador fica em `.cache/coletor/gravacoes.json` (`--gravacoes`), é guardado a cada rodada e vai no `registro.gravacoesDoMes`;
  - `somaDoMes` dá o total dos dois buckets;
  - no replay, o contador bate com o que o R2 recebeu. Uma gravação recusada não conta: se a Cloudflare cobrar as recusadas, a diferença aparece na comparação com o painel no ensaio ([ticket 30](30-ambiente-de-ensaio-e-conferencias.md)).
- **Conferência da entrega** (`entrega.ts`, `npm run conferir-entrega -- [--destino ensaio] [--sem-gzip] [--plano-b]`):
  - grava um objeto novo em `conferencia/` e o lê pela borda;
  - confere o corpo igual ao gravado, a ETag, o 304, o `max-age=15` no navegador, a cópia da borda (`HIT`), o CORS mesmo depois de um leitor sem `Origin`, e o preflight;
  - com `--plano-b`, republica o Worker só com esse objeto e o confere. Com um `rodada.json` no Worker ou na pasta dele, recusa.
- **Conta**: o roteiro está em `packages/coletor/cloudflare/README.md`. O CORS do bucket (`cors-ao-vivo.json`):
  - libera a origem `https://apurador.org`, com `GET` e `HEAD`;
  - permite o `If-None-Match` e expõe `Date` e `ETag`;
  - vale 24 h de preflight. O R2 responde ao `OPTIONS` pelas regras, sem `OPTIONS` na lista de métodos.

  Em 20/10, o bucket estava sem CORS e sem domínio próprio, com o `r2.dev` desligado, e o Worker do plano B não existia. O login OAuth do wrangler escreve no R2 e nos Workers, mas na zona só lê.
- **Não feito, passos do dono** (no README, na ordem):
  - o domínio próprio do bucket e o CORS: dois comandos prontos, que rodam com o ok do dono. O primeiro pede o ID da zona `apurador.org`;
  - no painel, três ajustes:
    - a Cache Rule de `ao-vivo.apurador.org`: respeita o `Cache-Control` e, sem ele, o padrão da Cloudflare, para um 404 não virar uma leitura no R2 por visitante;
    - o Tiered Cache;
    - o TTL do navegador em "Respect Existing Headers";
  - no painel, uma Transform Rule que põe o CORS em toda resposta do host. O R2 só põe o CORS quando o pedido traz `Origin`, e a cópia da borda feita por um leitor sem ele (a sentinela, o painel) chegaria ao navegador sem o CORS;
  - a chave de escrita só no bucket, no `.env` do coletor;
  - `npm run conferir-entrega -- --plano-b`, que também faz o primeiro deploy do Worker do plano B.

  Os critérios da configuração de `ao-vivo.apurador.org` e da conferência do gzip ficam abertos até esses passos.

**22/10/2026, os passos do dono feitos (Claude, com o ok do dono para os passos 1 a 4 e o 6):**

- **Domínio e CORS do bucket** (passos 1 e 2, pelo wrangler): `ao-vivo.apurador.org` está ligado ao `apurador-ao-vivo`, com TLS 1.2 ou mais, posse e SSL em "active". O CORS do bucket é o de `cors-ao-vivo.json`.
- **Zona `apurador.org`** (passos 3 e 4, pelo painel):
  - a Cache Rule "ao-vivo: respeitar a origem", com `http.host eq "ao-vivo.apurador.org"`: "Eligible for cache"; o Edge TTL pelo `Cache-Control` e, sem ele, o padrão da Cloudflare para o status; o Browser TTL em "Respect origin TTL";
  - o Smart Tiered Cache ligado. O painel o tirou de Caching → Tiered Cache: ele vem com o Smart Shield (Speed → Smart Shield), no pacote gratuito;
  - o Browser Cache TTL da zona, de "4 hours" para "Respect Existing Headers";
  - a Transform Rule de resposta "ao-vivo: CORS", no mesmo host, com `Access-Control-Allow-Origin: https://apurador.org` e `Access-Control-Expose-Headers: Date, ETag`. Até um 404 sai com os dois.

  O README ganhou os nomes novos do painel: a opção do Edge TTL e o caminho do Smart Tiered Cache.
- **Chave de escrita** (passo 5, dono): `R2_PRODUCAO_*` no `.env` do coletor, no checkout principal. A do ensaio fica para o [ticket 30](30-ambiente-de-ensaio-e-conferencias.md).
- **Conferência** (passo 6): `npm run conferir-entrega -- --plano-b` passou inteira, com gzip.
  - No R2: o corpo, a ETag, o `max-age=15`, o CORS, a cópia da borda (`HIT`), o 304 e o preflight de 24 h.
  - No Worker do plano B, que teve aí o primeiro deploy: o corpo (a borda o entrega em brotli), a ETag fraca, o CORS e o 304.
  - O coletor grava com gzip, sem `--sem-gzip`.
- **Medido: a borda guarda uma cópia para cada `Origin`**. O R2 responde com `Vary: Origin` aos pedidos que trazem `Origin`, e a borda não serve ao navegador a cópia feita por um leitor sem `Origin`, nem o contrário.
  - Na primeira rodada da conferência, o pedido do navegador logo depois do pedido sem `Origin` veio `MISS`. Com `curl`, cada lado vem `HIT` do segundo pedido em diante.
  - Na noite, todo navegador manda o mesmo `Origin: https://apurador.org` e divide uma cópia; a sentinela e o painel ficam com outra. Um arquivo lido pelos dois lados custa ao R2 duas leituras a cada 15 s, não uma.
  - A conferência passou a olhar o `HIT` no segundo pedido do navegador (`entrega.ts`), e a borda de mentira do teste ganhou a cópia por `Origin`.
- **Decisões confirmadas pelo dono**, como já estavam no código: a página que passou ao plano B fica nele; uma gravação que o R2 recusou não entra no contador.
