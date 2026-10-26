# Backlog de Redesign de Gameplay — Conclusão Investigativa Progressiva

## Status, propósito e limite de escopo

**Status:** proposta de produto para validação antes de implementação.

Este é o único backlog para regras de gameplay: pistas, conexões, hipóteses, operações, PA, cartas, pressão e balanceamento. O backlog principal trata apenas de plataforma, cooperação e refinamentos de interface.

Ele organiza a evolução do ciclo investigativo para que a conclusão do caso surja da investigação do jogador, e não de uma tela de acusação binária. Ele não altera, por si só, as regras atuais; após aprovação, suas tarefas devem ser executadas na ordem definida neste documento.

O escopo é o modo solo atual. Cooperação deve reutilizar as mesmas regras de dedução quando for implementada, sem criar uma segunda versão do sistema.

## Resultado pretendido

O ciclo da missão passa a ser:

```text
Descobrir fatos → validar ou refutar pistas → conectar padrões
→ desenvolver hipótese → preparar operação → resolver o desfecho
```

O jogador continua tomando decisões e podendo chegar a uma teoria incorreta, mas não perde imediatamente por selecionar um suspeito cedo demais. A derrota decorre do prazo final ou de uma operação mal sustentada sem tempo para se recuperar.

## Princípios de design

1. **A conclusão deve emergir do mural.** O jogador percebe que uma explicação ficou mais forte porque ela passa a cobrir acesso, oportunidade e vínculo.
2. **Pistas falsas precisam ensinar algo.** Refutar uma hipótese deve reduzir incerteza, desbloquear contexto ou tornar uma linha de investigação mais clara; não pode parecer apenas PA desperdiçado.
3. **Ação final é ficcional, não burocrática.** O jogador prepara uma operação investigativa, como seguir uma rota, proteger uma evidência ou confrontar uma inconsistência, em vez de preencher uma acusação formal.
4. **Iniciantes precisam de margem real.** Uma primeira partida deve suportar curiosidade, conversas e algumas escolhas subótimas sem exigir uma rota conhecida.
5. **Sem spoilers operacionais.** A interface pode explicar o estado da hipótese e a prontidão da operação, mas não deve indicar o local, a carta ou a resposta exata que falta.
6. **Servidor continua autoritativo.** Critérios de pista, hipótese, operação, custos e desfecho são validados no backend; o cliente só apresenta o estado público permitido.

## Decisões de produto a aprovar

- [x] **D-01 — Substituir “Apresentar acusação” por “Preparar operação”.** A operação só fica disponível quando uma hipótese tiver sustentação mínima; ela não revela antecipadamente qual solução é correta.
- [x] **D-02 — Definir recuperação após operação incompleta.** Recomendação: registrar uma inconsistência narrativa e manter a missão ativa até o prazo, salvo quando a própria ficção justificar encerramento imediato.
- [x] **D-03 — Manter seis rodadas no modo padrão.** Recomendação: manter o prazo, mas introduzir margem de recuperação e medir a primeira partida antes de considerar uma sétima rodada.
- [x] **D-04 — Manter a Rodada 6 como janela de recuperação.** Recomendação: permitir uma última ação útil e a operação no mesmo turno solo, quando os PA permitirem.
- [x] **D-05 — Tornar conexões formais significativas.** Recomendação: aceitar apenas pistas confirmadas e exigir que as conexões usadas pela operação sejam coerentes com a hipótese escolhida.
- [x] **D-06 — Consolidar regras de mão e apoio.** Definir uma única fonte de verdade para renovação da mão e para a escolha ou compra de carta do apoio antes de alterar balanceamento.

## Orçamento de PA e margem para iniciantes

### Base proposta

Manter, inicialmente, cinco PA efetivos por turno, com especialidades distintas:

| Investigador | PA | Função no redesign |
| --- | --- | --- |
| Lívia | 5 gerais | Exploração física e descoberta inicial. |
| Rafael | 4 gerais + 1 técnico | Validação de vestígios e confirmação de evidência física. |
| Isadora | 4 gerais + 1 social | Transforma declarações em avanços concretos de hipótese. |
| Otávio | 3 gerais + 2 de pesquisa | Cronologia, documentos e conexões formais. |

### Regras de balanceamento

- A rota mínima até uma operação sustentada deve caber até o encerramento da Rodada 4.
- A primeira partida deve comportar pelo menos **três ações básicas de curiosidade, conversa ou investigação não decisiva** antes de comprometer a possibilidade de concluir o caso na Rodada 6.
- Nenhum investigador pode depender de comprar uma carta específica, escolher um apoio específico ou usar uma conversa única para concluir a missão.
- Especialidades devem contribuir para a rota principal. Em particular, ações sociais precisam produzir confirmação, conexão, redução de custo ou abertura de operação — não apenas texto adicional.
- Usar uma carta em contexto incompatível deve ser bloqueado antes do gasto de PA e sem consumi-la.
- Ações sem descoberta nova devem gerar observação útil; elas não devem ocultar que a linha foi esgotada.

