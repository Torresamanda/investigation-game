# Backlog do MVP — Cidade das Brumas

Legenda: **P0** bloqueia uma partida consistente; **P1** implementa a mecânica principal do Caso 01 e correções que podem alterar seu resultado; **P2** prepara cooperação, segurança e entrega; **P3** reúne refinamentos de interface. A numeração de dois dígitos define a ordem de execução recomendada dentro de cada prioridade; sufixos em letra entram depois do número-base e antes do próximo número. Tags: `[Front]` interface e experiência, `[Back]` API e regras autoritativas, `[Definição]` conteúdo ou decisão de design necessária antes da implementação.

> Regra de prioridade: uma tarefa que implementa ou protege a mecânica do jogo vem antes de qualquer refinamento visual. A interface deve comunicar regras já funcionais; refinamentos de layout, animação e apresentação ficam para depois da mecânica principal.

## Ordem de Execução Recomendada para a Próxima IA

Para evitar *softlocks*, travamentos de baralho ou retrabalho arquitetural, execute as próximas tarefas pendentes exatamente nesta sequência:

1. **Fundação, Arquitetura e Anti-Desincronização (`P0` / `P1` Base):**
   - Concluído: `01A · ARQ-01`, `04A · SEC-03`, `04B · ARQ-02`, `23B · SEC-04`, `18 · BUG-03` e `03F · ARQ-03`.

2. **Prevenção de *Softlocks* em Diálogos e Cartas (`P1` Conversas e Baralho):**
   - Concluído: `12A · CASO-08`, `13 · CASO-03`, `04C · JOGO-05` e `04D · BUG-06`.
   - A virada de turno recolhe e embaralha as cartas não usadas e distribui uma mão nova de exatamente quatro cartas; as cartas usadas continuam no descarte.

3. **Motor do Caso 01, Economia de PA e Investigadores (`P1` Core Loop):**
   - Concluído: `07 · CASO-04` (descobertas cumulativas por local/rodada) e `08 · CASO-05` (deslocamento e desbloqueio do Corredor de Serviço).
   - Concluído: `10 · INV-01` (passivas de Lívia, Rafael, Isadora e Otávio; custo e viabilidade refletidos na interface).
   - Concluído: `09 · CASO-06` + `09A · BUG-05` (eventos aplicados no servidor e abertura da Rodada 4 condicionada às evidências confirmadas no diário).
   - Concluído: `14 · INV-02` (rotas investigativas alternativas e efeitos de cartas).

   - **Pendente (`P0`/`P1` Correções do Playtest End-to-End):**
     - `14A · JOGO-07` → Liberdade de uso de cartas em qualquer local e remoção de spoilers de local/rodada (permitir usar as cartas em qualquer cenário com sua ação compatível, gerando descobertas/observações contextuais daquele local sem travas de `locationId === '...'` ou `round >= X`, e proibir mensagens de erro que revelem locais ou rodadas futuras).
     - `15 · INV-03` → Implementar de fato o Apoio de Plantão no modo solo (`RequestSupportCardUseCase`, endpoint `POST /api/matches/:id/support-card`, `hasUsedSupportThisRound`, desconto de 1 PA na carta puxada do apoio e botão na UI; apenas a devolução ao `card.ownerId` no descarte havia sido feita).
     - `16A · BUG-07` → Corrigir os bugs de fluxo encontrados no playtest das Rodadas 1–6 (manter cartas `temporary: true` fixas na mão mesmo além do limite de 4 cartas base — ex.: 5+ cartas na mão — até o jogador decidir usá-las ou descartá-las; validação de `currentLocationId` e clique redundante no local atual; unificação das conexões de Otávio/cartas com `journalConnections` sem cobrar +1 PA compulsório quando Otávio quiser apenas pesquisar; desconto correto de `trace-marker` na próxima análise; `ownerDeck` no `CreateJournalConnectionUseCase`).

4. **Diário, Conexões e Acusação (`P1` Fechamento do Caso):**
   - Concluído: `05 · DIARIO-01` + `06 · DIARIO-03` → Separar categorias do diário e melhorar feedback de ação/alvo.
   - Concluído: `16 · DIARIO-02` → Conexões formais no diário (1 PA base; grátis 1x na Rodada 5 ou via cartas; hipóteses livres a 0 PA).
   - Concluído: `19 · CASO-07` → Acusação e desfechos nas Rodadas 5 e 6 (dossiê validado pelo servidor; 3 PA gerais no modo solo; Rodada 6 encerra a partida sem vitória).
   - Próxima após concluir `14A · JOGO-07`, `15 · INV-03` e `16A · BUG-07`: `17 · UX-01` → Refinar início de partida e estado de conexão.

5. **UX, Refinamentos Visuais e Cooperação (`P2` / `P3`):**
   - `17 · UX-01`, `05A · UX-06`, `05B · UX-07`, `05C · NOTIF-01`, `03A–03G`, seguidos de `COOP`, `AUTH` e `OPS`.

### Prompt de Handoff para a Próxima IA

```text
Leia AGENTS.md, documents/PROJECT_RULES.md, documents/COMMIT_CONVENTIONS.md e documents/BACKLOG.md.
O core loop das Rodadas 1 a 6 e a Acusação (`19 · CASO-07`) foram revisados em playtest e há 3 tarefas prioritárias de mecânica/fluxo que DEVEM ser concluídas antes de avançar para UI/UX (`17 · UX-01`):
1. `14A · JOGO-07` — Remover travas de cenário específico e spoilers de rodada/local nas cartas (`case01-card-effects.ts`): o jogador deve ter liberdade para usar qualquer carta em qualquer local compatível com a ação, recebendo efeitos/observações contextuais daquele ambiente sem mensagens que entreguem "exige Sala de Segurança" ou "a partir da Rodada 2/3".
2. `16A · BUG-07` — Garantir que cartas temporárias ganhas de personagens (`Agenda da Curadoria`, `Ficha de Tratamento`, `Lista de Convidados`, `Mapa de Rondas`) permaneçam fixas na mão entre turnos sem serem embaralhadas no `drawPile` e somando-se às 4 cartas base do baralho (podendo ficar com 5+ cartas na mão até o jogador decidir usá-las), além de corrigir validação de local atual, passiva do Otávio, desconto do `trace-marker` e `ownerDeck` no Diário.
3. `15 · INV-03` — Concluir o Apoio de Plantão no modo solo (`RequestSupportCardUseCase`, rota `POST /api/matches/:id/support-card`, `hasUsedSupportThisRound` e botão na UI para puxar 1 carta do apoio por rodada com desconto de 1 PA).
Siga rigorosamente Clean Architecture, TDD e rode `npm run check` antes de commitar. Nunca faça git push.
```

## P0 — Fundação visual transversal

- [x] **00 · ICON-01 — Adotar Phosphor Icons como sistema único de ícones** `[Front] [Definição]`
  - Adicionar a biblioteca Phosphor Icons ao projeto e criar `src/components/icons/` como ponto único de exportação dos ícones aprovados.
  - Substituir símbolos textuais, setas, sinais de fechar, marcadores e ícones de ação existentes por componentes desse catálogo.
  - Definir tamanhos, espessuras, rótulos acessíveis e estados de foco coerentes com a identidade visual do jogo.
  - Critério de aceite: nenhum ícone de interface é importado diretamente fora da pasta de ícones; os controles mantêm tamanho legível em desktop e celular.

## P3 — Refinamentos de fluxo e feedback

