# Coletor no computador do dono, visitantes só na CDN

Na noite de 25/10/2026, o coletor que lê o TSE, calcula a projeção e publica os JSONs ao vivo roda no computador do dono do projeto (Windows 11, IP residencial), e não na nuvem. Os visitantes nunca chegam a esse computador: páginas e JSONs saem da CDN da Cloudflare (static assets e R2 com cache curto). O computador só faz conexões de saída, sem porta aberta. Escolhemos assim porque, nos planos gratuitos, nenhuma nuvem comporta o coletor, e um IP residencial afasta o risco de a Akamai do TSE bloquear IPs de nuvem.

## Considered Options

- **Cron no Workers Free**: 50 subrequisições e 10 ms de CPU por execução não cobrem uma rodada (cerca de 30 índices mais os municípios que mudaram).
- **Workers Paid (US$ 5/mês)**: caberia, mas o IP seria de nuvem, e o computador do dono já resolve sem custo.
- **GitHub Actions**: os termos vetam usar Actions "as part of a serverless application" e para algo além de desenvolver e testar; o GitHub pode encerrar o job no meio da noite.
- **Servir os visitantes do computador** (direto ou por Cloudflare Tunnel): mesmo com 800 Mbps, expõe o IP da casa a ataques, viola termos comuns de operadoras residenciais e faz o site cair junto com o computador. Com o R2, o último estado continua no ar.

## Consequences

- Não há coletor reserva na nuvem. A proteção é nobreak, roteador de celular como reserva de internet, estado em disco com reinício automático e o aviso de "atualização interrompida" no site.
- O coletor é Node puro, sem depender do runtime dos Workers; voltar para a nuvem exigiria adaptá-lo e testar o acesso ao TSE a partir dela.

Detalhes: `.scratch/apurador-2026/issues/08-arquitetura-e-tecnologia.md` e `.scratch/apurador-2026/research/08-limites-cloudflare-e-github.md`.
