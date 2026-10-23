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
- 22/10/2026, do [ticket 19](19-textos-preditivos.md): o critério dos textos preditivos (Ensaio geral, decisão 22) se mede com `conferirPreditivos`, a conferência que o [ticket 30](30-ambiente-de-ensaio-e-conferencias.md) usa (como chamá-la está na nota de lá). No replay, ela passa na noite inteira com a chave desligada e numa noite em que a chave liga às 17:10 e desliga às 17:30. Para medir "ligada no meio" e "desligada de novo" no ensaio, o dono liga e desliga a chave pelo comando da noite numa hora combinada (`npm run noite -- ligar textos-preditivos` e `desligar textos-preditivos`) e confere na página: a frase de projeção na manchete e os eventos com "Projeção do Apurador:" na narração, só depois de ligar, e nenhum duas rodadas depois de desligar.
- 22/10/2026, do [ticket 21](21-painel-alertas-e-sentinela.md):
  - **Os limites dos alertas**, a conferir no ensaio 1, estão em `LIMITES_DOS_ALERTAS` (`packages/coletor/src/alertas.ts`). No replay, sem nada errado, o pico de pedidos fica em 50 por segundo, no limite de atenção, sem passar. A partida a frio chega a rodadas de 14,3 s, perto dos 15 s.
  - **Com o TSE falso**, o desvio do relógio não é conferido, porque o `Date` dele é a hora da noite de 2022. O alerta do relógio só vale no 24/10 e na noite.
  - **Sentinela do ensaio**: `apurador-sentinela-ensaio`, com `--env ensaio`, lê `ao-vivo-ensaio.apurador.org` e o plano B do ensaio. Para o ensaio conferir "os alertas no computador, no celular e da sentinela", o dono faz antes os passos de "Os alertas e a sentinela" no `packages/coletor/cloudflare/README.md`.

- 22/10/2026, do [ticket 29](29-metodologia-acerto-e-calibracao.md): o build do ensaio 2 leva as seções 6 e 7 da metodologia. Nos celulares, vale olhar a página `/metodologia/#acerto`: os botões "2022 | 2018" trocam a noite, as tabelas das seções 6 e 7 (e as de "Os números de cada candidato") rolam de lado sem rolar a página, e os gráficos cabem na largura.

- 22/10/2026, da junção dos tickets 19, 21 e 29 (`4f51901`, no ar): o que falta antes do ensaio.
  - **Sentinela**: nenhuma das duas está publicada, e o KV dela não existe. Os passos do dono são os de "Os alertas e a sentinela" (`packages/coletor/cloudflare/README.md`), a partir do passo do KV: o tópico do ntfy já está no `packages/coletor/.env`, e o alerta de teste foi aceito pelo ntfy. Falta assinar o tópico no app do celular.
  - **Ambiente do ensaio**: o [ticket 30](30-ambiente-de-ensaio-e-conferencias.md) ainda não foi construído. Sem ele, o ensaio 1 não tem Worker, subdomínio nem bucket próprios. Decisão do dono: rodar o ensaio 1 com o `npm run noite-local` ou juntá-lo ao ensaio 2.

- 22/10/2026, decisão do dono: o ensaio 1 roda hoje à noite com o `npm run noite-local`, no computador do dono, sem o ambiente do ensaio.
  - **O que ele mede**: ligar e desligar as chaves, os avisos, o plano B pela pasta local (a página passa a `/ao-vivo-plano-b/`), o 403 do TSE falso, os limites dos alertas no painel do coletor e no ntfy, as gravações e a duração de cada rodada, e o coletor derrubado e reiniciado. O `noite-local` para tudo quando o coletor sai, então o teste do reinício roda o TSE falso e o coletor separados (`npm run tse-falso` e `npm run coletor -- --tse http://127.0.0.1:8022/oficial --noite 2022-2`), com a pasta publicada intacta, como o R2 ficaria.
  - **O que passa ao ensaio 2**, porque só a infraestrutura real mede: o gzip pela borda, cortar a internet e passar ao celular, o plano B no Worker, os celulares no 4G e a sentinela. A reserva fria também, se houver notebook.
  - **Sem os tickets 22 e 23**: o coletor reiniciado parte sem estado, e no 403 ele não para de pedir. O ensaio 1 registra como está, sem reprovar por isso.

