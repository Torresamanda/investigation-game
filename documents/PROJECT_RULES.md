# Regras do Projeto — Cidade das Brumas (`investigation-game`)

> **INSTRUÇÃO OBRIGATÓRIA PARA AGENTES DE IA E DESENVOLVEDORES:**
> Leia e siga rigorosamente este documento antes de revisar, planejar, criar ou modificar qualquer arquivo deste repositório. Nenhuma alteração de código pode violar os limites de produto, segurança, Clean Code ou Clean Architecture definidos abaixo.

---

## 1. Documentação e Proteção de Conteúdo

- `documents/` reúne material seguro e regras públicas para acompanhar o repositório.
- `docs/` contém material privado de trabalho. **Nunca** publique, importe no frontend ou copie seu conteúdo para documentos públicos ou pacotes enviados ao navegador.
- Conteúdo narrativo secreto, condições ocultas, árvore completa de diálogos e soluções de casos **jamais** pertencem ao código público do cliente (`src/` ou `shared/`).

---

## 2. Regras de Produto e Domínio do Jogo

### 2.1. Limites do Produto

- O MVP é um jogo investigativo de cartas, por turnos, para navegador.
- O modo jogável atual é **solo**: um investigador ativo e um apoio diferente, escolhidos antes da missão.
- Uma futura partida cooperativa terá exatamente dois investigadores, definidos no início e mantidos até o fim da missão.
- Uma missão tem, no máximo, **seis rodadas**. Toda rodada começa com seu evento.
- A **acusação** é desbloqueada somente após o encerramento da Rodada 4 e fica disponível nas Rodadas 5 e 6. No modo solo, pode ser apresentada a qualquer momento do turno por 3 PA gerais; em uma futura partida cooperativa, deverá ser escolhida no início do turno e consumirá o turno inteiro.

### 2.2. Turnos e Pontos de Ação (PA)

- Os pontos de ação (PA) são restaurados no começo de cada turno conforme o perfil do investigador.
- Pontos de especialidade (`technical`, `social`, `research`) só podem ser gastos em ações compatíveis (`analyse`, `converse`, `research`, respectivamente) e devem ser consumidos antes dos PA gerais quando aplicáveis.
- Ações básicas consomem os PA aplicáveis e precisam ser resolvidas pelo motor autoritativo do jogo no servidor, nunca apenas pela interface.
- Examinar, analisar, pesquisar e conversar dependem do contexto selecionado (local, pessoa de interesse, rodada e evidências prévias).
- Uma ação pode revelar pista, alterar o diário, abrir caminho ou registrar que a abordagem não encontrou nada. Mesmo uma tentativa sem resultado deve gerar um registro útil (`observation`) para orientar a próxima abordagem.
- O jogador deve receber confirmação antes de encerrar o turno caso ainda possua PA utilizáveis.

### 2.3. Regras das Cartas

- Cada investigador possui quatro tipos de carta, com duas cópias de cada: **oito cartas no total**.
- A missão começa com quatro cartas na mão (`INITIAL_HAND_SIZE = 4`). No início de cada turno, as cartas não usadas da mão voltam ao monte de compra, esse monte é embaralhado e uma mão nova de exatamente quatro cartas é distribuída; se o monte acabar, o descarte é embaralhado para completar a mão.
- Uma carta usada vai para o descarte (`discardPile`). Quando o baralho de compra (`drawPile`) acaba, o descarte é embaralhado e se torna o novo baralho de compra.
- Cartas não usadas retornam ao ciclo de compra e são randomizadas no início do próximo turno; cartas usadas permanecem no descarte até o monte de compra acabar.
- Uma carta só pode ser usada no turno de seu dono, mas pode beneficiar pistas e diário compartilhados.
- Os custos possíveis são `0`, `1` ou `2` PA. Uma carta de `0` PA **não substitui** uma ação básica (o custo da carta soma-se ao custo da ação).
- Uma carta exige contexto/ação compatível e nunca pode revelar automaticamente a solução de um caso.
- Conversas podem conceder **cartas temporárias** a quem as conduziu. Elas são descartadas ao uso e não entram na coleção permanente.
- Na interface, clicar na carta prepara ou remove a preparação. O controle de informação abre os detalhes sem preparar a carta.

---

## 3. Clean Architecture e Separação de Responsabilidades

O projeto adota **Clean Architecture** combinada com princípios táticos de **Domain-Driven Design (DDD)**. A Regra de Dependência é estrita: **dependências apontam sempre para dentro (em direção ao Domínio)**. Camadas internas nunca importam nada de camadas externas.

### 3.1. Estrutura Oficial de Diretórios e Camadas