- [ ] **05A · UX-06 — Confirmar encerramento de turno com PA restantes** `[P1] [Front] [Definição]`
  - Ao encerrar o turno com PA utilizáveis, abrir modal com a quantidade disponível e as opções `Continuar investigando` e `Encerrar turno`.
  - Não abrir confirmação se não houver PA aplicáveis ou se o turno já estiver esgotado.
  - Critério de aceite: cancelar preserva integralmente o estado; confirmar encerra uma única vez e avança a rodada quando aplicável.

- [ ] **05B · UX-07 — Sinalizar descoberta de pista nova** `[Front] [Back]`
  - Quando a API registrar uma pista, destacar a descoberta sem exigir que o jogador procure pelo diário.
  - Avaliar abrir o Diário diretamente na aba `Pistas` ou exibir um toast estilizado conforme a identidade visual do projeto.
  - Critério de aceite: uma descoberta mostra título, origem e ação de consulta; uma observação sem nova pista não usa o mesmo destaque.

- [ ] **05C · NOTIF-01 — Criar serviço geral de notificações do jogo** `[Front] [Back] [Definição]`
  - Definir eventos de notificação para descoberta, desbloqueio, atualização de cronologia, falha de ação e eventos de rodada.
  - Criar contrato de API e serviço no backend que gere notificações para a partida; o frontend apenas as apresenta e marca como vistas.
  - Critério de aceite: uma mesma notificação pode ser exibida de modo consistente para todos os participantes da partida cooperativa.

## P3 — Ajustes de interface e conteúdo

- [ ] **03A · UI-01 — Ajustar identificação do apoio de plantão** `[Front]`
  - Posicionar o texto `Apoio de plantão` imediatamente acima do seletor de investigador.
  - Aplicar cursor `pointer` ao seletor e estados de foco consistentes com os demais controles.
  - Critério de aceite: o rótulo descreve claramente o seletor associado e o cursor comunica que o campo é interativo.

- [ ] **03B · UI-02 — Reposicionar ação de retorno ao mundo** `[Front]`
  - Posicionar o botão `Retornar ao mundo` imediatamente acima de `Museu de História de Véspera · Caso 01`.
  - Preservar a confirmação de abandono prevista em UX-04.
  - Critério de aceite: a hierarquia visual separa a navegação de abandono do contexto do caso.

- [ ] **03C · UI-03 — Exibir dificuldade do Caso 01 no mapa** `[Front] [Definição]`
  - Adicionar três estrelas ao resumo `Caso 01 · Introdução`, com uma estrela colorida para indicar dificuldade fácil.
  - Definir componente reutilizável para futuras classificações de caso.
  - Critério de aceite: a dificuldade é entendida sem depender apenas de cor e não interfere no resumo do caso.

- [ ] **03D · UI-04 — Estilizar barras de rolagem** `[Front]`
  - Aplicar cores, largura, trilho e indicador de rolagem coerentes com a identidade visual do jogo.
  - Cobrir navegadores baseados em WebKit e Firefox, preservando contraste e visibilidade do controle.
  - Critério de aceite: painéis com conteúdo rolável não exibem a barra padrão do navegador e continuam utilizáveis por mouse, toque e teclado.

- [ ] **03E · UI-05 — Centralizar ações com ícone e texto** `[Front]`
  - Centralizar horizontal e verticalmente ícone e rótulo nos botões `Encerrar turno` e `Retornar ao mundo`.
  - Preservar espaçamento legível, área clicável e alinhamento em desktop e celular.
  - Critério de aceite: ícone e texto formam um conjunto visualmente centralizado sem deslocamento em nenhum breakpoint suportado.

- [x] **03F · ARQ-03 — Dividir store monolítica, extrair composables e remover efeito colateral do router** `[P2] [Front]`
  - Separar `useInvestigationStore` por responsabilidade: estado autoritativo da partida (`useMatchStore`) e rascunhos/hipóteses locais (`useNotesStore`), extraindo a orquestração de UI da tela de investigação para composables focados.
  - Remover o efeito colateral `abandonInvestigation()` do hook global `router.afterEach` em `src/app/router.ts`, acionando o abandono apenas por ação explícita do jogador.
  - Critério de aceite: cada store e composable possui responsabilidade única e o roteador cuida apenas de navegação e guardas de acesso.

- [ ] **03G · UI-06 — Componentizar elementos repetidos e externalizar classes CSS compartilhadas** `[P3] [Front]`
  - Extrair padrões visuais recorrentes (cabeçalhos de seção com `eyebrow` e título, botões com ícone, badges de PA e itens de lista do diário) para componentes apresentacionais puros (`props`/`emit`) em `src/components/ui/`.
  - Externalizar e centralizar classes CSS repetidas (painéis, botões, badges, tipografia auxiliar e cabeçalhos) e tokens (`:root`) em `src/styles/`, deixando em `src/features/<feature>/styles/` apenas o layout específico da tela.
  - Garantir espaçamento claro entre classes, funções e blocos lógicos, nomenclatura alinhada ao domínio e importação de ícones exclusivamente via `src/components/icons/`.
  - Critério de aceite: não há duplicação de estilos base entre features, componentes genéricos não acessam stores diretamente e nenhum ícone é importado fora de `src/components/icons/`.

- [ ] **06A · BUG-04 — Corrigir separação de título e conteúdo em observações** `[P3] [Front]`
  - Inserir separação visual e textual após `Nenhuma descoberta nova`, incluindo `:` antes do conteúdo da observação.
  - Critério de aceite: título e mensagem não aparecem unidos em interface, leitor de tela ou diário.

- [x] **09A · BUG-05 — Remover antecipação do suspeito na abertura da Rodada 4** `[P1] [Front] [Back] [Definição]`
  - Substituir a mensagem que nomeia Raul por uma formulação neutra enquanto ele não tiver sido associado pelo diário do jogador.
  - Definir condição de conteúdo para liberar menções diretas somente depois das pistas adequadas.
  - Critério de aceite: chegar à Rodada 4 sem investigar Raul não revela sua participação por meio da narrativa de Sofia.

## P0 — Consolidar a partida no servidor

- [x] **01 · JOGO-01 — Unificar o motor de regras no backend** `[Front] [Back]`
  - Mover mão, compra, descarte, PA, rodada e cartas preparadas para o estado da partida no servidor.
  - Remover a duplicidade temporária entre o motor local do frontend e a API.
  - Critério de aceite: recarregar o cliente e buscar a partida retorna exatamente a mesma mão, PA, rodada e diário enquanto o servidor estiver em execução.

- [x] **01A · ARQ-01 — Unificar tipos, contratos e regras puras de PA em `shared/`** `[P0] [Front] [Back]`
  - Extrair identificadores primitivos (`InvestigatorId`, `LocationId`, `PersonId`, `InvestigationAction`), DTOs públicos da partida e a função pura `canPayAction` para `shared/`.
  - Corrigir a lógica de `canExecute` em `src/stores/investigation.ts` (que somava pontos de especialidade mesmo em ações incompatíveis) e remover a exigência de `mission.value` local quando `remoteMatch` estiver ativo.
  - Critério de aceite: frontend e backend importam a mesma função `canPayAction` de `shared/`; botões de ação só são habilitados quando os PA gerais e de especialidade compatíveis cobrem o custo real.

- [x] **03 · JOGO-02 — Resolver cartas no servidor** `[Front] [Back] [Definição]`
  - Enviar o identificador da carta e a ação escolhida para a API.
  - Validar dono, contexto, compatibilidade, custo e descarte exclusivamente no backend.
  - Critério de aceite: uma carta incompatível não pode ser aplicada pela interface nem por uma chamada direta à API.

- [x] **04 · JOGO-03 — Corrigir o estado de preparação de carta** `[Front] [Back]`
  - Registrar no servidor qual carta está preparada e limpar essa escolha ao usá-la, removê-la ou encerrar o turno.
  - Critério de aceite: dois clientes que consultam a mesma partida veem a mesma carta preparada.

