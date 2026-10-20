# Contas e acessos

Type: task
Status: claimed
Blocked by: —
Map: [Apurador 2026](../map.md)

Adiada: o dono só consegue fazer os passos a partir de 18/10/2026. Até lá, tudo fica num repositório Git local em `C:\Users\hiago\projetos\apurador` (branch `main`), preparado para ir depois ao GitHub e rodar na Cloudflare sem retrabalho.

## Question

Deixar prontas as contas e os logins de que a arquitetura e o deploy dependem. Isso é trabalho do dono do projeto: o Claude não cria contas nem digita senhas.

Checklist do dono (HITL):

**Aguardando o dono**: os passos 1 a 4 ficam para mais tarde em 18/10. Os outros tickets podem supor que as duas contas vão existir.

Decidido pelo dono em 18/10: **conta pessoal** do GitHub, repositório **privado até o lançamento**, e os commits trocam o e-mail de trabalho pelo **noreply do GitHub** antes do primeiro push.

1. **Cloudflare**: criar uma conta gratuita em https://dash.cloudflare.com/sign-up e confirmar o e-mail. Não é preciso cartão nem domínio. Depois, abrir **Workers & Pages** no painel e, se ele pedir, escolher o subdomínio `workers.dev`: ele aparece nas URLs públicas, então convém um nome neutro. Sem ele, o primeiro `wrangler deploy` (que não roda de forma interativa aqui) falha.
   - **R2**: no painel, abrir **R2 Object Storage** e ativar o plano gratuito pelo checkout (pode pedir cartão).
   - **Domínio** (decidido em [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md)): comprar `apurador.app` no Cloudflare Registrar (painel → Domain Registration → Register Domains; exige cartão). Se não estiver livre, `apurador.org`. O domínio é necessário para o caminho principal do JSON ao vivo (R2 em `ao-vivo.apurador.app`). Sem ele, vale o plano B em `*.workers.dev`.
2. **GitHub CLI**: instalar com `winget install --id GitHub.cli` e abrir um terminal novo.
3. **Login no GitHub**, com a conta pessoal: `gh auth login --hostname github.com --git-protocol https --web --scopes workflow`. O escopo `workflow` é o que permite enviar os arquivos de CI (`.github/workflows/`).
4. **Login na Cloudflare**: rodar `npx wrangler login` dentro de `C:\Users\hiago\projetos\apurador` (o npx pede para instalar o wrangler; abre o navegador para autorizar).
5. Avisar o Claude quando terminar.

Depois disso, o Claude:

- confirma os dois logins (`gh auth status`, `npx wrangler whoami`);
- reescreve os commits locais (todas as branches) com o e-mail noreply da conta e fixa esse e-mail em `.git/config`;
- cria o repositório `apurador` privado na conta pessoal e envia `main` e `prototipo/metodo-projecao` (o protótipo é um ativo apontado pelo [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md); a branch nunca entra na `main`);
- passa ao dono o último passo, que exige o repositório criado: criar na Cloudflare um token de API com o modelo "Edit Cloudflare Workers" (painel → My Profile → API Tokens) e guardá-lo como secret do GitHub com `gh secret set CLOUDFLARE_API_TOKEN --repo <usuário>/apurador`, que pede o valor sem mostrá-lo. O Claude grava o ID da conta com `gh secret set CLOUDFLARE_ACCOUNT_ID`, porque o ID não é segredo;
- cria o bucket do R2 para os JSONs ao vivo e passa ao dono a criação da chave de escrita só nesse bucket (painel → R2 → Manage API tokens → Object Read & Write), que o dono cola no `.env` do coletor, ignorado pelo Git;
- registra aqui o usuário do GitHub, a URL do repositório, o ID da conta Cloudflare, o subdomínio `workers.dev`, o domínio comprado e o nome do bucket, sem nenhum segredo.

## Comments

**18/10/2026, feito:**

- **GitHub**: logado como `HiggsWRX` (id 9259595), com o escopo `workflow`. O Git usa o protocolo SSH. O e-mail dos commits deste repositório passa a ser `9259595+HiggsWRX@users.noreply.github.com`, fixado em `.git/config`.
- **Cloudflare**: logado pelo `wrangler login`. ID da conta: `40aa2d90c0ed3139d2e8a10389f509ec`. O R2 está ativo, com o bucket `apurador-ao-vivo` criado.
- **Domínio**: adiado pelo dono. Até ele existir, o site usa `*.workers.dev`, e os JSONs ao vivo seguem o plano B da [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md) (decisão 15). O subdomínio `workers.dev` aparece no primeiro deploy.

