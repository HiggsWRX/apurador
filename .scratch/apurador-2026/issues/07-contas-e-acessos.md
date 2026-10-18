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

**Falta:**

- Reescrever os commits antigos com o e-mail noreply. A permissão do Claude bloqueou a reescrita do histórico, então o dono roda o comando ou autoriza o Claude.
- Criar o repositório privado e enviar `main` e `prototipo/metodo-projecao`.
- Guardar os secrets do GitHub: o token de API da Cloudflare fica com o dono, e o `CLOUDFLARE_ACCOUNT_ID` com o Claude.
- Colar a chave de escrita do R2 no `.env` do coletor (dono, quando o coletor existir).
- Comprar o domínio (dono, mais tarde).
