# AGENTS.md — Diretrizes Obrigatórias para Agentes de IA

Qualquer IA ou assistente de código que analisar, planejar, criar ou editar arquivos neste projeto (`investigation-game` — **Cidade das Brumas**) **DEVE** seguir integralmente as regras abaixo e a especificação completa em [`documents/PROJECT_RULES.md`](documents/PROJECT_RULES.md).

---

## 1. Leitura Obrigatória Antes de Codificar
1. Leia [`documents/PROJECT_RULES.md`](documents/PROJECT_RULES.md) para entender as regras de domínio, limites de segurança, Clean Code e Clean Architecture.
2. Consulte [`documents/BACKLOG.md`](documents/BACKLOG.md) e [`documents/COMMIT_CONVENTIONS.md`](documents/COMMIT_CONVENTIONS.md) antes de propor ou implementar mudanças.
3. **Nunca** importe, exponha ou copie arquivos da pasta privada `docs/` para o frontend (`src/`), `shared/` ou `documents/`.

---

## 2. Clean Architecture e Responsabilidade Única (SRP)
- **Evite jogar todas as lógicas em um único arquivo:** Separe rigorosamente por responsabilidade. Cada classe, caso de uso, entidade, repositório, presenter, store ou composable deve ter um único propósito claro e ficar em seu próprio arquivo.
- **Respeite as camadas:**
  - `shared/`: Apenas tipos primitivos compartilhados (`InvestigatorId`, `LocationId`, `InvestigationAction`), DTOs públicos e funções puras compartilhadas (ex.: `canPayAction`). Zero segredos do caso.
  - `backend/`: Núcleo privado e independente de runtime: domínio, portas, casos de uso, conteúdo do caso, presenters e adaptadores reutilizáveis. Proibido depender de Fastify, SQLite, `Math.random()` direto ou HTTP.
  - `worker/`: Adaptador de produção Cloudflare Worker/D1. Deve consumir `backend/` e nunca expor seu conteúdo como asset estático.
  - `src/`: Interface Vue 3 reativa. Stores Pinia separadas por responsabilidade (`useMatchStore`, `useNotesStore`), orquestração de tela em `composables/` e componentes de UI desacoplados.

---

## 3. Segurança (AppSec & Anti-Cheat)
- **Proteção de Estado Oculto (Data Exposure):** A API jamais deve retornar a entidade de domínio bruta com `drawPile` (ordem das cartas a comprar), baralho completo do apoio ou chaves internas (`resolvedKeys`). Sempre retorne DTOs públicos através de um `Presenter` (expondo apenas `hand`, `drawPileCount` e `discardPileCount`).
- **Validação de Entrada:** Nunca desestruture `request.body` sem validação prévia de schema (JSON Schema / TypeBox / Zod) para evitar erros `500` com payloads nulos ou malformados.
- **Tratamento de Erros Semântico:** Proibido definir status HTTP comparando strings de erro (`message === '...'`). Use classes de erro de domínio tratadas centralmente pelas rotas do Worker.
- **Sanitização e Aleatoriedade:** Use `encodeURIComponent()` em parâmetros de URL no cliente (`src/services/game-api.ts`) e Web Crypto para embaralhamento no backend.

---

## 4. Clean Code, Nomenclatura e Formatação Visual
- **Espaçamento claro entre classes, funções e blocos:**
  - Deixe sempre **uma linha em branco** entre funções, métodos, classes, interfaces e blocos lógicos distintos (`import`s, tipos, constantes, estado reativo, `computed`s, funções).
  - Em arquivos `.vue`, separe claramente `<script setup>`, `<template>` e `<style>`, e mantenha respiro visual entre declarações dentro do `<script setup>` e entre regras no CSS.
- **Nomenclatura que faça sentido com o domínio:**
  - Use nomes expressivos em **inglês** para código (identificadores, tipos, funções, variáveis, classes CSS) e **português (pt-BR)** para textos de UI e mensagens ao usuário.
  - Proibido usar nomes genéricos (`data`, `item`, `info`, `temp`, `handle`, `doAction`, `utils`, `helper`).
  - Use verbos claros para ações (`spendActionPoints`, `prepareCard`, `resolveConversationQuestion`) e prefixos booleanos claros (`canExecuteAction`, `isPersonAvailableAtLocation`, `hasConversationBonus`).
- **Tipagem Forte:** Evite `any`, type casts inseguros (`as ...`) e arrays de "strings mágicas" (`resolvedKeys: string[]`). Modele estados com tipos e Value Objects explícitos.

---

## 5. Frontend: Componentização, CSS e Ícones
- **Utilizar ícones exclusivamente a partir da pasta `icons` (`src/components/icons/`):**
  - **Regra estrita:** Nenhum arquivo fora de `src/components/icons/` pode importar de `@phosphor-icons/vue` diretamente. Todos os ícones devem ser exportados por [`src/components/icons/index.ts`](src/components/icons/index.ts) e importados de lá. Nunca use símbolos de texto (`+`, `-`, `×`, `←`) como ícones.
- **Componentizar componentes que se repetem:**
  - Padrões de UI que aparecem mais de uma vez (cabeçalhos de seção, botões com ícone, badges de PA, cards, modais, listas do diário) devem ser extraídos para componentes reutilizáveis e puramente apresentacionais (`props` / `emit`) em `src/components/ui/`.
- **Externalizar classes CSS que se repetem:**
  - Proibido duplicar estilos de botões, painéis, badges, tipografia auxiliar, scrollbars ou cabeçalhos em vários arquivos CSS.
  - Centralize tokens (`:root`) e classes base/utilitárias que se repetem em `src/styles/`, deixando nos arquivos `src/features/<feature>/styles/` apenas o layout específico daquela tela.

---

## 6. Validação, Commits (Conventional Commits) e Controle de Push
- **Verificação Obrigatória:** Sempre execute `npm run check` (lint, format:check, test, worker:check e build) para garantir zero erros e zero warnings antes de concluir uma alteração ou criar um commit.
- **Leitura Obrigatória Antes de Commitar:** Antes de criar qualquer commit, o agente **DEVE** ler [`documents/COMMIT_CONVENTIONS.md`](documents/COMMIT_CONVENTIONS.md) e seguir rigorosamente o padrão **Conventional Commits**:
  - **Formato obrigatório:** `<type>(<scope>): <short description>` (em inglês direto, letras minúsculas, no imperativo e sem ponto final).
  - **Types permitidos:** `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `perf`, `build`, `ci`, `chore` (adicione `!` após `type(scope)` em caso de *breaking change*).
  - **Scopes preferenciais (obrigatório informar escopo):** `ui`, `world`, `game`, `cards`, `journal`, `case`, `api`, `server`, `database`, `auth`, `realtime`, `icons`, `config`, `deps`, `backlog`.
  - **Proibido:** Mensagens genéricas como `update`, `changes` ou `fix bug`, mensagens em português ou sem escopo.
- **Proibição de `git push` Automático:** **NUNCA** execute `git push` por conta própria após criar um commit. Todo envio ao repositório remoto exige a validação e autorização explícita do usuário primeiro.