- 22/10/2026, registro do ensaio 1, das 20:34 às 22:07, no computador do dono, com a `main` em `f428097`. O Claude rodou, sem pessoas nem celulares assistindo.
  - **Como rodou**: `npm run noite-local -- --partida 16:58 --minutos 100`, a 3x até 20:30 e a 30x depois (a noite de 2022 inteira em 79 min). O `astro dev` não sobe: três vezes, "Failed to create the dev server app: transport invoke timed out after 60000ms", ao carregar `astro/dist/core/app/entrypoints/manifest.js`, mesmo com o cache do Vite limpo. A página foi o build (`PUBLIC_AO_VIVO=http://127.0.0.1:4322/ao-vivo/`, 55 s, 5.791 páginas) servido com a pasta do coletor na mesma origem, com ETag e 304 como a `ao-vivo-local.mjs`.
  - **Chaves e avisos** (comando → `rodada.json` → página): aviso 1, 20:50:56 → 20:51:24 → 20:51:28 (32 s); aviso 2 com a projeção desligada, 20:52:16 → 20:52:44 → 20:52:58 (42 s), e a caixa da projeção some; projeção e simulador religados, aviso retirado e textos preditivos ligados, 20:53:52 → 20:54:23 → 20:54:26 (34 s); textos preditivos desligados, 21:11:13 → 21:11:44 → 21:11:58 (45 s). O aviso 2 leva o link `https://resultados.tse.jus.br/oficial/app/index.html`.
  - **Textos preditivos**: ligados, o marco de 50% do Brasil ganhou "Projeção do Apurador: Bolsonaro 49,5% ± 2,0, Lula 50,5% ± 2,0", e a manchete, "A projeção do Apurador indica virada de Lula por volta de 79% das seções" (com 62,74%). Desligados, nenhum dos 5.780 JSONs de lugar ficou com evento preditivo nem com a linha da projeção.
  - **403 por 180 s**, às 20:54:52: o alerta crítico "TSE respondeu 403 nos últimos 10 min" saiu às 20:55:03, e a página foi a "TSE sem novidade" às 20:57:06 (2 min depois da última novidade). O coletor seguiu pedindo, de 341 a 454 pedidos 403 por rodada (#64 a #71): falta do ticket 23. Na volta, três rodadas com ~600 municípios novos, a última de 15,2 s, deram o alerta de atenção. A página voltou a "Ao vivo" às 20:58:38.
  - **Plano B pela pasta local**: comando às 21:12:14; a rodada seguinte regravou 5.838 arquivos em 17,5 s (alerta de atenção). A página foi a "TSE sem novidade" às 21:13:45 e passou a ler `/ao-vivo-plano-b/` às 21:14:45: 2 min 31 s, como desenhado. Nesse minuto, o indicador culpa o TSE, quando quem parou foi o endereço principal.
  - **A noite**: "18:46 Virada no Brasil: Lula passa à frente no placar parcial, com 69,60% das seções totalizadas"; "19:56 O TSE indica Lula eleito: eleição matematicamente definida, com 98,82% das seções totalizadas", com a manchete "O TSE indica Lula eleito"; fase "encerrada" na rodada #236 e "Lula foi eleito com 50,90% dos votos válidos", igual ao TSE. O painel do coletor deu o placar do Brasil "igual ao arquivo do TSE" em todas as leituras feitas.
  - **Volume**: 238 rodadas e 72.526 gravações. Na maior rodada, 5.838 (a do plano B); fora dela, 689. Duração máxima de 17,5 s e p95 de 14,5 s; pico de 50 pedidos por segundo, sem passar. O TSE falso não registrou violação do limite nem 404. A partida a frio levou ~10 rodadas de ~600 municípios, ~6.000 gravações. A 3x, o TSE muda três vezes mais rápido que na noite, então as rodadas no teto de 630 pedidos são mais comuns aqui que em 25/10.
  - **Alertas**: o crítico do 403 e quatro de atenção por rodada acima de 15 s (15,2 s depois do bloqueio, 17,5 s e 15,3 s no plano B, 15,5 s na rodada logo depois da final, que rebaixou os ~600 municípios finais). Os críticos foram ao ntfy; o dono confere se chegaram ao celular.
  - **Coletor derrubado e reiniciado** (TSE falso e coletor separados, desde 18:30, pasta publicada limpa): derrubado às 21:58:53, com o último `rodada.json` às 21:58:34. Na página: "TSE sem novidade" às 22:00:37; tenta o plano B às 22:01:37; "Atualizado às 21:58, atualização interrompida" às 22:02:37. Nenhum alerta, porque o painel morre com o coletor e a sentinela não está publicada. Reiniciado à mão às 22:02:39: processo de pé às 22:02:53, primeira rodada publicada às 22:03:07, página "Ao vivo" às 22:03:10, projeção de volta às 22:06:27 (11ª rodada). Sem estado, a narração do Brasil caiu de 9 para 4 eventos, e a virada das 18:46, que aconteceu durante a parada, não entrou. O ensaio 2 repete o teste com o ticket 22 juntado.
  - **Fica para o ensaio 2**: o gzip pela borda, cortar a internet e passar ao celular, o plano B no Worker, a sentinela, os celulares no 4G e as pessoas assistindo, a reserva fria e a conferência do placar pelo `conferirPlacar`.
  - **Achados**:
    - o `astro dev` não sobe, e o "A página ao vivo" do `docs/agents/issue-tracker.md` depende dele;
    - o indicador diz "TSE sem novidade" quando o principal para (plano B e coletor caído), por ~1 min antes do plano B e por ~2 min antes do "interrompida";
    - depois das 17h, nenhuma página tem link visível para o simulador (o da caixa de antes das 17h fica escondido): é o [ticket 25](25-simulador-ao-vivo.md).
  - **Veredito**: assina o dono. Pelo que foi medido, o núcleo mínimo passou nas chaves, nos avisos, no 403, no plano B pela pasta, no placar e na noite inteira, e ficou sem medir onde só a infraestrutura real mede. A projeção e os textos preditivos passaram nas chaves. O simulador ao vivo e o mapa não estão construídos.
  - **Depois do ensaio**: o arquivo de controle do ensaio (com `planoB: true`) saiu de `.cache/coletor/controle.json`; uma cópia ficou fora do repositório. As pastas `publicado/` e `publicado-plano-b/` ficaram com a reprodução.