### Salvaguardas recomendadas

- Uma conexão formal gratuita por missão quando a equipe obtiver três pistas confirmadas, ou uma conexão gratuita na Rodada 5; escolher uma única regra e comunicá-la claramente.
- Uma operação incompleta gera uma observação ou contradição útil, não derrota automática.
- O apoio de plantão continua opcional e não pode ser a única forma de cobrir um eixo da hipótese.
- Se telemetria ou playtest confirmar que o solo ainda é punitivo, preferir uma ajuda contextual de uso único por missão a aumentar PA gerais para todos os investigadores.

## Tarefas propostas

### P0 — Definição e contrato do novo ciclo

### Contrato de estados de hipótese (GD-01)

Uma hipótese livre é uma anotação do jogador: não tem custo, não é validada pelo
servidor e não libera operações. Uma hipótese mecânica é uma linha de raciocínio
privada do caso, acompanhada pelo servidor a partir de evidências já descobertas e
relações coerentes. O cliente recebe somente seu estado, os títulos de evidências já
conhecidas, os eixos já cobertos e a quantidade de relações coerentes.

| Estado | Significado público | Transições permitidas |
| --- | --- | --- |
| `inquiry` | Há fatos relacionados, mas ainda não formam uma explicação consistente. | Pode tornar-se `plausible`, `contested` ou `discarded`. |
| `plausible` | Fatos confirmados cobrem ao menos dois eixos públicos e há uma relação coerente. | Pode tornar-se `sustained`, `contested` ou `discarded`. |
| `sustained` | Fatos confirmados cobrem meios, oportunidade e vínculo, com as relações coerentes exigidas pelo caso. É o único estado que pode habilitar consulta de operação em GD-02. | Pode tornar-se `contested` ou `discarded`; nunca vence a missão por si só. |
| `contested` | Uma refutação, contradição confirmada ou inconsistência de operação enfraqueceu a explicação. A missão continua e a interface mostra apenas a inconsistência já observada. | Pode retornar a `inquiry`, `plausible` ou `sustained` após novos fatos válidos; pode tornar-se `discarded`. |
| `discarded` | Os fatos confirmados excluem definitivamente esta explicação no caso atual. | Não pode voltar a outro estado; o jogador pode criar uma nova hipótese livre. |

Fatos públicos que podem fortalecer uma hipótese mecânica são pistas confirmadas,
declarações corroboradas, refutações registradas e relações coerentes entre fatos já
confirmados. Uma pista refutada nunca fortalece uma hipótese; ela pode contestá-la ou
descartá-la. Uma observação sem descoberta nunca altera estado sozinha, mas pode
registrar a consequência narrativa de uma tentativa.

As transições são calculadas apenas no backend. Identificadores de linhas privadas,
requisitos ainda não descobertos, regras de descarte do caso, condições de operação e
resultado futuro permanecem privados. O DTO público não pode informar o próximo local,
carta, pessoa, eixo ausente ou operação bloqueada. GD-02 poderá consultar operações
somente para uma hipótese mecânica `sustained`, sem expor a regra que a sustentou.

- [x] **GD-01 — Definir estados de hipótese** `[Definição] [Back] [Front]`
  - Modelar hipótese como estado explícito: em apuração, plausível, sustentada, contestada e descartada.
  - Definir quais categorias públicas de evidência podem fortalecê-la: meios, oportunidade e vínculo.
  - Critério de aceite: o estado da hipótese pode ser apresentado sem expor condições futuras ou a solução do caso.

- [ ] **GD-02 — Definir operações investigativas** `[Definição] [Back] [Front]`
  - Substituir o comando de acusação por uma ou mais operações narrativas de fim de caso.
  - Estabelecer pré-requisitos, custo, consequência de sucesso, consequência de tentativa incompleta e disponibilidade na Rodada 6.
  - Critério de aceite: a decisão final é compreensível em ficção e não pede que o jogador preencha eixos manualmente.

- [ ] **GD-03 — Consolidar economia de PA e cartas** `[Definição] [Back]`
  - Tornar uma única regra oficial para renovação de mão, descarte voluntário, cartas temporárias e apoio de plantão.
  - Confirmar a prioridade de descontos, custos de cartas e gastos especializados.
  - Critério de aceite: documentação, UI e motor calculam o mesmo custo e a mesma disponibilidade de carta.

