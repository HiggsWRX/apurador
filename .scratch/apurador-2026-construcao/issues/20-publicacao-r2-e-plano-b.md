# 20: Publicação no R2 e plano B

Status: ready-for-agent
Blocked by: 12, 14
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O coletor publica por uma única interface com quatro destinos: o R2 de produção, o R2 do ensaio, a republicação do Worker do plano B e a pasta local.

- **Caminho principal**: JSONs comprimidos no R2, servidos em `ao-vivo.apurador.app` com cache da CDN.
- **Plano B**: um Worker só com os JSONs ao vivo como static assets, republicado a cada minuto, que funciona em `*.workers.dev`.

A página conhece os dois endereços e passa ao outro se o principal falhar.

Precisa do dono: o domínio, a chave de escrita do R2 no `.env` do coletor e, se não der por API, os ajustes de cache no painel da Cloudflare.

Decisões: [Arquitetura e tecnologia](../../apurador-2026/issues/08-arquitetura-e-tecnologia.md) (decisão 15), [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md) (decisão 14), [Volume de gravações na noite](../../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md) (decisão 6) e a [pesquisa de limites](../../apurador-2026/research/08-limites-cloudflare-e-github.md).

## Critérios de aceite

- [ ] **Interface**: o coletor publica por uma só interface, com os quatro destinos trocáveis por configuração. O destino do ensaio nunca é o de produção.
- [ ] **Gravação no R2**: os JSONs vão com `Content-Encoding: gzip`, ETag e `Cache-Control`, para a CDN guardar por 15 s.
- [ ] **Configuração de `ao-vivo.apurador.app`**: Cache Rule que respeita o `Cache-Control` da origem, Tiered Cache e TTL do navegador em "Respect Existing Headers". O que não der para configurar por API vira um passo descrito ao dono.
- [ ] **Conferência do gzip**: um objeto gravado com gzip chega certo ao navegador pela borda, com ETag e 304. Se não chegar, uma opção de configuração faz o coletor gravar sem compressão.
- [ ] **Plano B**: o Worker é republicado a cada minuto com os ~5.820 arquivos ao vivo, dentro dos 20.000 por versão. O coletor só publica nele por comando do dono e fica nele até o fim da noite.
- [ ] **Leitura da página**: ela lê o endereço principal. Se ele der erro, ou se o arquivo de rodada dele tiver mais de 2 min, tenta o outro e fica com a rodada mais nova.
- [ ] **Sem domínio**: só existe o caminho do Worker, e a página funciona com ele.
- [ ] **Credenciais**: as chaves de escrita ficam no `.env` local do coletor, nunca no Git.
- [ ] **Contador de gravações**: o coletor conta cada gravação nos dois buckets e guarda o contador no estado, para o [ticket 23](23-protecoes-e-fim-da-noite.md).

## Comments

- 19/10/2026, do [ticket 12](12-coletor-minimo-e-replay.md): `Destino { gravar(caminho, bytes) }` (`packages/coletor/src/destino.ts`) é a interface única, e hoje só existe `pastaLocal`. O coletor já grava só quando os bytes mudam (um hash por caminho) e conta `gravacoes` no registro de cada rodada.
- 19/10/2026, do [ticket 14](14-bloco-ao-vivo.md):
  - A página lê `<base>rodada.json` e `<base>lugares/<id>.json`. A `base` vem de `PUBLIC_AO_VIVO` no build, com a barra no fim; sem ela, a ilha não lê nada.
  - Ela pede com o `If-None-Match` posto à mão e `cache: "no-store"`, para o 304 chegar ao código, e lê o cabeçalho `Date` de cada resposta: é ele que dá a interrupção.
  - Lidas de `apurador.app` em `ao-vivo.apurador.app`, as duas coisas pedem CORS no R2:
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
