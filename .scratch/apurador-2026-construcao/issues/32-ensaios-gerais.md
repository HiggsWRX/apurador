# 32: Ensaios gerais 1 e 2

Status: ready-for-human
Blocked by: 28, 30, 31
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

Rodar a noite do 2º turno de 2022 de ponta a ponta, na infraestrutura real e com gente assistindo:

- **Ensaio 1**: quinta, 22/10, à noite, com o que estiver pronto.
- **Ensaio 2**: sexta, 23/10, à noite. É o de aprovação.

O dono opera e assina o veredito de cada bloco. O Claude prepara o ambiente, roda os scripts de conferência e escreve os registros.

Precisa do dono:

- domínio comprado até 21/10;
- computador preparado;
- nobreak medido;
- 3 a 5 pessoas com celulares variados (pelo menos um Android barato e um iPhone, alguns no 4G);
- o vigia escolhido entre elas.

Decisões: [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 2, 9, 10 e 19 a 25 e comentários) e [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md).

## Critérios de aceite

- [ ] **Ensaio 1**: roda os testes de falha:
  - derrubar o coletor e apertar o botão de reiniciar;
  - cortar a internet e passar ao celular;
  - acionar o plano B;
  - ligar e desligar as chaves;
  - testar a reserva fria, se houver notebook.

  Também mede as gravações, o volume, o gzip pela borda e os limites dos alertas.
- [ ] **Ensaio 2**: segue o roteiro da noite passo a passo, com:
  - o TSE falso respondendo 403 por um tempo;
  - os três avisos prontos;
  - o link para o app do TSE depois de 10 min de "interrompido";
  - a passagem da página ao plano B;
  - os alertas no computador, no celular e da sentinela.
- [ ] Cada pessoa recebe uma lista curta do que conferir e reporta com hora e print. O link fica só com quem assiste.
- [ ] **Núcleo mínimo**: o placar idêntico, o atraso, os seis estados do indicador, as quedas, nenhuma violação do TSE, a narração factual, as 17h, as chaves e os celulares em até 3 s são medidos contra os critérios bloqueantes.
- [ ] **Outros blocos**: a projeção, a base com pesquisas, o simulador, o mapa e os textos preditivos são medidos contra os seus critérios.
- [ ] **Veredito**: o registro de cada ensaio traz os números, as falhas com hora e o veredito de cada bloco, assinado pelo dono.
- [ ] **Se o núcleo mínimo for reprovado**: correção em 24/10 e um trecho de 30 min a 1x, das 18:30 às 19:00 de 2022. Se falhar de novo, vale o plano zero na noite.
- [ ] **Se outro bloco for reprovado**: ele vai para a noite com a chave desligada. Pode ser aprovado até as 18h de 24/10, se a correção passar no replay e num trecho de 30 min.

## Comments

- 19/10/2026, do [ticket 14](14-bloco-ao-vivo.md):
  - "Placar e curva visíveis em até 3 s num Android barato no 4G" não foi medido num aparelho. Fica para o ensaio. O JavaScript da ilha soma ~16 KB com gzip: ilha 6,0, Preact 4,4, signals 3,0, cliente do Astro 1,5 e hooks 1,2.
  - O limite de "TSE sem novidade" é provisório: 2 min sem totalização nova no Brasil, abaixo dos 3 min da interrompida. Nenhuma decisão fixa o número; o ensaio confirma ou ajusta.
- 22/10/2026, do [ticket 17](17-projecao-ao-vivo.md): o critério "erro de até 0,5 p.p. depois de 5% das seções" fica no limite em 2022, com as constantes congeladas.
  - **Sem arredondar**: o erro chega a ~0,48 com 30% a 36% das seções, nas duas bases (`docs/calibracao/noite-2022-2.csv`).
  - **Publicado**: com uma casa, chega a 0,50 (49,6 contra os 49,10 do TSE).
  - **No replay**: a conta é na precisão da página, contra o resultado como o TSE o publica, e passa. Se o ensaio medir contra o resultado com mais casas, o arredondamento a reprova.
  - **Decisão do dono em 22/10**: no ensaio, o critério se mede como no replay, no número publicado contra o resultado publicado. O erro do modelo sem arredondar fica com o teste do `modelo` (`packages/modelo/test/noites.test.ts`), com as constantes congeladas.
- 22/10/2026, do [ticket 21](21-painel-alertas-e-sentinela.md):
  - **Os limites dos alertas**, a conferir no ensaio 1, estão em `LIMITES_DOS_ALERTAS` (`packages/coletor/src/alertas.ts`). No replay, sem nada errado, o pico de pedidos fica em 50 por segundo, no limite de atenção, sem passar. A partida a frio chega a rodadas de 14,3 s, perto dos 15 s.
  - **Com o TSE falso**, o desvio do relógio não é conferido, porque o `Date` dele é a hora da noite de 2022. O alerta do relógio só vale no 24/10 e na noite.
  - **Sentinela do ensaio**: `apurador-sentinela-ensaio`, com `--env ensaio`, lê `ao-vivo-ensaio.apurador.org` e o plano B do ensaio. Para o ensaio conferir "os alertas no computador, no celular e da sentinela", o dono faz antes os passos de "Os alertas e a sentinela" no `packages/coletor/cloudflare/README.md`.