- [x] **GD-04 — Criar matriz de margem de erro** `[Definição] [Test]`
  - Mapear, por investigador, o menor custo para obter uma hipótese sustentada e quantas ações de curiosidade ainda cabem antes da Rodada 5 e da Rodada 6.
  - Cobrir cartas ausentes, deslocamentos, conversas, pistas falsas e uso opcional do apoio.
  - Critério de aceite: cada investigador solo possui uma rota sem carta obrigatória e suporta ao menos três ações não decisivas até a conclusão na Rodada 6.

### P1 — Motor autoritativo de hipóteses e operações

- [x] **GD-05 — Implementar entidade de hipótese investigativa** `[Back]`
  - Criar entidades e Value Objects tipados para hipótese, eixo de evidência, sustentação e contestação.
  - Não reutilizar arrays de chaves genéricas para controlar estados de dedução.
  - Critério de aceite: o domínio calcula a prontidão de uma hipótese de modo determinístico e testável.

- [x] **GD-06 — Implementar conexões coerentes** `[Back] [Front]`
  - Restringir conexões formais a evidências válidas e impedir que conexões irrelevantes satisfaçam a condição de operação.
  - Preservar hipóteses livres como anotações sem custo, separadas das conexões que têm efeito mecânico.
  - Critério de aceite: não é possível cumprir a prontidão conectando pistas aleatórias, duplicadas ou refutadas.

- [ ] **GD-06A — Separar relação no mural de cruzamento investigativo** `[Back] [Front] [Definição]`
  - A ligação visual entre evidências confirmadas e coerentes deve ser gratuita: ela registra a linha de raciocínio do jogador no mural e não consome PA.
  - O gasto de PA fica reservado para um cruzamento investigativo que produz efeito concreto, como validar uma relação, confrontar uma declaração, proteger uma prova ou abrir uma nova oportunidade.
  - A prontidão de hipótese e operação deve avaliar cobertura dos eixos e relações coerentes; não pode depender de uma contagem genérica de conexões formais.
  - Separar os contratos, casos de uso e apresentação das duas intenções para que uma ligação visual nunca seja confundida com uma ação investigativa.
  - Critério de aceite: o jogador pode organizar livremente o mural sem custo; PA só é gasto quando a relação gera consequência mecânica real; não existe conexão de preenchimento para liberar operação.

- [x] **GD-07 — Implementar preparação e resolução de operação** `[Back] [API]`
  - Criar casos de uso separados para consultar operações disponíveis, preparar uma operação e resolver seu resultado.
  - Operação incompleta deve manter a partida ativa quando ainda houver prazo e registrar consequência útil.
  - Depende da revisão de conexões em `GD-06A` antes de ser considerado consolidado.
  - Critério de aceite: o backend nunca entrega operações, resultados ou requisitos ainda bloqueados além do necessário para a decisão atual.

- [x] **GD-08 — Reequilibrar especialidades para a rota principal** `[Back] [Definição]`
  - Garantir que os PA técnico, social e de pesquisa possam reduzir pressão da rota investigativa de formas equivalentes.
  - Dar à especialidade social um ganho investigativo concreto, sem transformar conversas em revelação automática da solução.
  - Critério de aceite: em testes de orçamento, os quatro investigadores têm margem semelhante para erro e exploração.

### P2 — Interface, comunicação e experiência

- [x] **GD-09 — Criar painel de hipóteses no mural** `[Front]`
  - Mostrar progresso por linhas de raciocínio e evidências já conhecidas, sem barras de “culpado correto” ou indicação do próximo local.
  - Diferenciar claramente hipótese livre, hipótese plausível e hipótese sustentada.
  - Critério de aceite: um jogador entende por que sua teoria ganhou ou perdeu força sem receber solução pronta.

- [x] **GD-10 — Substituir a interface de acusação por preparação de operação** `[Front] [Back]`
  - Remover seleção manual de suspeito e dos três eixos como condição de interface.
  - Apresentar operações disponíveis, seus riscos narrativos e o estado geral de preparação.
  - Critério de aceite: um jogador pode concluir a missão sem uma tela de “acusação”.

- [x] **GD-11 — Criar feedback de recuperação sem spoiler** `[Front] [Back]`
  - Comunicar tentativa incompleta como inconsistência, nova observação ou tempo perdido, sem indicar a prova/local exato ausente.
  - Na Rodada 6, comunicar que só confirmações e decisões de encerramento permanecem possíveis.
  - Critério de aceite: o jogador sabe que ainda pode agir e por que sua teoria não se sustentou, sem receber um guia de solução.

