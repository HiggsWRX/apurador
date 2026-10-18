# Limites da Cloudflare e do GitHub nos planos gratuitos

Pesquisa para o item "limites do plano gratuito" do ticket [08 — Arquitetura e tecnologia](../issues/08-arquitetura-e-tecnologia.md). Também alimenta o ticket [17 — Acesso ao TSE a partir da nuvem](../issues/17-acesso-ao-tse-pela-nuvem.md). Fontes consultadas em 18/10/2026.

Convenções (as mesmas dos tickets 01 a 06):

- **Documentado:** escrito pela Cloudflare ou pelo GitHub. As páginas da Cloudflare foram lidas pela versão Markdown (`.../index.md`) e trazem a data "Last updated", que cito como "(página de dd/mm/aaaa)". As do GitHub foram lidas pela API `docs.github.com/api/article/body`; a data citada é a do último commit do arquivo no repositório `github/docs`, ou a "Version Effective Date" no caso dos termos.
- **Medido:** cabeçalhos obtidos com `curl --max-time 30` em 18/10/2026, a partir da máquina local (borda da Cloudflare em `GIG`, Rio de Janeiro).
- **Terceiros:** fórum, blog ou repositório que não é a fonte oficial do número.
- **Inferência:** conclusão minha, sem documento que a confirme.

Não criei conta nem fiz login em nada. Horário: em 25/10/2026, Brasília = UTC−3 (sem horário de verão, ver ticket 04). A noite das 17h às 21h vai das 20h às 0h UTC.

---

## Resumo

1. **Um Worker que gera o JSON a cada pedido não aguenta nem 1 mil visitantes no Workers Free.** O limite é de 100.000 requisições por dia por conta, zeradas à 0h UTC, ou seja, **às 21h de Brasília do dia 25**. Acima disso, o Worker devolve o erro 1027. Só uma rota de zona pode ser configurada para "falhar aberto" e pular o Worker. 1.000 visitantes lendo a cada 30 s durante 4 h já fazem 480 mil requisições.
2. **Os arquivos estáticos do Worker (Static Assets) são "free and unlimited"** e não entram nas 100 mil. Os limites são 20.000 arquivos por versão e 25 MiB por arquivo. O cabeçalho padrão é `Cache-Control: public, max-age=0, must-revalidate`, com `ETag`. O deploy só sobe os arquivos que mudaram. Não há limite documentado de frequência de deploy (só o limite geral da API, de 1.200 chamadas a cada 5 min), nem tempo documentado até o deploy valer na borda.
3. **O Workers Free é apertado demais para o coletor.** Cada invocação, HTTP ou Cron, tem 10 ms de CPU, 50 subrequisições e 128 MB de memória. O Cron roda no mínimo a cada 1 min, com 5 Cron Triggers por conta e 15 min de duração por execução. Com 50 `fetch` por minuto, uma varredura dos 5.757 municípios levaria quase 5 h.
4. **O Workers Paid custa US$ 5 por mês** e muda o que importa. Some o limite diário: 10 milhões de requisições/mês estão incluídas, e cada milhão a mais custa US$ 0,30. A CPU vai a 30 s por Cron (intervalo < 1 h). As subrequisições vão a 10.000 por invocação, e os Cron Triggers a 250 por conta.
5. **Pages:** 500 builds por mês, 1 build por vez, 20.000 arquivos por site, 25 MiB por arquivo. **A documentação não diz se o Direct Upload conta nos 500.** A própria Cloudflare abre a documentação do Pages com "Start new projects with Workers".
6. **KV Free:** 100.000 leituras e 1.000 escritas por dia, 1 escrita por segundo na mesma chave, valor de até 25 MiB. A propagação leva "up to 60 seconds or more". Não serve para os visitantes lerem.
7. **R2 Free:** 10 GB-mês, 1 milhão de operações classe A e 10 milhões classe B por mês, e saída grátis. O `r2.dev` tem limite variável ("hundreds of requests/second", depois 429) e é só para desenvolvimento. O cache de CDN exige domínio próprio na Cloudflare, e o JSON não é cacheado sem uma Cache Rule. É preciso ativar uma "assinatura" do R2 pelo checkout.
8. **Durable Objects existem no Free (só com SQLite):** 100.000 requisições e 13.000 GB-s por dia, com 5 GB de armazenamento. Cada objeto tem um alarm por vez, com 15 min de duração e até 6 novas tentativas. **A documentação é ambígua sobre a CPU no Free** (30 s na tabela, mas "Workers Limits apply according to your Workers plan").
9. **A Cache API (`caches.default`) funciona em `workers.dev`** (a restrição saiu da documentação em 05/03/2025). Mas o cache é local a cada data center, e o Worker roda, e conta, em toda requisição. O novo **Workers Cache** (julho de 2026) responde antes do Worker, inclusive em `workers.dev`, mas cada acerto é cobrado como requisição. As Cache Rules da zona não se aplicam a respostas de Worker.
10. **Domínio próprio no Free exige trocar os nameservers.** É a única forma de configuração aceita nesse plano, e a troca pode levar até 24 h. O Free tem 10 Cache Rules, e o TTL de borda forçado por regra é de no mínimo 2 h; para TTL curto, é preciso respeitar o `Cache-Control` da origem. **O Cloudflare Registrar não vende `.br`** (medido): registra-se no registro.br e apontam-se os nameservers para a Cloudflare.
11. **IPs de saída:** a documentação não publica os IPs de origem do `fetch` de um Worker, e IPs dedicados só existem no Enterprise. Todo `fetch` de Worker leva o cabeçalho `CF-Worker: <zona>`, feito para que o destino possa "recognize, filter, and route" esse tráfego.
12. **GitHub Actions Free:** os runners padrão são grátis e sem limite em repositório público; em repositório privado, há 2.000 min por mês. Um job dura até 6 h, um workflow até 35 dias, e cabem 20 jobs simultâneos. O `schedule` roda no mínimo a cada 5 min e pode atrasar em horário de pico; em carga alta, "some queued jobs may be dropped".
13. **Os termos do Actions vão contra o coletor.** Eles proíbem usar Actions "as part of a serverless application". Nos runners do GitHub, também proíbem atividades não ligadas a "production, testing, deployment, or publication of the software project". O GitHub pode encerrar jobs ou desativar o repositório.
14. **GitHub Pages** responde com `Cache-Control: max-age=600` (medido) e tem 100 GB/mês de banda (limite "soft") e 1 GB por site. Não serve para dados ao vivo.
15. **Inferência:** o caminho gratuito que aguenta 100 mil visitantes é publicar o JSON como arquivo estático, por redeploy dos assets a cada minuto ou por R2 com domínio próprio e cache. O coletor não cabe no Workers Free. As saídas são o Workers Paid (US$ 5), uma máquina nossa ou, com risco nos termos, o GitHub Actions.

