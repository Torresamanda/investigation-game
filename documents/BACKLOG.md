# Backlog do MVP — Cidade das Brumas

Legenda: **P0** bloqueia uma partida consistente; **P1** implementa a mecânica principal do Caso 01 e correções que podem alterar seu resultado; **P2** prepara cooperação, segurança e entrega; **P3** reúne refinamentos de interface. A numeração de dois dígitos define a ordem de execução recomendada dentro de cada prioridade; sufixos em letra entram depois do número-base e antes do próximo número. Tags: `[Front]` interface e experiência, `[Back]` API e regras autoritativas, `[Definição]` conteúdo ou decisão de design necessária antes da implementação.

> Regra de prioridade: uma tarefa que implementa ou protege a mecânica do jogo vem antes de qualquer refinamento visual. A interface deve comunicar regras já funcionais; refinamentos de layout, animação e apresentação ficam para depois da mecânica principal.

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

- [ ] **03F · ARQ-03 — Dividir store monolítica, extrair composables e remover efeito colateral do router** `[P2] [Front]`
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

- [ ] **09A · BUG-05 — Remover antecipação do suspeito na abertura da Rodada 4** `[P1] [Front] [Back] [Definição]`
  - Substituir a mensagem que nomeia Raul por uma formulação neutra enquanto ele não tiver sido associado pelo diário do jogador.
  - Definir condição de conteúdo para liberar menções diretas somente depois das pistas adequadas.
  - Critério de aceite: chegar à Rodada 4 sem investigar Raul não revela sua participação por meio da narrativa de Sofia.

## P0 — Consolidar a partida no servidor

- [x] **01 · JOGO-01 — Unificar o motor de regras no backend** `[Front] [Back]`
  - Mover mão, compra, descarte, PA, rodada e cartas preparadas para o estado da partida no servidor.
  - Remover a duplicidade temporária entre o motor local do frontend e a API.
  - Critério de aceite: recarregar o cliente e buscar a partida retorna exatamente a mesma mão, PA, rodada e diário enquanto o servidor estiver em execução.

- [ ] **01A · ARQ-01 — Unificar tipos, contratos e regras puras de PA em `shared/`** `[P0] [Front] [Back]`
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

- [ ] **04A · SEC-03 — Ocultar baralho de compra e chaves internas nas respostas da API (`MatchPresenter`)** `[P0] [Front] [Back]`
  - Criar `MatchPresenter` em `server/src/http/presenters/` para transformar a entidade de domínio em DTO público antes de enviá-la nas respostas HTTP.
  - Expor apenas `hand` do investigador ativo e contadores numéricos (`drawPileCount` e `discardPileCount`), removendo `drawPile` ordenado, baralho completo do apoio e `resolvedKeys` do payload público.
  - Critério de aceite: inspecionar qualquer resposta de `/api/matches/*` no navegador não revela a sequência de próximas cartas a comprar nem chaves internas de controle.

- [ ] **04B · ARQ-02 — Refatorar backend em camadas estritas de Clean Architecture e Domínio Rico** `[P1] [Back]`
  - Dividir `MatchService` em Casos de Uso independentes por responsabilidade (`CreateSoloMatchUseCase`, `ResolveActionUseCase`, `ResolveConversationUseCase`, `PrepareCardUseCase`, `EndTurnUseCase`) e mover `InMemoryMatchRepository` para `server/src/infrastructure/`.
  - Modelar `Match`, `InvestigatorDeck` e `TurnState` como entidades/Value Objects ricos que protegem suas invariantes, substituindo o array de strings mágicas `resolvedKeys` por estruturas tipadas e eliminando a dependência circular entre `match.ts` e `match-deck.ts`.
  - Extrair a resolução narrativa hardcoded do Caso 01 (`resolveCaseAction` e diálogos) para uma porta `CaseContentRepository` implementada na infraestrutura.
  - Critério de aceite: cada classe, entidade, caso de uso e repositório reside em seu próprio arquivo com responsabilidade única, e `domain/` não possui dependências externas.

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

- [ ] **13 · CASO-03 — Integrar cartas de conversa** `[Front] [Back] [Definição]`
  - Permitir preparar uma carta compatível antes de escolher uma pergunta.
  - Aplicar cartas de Isadora em conversa e entregar cartas temporárias de suspeitos quando as condições forem atendidas.
  - Critério de aceite: `Gravador de Bolso` registra uma declaração utilizável depois; `Pausa Calculada` abre uma pergunta adicional sem substituir a conversa base.

- [ ] **07 · CASO-04 — Implementar descobertas de todos os locais e rodadas** `[Back] [Definição]`
  - Modelar no backend os resultados oficiais de Galeria, Segurança, Laboratório, Curadoria e Corredor de Serviço.
  - Registrar pistas como indício, não confirmada, confirmada ou refutada.
  - Critério de aceite: a rota E1–E6 da simulação pode ser concluída sem expor a solução do caso no frontend.

