# Arquitetura e tecnologia

Type: grilling
Status: open
Blocked by: 01, 03, 05
Map: [Apurador 2026](../map.md)

## Question

Onde roda cada parte do site e com que tecnologia, dentro do plano gratuito da Cloudflare e aguentando picos na noite de 25/10?

- **Caminho ao vivo**: o navegador de cada visitante lê o TSE direto, ou um serviço nosso (ex.: Worker com agendamento) coleta do TSE, calcula a projeção e publica um arquivo único que a CDN entrega a todos? Com que frequência? O que acontece se o TSE ficar lento ou bloquear?
- **Cálculo do modelo**: no servidor, no navegador ou nos dois? O simulador "e se" exige ao menos parte do modelo rodando no navegador.
- **Dados históricos**: formato e tamanho dos arquivos estáticos por lugar, e como são gerados (pipeline offline). Ver [Dados históricos por município e malhas](03-dados-historicos-e-malhas.md). Decidir entre simplificar a malha do IBGE 2024/2025 (1 a 3 horas de trabalho, inclui Boa Esperança do Norte) e usar a malha de 2022 pronta da API (sem esse município). Como congelar os dados derivados, se o TSE regera os arquivos todo dia (guardar o `DT_GERACAO` de origem).
- **Tecnologia**: framework do site, biblioteca de gráficos e de mapas, linguagem do pipeline de dados. TypeScript é obrigatório no site.
- **Desenvolvimento antes das contas**: as contas da Cloudflare e do GitHub só existem a partir de 18/10. Tudo precisa rodar e ser testado localmente sem login (ex.: emulação local da Cloudflare com `wrangler dev`/Miniflare), e o deploy e a CI devem ficar descritos em arquivos do repositório, prontos para ligar quando as contas existirem.
- Limites do plano gratuito que importam (requisições de Workers, leituras de armazenamento, banda) e a conta de quanto tráfego aguentamos.
