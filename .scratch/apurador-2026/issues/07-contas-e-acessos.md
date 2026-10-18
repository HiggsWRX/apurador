# Contas e acessos

Type: task
Status: claimed
Blocked by: —
Map: [Apurador 2026](../map.md)

Adiada: o dono só consegue fazer os passos a partir de 18/10/2026. Até lá, tudo fica num repositório Git local em `C:\Users\hiago\projetos\apurador` (branch `main`), preparado para ir depois ao GitHub e rodar na Cloudflare sem retrabalho.

## Question

Deixar prontas as contas e os logins de que a arquitetura e o deploy dependem. Isso é trabalho do dono do projeto: o Claude não cria contas nem digita senhas.

Checklist do dono (HITL):

1. **Cloudflare**: criar uma conta gratuita em https://dash.cloudflare.com/sign-up e confirmar o e-mail. Não é preciso cartão nem domínio.
2. **GitHub CLI**: instalar com `winget install --id GitHub.cli` e abrir um terminal novo.
3. **Login no GitHub**: rodar `gh auth login` (GitHub.com → HTTPS → login pelo navegador).
4. **Login na Cloudflare**: rodar `npx wrangler login` dentro de `C:\Users\hiago\projetos\apurador` (abre o navegador para autorizar).
5. Avisar o Claude quando terminar.

Depois disso, o Claude:

- confirma os dois logins (`gh auth status`, `npx wrangler whoami`);
- cria o repositório `apurador` no GitHub (privado até o lançamento, salvo decisão em contrário) e faz o primeiro push;
- registra aqui o usuário do GitHub, a URL do repositório e o ID da conta Cloudflare, sem nenhum segredo.
