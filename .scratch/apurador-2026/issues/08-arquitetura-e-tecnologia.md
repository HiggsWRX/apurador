# Arquitetura e tecnologia

Type: grilling
Status: claimed
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

*Em andamento (18/10). Falta decidir: onde roda o coletor, como o JSON ao vivo chega aos visitantes e com que frequência, a conta de tráfego e o plano B de IP.*

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
