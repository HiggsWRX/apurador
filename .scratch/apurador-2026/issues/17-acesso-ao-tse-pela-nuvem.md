# Acesso ao TSE a partir da nuvem

Type: task
Status: open
Blocked by: 07
Map: [Apurador 2026](../map.md)

## Question

Um coletor nosso rodando na nuvem consegue baixar os arquivos de `resultados.tse.jus.br`, ou o CDN da Akamai bloqueia IPs de provedores de nuvem?

[API ao vivo do TSE](01-api-ao-vivo-tse.md) recomenda um coletor próprio que consulta o TSE e publica um JSON agregado, mas não testou se a Akamai bloqueia IPs de nuvem. Um projeto paralelo já se prepara para receber 403.

Trabalho (AFK, depois das contas):

- Publicar um Worker mínimo na Cloudflare que faz `GET` com timeout em `https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json` e em um arquivo de município, e devolve o status, os cabeçalhos e o tamanho. Rodar algumas vezes, inclusive de forma agendada.
- Repetir a partir de um GitHub Actions como segundo provedor.
- Registrar aqui o que funcionou, de onde, e com que latência, sem segredos.

Resolvido quando soubermos de quais provedores o coletor consegue acessar o TSE.
