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
