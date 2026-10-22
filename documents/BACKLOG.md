# Backlog do MVP — Cidade das Brumas

Legenda: **P0** bloqueia uma partida consistente; **P1** completa o Caso 01; **P2** prepara a experiência para evolução. A numeração de dois dígitos define a ordem de execução recomendada; sufixos em letra entram depois do número-base e antes do próximo número. Tags: `[Front]` interface e experiência, `[Back]` API e regras autoritativas, `[Definição]` conteúdo ou decisão de design necessária antes da implementação.

## P0 — Fundação visual transversal

- [x] **00 · ICON-01 — Adotar Phosphor Icons como sistema único de ícones** `[Front] [Definição]`
  - Adicionar a biblioteca Phosphor Icons ao projeto e criar `src/components/icons/` como ponto único de exportação dos ícones aprovados.
  - Substituir símbolos textuais, setas, sinais de fechar, marcadores e ícones de ação existentes por componentes desse catálogo.
  - Definir tamanhos, espessuras, rótulos acessíveis e estados de foco coerentes com a identidade visual do jogo.
  - Critério de aceite: nenhum ícone de interface é importado diretamente fora da pasta de ícones; os controles mantêm tamanho legível em desktop e celular.

## P1 — Ajustes de fluxo e feedback

- [ ] **05A · UX-06 — Confirmar encerramento de turno com PA restantes** `[Front] [Definição]`
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

## P2 — Ajustes de interface e conteúdo

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

- [ ] **06A · BUG-04 — Corrigir separação de título e conteúdo em observações** `[Front]`
  - Inserir separação visual e textual após `Nenhuma descoberta nova`, incluindo `:` antes do conteúdo da observação.
  - Critério de aceite: título e mensagem não aparecem unidos em interface, leitor de tela ou diário.

- [ ] **09A · BUG-05 — Remover antecipação do suspeito na abertura da Rodada 4** `[Front] [Back] [Definição]`
  - Substituir a mensagem que nomeia Raul por uma formulação neutra enquanto ele não tiver sido associado pelo diário do jogador.
  - Definir condição de conteúdo para liberar menções diretas somente depois das pistas adequadas.
  - Critério de aceite: chegar à Rodada 4 sem investigar Raul não revela sua participação por meio da narrativa de Sofia.

## P0 — Consolidar a partida no servidor

- [x] **01 · JOGO-01 — Unificar o motor de regras no backend** `[Front] [Back]`
  - Mover mão, compra, descarte, PA, rodada e cartas preparadas para o estado da partida no servidor.
  - Remover a duplicidade temporária entre o motor local do frontend e a API.
  - Critério de aceite: recarregar o cliente e buscar a partida retorna exatamente a mesma mão, PA, rodada e diário enquanto o servidor estiver em execução.

- [x] **03 · JOGO-02 — Resolver cartas no servidor** `[Front] [Back] [Definição]`
  - Enviar o identificador da carta e a ação escolhida para a API.
  - Validar dono, contexto, compatibilidade, custo e descarte exclusivamente no backend.
  - Critério de aceite: uma carta incompatível não pode ser aplicada pela interface nem por uma chamada direta à API.

- [ ] **04 · JOGO-03 — Corrigir o estado de preparação de carta** `[Front] [Back]`
  - Registrar no servidor qual carta está preparada e limpar essa escolha ao usá-la, removê-la ou encerrar o turno.
  - Critério de aceite: dois clientes que consultam a mesma partida veem a mesma carta preparada.

- [ ] **20 · JOGO-04 — Persistir partidas e diário** `[Back]`
  - Substituir o repositório em memória por SQLite local durante o MVP.
  - Persistir partida, ações, diário, cartas e hipóteses compartilhadas.
  - Critério de aceite: reiniciar a API não apaga uma partida existente.

## P1 — Conversas e investigação do Caso 01

