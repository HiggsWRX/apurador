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