---

## 1. Workers Free

**Documentado** ([Limits](https://developers.cloudflare.com/workers/platform/limits/), página de 12/10/2026, salvo indicação):

| Item | Workers Free | Workers Paid |
|---|---|---|
| Requisições | **100.000/dia** por conta | sem limite |
| CPU por requisição HTTP | **10 ms** | 5 min (padrão: 30 s) |
| CPU por Cron Trigger | **10 ms** | 30 s (intervalo < 1 h) / 15 min (intervalo ≥ 1 h) |
| Memória | 128 MB por isolate | 128 MB |
| Subrequisições por invocação | **50** (1.000 para serviços internos) | 10.000 (até 10 milhões) |
| Conexões simultâneas esperando cabeçalho | 6 | 6 |
| Duração (relógio) | HTTP: sem limite; Cron: 15 min; alarm de DO: 15 min | igual |
| Cron Triggers por conta | **5** | 250 |
| Workers por conta | 100 | 500 |
| Tamanho do Worker | 64 MiB descomprimido | 64 MiB |
| Arquivos de Static Assets por versão | 20.000 | 100.000 |
| Tamanho de cada asset | 25 MiB | 25 MiB |

### 1.1 Requisições por dia e o que acontece ao passar

- "Accounts on the Workers Free plan have a daily request limit of 100,000 requests, resetting at midnight UTC. When a Worker exceeds this limit, Cloudflare returns **Error 1027**."
- Há dois modos, configuráveis **na rota**. *Fail open*: "Bypasses the Worker. Requests behave as if no Worker is configured." *Fail closed*: "Returns a Cloudflare `1027` error page."
- A [referência de erros](https://developers.cloudflare.com/workers/observability/errors/) (página de 15/10/2026) define `1027` como "Worker exceeded free tier daily request limit".
- **Static Assets continuam de graça** ([Billing and Limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), página de 23/04/2026). Mas, com `run_worker_first`, os caminhos que passam pelo Worker "will receive a 429 (Too Many Requests) response instead of falling back to static asset serving" quando o limite estoura.
- **O Cron conta como requisição.** O exemplo 3 da [página de preços](https://developers.cloudflare.com/workers/platform/pricing/) (página de 02/10/2026) conta um Cron por hora como "720 requests/month". Um Cron por minuto faz 1.440 requisições por dia.
- **Inferência:** em `workers.dev` ou num Custom Domain não há origem atrás do Worker para onde "falhar aberto". Nesses casos, a parte dinâmica responde 1027 e os assets estáticos seguem no ar.
- **Inferência:** a cota zera à 0h UTC, que em 25/10 é 21h de Brasília. A noite toda (20h–24h UTC) cai num só dia UTC. Tudo o que rodar desde as 21h de 24/10 (testes da manhã, por exemplo) gasta a mesma cota.

### 1.2 CPU, memória e duração

- "Waiting on network requests (such as `fetch()` calls, KV reads, or database queries) does **not** count toward CPU time."
- "Each isolate has some built-in flexibility to allow for cases where your Worker infrequently runs over the configured limit." Quem passa do limite com frequência recebe o erro 1102 ("Worker exceeded resource limits").
- A memória é "per-isolate, not per-invocation". Acima de 128 MB, o runtime deixa terminar as requisições em andamento e cria outro isolate.
- Duração: HTTP não tem limite enquanto o cliente estiver conectado. `waitUntil()` estende a execução por até 30 s. Cron, Queue e alarm de Durable Object vão até 15 min.

### 1.3 Subrequisições e conexões

- "A subrequest is any request a Worker makes using the Fetch API or to Cloudflare services like R2, KV, or D1." No Free são 50 por invocação. "Each subrequest in a redirect chain counts against this limit."
- As chamadas à Cache API (`put`, `match`, `delete`) também são 50 por requisição no Free e "share the same quota as subrequests".
- Só 6 conexões podem estar "waiting for response headers" ao mesmo tempo. A sétima espera numa fila.
- Service bindings ([página](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)): "Each request to a Worker via a Service binding counts toward your subrequest limit", e "A single request has a maximum of 32 Worker invocations".

### 1.4 Cron Triggers

**Documentado** ([Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/), página de 17/10/2026):

- A expressão tem 5 campos, e o menor passo é o minuto (`* * * * *` = "At every minute"). **O intervalo mínimo é 1 min.** O horário é UTC.
- "Workers scheduled by Cron Triggers will run on underutilized machines".
- Mudanças no Cron "may take several minutes (up to 15 minutes) to propagate".
- São 5 Cron Triggers por conta no Free ([Limits](https://developers.cloudflare.com/workers/platform/limits/)). O antigo limite de 3 por Worker caiu em 18/10/2023 ([changelog do Workers](https://developers.cloudflare.com/workers/platform/changelog/)). A [página de alarms](https://developers.cloudflare.com/durable-objects/api/alarms/) (de 21/04/2026) ainda fala em "up to three Cron Triggers", o que está desatualizado.

---

## 2. Workers Static Assets

**Documentado:**

- **Limites:** 20.000 arquivos por versão no Free, 25 MiB por arquivo, 100 regras no `_headers` (2.000 caracteres por linha) e 2.000 redirects estáticos mais 100 dinâmicos no `_redirects` ([Limits](https://developers.cloudflare.com/workers/platform/limits/#static-assets)).
- **Custo:** "Requests to static assets are free and unlimited." O Worker só é cobrado quando o pedido não casa com um arquivo, como numa renderização no servidor ([Billing and Limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/); [Pricing](https://developers.cloudflare.com/workers/platform/pricing/), nota 3). "There is no additional cost for storing Assets."
- **Roteamento:** "if a requested URL matches a file in the static assets directory, that file will be served — without invoking Worker code" ([Static Assets](https://developers.cloudflare.com/workers/static-assets/), página de 12/10/2026).
- **Cache na borda:** os assets são cacheados automaticamente, com *tiered cache*: um data center que não tem o arquivo busca de outro próximo antes de ir ao armazenamento (mesma página).
- **Cabeçalhos padrão** ([Headers](https://developers.cloudflare.com/workers/static-assets/headers/), página de 22/09/2026):
  - `Cache-Control: public, max-age=0, must-revalidate`, quando o pedido não tem `Authorization` nem `Range`. O navegador guarda o arquivo, mas revalida a cada uso.
  - `ETag` com o hash do arquivo, que responde 304 a um `If-None-Match`.
  - `CF-Cache-Status`, que a própria página chama de "probabilistic".
  - O `_headers` pode trocar esses cabeçalhos, mas "are not applied to responses generated by your Worker code".
- **Deploy só sobe o que mudou** ([Direct Upload](https://developers.cloudflare.com/workers/static-assets/direct-upload/), página de 10/08/2026). Um manifesto com o hash de cada arquivo serve para "eliminate the need to upload unchanged files". "Unmodified files will not be returned in the `buckets` field (as they do not need to be re-uploaded) if they have recently been uploaded in previous versions of your Worker."
- **Frequência de deploy e versões guardadas:**
  - Não há limite documentado de deploys por hora ou por dia.
  - Vale o limite geral da API da Cloudflare: "1,200 requests per five minute period per user". Acima disso, "all API calls for the next five minutes will be blocked" com 429 ([API limits](https://developers.cloudflare.com/fundamentals/api/reference/limits/), página de 25/08/2026).
  - O Wrangler lista "the 100 most recent versions and deployments" ([Versions & deployments](https://developers.cloudflare.com/workers/versions-and-deployments/), página de 22/09/2026). "You can only roll back to the 100 most recently published versions" ([Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/), página de 15/07/2026).
  - Só se usarmos o CI da própria Cloudflare (Workers Builds): 3.000 min de build por mês, 1 build por vez, 20 min por build e Deploy Hooks a 10/min por Worker ([Workers Builds limits](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/), página de 29/05/2026).
- **Tempo até valer na borda:** não há número documentado. `wrangler deploy` "creates a new version and immediately deploys it to 100% of traffic". Isso descreve o comportamento, não o tempo de propagação.

**Medido** (18/10/2026): `developers.cloudflare.com/workers/platform/limits/` respondeu `Cache-Control: public, max-age=0, must-revalidate` e `CF-Cache-Status: HIT`, servido de `GIG`. Um arquivo com hash no nome (`/_astro/logo.te5VL_aD.svg`) veio com `public, max-age=604800, immutable`, coerente com uma regra de `_headers`.

**Inferência:** com `max-age=0, must-revalidate` + `ETag`, cada leitura do JSON pelo navegador vira uma requisição condicional à borda, respondida com 200 ou 304. Isso não custa nada nos assets. O que não sei é quanto tempo um arquivo novo leva para valer em todas as bordas depois do deploy. Isso precisa ser medido no ensaio (ticket 15).

---

## 3. Cloudflare Pages

**Documentado** ([Pages limits](https://developers.cloudflare.com/pages/platform/limits/), página de 05/09/2026):

| Item | Free |
|---|---|
| Builds | 1 por vez (contado por conta); **500 por mês**; tempo máximo de 20 min |
| Arquivos por site | 20.000 |
| Tamanho por arquivo | 25 MiB |
| Domínios próprios por projeto | 100 |
| Projetos por conta | 100 |
| `_headers` | 100 regras |
| Deploys de preview ativos | ilimitados |

- **Direct Upload** ([página](https://developers.cloudflare.com/pages/get-started/direct-upload/), de 21/04/2026): pelo Wrangler, 20.000 arquivos e 25 MiB; arrastando os arquivos no painel, 1.000 arquivos. Um projeto criado assim não pode migrar depois para a integração com Git.
- **Os 500 builds valem para Direct Upload?** Não está documentado. A página de limites descreve os builds como "Each time you push new code to your Git repository, Pages will build and deploy your site" e não menciona Direct Upload. **Terceiros:** um [tópico no fórum da Cloudflare](https://community.cloudflare.com/t/cloudflare-pages-limits-free-plan/431961) tem respostas contraditórias, inclusive sobre se o limite é por projeto ou por conta.
- **Cache** ([Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/), página de 10/10/2026):
  - "Every time you deploy an asset to Pages, the asset remains cached on the Cloudflare CDN until your next deployment."
  - Cabeçalhos: `Cache-Control: public, max-age=0, must-revalidate` (quando o arquivo é cacheável), `Etag` e sempre `Access-Control-Allow-Origin: *`.
  - "Assets have a time-to-live (TTL) of one week but can also disappear at any time."
- **Pages Functions** contam na cota do Workers.
- **A Cloudflare orienta usar Workers:** a [página inicial do Pages](https://developers.cloudflare.com/pages/) (de 25/08/2026) abre com "Are you sure you want to use Pages?" e diz que Workers "is Cloudflare's primary platform for building applications. Start new projects with Workers." O [guia de migração](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) (de 12/10/2026) diz que, "Like Pages, requests for static assets on Workers are free".

**Medido:** `hono.pages.dev` respondeu `Cache-Control: public, max-age=0, must-revalidate`.

**Inferência:** para o Apurador, Pages não traz vantagem sobre Workers com assets, e tem a dúvida dos 500 builds. Um redeploy por minuto das 17h às 21h dá 240 deploys numa noite.

---

## 4. Workers KV no Free

**Documentado** ([KV limits](https://developers.cloudflare.com/kv/platform/limits/), página de 08/10/2026; [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/), de 21/04/2026):

| Item | Free |
|---|---|
| Leituras | **100.000/dia** |
| Escritas em chaves diferentes | **1.000/dia** (exclusões e listagens: 1.000/dia cada) |
| Escritas na mesma chave | **1 por segundo** |
| Operações por invocação do Worker | 1.000 |
| Armazenamento | 1 GB |
| Tamanho do valor | **25 MiB** |
| Tamanho da chave | 512 bytes |
| `cacheTtl` mínimo | 30 s (padrão: 60 s) |

- Os limites zeram às 0h UTC. "If you exceed any one of these limits, further operations of that type will fail with an error" ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/#workers-kv)).
- **Propagação** ([How KV works](https://developers.cloudflare.com/kv/concepts/how-kv-works/), de 21/04/2026): as mudanças costumam aparecer na hora no local onde foram feitas, mas "Changes may take up to 60 seconds or more to be visible in other global network locations as their cached versions of the data time out."
- O "Workers KV Instant" está em beta privado.

**Inferência:** uma escrita por minuto numa chave dá 240 escritas na noite e cabe. Mas cada leitura de visitante passaria por um Worker (que conta nas 100 mil requisições) e por uma leitura de KV (outras 100 mil). Os dois limites estouram com poucas centenas de visitantes.

---

## 5. R2 no Free

**Documentado** ([R2 pricing](https://developers.cloudflare.com/r2/pricing/), página de 01/10/2026):

| Item | Free (por mês) |
|---|---|
| Armazenamento | 10 GB-mês (só classe Standard) |
| Operações classe A (`PutObject`, `ListObjects`, `CopyObject`…) | **1 milhão** |
| Operações classe B (`GetObject`, `HeadObject`…) | **10 milhões** |
| Saída (egress) | grátis, inclusive pela API do Worker, pela API S3 e pelo `r2.dev` |

- Escritas simultâneas na mesma chave: "1 per second"; acima disso, 429 ([R2 limits](https://developers.cloudflare.com/r2/platform/limits/), página de 08/06/2026).
- **`r2.dev`** (mesma página): "not intended for production usage and has a variable rate limit applied to it". "If you exceed the rate limit (hundreds of requests/second), requests to your `r2.dev` endpoint will be temporarily throttled and you will receive a `429 Too Many Requests` response." A banda também pode ser limitada.
- O [Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) (página de 25/09/2026) diz que o `r2.dev` serve "for non-production use cases" e que "should only be used for development purposes". Cache, WAF e controle de bots "are not available when using the `r2.dev` development url".
- **Domínio próprio:** "The domain being used must have been added as a zone in the same account as the R2 bucket". Com ele, "allows you to use Cloudflare Cache". Mas "By default, only certain file types are cached", e "The Cloudflare CDN does not cache HTML or JSON by default" ([Default cache behavior](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/), página de 14/09/2026). O JSON precisa de uma Cache Rule que o torne cacheável.
- O Public buckets sugere *partial (CNAME) setup* para domínios fora da Cloudflare. Mas o *full setup* "is the most common and the only one available for Free or Pro plans" ([Full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/), página de 29/07/2026). No Free, o domínio precisa mesmo usar os nameservers da Cloudflare.
- **Ativação:** "You need a Cloudflare account with an R2 subscription", e ela se ativa pelo "checkout flow" no painel ([Get started](https://developers.cloudflare.com/r2/get-started/), página de 21/04/2026). A página não diz se o checkout pede cartão.
- A API REST da Cloudflare para o R2 tem limite de 1.200 requisições a cada 5 min. Para muitas operações, o recomendado é a API S3 ou o binding do Worker.

---

## 6. Durable Objects no Free

**Documentado** ([DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), página de 18/10/2026; [DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/), de 01/06/2026):

- **Disponível no Free, só com armazenamento SQLite.**
- Cotas diárias do Free (zeram às 0h UTC; passou, "further operations of that type will fail with an error"):

| Item | Free |
|---|---|
| Requisições (HTTP, RPC, mensagens WebSocket, alarms) | **100.000/dia** |
| Duração | **13.000 GB-s/dia** |
| Linhas lidas / escritas | 5 milhões / 100.000 por dia |
| Armazenamento | 5 GB no total |

- **CPU:** a tabela de limites dá "30 seconds (default) / configurable to 5 minutes" por requisição. Mas a mesma página diz que "Durable Objects are a special kind of Worker, so Workers Limits apply according to your Workers plan", e o Workers Free tem 10 ms. **A página não deixa claro qual vale no Free.**
- **Subrequisições:** não há número próprio. Valem os limites do Workers (inferência: 50 no Free).
- **Alarms** ([Alarms](https://developers.cloudflare.com/durable-objects/api/alarms/), de 21/04/2026): "Each Durable Object is able to schedule a single alarm at a time". A execução é "at-least-once". Há novas tentativas "using exponential backoff starting at a 2 second delay from the first failure with up to 6 retries allowed". O handler tem 15 min de duração ([Limits](https://developers.cloudflare.com/workers/platform/limits/#duration)), e cada `setAlarm()` conta como uma linha escrita.
- Cada objeto tem "a soft limit of 1,000 requests per second".

**Inferência:** 13.000 GB-s ÷ 0,128 GB ≈ 101.600 s ≈ 28 h de objeto acordado por dia. Um objeto coordenador acordado 5 h cabe. Um DO poderia fazer um laço de alarms a cada 60 s, como alternativa ao Cron, mas herda a dúvida da CPU de 10 ms.

---

## 7. Cache API, Workers Cache e cache de CDN

### 7.1 Cache API (`caches.default`)

**Documentado** ([Cache](https://developers.cloudflare.com/workers/runtime-apis/cache/), página de 14/08/2026):

- "Workers deployed to custom domains have access to functional `cache` operations." Só o editor do painel e os previews do Playground "will have no impact".
- **`workers.dev` funciona hoje.** A frase que excluía "any `*.workers.dev` deployments" saiu da documentação em 05/03/2025, no commit [`935b0366c6`](https://github.com/cloudflare/cloudflare-docs/commit/935b0366c6) ("EW-6697 Remove workers.dev Cache API restriction"), com a nota "This bug was fixed about a year ago, but we forgot to update the docs."
- "the contents of the cache do not replicate outside of the originating data center". `cache.put` "is not compatible with tiered caching", e `cache.delete` só apaga no data center local.
- A [página de limitações do Workers Cache](https://developers.cloudflare.com/workers/cache/limitations/) (de 03/10/2026) resume: a Cache API "does not read through — responses are only cached when your Worker explicitly calls `put()`, and every request still executes your Worker on the way in". Ela também não junta pedidos simultâneos.

**Inferência:** como o Worker roda em toda requisição, a Cache API não tira nada das 100 mil por dia. Ela só poupa CPU e chamadas à origem.

### 7.2 Workers Cache (lançado em julho de 2026)

**Documentado** ([Workers Cache](https://developers.cloudflare.com/workers/cache/), página de 12/10/2026; [post de 06/07/2026](https://blog.cloudflare.com/workers-cache/)):

- "Workers Cache lets Cloudflare return cached HTTP responses from your Worker without executing your Worker code." Ativa-se com `"cache": { "enabled": true }` e responde ao `Cache-Control` que o Worker devolve.
- O post diz que "Workers Cache is available today to every Worker on any plan" e que "The cache works on `workers.dev`".
- O cache tem dois níveis (*tiered*) e junta pedidos simultâneos: uma rajada numa URL fria "still produces one Worker invocation".
- **Custo:** "all requests to your Worker are billed at the standard Workers request rate … whether the response comes from cache or from your Worker". Ligar o cache passa a cobrar também os pedidos a Static Assets ("Caching bills requests that are normally free").
- "No zone configuration for caching applies to Workers Caching", Cache Rules incluídas.

**Inferência:** a documentação não diz como isso conta no limite diário do Free. Se cada acerto conta como requisição, o Workers Cache não resolve as 100 mil por dia no Free, e ainda faria os assets estáticos passarem a contar. No Paid, ele é uma opção limpa (ver seção 9).

### 7.3 Cache de CDN da zona

- **Documentado** ([How the cache works](https://developers.cloudflare.com/workers/reference/how-the-cache-works/), página de 06/07/2026): "Cloudflare Workers run before the cache". As regras de cache da zona valem para o `fetch()` que o Worker faz e para o tráfego enviado a uma origem, não para a resposta que o próprio Worker gera.
- **Inferência:** num domínio próprio, a resposta de um Worker não fica no cache da CDN por meio de Cache Rules. Ela só fica em cache pelo Workers Cache ou pela Cache API. Um JSON servido pelo R2 num domínio próprio, por outro lado, passa pelo cache da zona normalmente.
- O `workers.dev` "is treated as a Free website and is intended for personal or hobby projects that aren't business-critical". A Cloudflare recomenda rota ou domínio próprio em produção ([workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/), página de 22/09/2026).

---

## 8. Domínio próprio no plano gratuito

**Documentado:**

- **Nameservers:** no Free, a única forma é o *full setup* ([Full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/), página de 29/07/2026). A Cloudflare atribui dois nameservers, que não podem ser escolhidos, e é preciso trocá-los no registrador. "Wait up to 24 hours while your registrar updates your nameservers." Se o DNSSEC estiver ativo, é preciso desligá-lo no registrador antes da troca.
- **Cache Rules:** o Free tem **10 regras** ([Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/), página de 14/08/2026), e elas exigem o DNS em modo proxy.
- **TTL de borda:** "Minimum Edge Cache TTL: Free 2 hours" ([Edge and Browser Cache TTL](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/), página de 14/08/2026). Esse mínimo vale para o TTL forçado pela regra. A regra também pode "Use cache-control header if present", ou seja, respeitar a origem ([Cache Rules settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/), página de 15/10/2026).
- **Armadilha do TTL do navegador:** o padrão do Free é 4 h. A Cloudflare sobrescreve o `Cache-Control` da origem quando ele é menor que essa configuração, a menos que ela esteja em "Respect Existing Headers" ([Set Browser Cache TTL](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/set-browser-ttl/), página de 16/04/2026).
- **Purge no Free:** 800 URLs por segundo por arquivo; para host, tag, prefixo ou tudo, 5 pedidos por minuto, com balde de 25 ([Purge cache](https://developers.cloudflare.com/cache/how-to/purge-cache/), página de 29/09/2026).
- **Tiered Cache** com Smart Topology está disponível no Free ([Tiered Cache](https://developers.cloudflare.com/cache/how-to/tiered-cache/), página de 29/09/2026).
- **Registrar:** a Cloudflare remete à [lista de TLDs](https://www.cloudflare.com/tld-policies/). Se um TLD não aparece na busca, "this means that TLD is not available for registration" ([Top Level Domains supported](https://developers.cloudflare.com/registrar/top-level-domains/), página de 15/05/2026).

**Medido** (18/10/2026): baixei a página de políticas de TLD e extraí os 368 nomes listados. Nem `br` nem `com.br` aparecem. **O Cloudflare Registrar não vende `.com.br`.**

**Documentado** ([FAQ do registro.br](https://registro.br/ajuda/gerenciamento-de-conta/alterar-servidores-dns), lida no navegador em 18/10/2026, porque a página é montada por JavaScript):

- Os servidores DNS podem ser alterados pelo contato administrativo ou pelo técnico. Eles "já devem estar previamente configurados para o domínio".
- As publicações de DNS de domínios ocorrem "a cada 5 minutos". Depois de uma alteração, "o domínio passará por um período de transição de 24 horas".

**Inferência:** o caminho é registrar o `.com.br` no registro.br, criar a zona na Cloudflare e apontar os dois nameservers. É preciso reservar até 24 h para a troca valer, e isso tem de acontecer bem antes de 25/10.

---

## 9. Workers Paid

**Documentado** ([Pricing](https://developers.cloudflare.com/workers/platform/pricing/), página de 02/10/2026; [Limits](https://developers.cloudflare.com/workers/platform/limits/), de 12/10/2026):

- "a minimum charge of $5 USD per month for an account". "There are no additional charges for data transfer (egress) or throughput (bandwidth)."

| Item | Free | Paid |
|---|---|---|
| Requisições | 100.000/dia | 10 milhões/mês incluídas + US$ 0,30/milhão; sem limite diário |
| CPU | 10 ms por invocação | 30 milhões de ms-CPU/mês incluídos + US$ 0,02/milhão de ms; HTTP: 30 s padrão, até 5 min; Cron: 30 s (intervalo < 1 h) ou 15 min (≥ 1 h) |
| Subrequisições | 50 | 10.000 (configurável até 10 milhões) |
| Cron Triggers | 5 por conta | 250 por conta |
| Static Assets | 20.000 arquivos | 100.000 arquivos |
| KV | 100 mil leituras e 1 mil escritas por dia | 10 milhões de leituras/mês (+ US$ 0,50/milhão) e 1 milhão de escritas/mês (+ US$ 5/milhão) |
| Durable Objects | 100 mil requisições/dia | 1 milhão/mês + US$ 0,15/milhão |

- A página de preços fala em "Max of 15 minutes of CPU time per Cron Trigger". A página de limites é mais específica: 30 s quando o intervalo é menor que 1 h.
- Os acertos do Workers Cache são cobrados como requisição, mas "do not consume CPU time" (exemplo 5 da página de preços).

---

## 10. IPs de saída do `fetch` de um Worker

**Documentado:**

- **`CF-Worker`** ([Cloudflare HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/), página de 09/10/2026): "`CF-Worker` is added to all Worker subrequests sent via `fetch()`. It is set to the name of the zone which owns the Worker making the subrequest." "The intended purpose of this header is to provide a means for recipients (for example, origins, load balancers, other Workers) to recognize, filter, and route traffic generated by Workers on specific zones."
- **Modelo de segurança** ([Security model](https://developers.cloudflare.com/workers/reference/security-model/)): as requisições de saída passam por um proxy local que "adds a header to every request identifying the Worker from which it originates, so that abusive requests can be traced and blocked". Depois disso, "the request is sent on to the Cloudflare network's HTTP caching layer and then out to the Internet".
- **IPs:** a documentação do Workers não publica os IPs de origem do `fetch`. As faixas em [cloudflare.com/ips](https://www.cloudflare.com/ips/) "are shared by all proxied hostnames" ([Cloudflare IP addresses](https://developers.cloudflare.com/fundamentals/concepts/cloudflare-ip-addresses/), página de 21/04/2026). IPs de saída exclusivos ("Dedicated CDN Egress IPs") são para "Enterprise customers" ([Smart Shield](https://developers.cloudflare.com/smart-shield/configuration/dedicated-egress-ips/), página de 16/04/2026). Com eles, "`fetch()` requests that access services on your origin will use Dedicated CDN Egress IP addresses" ([página](https://developers.cloudflare.com/smart-shield/configuration/dedicated-egress-ips/other-products/), de 07/05/2026).
- **Sockets TCP** (`connect()`): "TCP Workers outbound connections are sourced from a prefix that is not part of [the] list of IP ranges" ([TCP sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/)).
- O `fetch` só aceita nomes de host, não IPs ([Known issues](https://developers.cloudflare.com/workers/platform/known-issues/), página de 28/09/2026).
- Para comparar: os runners Linux e Windows do GitHub Actions "are hosted in Azure and subsequently have the same IP address ranges as the Azure datacenters" ([GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners#ip-addresses), commit de 16/07/2026).

**Inferência:** a Akamai do TSE recebe pedidos de IPs da Cloudflare (e do Azure, no caso do Actions), todos de nuvem, e no caso do Worker com um cabeçalho que se identifica sozinho. Bloquear isso é trivial para o destino. Só o teste do ticket 17 responde se a Akamai bloqueia. Um plano B com `connect()` sairia de outro prefixo, ainda da Cloudflare, e exigiria escrever o HTTP à mão. Não testei.

---

## 11. GitHub Actions: cotas e limites

**Documentado:**

- **Minutos** ([GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), commit de 09/07/2026): "GitHub Actions usage is **free** for **self-hosted runners** and for **public repositories** that use standard GitHub-hosted runners."
  - Em repositório privado, o GitHub Free tem **2.000 min por mês**, 500 MB de artefatos e 10 GB de cache por repositório.
  - "If your account does not have a valid payment method on file, usage is blocked once you use up your quota."
  - Na [referência de runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners): "Use of the standard GitHub-hosted runners is free and unlimited on public repositories."
- **Tempos** ([Actions limits](https://docs.github.com/en/actions/reference/limits), commit de 17/09/2026):
  - **Job: 6 h** nos runners do GitHub ("If a job reaches this limit, the job is terminated and fails") e 5 dias em runner próprio.
  - **Workflow: 35 dias**, contando espera e aprovação.
  - O runner de 1 CPU (`ubuntu-slim`) tem job de no máximo **15 min** ([referência de runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners#single-cpu-runners)).
- **Concorrência** (mesma página): no Free, **20 jobs simultâneos** (5 em macOS). Os limites de API para quem usa Actions incluem 1.000 requisições por hora por repositório com o `GITHUB_TOKEN`.
- **`schedule`** ([Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), commit de 21/09/2026):
  - "The shortest interval you can run scheduled workflows is once every 5 minutes."
  - "The `schedule` event can be delayed during periods of high loads of GitHub Actions workflow runs. High load times include the start of every hour. If the load is sufficiently high enough, some queued jobs may be dropped. To decrease the chance of delay, schedule your workflow to run at a different time of the hour."
  - O agendamento só roda no branch padrão. Em repositório público, ele é desativado depois de 60 dias sem atividade. Aceita fuso IANA (`timezone: "America/Sao_Paulo"`).

**Inferência:** um coletor no Actions seria um único job longo, iniciado por volta das 16h30 de Brasília num minuto quebrado. Teria `workflow_dispatch` como reserva e faria um laço de 60 s por dentro. O limite de 6 h cobre 16h30–22h30. Em repositório público, não gasta cota; em privado, 5 h de job usam 300 dos 2.000 min do mês.

---

## 12. GitHub Actions: termos de uso

**Documentado** ([GitHub Terms for Additional Products and Features](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#actions), "Version Effective Date: August 27, 2026"; o texto está sob CC0 no repositório `github/site-policy`). Seção "Actions", texto exato:

> Additionally, regardless of whether an Action is using self-hosted runners, Actions should not be used for:
>
> * Cryptomining;
> * Disrupting, gaining, or attempting to gain unauthorized access to, any service, device, data, account, or network (other than those authorized by the GitHub Bug Bounty program);
> * The provision of a stand-alone or integrated application or service offering the Actions product or service, or any elements of the Actions product or service, for commercial purposes;
> * Any activity that places a burden on our servers, where that burden is disproportionate to the benefits provided to users (for example, don't use Actions as a content delivery network or as part of a serverless application, but a low benefit Action could be ok if it's also low burden); or
> * If using GitHub-hosted runners, any other activity unrelated to the production, testing, deployment, or publication of the software project associated with the repository where GitHub Actions are used.

> In order to prevent violations of these limitations and abuse of GitHub Actions, GitHub may monitor your use of GitHub Actions. Misuse of GitHub Actions may result in termination of jobs, restrictions in your ability to use GitHub Actions, disabling of repositories created to run Actions in a way that violates these Terms, or in some cases, suspension or termination of your GitHub account.

> *Use for Development and Testing*
>
> You may only access and use GitHub Actions to develop and test your application(s).

As [Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies) (seção 4) também vetam "using our servers for any form of excessive automated bulk activity, to place undue burden on our servers through automated means".

**Inferência (não é parecer jurídico):**

- Um job de 4–5 h que consulta o TSE a cada minuto e publica o JSON que o site público lê não é desenvolvimento nem teste. Ele é a parte de produção de uma aplicação, o que é justamente o exemplo "as part of a serverless application".
- Pode-se argumentar que publicar dados do projeto é "publication of the software project". Mas o argumento é fraco para um laço de horas que alimenta visitantes ao vivo.
- A carga nos servidores do GitHub seria pequena (um runner, sem servir os visitantes), o que ajuda no critério "low burden", mas não resolve a cláusula "develop and test".
- O risco concreto, documentado, é o job ser encerrado no meio da noite ou o repositório ser desativado. Por isso o Actions não deveria ser o coletor principal. No máximo, serve de reserva.
- Um runner próprio escapa só da última alínea ("If using GitHub-hosted runners"). Continuam valendo as quatro primeiras e a frase "develop and test".
- **Terceiros:** o GitHub Next mantinha o [Flat Data](https://github.com/githubocto/flat), uma Action para baixar dados periodicamente para o repositório. O projeto está arquivado. Isso mostra tolerância a coletas pequenas, mas não é uma autorização.

---

## 13. GitHub Pages (só para comparar)

**Documentado** ([GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), commit de 24/07/2026):

- O site publicado pode ter até 1 GB. O deploy expira depois de 10 min.
- "GitHub Pages sites have a *soft* bandwidth limit of 100 GB per month."
- O limite de 10 builds por hora também é "soft" e "does not apply if you build and publish your site with a custom GitHub Actions workflow".
- Pode haver limites de taxa, respondidos com 429. Quem exceder pode receber um e-mail sugerindo "putting a third-party content distribution network (CDN) in front of your site".
- Pelos termos, o Pages é "primarily as a showcase for personal and organizational projects".
- A documentação não fala em `max-age`.

**Medido** (`curl -D - https://pages.github.com/`, 18/10/2026): `Cache-Control: max-age=600`, `Via: 1.1 varnish`, `X-Served-By: cache-for…` (CDN da Fastly, ponto em Fortaleza).

**Inferência:** com `max-age=600`, um JSON pode ficar até 10 min velho no navegador e nos caches intermediários. Com ~10 mil visitantes, a banda de uma só noite já chega aos 100 GB do mês (ver seção 14).

---

## 14. Consequências para o Apurador

### 14.1 Contas

Faço um teto: N visitantes simultâneos durante as 4 h inteiras. A média real será menor.

- Lendo a cada 30 s: 4 × 3.600 ÷ 30 = **480 leituras por visitante**. Lendo a cada 60 s: 240.
- O "JSON de 20 KB" é um valor intermediário entre 5 e 100 KB transferidos.

| Visitantes | Requisições em 4 h (30 s) | Requisições em 4 h (60 s) | Pico (30 s) | Banda em 4 h, 20 KB, 30 s | Idem, 100 KB |
|---|---|---|---|---|---|
| 1.000 | 480 mil | 240 mil | 33/s | 9,6 GB | 48 GB |
| 10.000 | 4,8 milhões | 2,4 milhões | 333/s | 96 GB | 480 GB |
| 100.000 | 48 milhões | 24 milhões | 3.333/s | 960 GB | 4,8 TB |

As respostas 304 (ETag igual) gastam requisição, mas quase nenhuma banda.

### 14.2 Caminho de leitura dos visitantes

| Opção | Limite que manda (documentado) | 1 mil | 10 mil | 100 mil |
|---|---|---|---|---|
| Worker que gera o JSON (Free) | 100 mil req/dia | **não** (480 mil) | não | não |
| Worker + KV (Free) | 100 mil req + 100 mil leituras/dia | não | não | não |
| Worker + Cache API (Free) | o Worker roda em todo pedido → 100 mil/dia | não | não | não |
| Workers Cache (Free) | acerto conta como requisição (inferência) | não | não | não |
| **Static Assets, redeploy a cada 1 min** | "free and unlimited" | sim | sim | sim (inferência: não há limite de banda documentado) |
| **R2 + domínio próprio + Cache Rule** (`Cache-Control: max-age=30`, "respect origin") | só as falhas de cache viram classe B (10 milhões/mês) | sim | sim | sim (inferência) |
| R2 pelo `r2.dev` | "hundreds of requests/second", fora de produção | arriscado (33/s) | não (333/s) | não |
| Workers Paid + Workers Cache | 10 milhões/mês incluídos, US$ 0,30/milhão | US$ 5 | US$ 5 | ≈ US$ 16,40 (48 milhões: 5 + 38 × 0,30) |
| GitHub Pages | `max-age=600` (medido); 100 GB/mês "soft" | dados até 10 min velhos | idem, e ~96 GB | não |

Inferências sobre as duas linhas viáveis:

- **Static Assets:** são 240 deploys entre 17h e 21h. Cada deploy sobe só o JSON (e os arquivos por lugar que mudaram) e faz poucas chamadas de API, bem abaixo das 1.200 a cada 5 min. O que falta medir: quanto tempo cada deploy leva e quanto tempo o arquivo novo leva para valer na borda. Também convém lembrar que o rollback alcança só as 100 versões mais recentes, cerca de 100 min de noite.
- **R2 com domínio:** suponha ~300 data centers, cada um errando o cache uma vez a cada 30 s. Seriam 300 × 480 ≈ 144 mil operações classe B na noite, ~1,4% da cota do mês. O Tiered Cache reduz isso. As escritas seriam 240 `PutObject` (classe A). Mas exige registrar o domínio no registro.br, trocar os nameservers (até 24 h), ativar a assinatura do R2 e configurar "Respect Existing Headers" no TTL do navegador.
- As ~5.800 páginas estáticas e os ~2 MB de histórico cabem nos 20.000 arquivos do Free. Se cada lugar ganhar também um JSON ao vivo como asset, são ~11.600 arquivos, mais o JS e o CSS. Ainda cabe, mas com menos folga.

### 14.3 Coletor

| Onde roda | Cabe? | Por quê |
|---|---|---|
| Cron no Workers Free | **não** (inferência) | 50 subrequisições por execução: 30 índices + 20 municípios por minuto. Uma varredura completa levaria 5.757 ÷ 20 ≈ 288 min. Os 10 ms de CPU por execução provavelmente não bastam nem para ler os índices: só o `-ab.json` de SP tem 45 KB com gzip (ticket 01). Não medi. Dá para distribuir o trabalho por Durable Objects (até 1.000 chamadas internas, 32 invocações por service binding), mas cada objeto herda a dúvida dos 10 ms. |
| Cron no Workers Paid (US$ 5) | sim, no papel (inferência) | 10.000 subrequisições e 30 s de CPU por Cron, 15 min de duração. Com 6 conexões esperando resposta ao mesmo tempo e ~100–200 ms de latência, o teto fica em ~30–60 req/s, o que basta para os 20–30 req/s previstos. Custa 1.440 requisições por dia. |
| GitHub Actions (repositório público) | cabe nos limites, **não nos termos** | O job de 6 h cobre a noite e é grátis. Mas os termos citados na seção 12 vetam esse uso, e o `schedule` pode atrasar ou ser descartado. |
| Máquina nossa (PC ou VPS) | sim (inferência) | Não tem limite de plataforma e provavelmente usa um IP menos "de nuvem". Em troca, é um ponto único de falha e precisa de credencial para publicar no R2 ou fazer deploy. |

Em todas as opções de nuvem, o IP é de provedor (Cloudflare ou Azure). Só o teste do ticket 17 diz se a Akamai do TSE aceita.

### 14.4 Fato e inferência

- **Fato documentado:** 100 mil requisições/dia no Workers Free, com reset à 0h UTC = 21h de Brasília; Static Assets grátis e ilimitados; 50 subrequisições e 10 ms de CPU no Free; Cron de 1 min; R2 com 10 milhões de leituras/mês e saída grátis; `r2.dev` fora de produção; `.br` fora do Cloudflare Registrar (medido); Actions com job de 6 h e termos que vetam "serverless application".
- **Inferência:**
  - Um caminho de leitura gratuito para 100 mil visitantes precisa servir o JSON como arquivo (assets ou R2 com cache), nunca como resposta de Worker.
  - O coletor precisa de Workers Paid, de uma máquina nossa ou, aceitando o risco dos termos, do Actions.
  - Se o orçamento permitir US$ 5, o Workers Paid simplifica as duas pontas: coletor em Cron e leitura via Workers Cache.

---

## 15. O que ficou sem resposta

- **Se o Direct Upload do Pages conta nos 500 builds por mês.** A documentação não diz.
- **Quanto tempo um `wrangler deploy` leva para o asset novo valer em todas as bordas,** e quanto dura cada deploy de ~6 mil arquivos com um só alterado. Precisa ser medido.
- **Se os acertos do Workers Cache contam nas 100 mil requisições do Free.** A documentação diz que são cobrados "at the standard Workers request rate", mas não fala do limite diário.
- **A CPU de um Durable Object no Free** (10 ms ou 30 s). A página de limites é ambígua.
- **A CPU real de ler os JSONs do TSE num Worker,** para saber se 10 ms bastam para alguma parte do trabalho.
- **Se a Akamai do TSE bloqueia IPs da Cloudflare ou do Azure,** ou o cabeçalho `CF-Worker` (ticket 17).
- **Se o checkout do R2 pede cartão** para liberar a cota gratuita.
- **Se 240 versões de um Worker numa noite** esbarram em algum limite não documentado.

## Fontes

Cloudflare (developers.cloudflare.com, lidas em 18/10/2026; data "Last updated" entre parênteses):

- Workers: [Limits](https://developers.cloudflare.com/workers/platform/limits/) (12/10/2026), [Pricing](https://developers.cloudflare.com/workers/platform/pricing/) (02/10/2026), [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) (17/10/2026), [Errors](https://developers.cloudflare.com/workers/observability/errors/) (15/10/2026), [workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/) (22/09/2026), [Service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/), [Security model](https://developers.cloudflare.com/workers/reference/security-model/), [TCP sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/), [Known issues](https://developers.cloudflare.com/workers/platform/known-issues/) (28/09/2026), [Changelog](https://developers.cloudflare.com/workers/platform/changelog/) (entrada de 18/10/2023).
- Static Assets: [Static Assets](https://developers.cloudflare.com/workers/static-assets/) (12/10/2026), [Billing and Limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) (23/04/2026), [Headers](https://developers.cloudflare.com/workers/static-assets/headers/) (22/09/2026), [Direct Upload](https://developers.cloudflare.com/workers/static-assets/direct-upload/) (10/08/2026), [Migrate from Pages](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) (12/10/2026).
- Versões: [Versions & deployments](https://developers.cloudflare.com/workers/versions-and-deployments/) (22/09/2026), [Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/) (15/07/2026), [Workers Builds limits](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/) (29/05/2026), [API limits](https://developers.cloudflare.com/fundamentals/api/reference/limits/) (25/08/2026).
- Cache: [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) (14/08/2026), [How the cache works](https://developers.cloudflare.com/workers/reference/how-the-cache-works/) (06/07/2026), [Workers Cache](https://developers.cloudflare.com/workers/cache/) (12/10/2026), [Workers Cache limitations](https://developers.cloudflare.com/workers/cache/limitations/) (03/10/2026), [Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/) (14/08/2026), [Cache Rules settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/) (15/10/2026), [Default cache behavior](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/) (14/09/2026), [Edge and Browser Cache TTL](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/) (14/08/2026), [Set Browser Cache TTL](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/set-browser-ttl/) (16/04/2026), [Tiered Cache](https://developers.cloudflare.com/cache/how-to/tiered-cache/) (29/09/2026), [Purge cache](https://developers.cloudflare.com/cache/how-to/purge-cache/) (29/09/2026).
- Pages: [Limits](https://developers.cloudflare.com/pages/platform/limits/) (05/09/2026), [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) (21/04/2026), [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/) (10/10/2026), [Overview](https://developers.cloudflare.com/pages/) (25/08/2026).
- Armazenamento: [KV limits](https://developers.cloudflare.com/kv/platform/limits/) (08/10/2026), [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/) (21/04/2026), [How KV works](https://developers.cloudflare.com/kv/concepts/how-kv-works/) (21/04/2026), [R2 pricing](https://developers.cloudflare.com/r2/pricing/) (01/10/2026), [R2 limits](https://developers.cloudflare.com/r2/platform/limits/) (08/06/2026), [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) (25/09/2026), [R2 get started](https://developers.cloudflare.com/r2/get-started/) (21/04/2026), [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) (18/10/2026), [DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/) (01/06/2026), [DO alarms](https://developers.cloudflare.com/durable-objects/api/alarms/) (21/04/2026).
- Rede e domínio: [HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/) (09/10/2026), [Cloudflare IP addresses](https://developers.cloudflare.com/fundamentals/concepts/cloudflare-ip-addresses/) (21/04/2026), [Dedicated CDN Egress IPs](https://developers.cloudflare.com/smart-shield/configuration/dedicated-egress-ips/) (16/04/2026) e [uso com outros produtos](https://developers.cloudflare.com/smart-shield/configuration/dedicated-egress-ips/other-products/) (07/05/2026), [Full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) (29/07/2026), [Registrar TLDs](https://developers.cloudflare.com/registrar/top-level-domains/) (15/05/2026), [TLD policies](https://www.cloudflare.com/tld-policies/) (sem data; medido em 18/10/2026).
- Blog da Cloudflare: [Your Worker can now have its own cache in front of it](https://blog.cloudflare.com/workers-cache/) (06/07/2026).
- Histórico da documentação: commit [`935b0366c6`](https://github.com/cloudflare/cloudflare-docs/commit/935b0366c6) em `cloudflare/cloudflare-docs` (05/03/2025).

GitHub (docs.github.com, lidas em 18/10/2026; data do último commit do arquivo em `github/docs`):

- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) (09/07/2026), [Actions limits](https://docs.github.com/en/actions/reference/limits) (17/09/2026), [Events that trigger workflows: schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) (21/09/2026), [GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) (16/07/2026), [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) (24/07/2026).
- [GitHub Terms for Additional Products and Features](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features) (Version Effective Date: 27/08/2026), [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies).

Outras:

- [registro.br, FAQ de gerenciamento de conta](https://registro.br/ajuda/gerenciamento-de-conta/alterar-servidores-dns) (lida no navegador em 18/10/2026).
- Terceiros: [fórum da Cloudflare sobre limites do Pages](https://community.cloudflare.com/t/cloudflare-pages-limits-free-plan/431961); [githubocto/flat](https://github.com/githubocto/flat) (arquivado).
- Medições: `curl -D -` em `developers.cloudflare.com`, `hono.pages.dev` e `pages.github.com` (18/10/2026).
- Interno: [ticket 01, API ao vivo do TSE](01-api-ao-vivo-tse.md) (tamanhos dos arquivos e limite de 100 req/s); [ticket 04](04-restricoes-legais.md) (fuso horário).
