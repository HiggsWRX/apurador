# 31: Roteiro da noite

Status: ready-for-agent
Blocked by: 16, 21, 23
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O roteiro da noite: o passo a passo escrito do dono para 25/10, no repositório, impresso ao lado do computador e salvo no celular, porque com o computador travado não dá para ler na tela. Ele traz:

- o preparo do computador;
- a linha do tempo do congelamento até o fim da noite;
- um cartão por falha, no formato sintoma → como confirmar → o que fazer → como voltar, com o comando exato.

O ensaio 2 o segue passo a passo. O roteiro precisa estar pronto em 22/10 e aceita correções até as 23h de 24/10. O dono revisa.

Decisões: [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md) (decisões 1 a 4 e 9 a 22) e [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 10 e 11 e comentário da operação).

## Critérios de aceite

- [ ] **Papéis**: operador (o dono), vigia (de fora, no 4G, das 16h30 até a indicação do TSE) e o Claude de prontidão, que só roda comandos quando o dono manda.
- [ ] **Preparo até 21/10**:
  - pausar as atualizações até 28/10;
  - tirar a manutenção e o Defender da faixa das 16h às 2h;
  - ligar a hora automática;
  - desligar suspensão e hibernação;
  - criar a tarefa do Agendador;
  - na BIOS, "ligar quando a energia voltar";
  - medir o nobreak (5 min fora da tomada).
- [ ] **Preparo em 25/10, antes das 15h**: fechar os programas da inicialização, deixar 20 GB livres, ligar tudo no nobreak e plugar o celular da reserva por USB. O roteiro diz o que fica aberto.
- [ ] **Linha do tempo**:
  - **24/10**: 18h, congelamento; das 19h às 19h30, o coletor contra o TSE zerado publicando na produção; até as 23h, as pesquisas e a conferência no celular.
  - **25/10**:
    - 8h e 14h, suspensões de pesquisas, com retirada até as 16h;
    - 15h, o coletor no ar;
    - 16h, as chaves iguais ao veredito do ensaio 2, os textos preditivos desligados salvo confirmação registrada, um alerta de teste, a sentinela e o relógio;
    - 16h30, o vigia;
    - 16h55, a contagem regressiva;
    - 17h, a fase muda;
    - até 99%, a conferência contra o app do TSE a cada 30 min.
- [ ] **De 21 a 24/10**: o coletor roda 15 min por dia contra o TSE real zerado, publicando só na pasta local.
- [ ] **Um cartão por falha**:
  - bloqueio pelo TSE;
  - queda da internet;
  - falha do R2 e plano B;
  - computador travado ou falta de luz;
  - TSE lento ou sem novidade;
  - placar divergente;
  - projeção que salta;
  - formato novo do TSE, a única exceção ao congelamento, só no módulo `tse`.

  Cada cartão traz sintoma, como confirmar, o que fazer, como voltar e o comando exato.
- [ ] **Ligar os textos preditivos na noite**: só com a resposta por escrito registrada no ticket 22, valendo dali em diante.
- [ ] **Fim da noite**: dormir depois da indicação do TSE e de 99%; o coletor encerrado e parado; a sentinela e a tarefa desligadas.
- [ ] **No dia seguinte**: conferir os objetos da noite, revogar a chave de escrita do R2 e fazer o registro da noite.
- [ ] O roteiro tem versão para imprimir e para o celular.

## Comments

