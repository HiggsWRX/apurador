# Arquitetura e tecnologia

Type: grilling
Status: resolved
Blocked by: 01, 03, 05
Map: [Apurador 2026](../map.md)

## Question

Onde roda cada parte do site e com que tecnologia, dentro do plano gratuito da Cloudflare e aguentando picos na noite de 25/10?

- **Caminho ao vivo**: o navegador de cada visitante lê o TSE direto, ou um serviço nosso (ex.: Worker com agendamento) coleta do TSE, calcula a projeção e publica um arquivo único que a CDN entrega a todos? Com que frequência? O que acontece se o TSE ficar lento ou bloquear?
- **Cálculo do modelo**: no servidor, no navegador ou nos dois? O simulador "e se" exige ao menos parte do modelo rodando no navegador.
- **Dados históricos**: formato e tamanho dos arquivos estáticos por lugar, e como são gerados (pipeline offline). Ver [Dados históricos por município e malhas](03-dados-historicos-e-malhas.md). Decidir entre simplificar a malha do IBGE 2024/2025 (1 a 3 horas de trabalho, inclui Boa Esperança do Norte) e usar a malha de 2022 pronta da API (sem esse município). Como congelar os dados derivados, se o TSE regera os arquivos todo dia (guardar o `DT_GERACAO` de origem).
- **Tecnologia**: framework do site, biblioteca de gráficos e de mapas, linguagem do pipeline de dados. TypeScript é obrigatório no site.
- Fatos de [API ao vivo do TSE](01-api-ao-vivo-tse.md):
  - A recomendação é um coletor próprio que publica um JSON agregado, porque o limite de 100 req/s é por IP (visitantes atrás de um mesmo NAT poderiam estourá-lo) e não teríamos controle da carga gerada no TSE.
  - Ainda não se sabe se a Akamai bloqueia IPs de nuvem; isso é o ticket [Acesso ao TSE a partir da nuvem](17-acesso-ao-tse-pela-nuvem.md). É preciso um plano B de IP.
  - Brasil, UF e municípios podem estar em instantes ligeiramente diferentes, então a soma das partes não bate com o total.
  - URLs devem ser geradas do `config/mun-e006258-cm.json`, porque 404 conta para o bloqueio. Uma rodada de índices `-ab.json` custa ~30 requisições; basta baixar o que mudou, no máximo uma vez por minuto por arquivo.
- **Desenvolvimento antes das contas**: as contas da Cloudflare e do GitHub só existem a partir de 18/10. Tudo precisa rodar e ser testado localmente sem login (ex.: emulação local da Cloudflare com `wrangler dev`/Miniflare), e o deploy e a CI devem ficar descritos em arquivos do repositório, prontos para ligar quando as contas existirem.
- Limites do plano gratuito que importam (requisições de Workers, leituras de armazenamento, banda) e a conta de quanto tráfego aguentamos.

## Answer

**Em uma linha**: a CDN da Cloudflare atende todos os visitantes (páginas em static assets, JSONs ao vivo no R2). O computador do dono lê o TSE, calcula e grava no R2, e nenhum visitante chega a ele. Tudo em TypeScript, nos planos gratuitos. Por que assim: [ADR 0001](../../../docs/adr/0001-coletor-no-computador-do-dono.md). Limites e contas de tráfego: [research/08-limites-cloudflare-e-github.md](../research/08-limites-cloudflare-e-github.md).

**Decisões** (aceitas pelo dono do projeto):