- [ ] **11 · CASO-01 — Criar diálogos por pessoa de interesse** `[Front] [Back] [Definição]`
  - Ao selecionar uma pessoa e escolher `Conversar`, abrir uma conversa contextual no local atual.
  - Oferecer três perguntas disponíveis, com texto, custo e resultado narrativo.
  - Critério de aceite: cada pergunta só pode ser usada quando a pessoa estiver disponível naquele local e produz um registro no diário.

- [ ] **12 · CASO-02 — Dar escolhas reais às três perguntas** `[Back] [Definição]`
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

- [ ] **23 · SEC-01 — Regras e conteúdo sensível somente no backend** `[Front] [Back]`
  - Não enviar solução do caso, condições futuras ou resultados não desbloqueados ao navegador.
  - Validar toda ação no servidor e limitar requisições por sessão.
  - Critério de aceite: inspecionar o catálogo público do cliente não revela o culpado ou a rota completa da missão.

- [ ] **26 · OPS-01 — Preparar deploy gratuito** `[Front] [Back] [Definição]`
  - Publicar frontend estático e API Node com variáveis de ambiente separadas.
  - Configurar banco persistente compatível com o provedor escolhido.
  - Critério de aceite: ambiente de produção permite criar, retomar e jogar uma partida sem depender do computador local.

## Bugs e refinamentos abertos

- [ ] **02 · BUG-01 — Cartas ainda são resolvidas localmente** `[Front] [Back]`
  - Consequência: o servidor não conhece o descarte e o custo adicional de uma carta.
  - Correção planejada: JOGO-01 e JOGO-02.

- [ ] **21 · BUG-02 — A API em memória perde partidas ao reiniciar** `[Back]`
  - Consequência: não há retomada de missão.
  - Correção planejada: JOGO-04.

- [ ] **18 · BUG-03 — O cliente possui modo de contingência local quando a API está indisponível** `[Front] [Back]`
  - Consequência: a mesma ação pode ter comportamento diferente se o servidor não estiver ativo.
  - Correção planejada: exibir estado de conexão e tornar a API obrigatória após a migração completa do motor.

- [ ] **17 · UX-01 — Exibir estado de conexão da partida** `[Front] [Back]`
  - Informar quando a API está indisponível ou quando uma ação está sendo processada.
  - Critério de aceite: botões não aceitam cliques repetidos durante uma requisição e erros podem ser recuperados.

- [ ] **27 · UX-02 — Refinar o layout das cartas em resoluções menores** `[Front]`
  - Confirmar legibilidade do selo de PA, botão `+`, título e moldura em notebook e celular.
  - Critério de aceite: os controles não se sobrepõem em nenhum breakpoint suportado.

- [ ] **28 · UX-03 — Animar entrada na investigação** `[Front]`
  - Criar transição entre a seleção da missão, o briefing de Sofia e a abertura do museu.
  - Respeitar preferência de redução de movimento e não bloquear a interação após a animação.
  - Critério de aceite: ao iniciar uma missão, a passagem pelo briefing comunica a entrada no caso sem causar recarregamento ou salto de layout.

- [ ] **29 · UX-04 — Confirmar abandono da partida** `[Front]`
  - Ao usar `Retornar ao mundo`, abrir um modal que explique que a partida atual será abandonada.
  - Oferecer `Continuar investigando` e `Abandonar partida`, com foco inicial na opção segura.
  - Critério de aceite: cancelar mantém o estado intacto; confirmar limpa a partida e retorna ao mapa de mundos.

- [ ] **30 · UX-05 — Animar descarte e embaralhamento de cartas** `[Front] [Back]`
  - Ao usar uma carta, animá-la da mão para a pilha de descarte somente depois da confirmação do servidor.
  - Quando o baralho se esgotar, mostrar o descarte sendo reunido, embaralhado e retornando como baralho de compra.
  - Sincronizar as animações com os eventos reais de compra, descarte e reciclagem do motor; respeitar redução de movimento.
  - Critério de aceite: a carta não desaparece antes da ação ser aceita, e o número de cartas na mão, compra e descarte permanece correto durante e após a animação.