- [x] **04A · SEC-03 — Ocultar baralho de compra e chaves internas nas respostas da API (`MatchPresenter`)** `[P0] [Front] [Back]`
  - Criar `MatchPresenter` em `server/src/http/presenters/` para transformar a entidade de domínio em DTO público antes de enviá-la nas respostas HTTP.
  - Expor apenas `hand` do investigador ativo e contadores numéricos (`drawPileCount` e `discardPileCount`), removendo `drawPile` ordenado, baralho completo do apoio e `resolvedKeys` do payload público.
  - Critério de aceite: inspecionar qualquer resposta de `/api/matches/*` no navegador não revela a sequência de próximas cartas a comprar nem chaves internas de controle.

- [x] **04B · ARQ-02 — Refatorar backend em camadas estritas de Clean Architecture e Domínio Rico** `[P1] [Back]`
  - Dividir `MatchService` em Casos de Uso independentes por responsabilidade (`CreateSoloMatchUseCase`, `ResolveActionUseCase`, `ResolveConversationUseCase`, `PrepareCardUseCase`, `EndTurnUseCase`) e mover `InMemoryMatchRepository` para `server/src/infrastructure/`.
  - Modelar `Match`, `InvestigatorDeck` e `TurnState` como entidades/Value Objects ricos que protegem suas invariantes, substituindo o array de strings mágicas `resolvedKeys` por estruturas tipadas e eliminando a dependência circular entre `match.ts` e `match-deck.ts`.
  - Extrair a resolução narrativa hardcoded do Caso 01 (`resolveCaseAction` e diálogos) para uma porta `CaseContentRepository` implementada na infraestrutura.
  - Critério de aceite: cada classe, entidade, caso de uso e repositório reside em seu próprio arquivo com responsabilidade única, e `domain/` não possui dependências externas.

- [x] **04C · JOGO-05 — Permitir descarte voluntário de 1 carta por rodada** `[P1] [Front] [Back] [Definição]`
  - Permitir que o investigador descarte voluntariamente até 1 carta preparada da mão durante a rodada e receba reposição imediata até `INITIAL_HAND_SIZE` (4 cartas), prevenindo bloqueio de mão cheia (*hand clogging*) com cartas contextuais ou temporárias.
  - Respeitar `card.ownerId` no descarte para que cartas do apoio retornem ao `discardPile` do apoio e cartas temporárias sejam descartadas sem entrar na reciclagem permanente.
  - Critério de aceite: o jogador com 4 cartas travadas consegue renovar 1 carta por rodada sem precisar forçar uma ação incompatível.

- [x] **04D · BUG-06 — Corrigir ciclo da mão ao encerrar turno, destino de cartas temporárias e estado de carta preparada no descarte** `[P0] [Front] [Back]`
  - **1. Limpar `preparedCardInstanceId` ao descartar (`server/src/application/use-cases/discard-card-use-case.ts`):** Ao executar `DiscardCardUseCase`, definir `preparedCardInstanceId: null` (se a carta descartada era a preparada) no `SoloMatch` persistido, evitando que `ResolveActionUseCase` lance erro `400 ("A carta não pode ser usada nesta ação.")` na ação seguinte por apontar para uma carta que já saiu da mão.
  - **2. Reembaralhar a mão ao iniciar o próximo turno (`server/src/application/use-cases/end-turn-use-case.ts` e `server/src/domain/match-deck.ts`):** Recolher as cartas não usadas da mão ao monte de compra, embaralhá-lo e distribuir uma mão nova de exatamente `INITIAL_HAND_SIZE` (4) cartas. Se necessário, embaralhar o descarte para completar quatro.
  - **3. Entregar cartas temporárias na `hand` e removê-las ao usar em ações (`server/src/domain/match-deck.ts`, `resolve-conversation-use-case.ts` e `resolve-action-use-case.ts`):** Substituir `addTemporaryCardToDrawPile` por `addTemporaryCardToHand` em `ResolveConversationUseCase` para que recompensas de conversa (`Agenda da Curadoria`, `Ficha de Tratamento`, `Lista de Convidados`, `Mapa de Rondas`) entrem imediatamente na mão de quem conduziu a conversa. Em `ResolveActionUseCase` e `ResolveConversationUseCase`, usar `recycleCardFromHand` em vez de `discardFromHand` ao consumir a carta preparada, garantindo que cartas `temporary: true` sejam eliminadas após o uso e cartas do apoio retornem para `decks[card.ownerId].discardPile`.
  - **4. Somar custo da carta preparada e expor requisito de bloqueio em `getConversationOptions` (`server/src/application/match-service.ts` e `ConversationDialog.vue`):** Em `getConversationOptions`, calcular `canResolve` somando o custo da pergunta (`bonusQuestion ? 0 : cost`) ao custo da carta preparada compatível (`preparedCard?.cost ?? 0`), impedindo que perguntas fiquem clicáveis quando preparar `Gravador de Bolso` (1 PA) exceder os PA disponíveis. Incluir também a string `blockedReason` no retorno de cada pergunta bloqueada e exibi-la no modal (`Diálogo bloqueado: necessário evidência — <blockedReason>`).
  - Critério de aceite: descartar uma carta limpa `preparedCardInstanceId` no servidor; a virada de turno randomiza a mão e sempre distribui 4 cartas; cartas temporárias entram direto na mão ao conversar e somem após usadas; preparar carta de custo > 0 em conversa atualiza `canResolve` corretamente.

- [x] **20 · JOGO-04 — Persistir partidas e diário** `[Back]`
  - Substituir o repositório em memória por SQLite local durante o MVP.
  - Persistir partida, ações, diário, cartas e hipóteses compartilhadas.
  - Critério de aceite: reiniciar a API não apaga uma partida existente.

## P1 — Conversas e investigação do Caso 01

- [x] **11 · CASO-01 — Criar diálogos por pessoa de interesse** `[Front] [Back] [Definição]`
  - Ao selecionar uma pessoa e escolher `Conversar`, abrir uma conversa contextual no local atual.
  - Oferecer três perguntas disponíveis, com texto, custo e resultado narrativo.
  - Critério de aceite: cada pergunta só pode ser usada quando a pessoa estiver disponível naquele local e produz um registro no diário.

- [x] **12 · CASO-02 — Dar escolhas reais às três perguntas** `[Back] [Definição]`
  - Incluir uma pergunta de apuração, uma de pressão e uma de contexto para cada conversa relevante.
  - Variar declarações, pistas, contradições ou bloqueios conforme pergunta, rodada e evidências existentes.
  - Critério de aceite: escolher perguntas diferentes muda o conteúdo do diário ou as próximas oportunidades da missão.

- [x] **12A · CASO-08 — Prevenir bloqueio permanente de diálogos, alinhar timing de recompensas e indicar presença por local** `[P1] [Front] [Back] [Definição]`
  - Exibir perguntas de confronto/pressão que dependem de evidência prévia (ex.: Helena sobre acesso institucional, Marta sobre digitais, Raul sobre queda de energia e Davi sobre mensagem) como **desabilitadas** no modal de conversa com aviso claro (`Diálogo bloqueado: necessário evidência — <requisito>`), impedindo que o jogador queime permanentemente a pergunta antes de cumprir o pré-requisito.
  - Disponibilizar as perguntas específicas que concedem cartas temporárias de Davi (`collectors` → `Lista de Convidados`) e Raul (`security-procedure` → `Mapa de Rondas`) somente a partir da **Rodada 2**, evitando que sejam consumidas na Rodada 1 sem entregar a recompensa.
  - Manter Davi Orsini alocado na `Galeria Principal` (alinhado aos 4 locais iniciais) e sinalizar visualmente em `SuspectRoster` / `SuspectProfile` quais pessoas de interesse estão presentes no local selecionado (desabilitando ou informando o local correto quando ausentes).
  - Critério de aceite: nenhuma pergunta com pré-requisito ou carta temporária pode ser perdida permanentemente por *timing* precoce, e o jogador sabe exatamente quem está presente em cada sala antes de acionar `Conversar`.