1. **Cálculo central**: o coletor calcula projeção, chance de vitória, curva projetada e narração da noite para as duas bases da projeção e publica o resultado pronto. O navegador só desenha. Ler o TSE direto do navegador está descartado: a projeção precisa dos 5.757 arquivos de município. O mesmo módulo do modelo roda no navegador só no simulador "e se", que baixa os dados por município quando é aberto.
2. **Linguagem**: TypeScript em tudo (site, coletor, pipeline de dados históricos e o módulo do modelo, portado do protótipo). O histórico de acerto da página de metodologia roda o mesmo código da noite.
3. **Framework**: Astro, com uma página estática por lugar (cerca de 5.800) e o bloco histórico já no HTML. O bloco ao vivo e o simulador são ilhas em Preact.
4. **Gráficos e mapas**: SVG feito à mão com partes pequenas do D3 (escalas, linhas). Mapas com d3-geo e TopoJSON em SVG, sem bibliotecas de mapa com fundo. O mapa do Brasil por município passa para canvas se o ensaio mostrar lentidão. O 3D segue a decisão 9.
5. **Malha**: a do IBGE 2024/2025, simplificada na construção, para incluir Boa Esperança do Norte (MT).
6. **Dados congelados**: o pipeline baixa TSE e IBGE para um cache fora do Git. O repositório guarda só os dados derivados (~2 MB), com manifesto de origem (URL, data de geração do TSE, hash). A construção do site lê só o repositório. O agregado de pesquisas também é um arquivo no repositório, e cada atualização é um deploy.
7. **TSE trocável**: o coletor lê de uma URL base configurável: o TSE de verdade, os arquivos finais do 1º turno de 2026 ou um "TSE falso" local que serve, no formato oficial, a apuração reconstruída do 2º turno de 2022 acelerada. O TSE falso é a peça do [Ensaio geral](15-ensaio-geral.md).
8. **Domínio**: comprar `apurador.app` no Cloudflare Registrar (ou `apurador.org`), passo do dono em [Contas e acessos](07-contas-e-acessos.md). `apurador.com.br` já tem dono. O site precisa funcionar também em `*.workers.dev`.
9. **3D (parallax e shaders)**: camada por cima de uma versão 2D completa, construída só depois que o núcleo ao vivo passar no ensaio geral, na mesma prioridade do explorador histórico.
   - **Onde não entra**: placar parcial, curva projetada, projeção e chance de vitória, porque a perspectiva distorce comprimentos e áreas.
   - **Onde pode entrar**: um mapa de picos do Brasil (altura = votos válidos do município, cor = quem lidera; na noite, os picos crescem conforme as seções são totalizadas), parallax na abertura e na passagem do bloco ao vivo para o histórico, e shaders sutis em fundos e na faixa de incerteza. O desenho fica com [Telas da página de lugar](12-telas-da-pagina-de-lugar.md).
   - **Salvaguardas**: carga sob demanda, fora do caminho do bloco ao vivo. Só aparece com WebGL2, sem pedido de movimento reduzido e em aparelho sem pouca memória. Botão 2D/3D. Todo dado em 3D existe também em 2D ou tabela. Volta sozinho ao 2D se a taxa de quadros cair.
   - **Biblioteca**: three.js, carregada sob demanda, com os picos desenhados como instâncias de uma mesma forma.
   - **Neutralidade**: câmera ortográfica (nada encolhe com a distância), inclinação e parallax limitados, vista inicial igual para todos sem favorecer região, cores e tratamento idênticos para os dois candidatos, e altura que nunca mede a vantagem de um só candidato.