**18/10/2026, depois da reescrita:** o dono reescreveu os commits antigos com o e-mail noreply (`git filter-branch`), e o Claude conferiu que as duas branches têm só o noreply e o mesmo conteúdo de antes. O Claude criou o repositório privado [HiggsWRX/apurador](https://github.com/HiggsWRX/apurador), com remoto SSH, e enviou `main` e `prototipo/metodo-projecao`. A chave de host do GitHub foi adicionada ao `known_hosts` do dono, conferida contra a impressão digital oficial.

**Falta:**

- Os dois secrets do GitHub ficam com o dono, porque a permissão do Claude bloqueou a gravação de secrets: `CLOUDFLARE_ACCOUNT_ID` (o ID acima, que não é segredo) e `CLOUDFLARE_API_TOKEN` (um token com o modelo "Edit Cloudflare Workers").
- Colar a chave de escrita do R2 no `.env` do coletor (dono, quando o coletor existir).
- Comprar o domínio (dono, **até 21/10**): pela decisão 8 do [Ensaio geral](15-ensaio-geral.md), o ensaio precisa dele para medir o caminho principal (R2 com cache) além do plano B. É `apurador.app`, ou `apurador.org` se o primeiro não estiver livre.
- Criar o bucket do R2 e o Worker do ensaio, separados dos de produção (Claude, na construção), e a chave de escrita só nesse bucket (dono). Ver a decisão 5 do [Ensaio geral](15-ensaio-geral.md).
- Criar um e-mail de contato dedicado ao projeto, para o rodapé (dono). Ver a decisão 7 de [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md).

**18/10/2026, de [Plano de lançamento em fases](19-plano-de-lancamento-em-fases.md):**

- **Repositório** (decisão 7 de lá): o "privado até o lançamento" passa a valer até **26/10**. Ele só abre depois de uma varredura de segredos e de endereços de ensaio em todo o histórico do Git.
- **Domínio** (decisão 6 de lá): o site abre em `apurador.app`. O limite segue 21/10, mas comprar já em 19/10 dá folga para a meta de 22/10 da etapa "Antes da noite".
- **E-mail do projeto**: o rodapé com ele é critério de pronto da etapa "Antes da noite" (decisão 3 de lá), então ele precisa existir antes de 22/10.

**20/10/2026, domínio comprado:**

- O dono comprou **`apurador.org`** no Cloudflare Registrar, o domínio previsto caso o `apurador.app` não estivesse livre (passo 1 acima). Os nameservers já são os da Cloudflare (`drake.ns.cloudflare.com` e `isla.ns.cloudflare.com`). O site vai abrir em `apurador.org`, e os JSONs ao vivo em `ao-vivo.apurador.org`.
- Na especificação e nos tickets abertos da construção (13 e 20), `apurador.app` passou a `apurador.org`. Nos tickets já resolvidos, o nome antigo fica como registro do que foi decidido, e vale `apurador.org`.
- **Secrets da Cloudflare no GitHub, a conferir**: o último deploy do Worker `apurador` é de 18/10, 23h46 (UTC), e os 20 commits enviados à `main` depois dele não geraram deploy. Ou o job `deploy` do CI pula por falta de `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`, ou os testes falham no GitHub. O dono confere na aba Actions do repositório.

**20/10/2026, depois do domínio (Claude, pelo navegador, com o ok do dono para cada passo):**

- **E-mail do projeto**: `contato@apurador.org`, pelo Email Routing da zona `apurador.org`, encaminhado para a caixa pessoal do dono (destino verificado). Os registros MX, DKIM e SPF foram criados pelo próprio Email Routing. O "catch-all" segue desligado: só esse endereço recebe.
- **Web Analytics**: site `apurador.org` no modo "Enable with JS Snippet installation", sem injeção automática. O token do site é público e vai no HTML: `cc7b32506206448bb43d8ec6514d5f18`. O snippet entra no lançamento ([ticket 13](../../apurador-2026-construcao/issues/13-lancamento-antes-da-noite.md)).
- **Worker do site**: o endereço `*.workers.dev` é `apurador.hicampos93.workers.dev`. O `apurador.org` já está ligado ao Worker `apurador` como domínio próprio, posto pelo painel, e serve o build de 18/10, com `noindex`.
- **Deploy parado, causa achada**: os quatro runs do CI passam nos testes e no replay e falham no `wrangler deploy` com "Invalid access token [code: 9109]". O único token da conta (`shy-darkness-f47e`, token de conta com o modelo de Workers) aparece como nunca usado: o valor gravado em `CLOUDFLARE_API_TOKEN` no GitHub não é ele. O dono gera um valor novo ("Roll") e regrava o secret.