- [x] **13 · CASO-03 — Integrar cartas de conversa** `[Front] [Back] [Definição]`
  - Permitir preparar uma carta compatível antes de escolher uma pergunta e permitir também que `Pausa Calculada` seja preparada/acionada **após** a primeira pergunta do turno para abrir imediatamente uma pergunta adicional a custo `0 PA`.
  - Aplicar cartas de Isadora em conversa e entregar cartas temporárias de suspeitos quando as condições forem atendidas.
  - Substituir no MVP a penalidade de "avançar pressão da imprensa" da `Lista de Convidados` por uma regra concreta de PA (ex.: custo normal de `1 PA` na pesquisa ou `+1 PA` fora do Escritório da Curadoria), deixando o medidor global de imprensa para evolução futura.
  - Critério de aceite: `Gravador de Bolso` registra uma declaração utilizável depois; `Pausa Calculada` abre uma pergunta adicional sem substituir a conversa base (tanto preparada antes quanto após a 1ª pergunta).

- [x] **07 · CASO-04 — Implementar descobertas de todos os locais e rodadas** `[Front] [Back] [Definição]`
  - **Escopo técnico (`server/src/infrastructure/content/case01-content-repository.ts` e `shared/`):**
    - Remover a trava `match.round === 1` da Galeria Principal e modelar todas as descobertas oficiais dos 5 locais (`gallery`, `security`, `laboratory`, `office`, `service-corridor`) usando condições cumulativas `match.round >= minRound` combinadas com pré-requisitos em `resolvedKeys`. Pistas físicas e documentais **nunca expiram** ao avançar de rodada.
    - Mapear as descobertas da simulação oficial (`docs/private/simulacao-caso-01-o-vazio-na-vitrine (1).md`):
      - **Galeria (`gallery`):** `Examinar` vitrine (`round >= 1` → `E1 unconfirmed`, chave `'gallery-lock'`); `Examinar` pedestal (`round >= 1` → indício de óleo/poeira para `E4`, chave `'gallery-pedestal'`); `Examinar` porta de serviço (`round >= 3` → `E4 unconfirmed` + desbloqueia Corredor de Serviço, chave `'gallery-service-door'`); `Analisar` vitrine (`requires: 'gallery-lock'` → confirma `E1`, chave `'e1-confirmed'`).
      - **Sala de Segurança (`security`):** `Pesquisar` relatório inicial (`round >= 1` → linha do tempo 22h14–22h21, chave `'security-initial-report'`); `Pesquisar` registros do terminal (`round >= 2` → `E3 unconfirmed` lacuna às 22h13, chave `'security-log-gap'`); `Analisar` relatório de apagão (`round >= 3` → confirma `E2` acionamento manual às 22h14, chave `'e2-confirmed'`); `Analisar` lacuna de registros (`round >= 3`, `requires: 'security-log-gap'` → confirma `E3` exclusão no terminal da segurança, chave `'e3-confirmed'`); `Pesquisar` controle de acesso (`round >= 4` → confirma `E6` retorno do cartão de Raul às 22h16, chave `'e6-confirmed'`).
      - **Laboratório (`laboratory`):** `Examinar` ou `Analisar` ferramentas de Marta (`round >= 1` → pista falsa sobre marcas de ferramenta; se usar carta `treatment-sheet` ou analisar após `'gallery-lock'`, refuta a pista falsa datando-a da semana anterior, chave `'marta-tools-refuted'`).
      - **Curadoria (`office`):** `Pesquisar` avaliação do seguro (`round >= 1` → pista falsa do seguro; se usar `curator-agenda` ou pesquisar em `round >= 2`, refuta a pista falsa confirmando exigência prévia da seguradora, chave `'helena-insurance-refuted'`).
      - **Corredor de Serviço (`service-corridor`):** `Examinar` piso e área técnica (`round >= 3`, `requires: 'gallery-service-door'` → confirma `E4` óleo recente até área técnica, chave `'e4-confirmed'`); `Pesquisar` arquivo técnico (`round >= 4`, `requires: 'gallery-service-door'` → `E5 unconfirmed` relatório de câmera inoperante adiada pela segurança, chave `'corridor-camera-report'`, confirmável via conversa com Helena ou análise); `Analisar` resíduo do corredor (`round >= 5`, `requires: 'e4-confirmed'` → confirma óleo do carrinho da segurança).
    - Expandir o status de `JournalEntry` para suportar `'indicio' | 'unconfirmed' | 'confirmed' | 'refuted' | 'note' | 'recorded' | 'contestable' | 'blocked'` (ou equivalente em inglês consistente com o domínio) e indicar claramente no título/conteúdo do retorno qual elemento específico do local foi examinado/analisado.
  - Critério de aceite: a rota E1–E6 e a refutação das pistas falsas podem ser concluídas em qualquer ordem válida de visitação (`round >= minRound`) sem *softlock* por rodada e sem expor a solução futura no frontend.

- [x] **08 · CASO-05 — Liberar locais e deslocamento** `[Front] [Back] [Definição]`
  - **Escopo técnico (`shared/domain/identifiers.ts`, `SoloMatch`, `LocationsPanel.vue` e rota de deslocamento):**
    - Adicionar `'service-corridor'` (`Corredor de Serviço`) a `locationIds` e ao catálogo visual `src/content/case01.ts`, mantendo-o oculto/bloqueado no início da partida (`unlockedLocations: ['gallery', 'security', 'laboratory', 'office']`).
    - Rastrear no servidor o local atual do investigador (`currentLocationId: LocationId`, iniciando em `'gallery'`) e se o deslocamento gratuito da rodada já foi utilizado (`hasUsedFreeMoveThisRound: boolean`, resetado para `false` em `EndTurnUseCase`).
    - Criar caso de uso e endpoint `POST /api/matches/:id/move` (recebendo `locationId`):
      - Validar se o destino está em `unlockedLocations` (rejeitar com `DomainError` caso bloqueado).
      - Se `hasUsedFreeMoveThisRound === false`, mover com custo `0 PA` e marcar `hasUsedFreeMoveThisRound = true`.
      - Se `hasUsedFreeMoveThisRound === true`, exigir e descontar `1 PA` geral.
    - Desbloquear automaticamente `'service-corridor'` quando a chave `'gallery-service-door'` (ou carta de acesso aplicável a partir da Rodada 3) for resolvida.
    - Na interface (`LocationsPanel.vue`), exibir o custo do deslocamento (`Grátis (1º da rodada)` ou `1 PA`) e substituir o botão estático `Área não descoberta` pelo `Corredor de Serviço` ativo assim que desbloqueado.
  - Critério de aceite: o primeiro deslocamento de cada rodada custa `0 PA`, os seguintes custam `1 PA`, e o `Corredor de Serviço` permanece inacessível até que sua condição de abertura seja cumprida no servidor.