10. **Escala**: nenhuma requisição de visitante executa código nosso. Páginas, dados históricos e o JSON ao vivo são arquivos estáticos servidos pela CDN da Cloudflare. Meta: 100 mil visitantes simultâneos sem degradar.
11. **Coletor no computador do dono** (substitui o plano B de IP desta rodada): ver a decisão 16.
12. **CI e deploy**: GitHub Actions roda os testes (modelo, leitor do TSE, replay do 2º turno de 2022) em cada pull request e push na `main`, e faz o deploy na Cloudflare a partir da `main`. O token da Cloudflare é um secret do GitHub que o dono cria e cola (passo em [Contas e acessos](07-contas-e-acessos.md)).
13. **Organização do código**: um repositório com workspaces do npm e testes em Vitest. Seis módulos: `modelo` (projeção pura, sem rede nem DOM), `tse` (leitura e normalização dos arquivos do TSE, ao vivo e históricos), `coletor`, `pipeline` (dados históricos e malha), `ensaio` (TSE falso e replay) e `site` (Astro). `modelo` e `tse` são compartilhados.
14. **Audiência**: Cloudflare Web Analytics, sem cookies nem dados pessoais, portanto sem banner de consentimento. Nenhum outro rastreador (Google Analytics, pixels de anúncio).
15. **Leitura dos visitantes**: os JSONs ao vivo ficam no R2, servidos em `ao-vivo.apurador.app` com cache da CDN (Cache Rule que respeita o `Cache-Control` da origem, Tiered Cache, TTL do navegador em "Respect Existing Headers"). Leituras e saída saem de graça com qualquer número de visitantes ([pesquisa de limites](../research/08-limites-cloudflare-e-github.md), seção 14). Descartados: resposta de Worker, inclusive com KV, Cache API ou Workers Cache (o Workers Free tem 100 mil requisições por dia, e mil visitantes já fazem 480 mil), `r2.dev` (limitado e fora de produção), GitHub Pages (`max-age=600`) e Cloudflare Tunnel (os dados somem da borda se o computador cair). **Plano B**: um Worker separado só com os JSONs ao vivo como static assets, republicado a cada minuto; funciona em `*.workers.dev`, e o tempo até valer na borda é medido no ensaio. O coletor publica por uma única interface com três destinos: R2, republicação e pasta local.
16. **Coletor**: roda no computador do dono (Ryzen 5 5600X3D, 64 GB, 800 Mbps simétricos, IP residencial), como processo Node 24 em TypeScript, direto no Windows e sem framework web. Só faz conexões de saída (lê o TSE, grava no R2): nenhuma porta aberta, IP da casa escondido. Grava o estado em disco a cada rodada, e um supervisor o reinicia se cair. A chave de escrita no R2 fica num `.env` local colado pelo dono. Descartados: Workers Free (50 subrequisições e 10 ms de CPU por execução), Workers Paid (desnecessário com o computador), GitHub Actions (os termos vetam "serverless application" e uso fora de desenvolver e testar) e servir visitantes do computador (ataques ao IP da casa, ponto único de falha, termos da operadora). A RTX 4080 não acelera a noite: o modelo leva milissegundos.
17. **Frequência**: o coletor lê os índices do TSE a cada 20 s e baixa só o que mudou. A CDN guarda cada JSON por 15 s, e o navegador relê a cada 30 s com `If-None-Match`. Atraso esperado sobre o app oficial do TSE: ~35 s em média, ~70 s no pior caso. O ensaio mede.
18. **Arquivos ao vivo**: um JSON por lugar (placar parcial, projeção, chance de vitória, curva real e curva projetada nas duas bases, e a narração do lugar se a [Narração da noite](14-narracao-da-noite.md) decidir que existe por lugar); um `mapa.json` compacto (~25 KB com gzip) baixado só com o mapa na tela; e um arquivo completo para o simulador, baixado só quando ele abre. O coletor reescreve só o que mudou e guarda no R2 cada estado da noite (~50 MB), para auditar, corrigir e medir depois o acerto do modelo em 2026.
19. **Falha do computador ou da internet**: sem coletor reserva na nuvem. O computador e o roteador ficam no nobreak, e o roteador de celular é a reserva de internet. O site continua no ar com as páginas e o último JSON na Cloudflare. Se os dados passarem 3 min sem atualizar, a página mostra "atualizado às HH:MM, atualização interrompida". [Acesso ao TSE a partir da nuvem](17-acesso-ao-tse-pela-nuvem.md) sai do mapa como fora do escopo.
20. **Zonas**: o coletor guarda desde o início as zonas dos 190 municípios com mais de uma (mais 535 arquivos por varredura). O [Ensaio geral](15-ensaio-geral.md) decide se o modelo as usa.
21. **Placar parcial de cada lugar**: o placar parcial e o % de seções totalizadas vêm do arquivo do TSE do próprio lugar, sem alteração (o do Brasil sai do arquivo do Brasil, nunca da soma dos municípios), com a hora da última totalização do TSE, num bloco visualmente separado dos cálculos do site. A curva real é a sequência desses placares na noite. A projeção usa os arquivos de município e de zona.

## Comments

- 18/10/2026, de [Simulador "e se"](13-simulador-e-se.md) (decisão 14 de lá): além dos arquivos da decisão 18, o coletor publica a cada rodada um **arquivo de rodada** minúsculo, com a hora da rodada. Os 3 min da decisão 19 passam a contar desde a última rodada do coletor, e não desde a última novidade do TSE.
- 18/10/2026, de [Ensaio geral](15-ensaio-geral.md):
  - **Fase e relógio** (decisão 7 de lá): a fase da página (antes das 17h, ao vivo, depois) sai do arquivo de rodada. Os 3 min da decisão 19 comparam a hora da rodada com o cabeçalho `Date` da resposta da CDN, nunca com o relógio do aparelho.
  - **TSE falso** (decisão 4 de lá, detalha a decisão 7 daqui): ele serve 2022 no formato de 2026, com a configuração de municípios e zonas de 2022. Por isso, o coletor e o site não podem ter os candidatos nem a lista de municípios fixos no código.
  - **Ambiente do ensaio** (decisão 5 de lá): Worker, subdomínio e bucket próprios, nunca os de produção. O coletor ganha esse destino na mesma interface de publicação da decisão 15.
  - **Chaves** (decisão 19 de lá): a base Apuração + pesquisas e o mapa ganham chave de publicação própria.
  - **Zonas** (decisão 16 de lá, fecha a decisão 20 daqui): a zona entra no modelo só se a calibração mostrar ganho de pelo menos 0,05 p.p. em todas as noites.
  - **Domínio** (decisão 8 de lá): o dono compra o domínio até 21/10.