```text
shared/                         Contratos públicos, IDs, Value Objects puros e regras compartilhadas sem segredos
├── domain/                     Tipos primitivos (InvestigatorId, LocationId), ActionPointPool e validações puras
└── contracts/                  DTOs públicos de entrada/saída da API (PublicMatchDto, ConversationOptionsDto)

backend/                        Núcleo privado autoritativo, reutilizável por runtimes de backend
├── domain/                     1. DOMÍNIO PURO (Zero dependências de HTTP, SQLite ou frameworks)
│   ├── entities/               Entidades ricas e Aggregate Roots (Match, InvestigatorDeck, TurnState)
│   ├── services/               Serviços de domínio puros, Strategies de efeitos de cartas e motor de regras
│   └── errors/                 Erros semânticos de domínio (DomainError, MatchNotFoundError, etc.)
├── application/                2. APLICAÇÃO / CASOS DE USO (Orquestração)
│   ├── ports/                  Interfaces/contratos de saída (MatchRepository, CaseContentRepository, RandomGenerator)
│   └── use-cases/              Casos de uso focados (um fluxo por classe/arquivo)
├── infrastructure/             3. INFRAESTRUTURA PORTÁVEL (Implementações sem dependência do runtime)
│   ├── persistence/            InMemoryMatchRepository
│   ├── content/                Repositórios de conteúdo privado dos casos (ex.: Case01ContentRepository)
│   └── crypto/                 Gerador aleatório seguro compatível com Worker
└── presenters/                 Transformam entidades de domínio em DTOs públicos seguros

worker/                         Adaptador de produção (Cloudflare Worker / D1)
├── http/                       Rotas, validação de requisição e limites de taxa
└── infrastructure/             Persistência D1 e sessões de partida

src/                            Frontend (Vue 3 / Pinia / Vite)
├── app/                        Bootstrap da aplicação e configuração de rotas (sem lógica de negócio)
├── components/                 Componentes visuais genéricos e reutilizáveis (Design System local)
│   ├── icons/                  Ponto ÚNICO de exportação de ícones do projeto
│   └── ui/                     Componentes base reutilizáveis (AppModal, CharacterPortrait, CardArtwork, etc.)
├── content/                    Catálogo estático puramente visual/público (nomes, retratos, artes)
├── features/                   Módulos de funcionalidades (worlds, investigation)
│   └── <feature>/
│       ├── components/         Componentes específicos da feature
│       ├── composables/        Lógica de interação, estado local de UI e orquestração da feature
│       └── styles/             Estilos específicos de layout daquela feature
├── services/                   Gateways de comunicação HTTP com a API
├── stores/                     Stores Pinia separadas por contexto de responsabilidade
└── styles/                     Tokens globais (:root), reset, tipografia e classes utilitárias/base reutilizáveis
```

### 3.2. Regras Arquiteturais Obrigatórias

1. **Proibição de "God Files" / "God Classes" (SRP):**
   - Evite jogar múltiplas responsabilidades em um único arquivo.
   - Nunca misture definição de repositório (`InMemoryMatchRepository`), regras de domínio, dados narrativos de casos e orquestração de serviço no mesmo arquivo.
   - Cada caso de uso, entidade, repositório, presenter ou composable deve residir em seu próprio módulo focado.
2. **Fonte Única para Regras Compartilhadas (`shared/`):**
   - Tipos, identificadores (`InvestigatorId`, `LocationId`, `InvestigationAction`) e cálculos públicos de viabilidade de ação (`canPayAction`) devem ficar em `shared/` e ser importados tanto pelo frontend quanto pelo backend.
   - É proibido duplicar regras de cálculo de PA ou tipos de contrato entre `src/` e `backend/`.
3. **Domínio Rico e Determinístico (`backend/domain/`):**
   - Entidades de domínio devem proteger suas próprias invariantes (ex.: validar se há PA suficientes, validar limite de 6 rodadas, validar se a carta está na mão).
   - O domínio deve ser 100% determinístico: nunca chame `Math.random()`, `new Date()` ou `crypto.randomUUID()` diretamente dentro de funções/entidades de domínio sem recebê-los via parâmetro ou porta injetada.
   - Evite estados baseados em "strings mágicas" concatenadas (ex.: `resolvedKeys: string[]` misturando pistas, turnos e bônus). Use Value Objects e propriedades tipadas explícitas (`TurnState`, `discoveredClues`, `askedQuestions`).
4. **Rotas HTTP Finas e Tratamento de Erros Semântico (`worker/src/http/`):**
   - Rotas apenas validam a entrada via schema, invocam o caso de uso correspondente e retornam o DTO formatado pelo `Presenter`.
   - **Proibido** decidir status HTTP comparando textos de mensagens de erro (`message === 'Partida não encontrada.'`). Utilize classes de erro tipadas (`NotFoundError`, `DomainRuleError`, `ValidationError`) tratadas de forma centralizada no adaptador HTTP.