- [x] **09 · CASO-06 — Eventos de abertura e fechamento de rodada** `[Front] [Back] [Definição]`
  - **Escopo técnico (`SoloMatch`, `ResolveActionUseCase`, `ResolveConversationUseCase`, `EndTurnUseCase`):**
    - Aplicar no motor autoritativo os efeitos mecânicos de cada evento de rodada descritos na simulação oficial:
      - **Rodada 1 (`Perímetro preservado`):** O primeiro `Examinar` na Galeria Principal nesta rodada revela um detalhe adicional no registro do diário.
      - **Rodada 2 (`Vazamento para a imprensa`):** A primeira conversa com `helena` ou `davi` na Rodada 2 custa `+1 PA` extra, a menos que o investigador prepare `calculated-pause` (`Pausa Calculada`) ou outra carta social compatível.
      - **Rodada 3 (`Comando manual`):** Registra no diário na abertura da Rodada 3 a confirmação externa de que a queda de energia começou dentro do prédio e habilita o exame da porta de serviço na Galeria.
      - **Rodada 4 (`Janela de acusação`):** Ao encerrar a Rodada 4 (passando para a Rodada 5), desbloqueia a ação de Acusação (`canAccuse = true`).
      - **Rodada 5 (`Linha do tempo consolidada`):** Concede 1 conexão formal gratuita (`0 PA`) entre duas pistas confirmadas durante a Rodada 5 (`hasFreeConnectionThisRound = true`).
      - **Rodada 6 (`Prazo final`):** Impede o surgimento de pistas inéditas de exploração básica (permitindo apenas analisar pistas pendentes, criar conexões, confrontar inconsistências ou acusar).
  - Critério de aceite: custos, bônus e restrições de cada rodada são validados pelo servidor e comunicados ao jogador na abertura da rodada.

- [x] **19 · CASO-07 — Acusação e desfechos** `[Front] [Back] [Definição]`
  - **Escopo técnico (`AccuseSuspectUseCase`, `POST /api/matches/:id/accuse` e modal de Acusação no frontend):**
    - Desbloquear acusação somente após o encerramento da Rodada 4, disponível nas Rodadas 5 e 6.
    - **Regra de custo Solo vs. Coop:** Em **cooperação**, a acusação deve ser escolhida no início de um turno (`hasActedThisTurn === false`) e consome o turno completo daquele investigador; no **modo solo**, permitir apresentar a acusação em qualquer momento das Rodadas 5 ou 6 desde que o investigador possua e gaste **3 PA** (permitindo que o jogador solo use até 2 PA na Rodada 6 para concluir uma última análise ou conexão antes de acusar).
    - Validar no servidor os 3 pré-requisitos estruturais antes de aceitar o dossiê:
      1. Pelo menos **3 pistas confirmadas** (`status === 'confirmed'`);
      2. Pelo menos **2 conexões formais** registradas no diário;
      3. Preenchimento dos 3 eixos da acusação (**meios**, **oportunidade** e **vínculo**) com pistas confirmadas.
    - Se os pré-requisitos estruturais não forem atendidos, retornar erro de domínio informando apenas que o dossiê ainda não está sustentado (sem gastar o turno/PA e sem encerrar a partida).
    - Se o dossiê estiver sustentado: verificar se o suspeito acusado é `raul` e se as evidências cobrem meios (`E1` ou `E5`), oportunidade (`E2` ou `E6`) e vínculo (`E3`, `E4`, `E5` ou `E6`). Atualizar `match.status` para `'won'` (vitória) ou `'lost'` (derrota, caso acuse outro suspeito ou eixos incompatíveis, **sem revelar quem era o culpado**).
    - Caso o jogador encerre a Rodada 6 em `EndTurnUseCase` sem vitória, encerrar a partida com `status: 'lost'`.
  - Critério de aceite: o jogador solo consegue realizar 1 ação de 2 PA e ainda acusar por 3 PA na Rodada 6; acusações sem os pré-requisitos avisam que falta base; acusações formais encerram a partida em vitória ou derrota sem entregar a resposta em caso de falha.

## P1 — Identidade e especialização dos investigadores

- [x] **10 · INV-01 — Aplicar habilidades passivas por investigador** `[Front] [Back] [Definição]`
  - **Escopo técnico (`ResolveActionUseCase`, `ResolveConversationUseCase`, `shared/domain/action-points.ts`):**
    - **Lívia (`Instinto de Cena`):** O primeiro `Examinar` em cada local por rodada (`examinedLocationsThisRound`) custa `1 PA` a menos (custo base cai de `2 PA` para `1 PA`). Atualizar `canPayAction` / `canExecute` para refletir o custo reduzido de `1 PA` quando o local atual ainda não foi examinado por Lívia na rodada.
    - **Rafael (`Cadeia de Custódia`):** Usa `1 PA` técnico em `Analisar` ou cartas técnicas; uma vez por rodada (`hasUsedPassiveThisRound`), ao analisar uma pista física não verificada, confirma-a imediatamente e registra a validação pericial no diário.
    - **Isadora (`Leitura de Sala`):** Usa `1 PA` social em `Conversar` ou cartas sociais; uma vez por rodada, pode marcar uma declaração registrada como `contestable` e, ao contradizê-la com evidência, recebe `1 PA` social bônus na rodada.
    - **Otávio (`Conexões Ocultas`):** Usa os `2 PA` de pesquisa em `Pesquisar` ou cartas de pesquisa e pode gastar `1 PA` de pesquisa para criar uma conexão no diário entre uma pista confirmada e uma não verificada, revelando uma dica de local ou pergunta.
  - Critério de aceite: o desconto de Lívia e as habilidades de Rafael, Isadora e Otávio funcionam no servidor e na validação de botões da UI, equilibrando o gasto de PA de cada perfil.

- [x] **14 · INV-02 — Criar rotas investigativas alternativas** `[Back] [Definição]`
  - **Escopo técnico (`Case01ContentRepository` e efeitos de cartas):**
    - Garantir que todas as cartas dos baralhos iniciais (`Lanterna Ultravioleta`, `Marcador de Vestígio`, `Mapa de Rotas`, `Credencial de Acesso`, `Lupa Comparativa`, `Câmera Forense`, `Envelope de Custódia`, `Reagente de Traços`, `Transcrição Marcada`, `Cartão de Contato`, `Caixa de Arquivo`, `Fio Cronológico`, `Cruzamento de Registros`, `Selo Institucional`) apliquem seu benefício mecânico real ao serem usadas com uma ação compatível (reduzindo custo da próxima análise, confirmando pista física, organizando cronologia 22h13–22h16–22h21, abrindo acesso restrito ou gerando conexão).
    - Garantir que tanto a **rota técnica** (`E1 + E2 + E3`) quanto a **rota exploratória/documental** (`E4 + E5 + E6`) permitam vencer com qualquer dupla de investigadores.
  - Critério de aceite: nenhuma carta gasta PA em vão sem produzir seu efeito descrito, e a missão pode ser vencida por múltiplas combinações de investigadores.

