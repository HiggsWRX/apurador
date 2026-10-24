# Roteiro da noite: 25/10/2026

O passo a passo do dono para a noite do 2º turno ([Operação na noite](../.scratch/apurador-2026/issues/18-operacao-na-noite.md), decisões 1 a 4 e 9 a 22). Ele fica impresso ao lado do computador e salvo no celular, porque com o computador travado não dá para ler na tela. `npm run roteiro` gera as duas versões (veja "Imprimir e levar ao celular", no fim). O ensaio 2 segue este roteiro passo a passo, com as trocas de "No ensaio 2". O roteiro aceita correções até as 23h de 24/10 e depois congela.

**Regras de sempre**

- Todo comando roda no PowerShell, na raiz do repositório (`C:\Users\hiago\projetos\apurador`), na `main` aprovada.
- Nenhum alerta age sozinho: quem decide é o dono, por este roteiro. O Claude só roda um comando quando o dono manda.
- Depois de um comando da noite, confira no site, não no terminal. No ensaio 1, do comando à página levou de 32 a 45 s: conte até 1 min.
- O TSE nunca é aberto no navegador do computador, só no app, no celular, pelo 4G.
- Na dúvida sobre o placar, plano zero ([cartão F](#f-placar-divergente)): nunca vai ao ar um placar errado.

## Papéis

- **Operador**: o dono, a única pessoa com comandos.
- **Vigia**: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_, fora da rede do dono e no 4G, das 16h30 até a indicação do TSE. Olha o site como visitante, compara o placar do Brasil com o app do TSE a cada 15 min e manda mensagem ao dono. Não tem acesso a nenhum comando.
- **Claude**: uma sessão do Claude Code aberta no repositório, de prontidão para diagnosticar. Roda comandos deste roteiro só quando o dono manda.

## O que fica aberto

- **O log do coletor**, num PowerShell:

  ```powershell
  Get-Content .cache\coletor\coletor-2026-10-25.log -Wait -Tail 40
  ```

  O dia do nome é o de Greenwich, contado quando o supervisor começa. Se ele recomeçar depois das 21h (num reinício do computador ou num `Start-ScheduledTask`), o log novo é o `coletor-2026-10-26.log`.
- **O painel do coletor** (daqui em diante, só "o painel"): `.cache\coletor\painel.html`, no navegador. Ele se recarrega a cada 5 s, e o título da aba diz quantos alertas críticos há. A ordem do painel é Estado, Visto de fora, TSE, Placar conferido, Projeção do Brasil, Gravação e Computador. Rodando pela tarefa do Agendador, o coletor não toca som nem mostra notificação do Windows. O alerta no computador é o painel, e o crítico vai também ao celular.
- **Um navegador como visitante** em `https://apurador.org`.
- **O app do TSE** no celular, pelo 4G.
- **A sessão do Claude.**

Todo o resto fica fechado.

## Os comandos da noite

Cada comando mostra o que vai mudar e pede para digitar o nome do bloco. Qualquer outra coisa, ou Enter vazio, não grava nada.

| O quê | Comando | Digite |
| --- | --- | --- |
| Ver o estado: chaves, aviso, destino e hora do arquivo | `npm run noite` | — |
| Desligar um bloco | `npm run noite -- desligar <chave>` | a chave |
| Ligar um bloco | `npm run noite -- ligar <chave>` | a chave |
| Plano zero | `npm run noite -- desligar nucleo-minimo` | `nucleo-minimo` |
| Voltar do plano zero | `npm run noite -- ligar nucleo-minimo` | `nucleo-minimo` |
| Publicar o aviso pronto 1, 2 ou 3 | `npm run noite -- aviso 1` | `aviso-1` |
| Retirar o aviso | `npm run noite -- retirar-aviso` | `aviso` |
| Plano B, sem volta | `npm run noite -- plano-b` | `plano-b` |

- **As chaves** são `nucleo-minimo`, `projecao`, `base-com-pesquisas`, `simulador`, `mapa` e `textos-preditivos`. `desligar projecao` desliga também o simulador. `ligar projecao` não o religa: depois dela, `ligar simulador`.
- **Os avisos prontos**:
  1. "O TSE está demorando a divulgar novos dados. Os números abaixo são os mais recentes divulgados."
  2. "O Apurador está com instabilidade. Acompanhe também no app oficial do TSE.", com o link.
  3. "A projeção do Apurador está suspensa. O placar oficial do TSE continua atualizado."

  Um aviso novo entra no lugar do anterior.
- **No log**, cada linha de rodada mostra o que foge do tudo ligado: `· desligadas: textos preditivos` (o normal da noite, com os textos preditivos desligados), `· desligadas: projeção, simulador, textos preditivos`, `· aviso 2`, `· plano B`.

**A tarefa do Agendador** (o coletor sem login, pelo supervisor):

- Ligar:

  ```powershell
  Enable-ScheduledTask -TaskName "Apurador coletor"; Start-ScheduledTask -TaskName "Apurador coletor"
  ```

- Desligar:

  ```powershell
  Stop-ScheduledTask -TaskName "Apurador coletor"; Disable-ScheduledTask -TaskName "Apurador coletor"
  ```

- Reiniciar o coletor, para ler o código ou o agregado novo:

  ```powershell
  Stop-ScheduledTask -TaskName "Apurador coletor"; Start-ScheduledTask -TaskName "Apurador coletor"
  ```

- Conferir que nenhum `node` do coletor ficou de pé depois de parar a tarefa (a sessão do Claude também roda `node`, então o filtro é pelo coletor):

  ```powershell
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object CommandLine -match 'coletor' | Select-Object ProcessId, CommandLine
  ```

  Se sobrar algum, `Stop-Process -Id <ProcessId> -Force`.

## Preparo do computador

Era para estar pronto em 21/10. Marque o que já foi feito: tudo precisa estar pronto antes do ensaio 2, que testa este preparo.

- [ ] **Atualizações do Windows** pausadas até 28/10: Configurações → Windows Update → "Pausar atualizações".
- [ ] **Manutenção automática** fora da faixa das 16h às 2h: Painel de Controle → Sistema e Segurança → Segurança e Manutenção → Manutenção → "Alterar configurações de manutenção", às 10h. A verificação agendada do Defender roda na manutenção. Confira no Agendador de Tarefas, em Microsoft → Windows → Windows Defender → "Windows Defender Scheduled Scan", que ela não tem gatilho entre as 16h e as 2h.
- [ ] **Hora automática**: Configurações → Hora e idioma → Data e hora → "Definir hora automaticamente" ligado e "Sincronizar agora". Em 18/10, o serviço de hora estava parado. No PowerShell como administrador:

  ```powershell
  Set-Service w32time -StartupType Automatic; Start-Service w32time; w32tm /resync
  ```

- [ ] **Suspensão e hibernação** desligadas, de modo que só a tela apaga. No PowerShell como administrador:

  ```powershell
  powercfg /change standby-timeout-ac 0; powercfg /hibernate off
  ```

- [ ] **A tarefa do Agendador**, criada uma vez. Ela pede a senha do Windows e nasce desligada. Rodar o comando de novo troca a tarefa: o ensaio 2 usa a sua (veja "No ensaio 2"), e depois dele é preciso voltar a esta:

  ```powershell
  powershell -ExecutionPolicy Bypass -File packages\coletor\agendador\criar-tarefa.ps1 -Destino producao
  ```

- [ ] **BIOS**: "ligar quando a energia voltar" ("Restore on AC Power Loss" → "Power On"), se houver.
- [ ] **Nobreak**: 5 min fora da tomada, com o computador, o monitor e o roteador ligados. Autonomia medida: \_\_\_\_ min.
- [ ] **Celular da reserva**: a ancoragem USB testada (com o cabo puxado, o painel diz "celular") e pelo menos 1 GB livre na franquia, com a ancoragem liberada. Se faltar, compre um pacote extra até 24/10.
- [ ] **ntfy**: o app no celular, com o tópico do `NTFY_TOPICO` assinado em `ntfy.sh`. No Android, deixe o app fora da economia de bateria. `npm run alerta-de-teste` toca no computador e no celular.
- [ ] **`packages/coletor/.env`**, com os passos de `packages/coletor/cloudflare/README.md`:
  - `R2_PRODUCAO_*`: a chave dos arquivos ao vivo;
  - `R2_NOITE_*`: a dos objetos da noite. Sem ela, o coletor não guarda o objeto da noite: a máquina reserva fica sem ter de onde retomar, e o "Como a projeção se saiu" de 26/10 fica sem dados;
  - `NTFY_TOPICO`;
  - `CLOUDFLARE_API_TOKEN`: sem ele, o plano B republica pelo `wrangler login`, que pode cair;
  - para o ensaio, `R2_ENSAIO_*` e `R2_ENSAIO_NOITE_*`.
- [ ] **As duas sentinelas**, pelo passo 3 de "Os alertas e a sentinela" do README, cada uma só depois da primeira rodada do coletor no seu destino. Sem `rodada.json` no endereço, a sentinela manda "Sentinela: arquivo de rodada público sem leitura há …". A do ensaio vai no começo do ensaio 2; a da noite, no teste das 19h de 24/10. Depois, com o arquivo de rodada de outra noite, ela fica quieta.
- [ ] **`npx wrangler whoami`** mostra o login.
- [ ] **Máquina reserva**, só se houver notebook: `git clone`, a `main` do dia, o Node 24, `npm ci` e o `packages/coletor/.env` com `R2_PRODUCAO_*`, `R2_NOITE_*`, `NTFY_TOPICO` e `CLOUDFLARE_API_TOKEN`. Teste no ensaio 2.

## Linha do tempo

### Sábado, 24/10

O ensaio 2 passou de 23/10 para esta manhã.

- **De manhã, antes do ensaio**: o coletor por 15 min contra o TSE real zerado, publicando só na pasta local. Isso confere o formato, os cabeçalhos e o ritmo do TSE. Pela decisão, ele rodaria 15 min por dia de 21 a 24/10, e este é o último:

  ```powershell
  npm run coletor -- --minutos 15
  ```

  O que conferir: nenhum alerta de arquivo que o leitor não entende, e a linha do TSE no painel com leituras.
- **De manhã**: o ensaio 2 (veja "No ensaio 2"). O registro vai em `docs/ensaios/2026-10-24.md`, a partir de `docs/ensaios/modelo.md`, com o veredito de cada bloco assinado pelo dono.
- **Depois do veredito**:
  - **Núcleo mínimo reprovado**: correção e um trecho de 30 min a 1x, das 18:30 às 19:00 de 2022 (`npm run tse-falso -- --partida 18:30 --velocidade 1`). Se falhar de novo, vale o plano zero na noite.
  - **Outro bloco reprovado**: vai para a noite com a chave desligada, em `dados/chaves.json`, seção `noite`. Ele pode ser aprovado até as 18h, se a correção passar no replay e num trecho de 30 min.
- **Logo depois do ensaio**, antes de qualquer coletor na produção:
  - apague o arquivo de controle do ensaio. O teste das 19h o leria, e o aviso de "outro dia" não pega um arquivo do mesmo dia: com o plano B do ensaio ligado, o teste iria direto ao plano B.

    ```powershell
    Remove-Item .cache\coletor\controle.json
    ```

  - crie de novo a tarefa com `-Destino producao` (em "Preparo do computador");
  - ponha `packages/site/ensaio/pesquisas-retiradas.json` de volta em `[]`.
- **Até 18h**:
  - o `dados/chaves.json` (seção `noite`) igual ao veredito;
  - o push da `main` aprovada, que o CI testa e põe no ar (GitHub → Actions; em 22/10, de 4,5 a 13 min). Conferir no celular que o `apurador.org` está no build novo: o cartão do mapa aparece no Brasil, antes do histórico.
  - Com o CI vermelho, use o [Deploy pelo computador](#deploy-pelo-computador), abaixo, **sem** os endereços ao vivo.
- **18h**: congelamento do código. Daí em diante, só os dados das pesquisas, até 23h, e o passo das 19h40.
- **Das 19h às 19h30**: o coletor contra o TSE real zerado, publicando na produção. É a primeira rodada do coletor na produção:

  ```powershell
  npm run coletor -- --destino producao --minutos 30
  ```

  No painel: a Gravação no destino principal dando certo, o Visto de fora lendo `ao-vivo.apurador.org` e nenhum alerta crítico. Com a primeira rodada publicada, publique a sentinela da noite (passo 3 de "Os alertas e a sentinela", no README). ~3 min depois de o coletor parar, chega ao celular "Sentinela: arquivo de rodada público parado há …". É o teste dela, e não há nada a fazer.
- **19h40**: os endereços ao vivo no deploy ([ticket 13](../.scratch/apurador-2026-construcao/issues/13-lancamento-antes-da-noite.md)). Sem eles, a página da noite não lê nada. É a mudança de código prevista depois do congelamento; na noite, só o [cartão H](#h-formato-novo-do-tse) abre outra. No `.github/workflows/ci.yml`, job `deploy`, o último passo passa a ser

  ```yaml
        - if: steps.secrets.outputs.ok == 'true'
          run: npm run deploy
          env:
            PUBLIC_AO_VIVO: https://ao-vivo.apurador.org/
            PUBLIC_AO_VIVO_PLANO_B: https://apurador-plano-b.hicampos93.workers.dev/
  ```

  Depois, commit e push. Quando o deploy terminar, conferir pelo 4G que o Brasil abre normal, no painel de antes das 17h, sem aviso nem "interrompida". No computador, F12 → Rede: o `rodada.json` vem de `ao-vivo.apurador.org` com 200 ou 304.
- **Até 23h**: o último deploy das pesquisas (`dados/pesquisas.csv`, commit e push).
- **23h**: o roteiro congela.
- **23h01**: rode o CI à mão para pôr no ar o agregado da noite, congelado às 23h. O agendado das 23h05 não serve: de 20 a 23/10, o agendado do CI rodou ~5 h depois da hora marcada. Também dá pelo GitHub → Actions → CI → "Run workflow".

  ```powershell
  gh workflow run ci.yml --ref main
  ```

  Quando ele terminar, confira pelo celular no 4G a lista das pesquisas, o agregado e as curvas das duas bases. Com o CI vermelho, rode o [Deploy pelo computador](#deploy-pelo-computador) **com** os endereços.

### Deploy pelo computador

Só se o CI estiver vermelho, porque ele pula os testes do CI. Sem os endereços (antes das 19h40):

```powershell
npm run deploy
```

Com os endereços (das 19h40 em diante). Um deploy feito daqui sem eles tira a noite do ar:

```powershell
$env:PUBLIC_AO_VIVO="https://ao-vivo.apurador.org/"; $env:PUBLIC_AO_VIVO_PLANO_B="https://apurador-plano-b.hicampos93.workers.dev/"; npm run deploy
```

### Domingo, 25/10

- **De madrugada**: os dois deploys agendados do CI (o das 23h05 e o de todo dia), que nesta semana rodaram ~5 h atrasados, por volta das 4h e das 5h. Não há nada a fazer. Se a página quebrar depois deles, use o [cartão I](#i-um-deploy-quebrou-a-página).
- **8h e 14h**: as notícias e as decisões do TSE sobre pesquisas suspensas. Se uma do agregado for suspensa, siga [Retirar uma pesquisa](#retirar-uma-pesquisa). A última retirada é às 16h.
- **Antes das 15h**, o preparo do dia:
  - [ ] Steam, Discord, OneDrive e parecidos fechados e fora da inicialização (Gerenciador de Tarefas → Aplicativos de inicialização). Nada de jogo, download ou chamada de vídeo no computador.
  - [ ] pelo menos 20 GB livres no disco;
  - [ ] o computador, o monitor e o roteador no nobreak, e o celular da reserva plugado por USB, com a ancoragem ligada;
  - [ ] o checkout na `main` aprovada, sem mudança local (`git status`);
  - [ ] `npm run noite`: se o arquivo de controle for de outro dia (o comando avisa), apague-o. O do ensaio pode ter ficado com o plano B ligado. Sem o arquivo, valem as chaves do `dados/chaves.json`:

    ```powershell
    Remove-Item .cache\coletor\controle.json
    ```

- **15h**: o coletor no ar, pela tarefa ("Ligar", em "Os comandos da noite"). Abra o log e o painel. O painel mostra a fase "antes das 17h", e o Visto de fora, o `rodada.json` lido em `ao-vivo.apurador.org`. A partida a frio leva ~10 rodadas (3 a 4 min). O log mostra o agregado que o coletor usa: ele precisa ser o da página.
- **16h**, a conferência:
  - [ ] `npm run noite`: cada chave igual ao veredito do ensaio 2; os textos preditivos desligados, salvo resposta por escrito já registrada na [Confirmação dos textos preditivos](../.scratch/apurador-2026/issues/22-confirmacao-dos-textos-preditivos.md); nenhum aviso; o destino principal;
  - [ ] `npm run alerta-de-teste` chega ao celular;
  - [ ] a sentinela da noite está publicada: `npx wrangler deployments list --name apurador-sentinela`;
  - [ ] no painel, em Computador, o relógio com desvio menor que 2 s. Se passar, Configurações → Hora e idioma → Data e hora → "Sincronizar agora";
  - [ ] o vigia confirmado;
  - [ ] é a última hora para retirar uma pesquisa.
- **16h30**: o vigia começa. O dono fica perto do computador até a indicação do TSE e os 99% das seções, com pausas de no máximo 5 min e o celular no bolso.
- **16h55**: a página mostra a contagem regressiva, e nada mudou desde as 16h.
- **17h**: a fase muda sozinha. Nas primeiras rodadas, confira o Placar conferido ("igual"), o Visto de fora e o app do TSE.
- **Até 99%**: a cada 30 min, o placar do Brasil no site contra o app do TSE. O vigia confere a cada 15 min.
- **Textos preditivos**: ligue só com a resposta por escrito registrada no ticket. Eles valem dali em diante, sem nada retroativo:

  ```powershell
  npm run noite -- ligar textos-preditivos
  ```

### Retirar uma pesquisa

Até as 16h de 25/10, com meta de 10 min:

1. Apague a linha da pesquisa (o registro `BR-NNNNN/2026`) em `dados/pesquisas.csv`.
2. Faça commit e push. O CI põe no ar (de 4,5 a 13 min em 22/10). Com o CI vermelho, use o [Deploy pelo computador](#deploy-pelo-computador), com os endereços:

   ```powershell
   git commit -am "Retira a pesquisa BR-NNNNN/2026, suspensa"; git push
   ```

3. Confira pelo celular a lista sem ela, o agregado e as curvas das duas bases.
4. Se o coletor já estiver no ar (depois das 15h), reinicie-o ("Reiniciar", em "Os comandos da noite"): ele lê o agregado só quando parte. O log mostra o agregado novo.

### Fim da noite

- **Dormir**: depois da indicação do TSE e de 99% das seções. O coletor segue sozinho, só com os alertas críticos no celular.
- **Totalização final**: na primeira rodada na fase encerrada, a linha da fase no painel diz "o coletor para sozinho às 00:48:20, 30 min depois da totalização final" (no log, `para às 00:48:20`). Na hora, ele para com código 0, e o log diz "Fim da noite: o coletor parou sozinho, 30 min depois da totalização final (00:48:20)". O supervisor não o põe de volta.
- **Depois disso**, na hora ou ao acordar, desligue a tarefa ("Desligar", em "Os comandos da noite") e a sentinela. A tarefa sai desligada porque, num reinício mais de 6 h depois, o coletor partiria a frio e regravaria ~5.900 arquivos:

  ```powershell
  npx wrangler delete --config packages/coletor/cloudflare/sentinela.jsonc --env=""
  ```

### Segunda, 26/10

- **Os objetos da noite**: numa noite como a de 2022, ~1.800 objetos e ~1,7 GB.

  ```powershell
  npx wrangler r2 bucket info apurador-noite
  ```

- **A chave de escrita** do `apurador-ao-vivo`: revogue em painel da Cloudflare → R2 → "Manage API tokens". A do `apurador-noite` só depois de o [ticket 35](../.scratch/apurador-2026-construcao/issues/35-etapa-depois.md) ler os objetos.
- **O registro da noite** em `docs/noite/2026-10-25.md`: os alertas, as ações com hora e as quedas, como nos ensaios, a partir do log e dos registros de rodada em `.cache\coletor\`.

## Cartões de falha

Cada cartão segue a ordem sintoma → como confirmar → o que fazer → como voltar. As mensagens entre aspas são as que o painel, o log e o celular mostram.

### A. Bloqueio pelo TSE

- **Sintoma**: o alerta crítico "TSE respondeu 403: o coletor parou de pedir até a conexão mudar" (ou 429). No painel, a linha "Pedidos ao TSE" diz "parados no bloqueio desde 21:03:04 (403): troque a conexão". Cada rodada do log traz `PARADO NO BLOQUEIO (403): troque a conexão`.
- **Como confirmar**: só pelo painel, nunca abrindo o TSE no navegador do computador. O coletor já parou de pedir no primeiro 403 e segue publicando o `rodada.json` a cada 20 s. A página não mostra "interrompida", só "TSE sem novidade", 2 min depois da última novidade.
- **O que fazer**: puxe o cabo de rede. O celular dá outro IP, e o coletor volta a pedir sozinho em até ~25 s. Não há comando.
  - **Celular também bloqueado** (o crítico continua): ponha o celular em modo avião por 10 s.
  - **Sem celular**: depois dos 10 min do bloqueio, puxe o cabo por ~10 s e ponha-o de volta. Esperar sem mexer na conexão não basta: o coletor não pede ao TSE para saber se o bloqueio passou.
- **Como confirmar a volta**: a linha "Pedidos ao TSE" passa a "uma rodada a cada 40 s até 21:20:10, 15 min depois da volta" (no log, `rodada de 40 s até 21:20:10`). Se algum pico da noite passou de 50 pedidos por segundo, a linha diz "até o fim da noite".
- **Como voltar ao cabo**: não antes de 15 min. O alerta termina sozinho 10 min depois do último 403. Um coletor derrubado no meio do bloqueio volta parado, com a mesma regra.

### B. Queda da internet

- **Sintoma**: o alerta crítico "Coletor sem rodada completa há …", com o TSE e a gravação falhando juntos no painel.
- **Como confirmar**: outro aparelho na Wi-Fi da casa também está sem internet, e o painel diz "Conexão: cabo".
- **O que fazer**: puxe o cabo. O Windows passa ao celular em segundos, e o painel diz "Conexão: celular" e soma os MB que passam por ele. Enquanto a conexão é o celular, o objeto da noite fica no disco (no painel, "Objeto da noite: no disco enquanto a conexão for o celular"), e não há nada a fazer. A meta é a publicação de volta em até 3 min.
- **Como voltar**: ligue o cabo de novo quando outro aparelho na Wi-Fi da casa navegar normalmente por 15 min. O primeiro objeto da noite com o cabo leva os arquivos que estavam esperando.

### C. Falha do R2 e plano B

- **Sintoma**: o alerta crítico "Gravação no destino principal falhando 2 vezes seguidas" (no log, `gravar <arquivo>: R2 respondeu …`), ou "Arquivo de rodada público com …" com a gravação dando certo.
- **Como confirmar**: no painel, na Gravação, a última gravação boa no principal ficou para trás; no Visto de fora, a idade do `rodada.json` público sobe. No celular, `https://www.cloudflarestatus.com`.
- **O que fazer**: acione o plano B, confirmando com `plano-b`:

  ```powershell
  npm run noite -- plano-b
  ```

  - Na rodada seguinte, o coletor regrava todos os ~5.800 arquivos na pasta do Worker, em 4 rodadas no teto (~80 s). A primeira republicação sai ~1 min depois do comando, e as seguintes, a cada minuto.
  - A página passa sozinha ao plano B quando o `rodada.json` do R2 passa de 2 min. No ensaio 1, isso levou 2 min 31 s do comando à página, e agora soma-se esse minuto. A meta é ter os dados de volta em até 5 min.
  - Nesse meio-tempo, a página diz "TSE sem novidade". Quem parou foi o Apurador, não o TSE.
  - Se a republicação falhar (`republicar o plano B: wrangler saiu com …`), rode `npx wrangler whoami`. Se o login caiu, `npx wrangler login`. Com o `CLOUDFLARE_API_TOKEN` no `.env`, o plano B não depende do login.
- **Como voltar**: não volta. O plano B fica até o fim da noite e sobrevive a um reinício do coletor.

### D. Coletor caído, computador travado ou falta de luz

- **Sintoma**: chega ao celular "Sentinela: arquivo de rodada público parado há 3 min 10 s, desde 21:03:05" (ou "… sem leitura há …", com os dois endereços dando erro). No computador, o painel para de mudar e nenhum alerta toca, porque o painel morre com o coletor.
- **Como confirmar**: no log, `Supervisor: o coletor caiu (código N) …; volta em 5 s, do estado em disco` e, depois, `Retoma do disco da rodada N`.
- **O que fazer**, nesta ordem:
  1. **Espere 1 min**: o supervisor põe o coletor de volta 5 s depois de ele cair, retomando do disco.
  2. **Supervisor caído** (o log parou, sem nenhuma linha "Supervisor:"):

     ```powershell
     Start-ScheduledTask -TaskName "Apurador coletor"
     ```

  3. **Coletor que cai sem parar** (o log mostra `Supervisor: o coletor caiu` a cada 5 s, sem rodada no meio): o estado não serve. Desligue a tarefa, confira que nenhum `node` do coletor ficou (comandos em "Os comandos da noite") e rode, neste terminal, o comando abaixo. Ele regrava tudo uma vez, em ~10 rodadas:

     ```powershell
     npm run coletor -- --destino producao --partida a-frio
     ```

     Assim, o log fica só neste terminal, e nada põe o coletor de volta se ele cair. Depois de duas rodadas boas, aperte Ctrl+C (ele para no fim da rodada) e ligue a tarefa de novo ("Ligar"), que retoma do disco.

  4. **Computador sem resposta**: aperte o botão de reiniciar. A tarefa traz o coletor de volta sem login, do estado em disco. A meta é ter os dados de volta em 5 min. Depois do login, abra de novo o log (depois das 21h, o do dia 26) e o painel.
  5. **Computador que não liga**: passe ao notebook, se houver. Ele retoma do último objeto da noite (no log, `Retoma do objeto da noite da rodada N`) e leva ~10 rodadas (3 a 4 min). Nesse tempo, o placar segue, mas a projeção sai dos JSONs do Brasil e das UFs, e o mapa e as tabelas não mudam. Deixe o computador principal desligado ou sem cabo até o fim da noite: se ele voltar com a tarefa ligada, sobe outro coletor.

     ```powershell
     npm run coletor -- --destino producao
     ```

  6. **Falta de luz**: o nobreak dura \_\_\_\_ min. 5 min antes do fim, desligue pelo Windows (Iniciar → Ligar/Desligar → Desligar). O site cai em "interrompida" e, 10 min depois, mostra sozinho o link do app do TSE. Quando a luz voltar, a BIOS liga o computador, e a tarefa traz o coletor de volta.
- **Como voltar**: a página volta a "Ao vivo" no navegador de visitante. No ensaio 1, partindo sem estado, a projeção voltou na 11ª rodada (~3,5 min).

### E. TSE lento ou sem novidade

- **Sintoma**: o alerta de atenção "TSE sem novidade há …, com …% das seções" (só no painel, sem ir ao celular), e a página em "TSE sem novidade".
- **Como confirmar**: o app do TSE no celular, pelo 4G.
- **O que fazer**:
  - **O app também está parado**: o problema é do TSE. Depois de 10 min, publique o aviso pronto 1, confirmando com `aviso-1`:

    ```powershell
    npm run noite -- aviso 1
    ```

  - **O app está à frente**: o problema é nosso. Diagnostique com o Claude e, depois de 10 min, publique o aviso pronto 2, confirmando com `aviso-2`:

    ```powershell
    npm run noite -- aviso 2
    ```

- **Como voltar**: quando chegar novidade, retire o aviso, confirmando com `aviso`:

  ```powershell
  npm run noite -- retirar-aviso
  ```

### F. Placar divergente

- **Sintoma**: o alerta crítico "Placar do Brasil publicado diferente do arquivo do TSE", com o Placar conferido "divergente" no painel. Ou o vigia avisa que o placar do site não bate com o app.
- **Como confirmar**: não espere para confirmar. O plano zero vem primeiro, porque nunca vai ao ar um placar errado. Depois, confira pelo painel e pelo app do TSE.
- **O que fazer**: plano zero, na hora, confirmando com `nucleo-minimo`. O coletor passa a publicar só o arquivo de rodada, e a página mostra "Acompanhe a apuração no app oficial do TSE", com o link. Depois, diagnostique com o Claude.

  ```powershell
  npm run noite -- desligar nucleo-minimo
  ```

- **Como voltar**: só se a causa for o leitor do TSE, corrigido pelo [cartão H](#h-formato-novo-do-tse). No plano zero, o coletor não publica os lugares, então o Placar conferido não tem o que conferir: só dá para ver o placar de novo religando.

  ```powershell
  npm run noite -- ligar nucleo-minimo
  ```

  Nas duas primeiras rodadas depois de religar, confira o Placar conferido ("igual") e o placar do site contra o app do TSE. Se divergir de novo, plano zero outra vez, até o fim da noite.

### G. Projeção que salta

- **Sintoma**: o alerta de atenção "Projeção do Brasil mudou numa rodada: …". Ele aparece quando a projeção muda mais de 1 ponto, ou a chance de vitória mais de 20 pontos, depois de 5% das seções.
- **Como confirmar**: veja se a chegada de um lugar grande explica o salto. Por exemplo, o % de seções de SP ou de MG pulou na mesma rodada, na página da UF. Se explica, não há nada a fazer.
- **O que fazer**, quando o salto não tem explicação (um número inválido, um vai e volta): desligue a projeção, o que desliga também o simulador (confirme com `projecao`):

  ```powershell
  npm run noite -- desligar projecao
  ```

  Depois, publique o aviso pronto 3 (confirme com `aviso-3`):

  ```powershell
  npm run noite -- aviso 3
  ```

- **Como voltar**: a projeção não volta na noite, salvo se a causa for uma leitura errada do TSE, corrigida no leitor ([cartão H](#h-formato-novo-do-tse)). Nesse caso: `ligar projecao`, `ligar simulador` e `retirar-aviso`.

### H. Formato novo do TSE

É a única exceção ao congelamento na noite.

- **Sintoma**: o alerta crítico "Arquivo do TSE que o leitor não entende: …" (Brasil ou UF), ou o de atenção "Arquivo de município que o leitor não entende (N): fica o último bom".
- **Como confirmar**: o nome do arquivo no alerta e no log, que o Claude abre.
- **O que fazer**:
  1. Só o módulo `tse` (`packages/tse`) muda, e só para voltar a ler. O Claude escreve, e o dono revisa.
  2. A correção passa nos testes do `tse` e no replay local:

     ```powershell
     npx vitest run --project @apurador/tse
     ```

     ```powershell
     npx vitest run --project @apurador/ensaio
     ```

  3. Commit na `main` e reinício do coletor ("Reiniciar", em "Os comandos da noite"). O site não é republicado.
  4. Se o placar do Brasil não voltar em 30 min a partir do primeiro alerta, plano zero ([cartão F](#f-placar-divergente)). A volta é a do cartão F, depois da correção.
- **Como voltar**: o alerta termina sozinho quando o leitor volta a entender o arquivo. Nenhuma outra mudança de código entra na noite.

### I. Um deploy quebrou a página

- **Sintoma**: depois de um deploy (de pesquisas, de uma retirada ou o agendado), a página não abre ou não mostra o placar, no celular do dono ou no do vigia.
- **Como confirmar**: em outro aparelho, pelo 4G, e no navegador do computador.
- **O que fazer**: volte à versão anterior. Sem o `<id>`, o `wrangler rollback` volta à versão anterior à atual:

  ```powershell
  cd packages/site; npx wrangler deployments list
  ```

  ```powershell
  npx wrangler rollback <id-da-versão-boa> -m "volta: <o que quebrou>" -y; cd ../..
  ```

- **Como voltar**: o deploy seguinte da `main` (um push, uma execução à mão ou o agendado, que roda de madrugada) substitui a versão voltada, então a correção precisa estar na `main` antes dele.

## No ensaio 2

O ensaio 2 segue este roteiro com estas trocas:

| Na noite | No ensaio 2 |
| --- | --- |
| o site `https://apurador.org` | `https://apurador-ensaio.hicampos93.workers.dev` |
| os arquivos ao vivo em `ao-vivo.apurador.org` | `ao-vivo-ensaio.apurador.org`, e o plano B em `apurador-ensaio-plano-b.hicampos93.workers.dev` |
| o TSE real | o TSE falso, num terminal à parte: `npm run tse-falso -- --partida 16:50`, a 3x até as 20:30 da noite e a 30x depois |
| a tarefa com `-Destino producao` | `-Destino ensaio -Argumentos "--tse http://127.0.0.1:8022/oficial --noite 2022-2"` |
| `npm run coletor -- --destino producao` | `npm run coletor -- --destino ensaio --tse http://127.0.0.1:8022/oficial --noite 2022-2`, com `--partida a-frio` se o coletor já rodou no destino do ensaio há menos de 6 h |
| o bloqueio do TSE | no terminal do TSE falso, `403 120`, e a troca de conexão depois de 2 min |
| a sentinela com `--env=""` | `--env ensaio` |
| retirar uma pesquisa: `dados/pesquisas.csv` e push | o registro em `packages/site/ensaio/pesquisas-retiradas.json` e `npm run deploy-ensaio`. Depois do ensaio, o arquivo volta a `[]` |
| o placar contra o app do TSE | `npm run ler-ensaio` durante o ensaio e `npm run conferir-ensaio` depois, que confere todo placar lido |

**Antes**: a chave do ensaio no `.env`, `npm run conferir-entrega -- --destino ensaio --plano-b` (o gzip pela borda) e `npm run deploy-ensaio`, com a `main` que vai ao ar. Os comandos do registro estão em `docs/ensaios/modelo.md`.

**O botão de reiniciar, num teste à parte, antes do ensaio.** O reinício derruba também o TSE falso e o `ler-ensaio`, e um TSE falso partido de novo regrava o relógio que a conferência do ensaio usa. Por isso esse teste fica fora do ensaio:

1. suba o TSE falso e ligue a tarefa do ensaio;
2. depois de algumas rodadas publicadas, anote a hora da noite do TSE (a linha do TSE no painel) e aperte o botão de reiniciar;
3. depois do login, rode `npm run tse-falso -- --partida <a hora anotada>`. A meta de 5 min conta até a primeira rodada publicada depois disso;
4. no fim, pare tudo, desligue a tarefa e apague o `.cache\coletor\estado-ensaio.json`, para o ensaio partir a frio.

**O que o ensaio provoca, nesta ordem** (o plano B por último, porque não volta):

1. o 403 do TSE falso ([cartão A](#a-bloqueio-pelo-tse));
2. os três avisos e as chaves (cartões [E](#e-tse-lento-ou-sem-novidade) e [G](#g-projeção-que-salta));
3. o cabo puxado ([cartão B](#b-queda-da-internet));
4. o coletor derrubado ([cartão D](#d-coletor-caído-computador-travado-ou-falta-de-luz)). Ache o processo e derrube-o com `Stop-Process -Id <ProcessId> -Force`; o supervisor o põe de volta:

   ```powershell
   Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object CommandLine -match 'principal\.ts' | Select-Object ProcessId, CommandLine
   ```

5. a tarefa desligada por mais de 14 min, para a página mostrar o link do app do TSE depois de 10 min de "interrompida". Depois, ligue-a de novo;
6. o plano B ([cartão C](#c-falha-do-r2-e-plano-b)).

Os alertas precisam chegar ao celular e pela sentinela, e aparecer no painel. A sentinela do ensaio é publicada depois da primeira rodada.

**Depois do ensaio**: o que está em "Logo depois do ensaio", no sábado.

## Imprimir e levar ao celular

```powershell
npm run roteiro
```

O comando gera `.cache/roteiro/roteiro-da-noite.html` e, com o Chrome ou o Edge instalado, o `.pdf` ao lado. Imprima o PDF e salve-o no celular, no próprio aparelho, para ler sem internet. Depois de cada correção, gere e imprima de novo.
