# 30: Ambiente de ensaio e scripts de conferência

Status: ready-for-agent
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

- [ ] **Ambiente**: o Worker, o subdomínio e o bucket do ensaio são separados dos de produção, e o coletor tem o destino "R2 do ensaio" na interface de publicação.
- [ ] **Tarja**: todas as páginas do ensaio têm `noindex` e a tarja "Ensaio: reprodução da apuração de 30/10/2022. Não é resultado de 2026."
- [ ] **Antes das 17h no ensaio**: o painel usa o agregado das pesquisas de 2022.
- [ ] **Retirada de pesquisa**: dá para retirar uma pesquisa de 2022 por deploy, e o agregado recalculado aparece em até 10 min, sem tocar no coletor.
- [ ] **Placar idêntico**: compara o placar publicado com o arquivo do TSE falso, em todas as rodadas e lugares. A meta é zero divergências.
- [ ] **Atraso visto de fora**: o script lê o endereço público como a página lê (a cada 30 s, com `If-None-Match`) e dá a mediana e o p95. As metas são 35 s e 70 s no caminho R2 e 75 s e 150 s no plano B.
- [ ] **Textos preditivos**: com a chave desligada, nenhum preditivo em nenhum JSON público de nenhuma rodada.
- [ ] **Narração factual**: igual à do replay automático da mesma noite, salvo o que as quedas provocadas explicam.
- [ ] **Cache**: no caminho R2, pelo menos 90% das respostas dos JSONs ao vivo vêm da borda (`HIT` ou `REVALIDATED`).
- [ ] **Medições sem meta bloqueante**:
  - o tempo de cada rodada (meta: menos de 20 s no pico a 3x);
  - as gravações por rodada e por hora;
  - o volume da noite;
  - o contador do coletor contra o painel da Cloudflare (até 1% de diferença);
  - os dados por visitante na página do Brasil das 17h às 20h (até 10 MB).
- [ ] **Registro de cada ensaio**: traz os números contra os critérios, as falhas com hora e o veredito de cada bloco, para o dono assinar.

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