- [ ] **08 · CASO-05 — Liberar locais e deslocamento** `[Front] [Back] [Definição]`
  - Implementar primeiro deslocamento gratuito da rodada e os deslocamentos seguintes por 1 PA.
  - Liberar o Corredor de Serviço pelas condições definidas no caso.
  - Critério de aceite: um local bloqueado não pode ser selecionado até a descoberta correspondente.

- [ ] **09 · CASO-06 — Eventos de abertura e fechamento de rodada** `[Front] [Back] [Definição]`
  - Aplicar os eventos da simulação, inclusive Perímetro Preservado, Vazamento para a Imprensa e Linha do Tempo Consolidada.
  - Critério de aceite: a narrativa, custos e opções disponíveis mudam conforme a rodada.

- [ ] **19 · CASO-07 — Acusação e desfechos** `[Front] [Back] [Definição]`
  - Desbloquear acusação somente após o encerramento da Rodada 4 e somente no início de turno das Rodadas 5 e 6.
  - Validar três evidências confirmadas, dois vínculos e os eixos meios, oportunidade e vínculo.
  - Critério de aceite: acusações insuficientes não revelam a solução; desfechos corretos e incorretos encerram a partida.

## P1 — Identidade e especialização dos investigadores

- [ ] **10 · INV-01 — Aplicar habilidades passivas por investigador** `[Front] [Back] [Definição]`
  - Lívia: primeiro `Examinar` de cada local por rodada custa 1 PA a menos, mínimo 1.
  - Rafael: usa PA técnico em análise e pode confirmar uma pista física uma vez por rodada.
  - Isadora: usa PA social em conversa e pode marcar uma declaração como contestável.
  - Otávio: usa PA de pesquisa e pode conectar pistas conforme a habilidade.
  - Critério de aceite: a interface explica o benefício aplicado e o diário registra o resultado especial quando houver.

- [ ] **14 · INV-02 — Criar rotas investigativas alternativas** `[Back] [Definição]`
  - Garantir que cada investigador possua ao menos uma forma própria de gerar, confirmar ou conectar informação relevante.
  - Critério de aceite: a missão pode alcançar uma acusação fundamentada por mais de uma combinação de investigadores e cartas.

- [ ] **15 · INV-03 — Implementar apoio de plantão no modo solo** `[Front] [Back] [Definição]`
  - Uma vez por rodada, permitir trazer uma carta do apoio para a mão do investigador ativo.
  - Ao usar a carta, descartá-la no baralho do apoio.
  - Critério de aceite: o apoio não recebe turno, não compartilha todas as cartas e respeita o limite de uma carta por rodada.

## P1 — Diário e feedback de jogo

- [ ] **05 · DIARIO-01 — Separar pistas, observações, declarações e conexões** `[Front] [Back]`
  - Exibir cada tipo de registro com estado, origem, rodada e relações relevantes.
  - Critério de aceite: uma tentativa sem descoberta aparece como observação, sem ser confundida com uma pista de acusação.

- [ ] **16 · DIARIO-02 — Criar conexões no diário** `[Front] [Back] [Definição]`
  - Permitir que o jogador relacione duas pistas, com validação de contexto quando exigida por habilidade ou evento.
  - Critério de aceite: as conexões contam para o requisito da acusação e ficam visíveis para a equipe.

- [ ] **06 · DIARIO-03 — Melhorar feedback de ação** `[Front]`
  - Mostrar custo, carta aplicada, alteração de PA e resultado em uma mensagem única e acessível.
  - Critério de aceite: após qualquer ação, o jogador entende o que aconteceu sem precisar abrir o diário.

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

- [ ] **23B · SEC-04 — Validar schemas de entrada, tratar erros de domínio e sanitizar parâmetros HTTP** `[P1] [Front] [Back]`
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

## Bugs e refinamentos: estado e prioridade

- [x] **02 · BUG-01 — Cartas ainda são resolvidas localmente** `[P1] [Front] [Back]`
  - Resolvido por JOGO-01 e JOGO-02: o servidor valida contexto, custo, descarte e efeito das cartas antes de devolver o novo estado da partida.
  - A contingência local em falhas de conexão continua rastreada separadamente em BUG-03.

- [x] **21 · BUG-02 — A API em memória perde partidas ao reiniciar** `[P1] [Back]`
  - Resolvido por JOGO-04: SQLite persiste a partida e o diário para que a missão seja retomada depois de reiniciar a API.

- [ ] **18 · BUG-03 — O cliente possui modo de contingência local quando a API está indisponível** `[P1] [Front] [Back]`
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
