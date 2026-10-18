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

Decidido pelo dono em 18/10: **conta pessoal** do GitHub, repositório **privado até o lançamento**, e os commits trocam o e-mail da DTACT pelo **noreply do GitHub** antes do primeiro push.

1. **Cloudflare**: criar uma conta gratuita em https://dash.cloudflare.com/sign-up e confirmar o e-mail. Não é preciso cartão nem domínio. Depois, abrir **Workers & Pages** no painel e, se ele pedir, escolher o subdomínio `workers.dev`: ele aparece nas URLs públicas, então convém um nome neutro. Sem ele, o primeiro `wrangler deploy` (que não roda de forma interativa aqui) falha.
   - **Domínio** (decidido em [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md)): comprar `apurador.app` no Cloudflare Registrar (painel → Domain Registration → Register Domains; exige cartão). Se não estiver livre, `apurador.org`. O site também funciona em `*.workers.dev`, então o domínio não bloqueia nada.
2. **GitHub CLI**: instalar com `winget install --id GitHub.cli` e abrir um terminal novo.
3. **Login no GitHub**, com a conta pessoal: `gh auth login --hostname github.com --git-protocol https --web --scopes workflow`. O escopo `workflow` é o que permite enviar os arquivos de CI (`.github/workflows/`).
4. **Login na Cloudflare**: rodar `npx wrangler login` dentro de `C:\Users\hiago\projetos\apurador` (o npx pede para instalar o wrangler; abre o navegador para autorizar).
5. Avisar o Claude quando terminar.

Depois disso, o Claude:

- confirma os dois logins (`gh auth status`, `npx wrangler whoami`);
- reescreve os commits locais (todas as branches) com o e-mail noreply da conta e fixa esse e-mail em `.git/config`;
- cria o repositório `apurador` privado na conta pessoal e envia `main` e `prototipo/metodo-projecao` (o protótipo é um ativo apontado pelo [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md); a branch nunca entra na `main`);
- registra aqui o usuário do GitHub, a URL do repositório, o ID da conta Cloudflare, o subdomínio `workers.dev` e o domínio comprado, sem nenhum segredo.