- [ ] **GD-11A — Unificar notificações de investigação** `[Front] [Back]`
  - Substitui `05C · NOTIF-01` do backlog principal.
  - Notificar descoberta, pista refutada, hipótese fortalecida ou contestada, operação disponível, falha de ação e evento de rodada.
  - Critério de aceite: as mensagens derivam de eventos autoritativos e continuam consistentes entre participantes em uma futura sala cooperativa.

- [ ] **GD-12 — Revisar onboarding e linguagem de regras** `[Front] [Docs]`
  - Explicar diferença entre pista, conexão, hipótese e operação no tour opcional e no Diário.
  - Priorizar exemplos de mecânica neutros, sem conteúdo secreto de caso.
  - Critério de aceite: uma pessoa nova entende como progredir sem instrução externa.

### P3 — Conteúdo, regressão e validação

- [ ] **GD-13 — Adaptar o Caso 01 ao sistema de operações** `[Back] [Definição]`
  - Reescrever apenas o conteúdo privado do caso para mapear evidências, hipóteses, pistas falsas e operações.
  - Manter solução, condições futuras e árvore completa exclusivamente no backend/conteúdo privado.
  - Critério de aceite: existem múltiplas rotas sem carta obrigatória até a operação correta.

- [ ] **GD-13A — Externalizar e versionar conteúdo de casos** `[Back] [Definição]`
  - Substitui `31 · CONTEUDO-01` do backlog principal.
  - Modelar conteúdo privado versionado para evidências, diálogos, hipóteses, operações e resultados; validar por schema antes de publicar.
  - Manter conteúdo secreto no backend e entregar ao cliente apenas opções e resultados já desbloqueados.
  - Critério de aceite: um novo caso pode ser criado ou corrigido sem mudar o motor, sem expor solução ou condições futuras.

- [ ] **GD-14 — Criar simulador de roteiro e orçamento** `[Test] [Back]`
  - Testar rotas mínimas, rotas com curiosidade, pistas falsas, ausência de carta útil e cada investigador ativo.
  - Tornar o cenário de primeira partida uma regressão automatizada.
  - Critério de aceite: a suíte demonstra vitória até a Rodada 6 com três ações não decisivas e sem depender de aleatoriedade.

- [ ] **GD-15 — Conduzir playtest de iniciantes** `[Pesquisa]`
  - Observar pessoas que não conhecem a solução e registrar rodada de primeira hipótese, operações tentadas, uso de PA, compreensão do mural e sensação de frustração.
  - Critério de aceite: a maioria compreende a hipótese principal antes do encerramento e nenhum participante relata que precisou adivinhar a interface final.

- [ ] **GD-16 — Atualizar documentos de regra e backlog principal** `[Docs]`
  - Após as decisões D-01 a D-06, tornar uma única documentação a fonte oficial de turno, PA, cartas, hipótese e operação.
  - Mover tarefas aprovadas para `BACKLOG.md` na ordem de implementação escolhida.
  - Critério de aceite: não há conflito entre documentação de produto, backlog e comportamento implementado.

- [ ] **GD-17 — Avaliar medidor de pressão do caso** `[Front] [Back] [Definição]`
  - Substitui `32 · JOGO-06` do backlog principal e depende de `GD-04`, `GD-08`, `GD-14` e `GD-15`.
  - Decidir se a pressão adiciona escolhas interessantes sem reduzir a margem mínima para iniciantes; só então definir eventos, ações e cartas que a alteram.
  - Critério de aceite: a pressão é comunicada claramente, tem efeitos concretos e não torna cartas, apoio ou uma rota específica obrigatórios.

## Ordem recomendada

1. D-01 a D-06 e GD-01 a GD-04.
2. GD-05 e GD-06, com testes de domínio desde o início.
3. GD-06A; então revalidar GD-07 e GD-08 contra a economia de PA revisada.
4. GD-09 a GD-12, incluindo GD-11A.
5. GD-13, GD-13A e GD-14.
6. GD-15; ajustar o balanceamento conforme dados.
7. GD-17 depois de validar a economia de PA.
8. GD-16 somente depois de validar o fluxo.

## Métricas de validação

- Primeira hipótese plausível formada até a Rodada 3 na maioria dos playtests.
- Hipótese sustentada disponível até a Rodada 5 em uma rota bem conduzida.
- Conclusão possível até a Rodada 6 após pelo menos três ações não decisivas.
- Nenhuma vitória depende de carta, investigador de apoio ou pergunta específica.
- Nenhuma operação revela a solução antes de o jogador possuir evidências suficientes.
- Nenhuma ação válida deixa a partida sem uma forma de encerrar turno, recuperar informação ou concluir dentro do prazo restante.