- [ ] **14A · JOGO-07 — Garantir liberdade de uso de cartas por cenário e eliminar spoilers de local/rodada** `[P0] [Front] [Back] [Definição]`
  - **Problema detectado:** Em `server/src/infrastructure/content/case01-card-effects.ts`, várias cartas bloqueiam a ação do jogador exigindo um único local e uma rodada mínima fixa, além de exibir mensagens de erro com spoilers diretos que apontam para a Sala de Segurança (Raul) e revelam gatilhos de rodadas futuras (ex.: `"O Cartão de Contato exige Pesquisar a Sala de Segurança a partir da Rodada 2"`, `"A Credencial de Acesso exige Pesquisar os arquivos de segurança a partir da Rodada 3"`, `"A Lanterna Ultravioleta exige Examinar a Galeria Principal"`).
  - **Escopo técnico (`server/src/infrastructure/content/case01-card-effects.ts` e `server/src/infrastructure/content/case01-card-effects.test.ts`):**
    1. **Liberdade de cenário (`locationId`):** Permitir que o jogador use suas cartas de `examine`, `research` e `analyse` em **qualquer local investigável** compatível com a ação, sem restringir a carta a uma única sala:
       - **`ultraviolet-flashlight` (`Examinar`):** Na `gallery` ou `service-corridor`, revela o rastro fluorescente de óleo e poeira; em `laboratory`, `security` ou `office`, registra uma observação contextual da varredura UV naquele ambiente (ex.: respingos antigos de verniz e solvente na bancada de restauração; ausência de resíduos anômalos na curadoria/segurança).
       - **`route-map` (`Pesquisar`):** Pode ser usada em qualquer local e em qualquer rodada. Relaciona o local atual às passagens do museu (se usada na `gallery` ou `security`, aponta a ligação técnica com o `service-corridor` e — se `round >= 3` ou se `'gallery-pedestal'` já foi visto — já libera `'gallery-service-door'` / `'service-corridor'`; se já houver duas pistas conectáveis no Diário, também gera `journalConnection`).
       - **`access-credential`, `archive-box`, `institutional-seal` e `contact-card` (`Pesquisar`):** Podem ser usadas em qualquer local e em qualquer rodada sem erro:
         - Em `security`: antecipam/revelam ou confirmam os registros de segurança (`security-log-gap`, `e2-confirmed` ou `e3-confirmed`, sem exigir `round >= 2` ou `round >= 3` quando o jogador está justamente pagando uma carta de recurso/acesso para destravar a informação!).
         - Em `office`: acessam os registros institucionais da curadoria (revelando `'helena-insurance'` ou refutando `'helena-insurance-refuted'` caso já descoberta).
         - Em `laboratory`: consultam o histórico de conservação e inventário técnico (revelando `'marta-tools'` ou refutando `'marta-tools-refuted'`).
         - Em `gallery` ou `service-corridor`: consultam plantas técnicas, ordens de manutenção (`'corridor-camera-report'`) ou histórico da exposição.
    2. **Zero spoilers de local ou rodada em mensagens de bloqueio:**
       - Proibir qualquer string de erro que mencione *"a partir da Rodada X"* ou *"exige <Nome do Local>"*.
       - Cartas que operam sobre registros já coletados pelo jogador (`marked-transcript`, `chronological-thread`, `comparative-magnifier`, `cross-reference`, `custody-envelope`, `trace-reagent`, `trace-marker`) devem validar apenas se o **Diário do jogador** possui os elementos necessários (ex.: *"É necessário ter ao menos uma declaração e uma pista confirmada no diário"*, *"É necessário ter uma pista não verificada neste local"*), sem indicar onde ou quando encontrar pistas.
  - Critério de aceite: o jogador tem liberdade de usar qualquer carta em qualquer local compatível com sua ação sem receber erros de "local errado" ou spoilers de rodada/culpado.

- [ ] **15 · INV-03 — Implementar apoio de plantão no modo solo** `[Front] [Back] [Definição]`
  - **Estado atual:** Apenas a devolução ao `decks[card.ownerId].discardPile` em `recycleCardFromHand` está pronta; falta toda a mecânica de acionar o apoio na partida.
  - **Escopo técnico (`RequestSupportCardUseCase`, `POST /api/matches/:id/support-card` e UI de Apoio):**
    - Adicionar `hasUsedSupportThisRound: boolean` em `SoloMatch` e `PublicMatchDto` (iniciando em `false` e resetado para `false` em `EndTurnUseCase`).
    - Uma vez por rodada (`hasUsedSupportThisRound === false`), permitir que o jogador solo acione o Apoio de Plantão (`POST /api/matches/:id/support-card`) para puxar 1 carta do baralho do apoio (`decks[supportInvestigatorId]`) para a mão do investigador ativo **com desconto de `1 PA` no seu custo de uso** (`cost: Math.max(0, card.cost - 1)`), compensando a metade de turnos do modo solo em relação ao cooperativo.
    - Exibir na interface (`LocationsPanel.vue` ou `CardHand.vue`) o botão `Acionar apoio (<Nome>) · 1x por rodada` quando disponível e desabilitá-lo após o uso na rodada.
    - Garantir que, ao usar ou descartar uma carta cujo `ownerId === supportInvestigatorId` (inclusive em `CreateJournalConnectionUseCase`), `recycleCardFromHand` devolva a carta para `decks[supportInvestigatorId].discardPile` restaurando seu custo original.
  - Critério de aceite: o jogador solo pode puxar 1 carta do apoio por rodada com desconto de 1 PA, o apoio não recebe turno próprio e suas cartas retornam sempre ao baralho do apoio ao serem usadas ou descartadas.

## P1 — Diário e feedback de jogo

- [x] **05 · DIARIO-01 — Separar pistas, observações, declarações e conexões** `[Front] [Back]`
  - **Escopo técnico (`CaseJournal.vue` e `MatchJournalEntry`):**
    - Exibir cada registro com badge visual claro de estado (`Indício`, `Não confirmada`, `Confirmada`, `Refutada`, `Declaração`, `Contestável`, `Observação`), além do local de origem e número da rodada.
    - Separar visualmente `observation` (tentativa sem descoberta nova) das pistas reais (`clue`) e declarações (`statement`), e atualizar a aba `Cronologia` dinamicamente conforme horários (`22h13`, `22h16`) são descobertos.
  - Critério de aceite: uma tentativa sem descoberta aparece claramente como observação e o jogador distingue de imediato quais pistas já estão `Confirmadas` para a acusação.

- [x] **16 · DIARIO-02 — Criar conexões no diário** `[Front] [Back] [Definição]`
  - **Escopo técnico (`CreateJournalConnectionUseCase`, `POST /api/matches/:id/connections` e `CaseJournal.vue`):**
    - Manter **Hipóteses (anotações livres)** sempre com custo `0 PA`.
    - Permitir que o jogador selecione duas pistas registradas no diário para criar uma **Conexão Formal** (`JournalConnection`: `id`, `fromClueId`, `toClueId`, `round`).
    - Cobrar **1 PA** (geral ou de pesquisa) para registrar a conexão formal, sendo **gratuita (`0 PA`)** uma vez na Rodada 5 (evento _Linha do Tempo Consolidada_) ou quando gerada por cartas/habilidades (`Mapa de Rotas`, `Lupa Comparativa`, `Cruzamento de Registros`).
    - Validar pares coerentes de conexão (evitando conectar uma pista consigo mesma ou duplicar a mesma conexão).
  - Critério de aceite: as conexões formais consomem 1 PA (salvo isenções), ficam listadas no diário e são contabilizadas nos 2 vínculos exigidos por `19 · CASO-07`.

