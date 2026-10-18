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