5. **Desacoplamento no Frontend (`src/`):**
   - O roteador (`router.ts`) cuida exclusivamente de navegação e guardas de rota; nunca execute mutações destrutivas de negócio silenciosamente em hooks globais como `afterEach`.
   - Componentes Vue não devem conter regras de negócio complexas nem chamadas diretas à camada `services/`.
   - Stores Pinia não devem virar um único arquivo monolítico: separe o estado autoritativo da partida (`useMatchStore`) de estados efêmeros de interface/anotações (`useNotesStore`, `useUiStore`).

---

## 4. Regras de Segurança (AppSec & Game Security)

1. **Nunca Expor Entidades de Domínio ou Estado Oculto na API:**
   - A API jamais deve retornar `drawPile` (ordem das cartas a comprar), baralho completo do apoio ou chaves internas de controle.
   - Toda resposta HTTP de partida deve passar por um `Presenter` (`MatchPresenter.toPublicDto(match)`), expondo apenas a mão ativa (`hand`) e a contagem numérica das pilhas (`drawPileCount`, `discardPileCount`).
2. **Autoridade Exclusiva do Servidor:**
   - O backend autoritativo (em produção, Worker/D1) é a única autoridade para criação de partida, PA, resolução de ações, uso/preparação de cartas, avanço de turnos e registros do diário.
   - O frontend nunca deve resolver ações de jogo localmente em produção nem mascarar falhas de rede com estado local divergente.
3. **Validação Estrita de Entrada (Schema Validation):**
   - Toda rota HTTP que receba `body`, `params` ou `querystring` deve validar seu formato antes de desestruturar propriedades (prevenindo `TypeError` / erro `500` em payloads nulos ou malformados).
   - Sempre restrinja tamanhos de texto livre, limites de payload (`bodyLimit`) e enums permitidos.
4. **Sanitização de Parâmetros no Cliente HTTP:**
   - Ao construir URLs dinâmicas em `src/services/game-api.ts`, sempre utilize `encodeURIComponent()` para qualquer parâmetro de rota (`matchId`, `personId`, `questionId`).
5. **Aleatoriedade Segura e Concorrência:**
   - No backend, operações de embaralhamento devem usar geração criptograficamente segura de Web Crypto através da porta `RandomGenerator`.
   - Operações de escrita em partida devem prevenir condições de corrida (bloqueio de submissão dupla no frontend com estado `isPending` e controle de versão no repositório D1).
6. **Autorização de Sessão e Proteção contra Abuso:**
   - Nenhuma leitura ou mutação de partida em produção deve confiar apenas no UUID público da URL; valide o token de sessão vinculado à partida e aplique _rate limiting_ nas rotas.

---

## 5. Padrões de Clean Code, UI, CSS e Componentização

### 5.1. Espaçamento e Legibilidade de Código

- **Espaçamento claro entre blocos:** Mantenha sempre **uma linha em branco** separando:
  - Diferentes funções, métodos, classes, interfaces e types.
  - Blocos lógicos distintos dentro de um arquivo (ex.: bloco de `import`s → declarações de tipos → constantes → implementação).
  - Em arquivos Vue (`.vue`), separe claramente `<script setup>`, `<template>` e `<style>`, e dentro do `<script setup>` separe com linha em branco: imports, `defineProps`/`defineEmits`/`defineModel`, variáveis reativas (`ref`), propriedades computadas (`computed`), watchers e funções.
  - Em arquivos CSS, mantenha espaçamento consistente e claro entre blocos de regras/seletores e media queries, evitando blocos gigantes compactados sem separação visual.
- **Funções pequenas e coesas:** Cada função ou método deve fazer apenas uma coisa e operar em um único nível de abstração. Evite aninhamentos profundos (`if/else` encadeados ou ternários aninhados complexos); prefira _early returns_ (_guard clauses_) e funções auxiliares bem nomeadas.

### 5.2. Nomenclatura Significativa (Clean Naming & Ubiquitous Language)

- Utilize nomes que expressem claramente **o que está sendo feito** e **qual o papel do elemento** no domínio:
  - **Evite nomes vagos ou genéricos:** `data`, `item`, `info`, `val`, `temp`, `res`, `handle`, `process`, `doAction`, `Manager`, `Helper`, `Utils`.
  - **Funções e Métodos:** Devem começar com verbos precisos que descrevam a ação ou consulta (ex.: `spendActionPoints`, `drawCardsToHand`, `resolveConversationQuestion`, `prepareInvestigatorCard`).
  - **Booleanos e Predicados:** Devem usar prefixos afirmativos claros como `is`, `has`, `can`, `should` (ex.: `canExecuteAction`, `isPersonAvailableAtLocation`, `hasReachedQuestionLimit`, `isCardPrepared`).
  - **Classes e Interfaces Arquiteturais:** Devem explicitar seu padrão ou camada no sufixo quando aplicável (ex.: `CreateSoloMatchUseCase`, `SqliteMatchRepository`, `MatchPublicPresenter`, `InsufficientActionPointsError`).
  - **Consistência de Idioma:** Código-fonte (identificadores, tipos, funções, variáveis, classes CSS e commits) deve ser escrito em **inglês**; textos de interface, mensagens voltadas ao jogador e documentação do projeto devem ser escritos em **português (pt-BR)**.