- [ ] **16A · BUG-07 — Corrigir bugs de fluxo do playtest (cartas temporárias fixas na mão além de 4 cartas, validação de local, conexões de Otávio/cartas e `trace-marker`)** `[P0] [Front] [Back]`
  - **1. Manter cartas temporárias fixas na mão entre turnos, somando-se às 4 cartas do baralho (`server/src/domain/match-deck.ts`, `discard-card-use-case.ts` e `match-service.test.ts`):**
    - Quando o jogador obtém uma carta temporária de um personagem (`Agenda da Curadoria`, `Ficha de Tratamento`, `Lista de Convidados`, `Mapa de Rondas`), ela deve **permanecer na mão do jogador até que ele próprio decida usá-la ou descartá-la**, mesmo que a mão fique com **5 ou mais cartas**.
    - Em `refreshHandForTurn(deck, handSize, random)` (`server/src/domain/match-deck.ts`):
      1. Separar as cartas da mão atual em `temporaryCards = deck.hand.filter(card => card.temporary)` e `regularHandCards = deck.hand.filter(card => !card.temporary)`.
      2. Embaralhar apenas `[...deck.drawPile, ...regularHandCards]` e comprar até `handSize` (4 cartas regulares do baralho do investigador).
      3. Retornar a nova mão combinando as `4` cartas regulares compradas **mais** todas as `temporaryCards` retidas (`hand: [...refreshedRegularDeck.hand, ...temporaryCards]`). Assim, se o jogador tinha 1 carta temporária na mão ao encerrar o turno, ele iniciará o próximo turno com 4 cartas do seu baralho + 1 carta temporária (5 cartas na mão), sem que a carta temporária suma no `drawPile` nem roube o espaço de compra das 4 cartas normais!
    - Em `DiscardCardUseCase` (`server/src/application/use-cases/discard-card-use-case.ts`): ao descartar uma carta regular tendo cartas temporárias na mão, garantir que a reposição com `drawToHand` mantenha 4 cartas regulares + as cartas temporárias restantes.
  - **2. Validar local atual no servidor e ignorar clique redundante no local ativo (`LocationsPanel.vue`, `InvestigationView.vue`, `ResolveActionUseCase`, `ResolveConversationUseCase`):**
    - No frontend (`LocationsPanel.vue` / `InvestigationView.vue`), se o jogador clicar no botão do local em que já se encontra (`locationId === currentLocationId`), ignorar o disparo de `moveInvestigator` para não consumir o movimento gratuito da rodada por acidente.
    - No backend (`ResolveActionUseCase`, `ResolveConversationUseCase` e `getConversationOptions`), validar que `locationId === match.currentLocationId` e que `match.unlockedLocations.includes(locationId)`, impedindo ações em salas bloqueadas ou diferentes da posição atual do investigador.
  - **3. Desacoplar o custo extra de conexão do Otávio da ação base `Pesquisar` e unificar conexões de cartas (`shared/domain/action-points.ts`, `resolve-action-use-case.ts`, `case01-card-effects.ts`):**
    - Remover a cobrança automática e obrigatória de `+1 PA` em `investigatorActionCost` quando `investigatorId === 'otavio' && action === 'research' && canCreateConnection` (ou só aplicar se houver PA excedente após o `Pesquisar` de 2 PA), para que o Otávio nunca fique impedido de executar um `Pesquisar` normal de 2 PA quando tiver apenas 2 PA restantes (e lembre que ele já pode criar conexões diretamente na aba `Pistas` do Diário por 1 PA de pesquisa).
    - Quando cartas de conexão (`route-map`, `comparative-magnifier`, `cross-reference`) ou a habilidade do Otávio gerarem uma conexão entre duas pistas durante uma ação, registrar também o vínculo formal em `match.journalConnections` (evitando duplicatas), garantindo que contem para os 2 vínculos exigidos na Acusação (`19 · CASO-07`).
  - **4. Corrigir momento do desconto da carta `Marcador de Vestígio` (`trace-marker`) (`shared/domain/action-points.ts`, `resolve-action-use-case.ts`, `case01-card-effects.ts`):**
    - A carta `trace-marker` tem custo `0 PA` e seu efeito é: _"Marca uma pista física; a **próxima** análise dessa pista custa 1 PA a menos"_.
    - Ajustar `investigatorActionCost` para aplicar o desconto de `-1 PA` em `analyse` quando já existir no `journalEntries` daquele `locationId` uma pista não confirmada com `markedForFollowUp === true` (e limpar/consumir a marcação ao confirmar a pista), em vez de dar o desconto na própria jogada em que `preparedCardId === 'trace-marker'`.
  - **5. Corrigir descarte de carta do apoio em `CreateJournalConnectionUseCase` (`server/src/application/use-cases/create-journal-connection-use-case.ts`):**
    - Passar `match.decks[preparedCard.ownerId]` como `ownerDeck` ao chamar `recycleCardFromHand(activeDeck, ownerDeck, preparedCard.instanceId)` e atualizar `match.decks[preparedCard.ownerId]` quando uma carta de conexão vinda do Apoio de Plantão for consumida pelo Diário.
  - **6. Limpar código morto legado de partida offline no frontend (`src/domain/game/deck.ts` e `src/application/game/solo-mission.ts`):**
    - Remover `src/application/game/solo-mission.ts`, `src/domain/game/deck.ts` e seus testes legados caso não tenham mais uso após `01 · JOGO-01` e `18 · BUG-03`.
  - Critério de aceite: cartas temporárias permanecem na mão ao avançar de turno; clicar no local atual não gasta o movimento gratuito; o servidor rejeita ações fora de `currentLocationId`; Otávio consegue pesquisar com 2 PA mesmo tendo pistas conectáveis; conexões de cartas entram em `journalConnections`; `trace-marker` reduz o custo da análise seguinte; `npm run check` passa sem erros.

- [x] **06 · DIARIO-03 — Melhorar feedback de ação** `[Front]`
  - **Escopo técnico (`InvestigationView.vue` e `InvestigationActions.vue`):**
    - Mostrar alvo da ação, custo efetivo em PA, carta aplicada e resultado narrativo em uma mensagem estruturada e acessível, destacando se gerou pista nova, confirmação, refutação ou observação.
  - Critério de aceite: após qualquer ação, o jogador entende o que aconteceu, quanto custou e qual foi o resultado sem precisar abrir o diário.

## P2 — Cooperação, segurança e entrega

- [ ] **24 · COOP-01 — Criar salas para dupla fixa** `[Front] [Back] [Definição]`
  - Criar, entrar e abandonar sala; limitar a dois investigadores fixos por partida.
  - Critério de aceite: cada jogador controla apenas o próprio turno e o próprio baralho.

- [ ] **25 · COOP-02 — Sincronização em tempo real** `[Front] [Back]`
  - Adicionar WebSocket para atualizar ações, diário, turno e estado da sala.
  - Critério de aceite: o segundo jogador vê uma ação concluída sem recarregar a página.

- [ ] **22 · AUTH-01 — Autenticação leve** `[Back] [Definição]`
  - Começar com sessão anônima e token de sala; evoluir para conta opcional somente se a persistência entre dispositivos for necessária.
  - Critério de aceite: um jogador não consegue executar ações em uma sala à qual não pertence.

- [ ] **22A · AUTH-02 — Autorizar ações pela sessão da partida** `[Back] [Definição]`
  - Emitir um token opaco vinculado à partida ao criá-la ou entrar nela e exigir esse token em toda leitura ou mutação da partida.
  - Não aceitar o identificador da partida como autorização; validar que a sessão apresentada pertence à partida solicitada.
  - Critério de aceite: uma chamada direta à API, sem sessão válida ou com token de outra partida, recebe erro e não revela nem altera o estado.

- [ ] **23 · SEC-01 — Regras e conteúdo sensível somente no backend** `[Front] [Back]`
  - Não enviar solução do caso, condições futuras ou resultados não desbloqueados ao navegador.
  - Validar toda ação no servidor e limitar requisições por sessão.
  - Critério de aceite: inspecionar o catálogo público do cliente não revela o culpado ou a rota completa da missão.

- [ ] **23A · SEC-02 — Limitar abuso e endurecer contratos da API** `[Back] [Definição]`
  - Aplicar limite de requisições por sessão e endereço de origem às rotas de partida, com respostas seguras para excesso de tentativas.
  - Manter as respostas limitadas ao estado já desbloqueado; não criar rotas de catálogo completo para conteúdo de casos, diálogos ou desfechos.
  - Critério de aceite: tentativas automatizadas são limitadas sem afetar uma sessão normal, e consultas diretas não retornam conteúdo futuro.