- 20/10/2026, do [ticket 16](16-comandos-chaves-e-plano-zero.md): os comandos da noite existem, e o roteiro escreve cada um exatamente assim, sempre da raiz do repositório.
  - **Os comandos** (`npm run noite -- <comando>`): `ligar <chave>`, `desligar <chave>`, `aviso <1|2|3>`, `retirar-aviso` e `plano-b`. As chaves são `nucleo-minimo`, `projecao`, `base-com-pesquisas`, `simulador`, `mapa` e `textos-preditivos`. Não há outro comando: nem texto livre, nem pausa, nem volta.
  - **A confirmação**: cada comando mostra o que vai mudar e pede para digitar o nome do bloco (`nucleo-minimo`, `projecao`, …; `aviso-1`, `aviso-2` ou `aviso-3` para publicar um aviso e `aviso` para retirá-lo; `plano-b` para o plano B). Qualquer outra coisa, ou Enter vazio, não grava nada.
  - **O estado**: `npm run noite`, sem comando, mostra cada chave, o aviso no ar, o destino e quando o arquivo foi gravado. É a conferência das 16h ("cada chave igual ao veredito do ensaio 2; textos preditivos desligados").
  - **Plano zero** é `npm run noite -- desligar nucleo-minimo`; a volta é `ligar nucleo-minimo`. O coletor passa a publicar só o arquivo de rodada, e a página mostra "Acompanhe a apuração no app oficial do TSE", com o link, a partir das 17h.
  - **Avisos prontos**: `aviso 1` (TSE demorando), `aviso 2` (Apurador instável, com o link do TSE), `aviso 3` (projeção suspensa). Um aviso novo entra no lugar do anterior; `retirar-aviso` tira o que estiver no ar. Os textos exatos estão em `npm run noite`.
  - **Projeção que salta** (decisão 18): `desligar projecao` desliga também o simulador. Religar a projeção não religa o simulador: é `ligar projecao` e depois `ligar simulador`.
  - **Plano B**: `plano-b`, uma vez; não há comando de volta, e o estado sobrevive a um reinício do coletor.
  - **Tempo**: o coletor lê o arquivo de controle no começo de cada rodada (20 s) e publica o estado no `rodada.json`; a página relê a cada 30 s. Conte até 2 rodadas mais o cache (~1 min) e confira no site, não no terminal.
  - **O terminal do coletor** mostra o controle em cada linha de rodada: `· desligadas: projeção, simulador`, `· aviso 2`, `· plano B`. Sem nada disso, está tudo ligado e sem aviso.
  - **O arquivo de controle** é `.cache/coletor/controle.json`, fora do Git. Ele sobrevive a reinícios e também de um ensaio para a noite: **antes das 15h de 25/10**, rodar `npm run noite` e, se o arquivo for de outro dia (o comando avisa), apagá-lo. Sem o arquivo, valem as chaves de `dados/chaves.json` (seção `noite`), as mesmas que a página usa antes do coletor, sem aviso e no destino principal: um bloco desligado por deploy fica desligado quando o coletor sobe. Um arquivo editado à mão que não sirva é ignorado, com `controle: …` nas falhas da rodada, e o coletor fica com o estado anterior.
  - **Textos preditivos na noite**: `ligar textos-preditivos`, só com a confirmação por escrito registrada no ticket 22; vale dali em diante.
- 20/10/2026, do [ticket 20](20-publicacao-r2-e-plano-b.md):
  - **O coletor na produção**: `npm run coletor -- --destino producao`, com a chave de escrita em `packages/coletor/.env`. Use `--sem-gzip` se a conferência da entrega pedir. Se `ao-vivo.apurador.org` não estiver pronto, use `--destino producao --sem-dominio`: o coletor publica só no Worker, e o build do site leva só `PUBLIC_AO_VIVO_PLANO_B`. A primeira publicação na produção é a de 24/10, às 19h.
  - **Cartão da falha do R2 e plano B**:
    - **Sintoma**: `gravar <arquivo>: R2 respondeu …` nas falhas de 2 rodadas seguidas, ou o visto de fora parado com a gravação dando certo.
    - **O que fazer**: `npm run noite -- plano-b`, confirmado digitando `plano-b`. Na rodada seguinte, o coletor passa ao Worker e regrava ali todos os ~5.800 arquivos; essa rodada fica uns segundos mais longa. Depois, ele republica o Worker a cada minuto. A página passa sozinha ao plano B quando o `rodada.json` do R2 passar de 2 min.
    - **Tempo**: os dados voltam em ~2 min de rodada velha, mais até 1 min de republicação, mais o tempo até a borda, que o ensaio mede.
    - **Como voltar**: não volta (Operação na noite, decisão 14).
    - **Se a republicação falhar** (`republicar o plano B: wrangler saiu com …`): confira o login com `npx wrangler whoami`; se ele caiu, `npx wrangler login`. Um `CLOUDFLARE_API_TOKEN` no `.env` dispensa o login.
  - **Depois de um ensaio com o plano B**: o arquivo de controle fica com `planoB: true` e sobrevive ao reinício do coletor. O roteiro já manda conferir e apagar o arquivo antes da noite.
- 22/10/2026, do [ticket 17](17-projecao-ao-vivo.md):
  - **O agregado da noite**: o coletor lê o `pesquisas.csv` quando parte (`lerEntradaDaProjecao`, em `packages/coletor/src/entrada-da-projecao.ts`) e imprime o agregado que usa. Uma retirada de pesquisa até as 16h só entra na projeção com o coletor reiniciado depois do deploy.
  - **Reinício no meio da noite**: sem estado, ele segura a projeção por ~10 rodadas, até ter os municípios.
  - **A noite**: `--noite 2026-2` é o padrão; o ensaio usa `2022-2`.