### 5.3. Componentização e Reuso no Frontend (`src/components/`)

- **Componentizar elementos que se repetem:** Sempre que um padrão visual ou estrutural se repetir em dois ou mais lugares (ex.: cabeçalhos de seção com `eyebrow` + título, botões com ícone alinhado, selos/badges de PA, cards de perfil, modais de confirmação, abas, estados vazios), extraia-o para um componente reutilizável em `src/components/ui/`.
- **Componentes de UI puros (_Presentational Components_):** Componentes em `src/components/ui/` devem receber dados exclusivamente via `props` e comunicar ações via `emit` / `v-model`. Eles não devem importar stores Pinia nem serviços de API.
- **Tamanho de Componentes:** Se um componente Vue ultrapassar ~120–150 linhas ou começar a lidar com múltiplos sub-blocos independentes de interface, divida-o em subcomponentes menores e extraia a lógica reativa para um _composable_ (`use<Feature>.ts`).

### 5.4. Uso Estrito de Ícones (`src/components/icons/`)

- **Ponto único de exportação:** Todos os ícones utilizados no projeto devem ser exportados pelo arquivo central [`src/components/icons/index.ts`](file:///c:/Users/Pichau/repos/investigation-game/src/components/icons/index.ts).
- **Proibição de import direto:** **Nenhum** componente Vue ou arquivo TypeScript fora de `src/components/icons/` pode importar diretamente de `@phosphor-icons/vue` ou de qualquer outra biblioteca de ícones.
- **Proibição de símbolos textuais improvisados:** Não utilize caracteres de texto (`+`, `-`, `×`, `←`, `→`) para representar ícones de interface; utilize sempre os componentes exportados de `src/components/icons` com `aria-hidden="true"` (quando decorativos) e rótulos acessíveis (`aria-label`) no botão/controle pai.

### 5.5. Organização e Externalização de CSS (`src/styles/`)

- **Externalizar classes CSS que se repetem:** Regras visuais recorrentes (como superfícies de painel `.panel`, cabeçalhos `.section-heading`, textos auxiliares `.eyebrow`, `.muted`, `.help-text`, variantes de botões `.button-primary`, `.button-icon`, badges de PA, barras de rolagem customizadas e estados de foco) devem ser centralizadas e compartilhadas em `src/styles/` — nunca copiadas e coladas entre diferentes arquivos CSS de features ou blocos `<style>` de componentes.
- **Uso de Design Tokens (Variáveis CSS):** Cores, famílias tipográficas, raios de borda, sombras e espaçamentos recorrentes devem ser definidos como custom properties em `:root` (`src/styles/main.css` ou `src/styles/tokens.css`) e referenciados via `var(--...)`. Evite valores hexadecimais mágicos espalhados nos arquivos CSS.
- **Escopo claro de estilos:** Os arquivos CSS dentro de `src/features/<feature>/styles/` devem conter **apenas** o posicionamento, grid e ajustes específicos daquela funcionalidade, reaproveitando as classes utilitárias e de componentes base de `src/styles/`.

---

## 6. Qualidade, Testes e Fluxo de Trabalho

- **Testes Automatizados:** Toda nova regra de domínio, caso de uso, rota HTTP ou comportamento relevante de componente deve ser acompanhada de testes automatizados (Vitest). Testes de domínio e casos de uso não devem depender de banco de dados em disco nem de servidor de rede ativo.
- **Verificação Obrigatória:** Antes de concluir qualquer tarefa, execute:
  ```bash
  npm run check
  ```
  Esse comando valida ESLint (`--max-warnings=0`), Prettier, testes unitários/integrados, checagem de tipos do Worker (`tsc`) e build/tipos do frontend (`vue-tsc` + `vite build`).
- **Convenção de Commits e Controle de Push:**
  - Antes de criar qualquer commit, leia obrigatoriamente [COMMIT_CONVENTIONS.md](COMMIT_CONVENTIONS.md).
  - Todos os commits devem seguir o padrão **Conventional Commits** em inglês e em minúsculas no formato `<type>(<scope>): <short description>` (com escopo obrigatório e verbo no imperativo, sem ponto final).
  - **Não execute `git push` automaticamente:** qualquer push exige validação e aprovação explícita do usuário primeiro.
- **Alinhamento com o Backlog:** Consulte [BACKLOG.md](BACKLOG.md) antes de alterar prioridades ou o desenho de evoluções planejadas.