- [x] **23B · SEC-04 — Validar schemas de entrada, tratar erros de domínio e sanitizar parâmetros HTTP** `[P1] [Front] [Back]`
  - Definir schemas de validação (`body`, `params`, `querystring`) e `bodyLimit` explícito em todas as rotas de `server/src/http/app.ts`, evitando `TypeError` (status `500`) quando `request.body` for nulo ou malformado.
  - Substituir a comparação de string `message === 'Partida não encontrada.'` por classes de erro semânticas (`DomainError`, `MatchNotFoundError`, `InvalidActionError`) tratadas em um `setErrorHandler` centralizado no Fastify.
  - Sanitizar todos os parâmetros dinâmicos de URL (`matchId`, `personId`, `questionId`) com `encodeURIComponent()` em `src/services/game-api.ts`.
  - Critério de aceite: payloads nulos ou malformados retornam `400` estruturado sem lançar `500`, e o status HTTP de erro é determinado pela classe de domínio, nunca por comparação de texto.

- [ ] **23C · SEC-05 — Adotar CSPRNG no embaralhamento e controle de concorrência no SQLite** `[P2] [Back]`
  - Substituir `Math.random()` em `server/src/domain/match-deck.ts` por uma porta `RandomGenerator` implementada com `crypto.randomInt()` (`node:crypto`).
  - Configurar `PRAGMA journal_mode = WAL;` e `PRAGMA busy_timeout` no `SqliteMatchRepository`, adicionando controle de concorrência otimista (`version`) para impedir condições de corrida (*lost updates*) em requisições simultâneas.
  - Critério de aceite: o embaralhamento no servidor usa CSPRNG injetável em testes e requisições concorrentes para a mesma partida não sobrescrevem silenciosamente o estado uma da outra.

- [ ] **26 · OPS-01 — Preparar deploy gratuito** `[Front] [Back] [Definição]`
  - Publicar frontend estático e API Node com variáveis de ambiente separadas.
  - Configurar banco persistente compatível com o provedor escolhido.
  - Critério de aceite: ambiente de produção permite criar, retomar e jogar uma partida sem depender do computador local.

- [ ] **26A · OPS-02 — Isolar a implementação do servidor em produção** `[Back] [Definição]`
  - Publicar somente os artefatos necessários do cliente e executar a API como serviço separado, sem servir fontes, documentação privada ou source maps do backend.
  - Configurar segredos e dados de sessão exclusivamente no ambiente do servidor; revisar cabeçalhos, logs e erros para não expor dados internos.
  - Critério de aceite: o navegador não consegue baixar arquivos de `server/` ou `docs/private/`, e uma falha de API não revela detalhes internos.

## Pós-MVP — Escala de conteúdo

- [ ] **31 · CONTEUDO-01 — Externalizar diálogos e resultados dos casos** `[Pós-MVP] [Back] [Definição]`
  - Substituir definições narrativas codificadas no servidor por uma camada de conteúdo versionada e validada, sem disponibilizar o catálogo completo ao cliente.
  - Começar com arquivos estruturados privados em `server/content/cases/<caso>/` (por exemplo, diálogos, condições e resultados), validados por schema e testes de compilação de conteúdo.
  - Publicar versões aprovadas desse conteúdo em tabelas próprias do banco de dados — SQLite no desenvolvimento e PostgreSQL em produção — com versão, status de publicação e possibilidade de reversão.
  - Introduzir um CMS/headless CMS somente se a edição por pessoas não técnicas ou o fluxo editorial justificar a complexidade; ele deve publicar para a mesma camada de banco, nunca diretamente para o navegador.
  - Definir uma interface de repositório de conteúdo no servidor para que o motor consulte diálogos, perguntas e variantes sem depender do formato de origem.
  - Critério de aceite: um novo caso pode ser adicionado ou uma conversa pode ser corrigida por uma nova versão de conteúdo, sem alteração do motor; a API continua entregando apenas opções e resultados já desbloqueados.

- [ ] **32 · JOGO-06 — Medidor global de Pressão da Imprensa** `[Pós-MVP] [Front] [Back] [Definição]`
  - Implementar um medidor de pressão externa/imprensa que sobe com eventos de rodada, ações ruidosas ou cartas de risco (como `Lista de Convidados`).
  - Associar limiares de pressão a efeitos mecânicos concretos (ex.: aumento de custo social em conversas ou bloqueio de favores institucionais).
  - Critério de aceite: a pressão da imprensa é visível na interface e altera dinamicamente as decisões de risco da equipe.

## Bugs e refinamentos: estado e prioridade

- [x] **02 · BUG-01 — Cartas ainda são resolvidas localmente** `[P1] [Front] [Back]`
  - Resolvido por JOGO-01 e JOGO-02: o servidor valida contexto, custo, descarte e efeito das cartas antes de devolver o novo estado da partida.
  - A contingência local em falhas de conexão continua rastreada separadamente em BUG-03.

- [x] **21 · BUG-02 — A API em memória perde partidas ao reiniciar** `[P1] [Back]`
  - Resolvido por JOGO-04: SQLite persiste a partida e o diário para que a missão seja retomada depois de reiniciar a API.

- [x] **18 · BUG-03 — O cliente possui modo de contingência local quando a API está indisponível** `[P1] [Front] [Back]`
  - Consequência: a mesma ação pode ter comportamento diferente se o servidor não estiver ativo.
  - Correção planejada: tornar a API obrigatória para ações de jogo, preservar somente uma tela de indisponibilidade e impedir alteração local do estado.
  - Critério de aceite: sem API, o jogador vê o estado de conexão e nenhuma ação, carta ou turno é resolvido no cliente.

- [ ] **17 · UX-01 — Exibir estado de conexão da partida** `[P1] [Front] [Back]`
  - Informar quando a API está indisponível ou quando uma ação está sendo processada.
  - Critério de aceite: botões não aceitam cliques repetidos durante uma requisição e erros podem ser recuperados.

- [ ] **27 · UX-02 — Refinar o layout das cartas em resoluções menores** `[P3] [Front]`
  - Confirmar legibilidade do selo de PA, botão `+`, título e moldura em notebook e celular.
  - Critério de aceite: os controles não se sobrepõem em nenhum breakpoint suportado.

- [ ] **28 · UX-03 — Animar entrada na investigação** `[P3] [Front]`
  - Criar transição entre a seleção da missão, o briefing de Sofia e a abertura do museu.
  - Respeitar preferência de redução de movimento e não bloquear a interação após a animação.
  - Critério de aceite: ao iniciar uma missão, a passagem pelo briefing comunica a entrada no caso sem causar recarregamento ou salto de layout.

- [ ] **29 · UX-04 — Confirmar abandono da partida** `[P3] [Front]`
  - Ao usar `Retornar ao mundo`, abrir um modal que explique que a partida atual será abandonada.
  - Oferecer `Continuar investigando` e `Abandonar partida`, com foco inicial na opção segura.
  - Critério de aceite: cancelar mantém o estado intacto; confirmar limpa a partida e retorna ao mapa de mundos.

- [ ] **30 · UX-05 — Animar descarte e embaralhamento de cartas** `[P3] [Front] [Back]`
  - Ao usar uma carta, animá-la da mão para a pilha de descarte somente depois da confirmação do servidor.
  - Quando o baralho se esgotar, mostrar o descarte sendo reunido, embaralhado e retornando como baralho de compra.
  - Sincronizar as animações com os eventos reais de compra, descarte e reciclagem do motor; respeitar redução de movimento.
  - Critério de aceite: a carta não desaparece antes da ação ser aceita, e o número de cartas na mão, compra e descarte permanece correto durante e após a animação.
