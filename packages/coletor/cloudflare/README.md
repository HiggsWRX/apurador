# A conta da Cloudflare para os arquivos ao vivo

O caminho principal dos arquivos ao vivo é o bucket `apurador-ao-vivo` do R2, servido em `ao-vivo.apurador.org` com o cache da CDN. O plano B é o Worker `apurador-plano-b`, em `apurador-plano-b.hicampos93.workers.dev` (Arquitetura e tecnologia, decisão 15; Operação na noite, decisão 14). O ensaio tem os dele, nunca os de produção (`packages/coletor/src/ambientes.ts`), e quem os cria é o ticket 30.

## Os arquivos

- `cors-ao-vivo.json`: o CORS do bucket. A página em `https://apurador.org` lê com `GET` e o `If-None-Match` posto à mão, então o pedido tem preflight. O R2 responde ao `OPTIONS` pelas regras do bucket, sem `OPTIONS` na lista de métodos. `Date` e `ETag` ficam expostos, porque a página lê os dois. O preflight vale 24 h, e o Chrome corta em 2 h.
- `plano-b.jsonc` e `plano-b-ensaio.jsonc`: os Workers do plano B, só com os static assets da pasta que o coletor grava (`.cache/coletor/plano-b/` e `.cache/coletor/plano-b-ensaio/`). O coletor os republica com `wrangler deploy --config`, pelo login do wrangler.

## O que configurar, na ordem

Os passos 1, 2 e 6 são comandos, rodados na raiz do repositório com o login do wrangler. O login (OAuth) escreve no R2 e nos Workers, mas na zona só lê. Por isso os passos 3 e 4 são no painel. O passo 5 é sempre do dono.

1. **Domínio próprio do bucket**: liga `ao-vivo.apurador.org` ao bucket. A Cloudflare cria o registro DNS na zona e o certificado. O ID da zona fica no painel, em apurador.org → Overview → API → Zone ID.

   ```bash
   npx wrangler r2 bucket domain add apurador-ao-vivo --domain ao-vivo.apurador.org --zone-id <ID da zona apurador.org> --min-tls 1.2
   ```

2. **CORS do bucket**:

   ```bash
   npx wrangler r2 bucket cors set apurador-ao-vivo --file packages/coletor/cloudflare/cors-ao-vivo.json
   ```

3. **Cache da zona `apurador.org`** (painel → apurador.org → Caching):
   - **Cache Rules** → "Create rule", com o nome "ao-vivo: respeitar a origem":
     - "Custom filter expression": `Hostname` `equals` `ao-vivo.apurador.org`;
     - "Cache eligibility": "Eligible for cache";
     - "Edge TTL": "Use cache-control header if present, use default Cloudflare caching behavior if not". Os arquivos do coletor vão com `max-age=15`. Um 404 fica na borda pelo padrão da Cloudflare (3 min), e assim um arquivo que falta não vira uma leitura no R2 a cada visitante;
     - "Browser TTL": "Respect origin TTL".
   - **Tiered Cache** → "Smart Tiered Caching Topology" ligado.
   - **Configuration** → "Browser Cache TTL": "Respect Existing Headers". O padrão do plano gratuito, 4 h, trocaria o `max-age=15` da origem.

4. **CORS em toda resposta** (painel → apurador.org → Rules → Transform Rules → "Modify Response Header" → "Create rule", com o nome "ao-vivo: CORS"):
   - expressão `Hostname` `equals` `ao-vivo.apurador.org`;
   - "Set static" `Access-Control-Allow-Origin` = `https://apurador.org`;
   - "Set static" `Access-Control-Expose-Headers` = `Date, ETag`.

   O R2 só põe o CORS na resposta quando o pedido traz `Origin`, e a borda guarda esses cabeçalhos junto com a cópia. Sem esta regra, uma cópia feita por um leitor sem `Origin`, como a sentinela, o painel do coletor ou um `curl`, chegaria ao navegador sem o CORS por até 15 s. A conferência (passo 6) pega isso no item "cors".

5. **Chave de escrita** (dono): painel → R2 → "Manage API tokens" → "Create API token":
   - "Object Read & Write";
   - "Apply to specific buckets only": `apurador-ao-vivo`.

   O painel mostra o "Access Key ID" e o "Secret Access Key" uma vez só. Copie `packages/coletor/.env.exemplo` para `packages/coletor/.env`, no checkout em que o coletor roda, e cole os dois valores ali. O `.env` é ignorado pelo Git. A chave do ensaio é outra, só no bucket do ensaio (ticket 30).

6. **Conferência da entrega**:

   ```bash
   npm run conferir-entrega -- --plano-b
   ```

   O comando grava um objeto novo em `conferencia/`, com gzip, e o lê por `ao-vivo.apurador.org` como a noite o lê. Ele confere:
   - o JSON igual ao gravado, com ETag e o 304;
   - os 15 s de cache no navegador e a cópia da borda (`CF-Cache-Status: HIT`);
   - o CORS e o preflight.

   Com `--plano-b`, o comando também faz o primeiro deploy do Worker do plano B só com esse objeto e o `_headers`, e confere o Worker. Sem `rodada.json` no Worker, a página continua no principal.

   Se o corpo, a ETag ou o 304 falharem com gzip e passarem com `--sem-gzip`, o coletor da noite roda com `--sem-gzip`.

Se o CORS mudar depois de a borda já ter cópias, apague o cache do host: painel → Caching → Configuration → "Purge Cache" → "Custom Purge" → "Hostname" `ao-vivo.apurador.org`.

## Na noite

- O coletor: `npm run coletor -- --destino producao`. Ele grava no R2 com gzip e conta cada gravação em `.cache/coletor/gravacoes.json`.
- O plano B: `npm run noite -- plano-b`. Na rodada seguinte, o coletor passa ao Worker, regrava todos os arquivos na pasta dele e o republica a cada minuto, até o fim da noite.
- O build do site leva `PUBLIC_AO_VIVO=https://ao-vivo.apurador.org/` e `PUBLIC_AO_VIVO_PLANO_B=https://apurador-plano-b.hicampos93.workers.dev/`. Sem domínio, leva só o segundo.
