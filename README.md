# Cidade das Brumas

> Um MVP de jogo investigativo de cartas para navegador, com partidas solo e uma base preparada para cooperação online.

O projeto explora investigação por turnos: o jogador escolhe um investigador, visita locais, realiza ações, usa cartas e registra descobertas no diário. A interface é construída para evoluir aos poucos, enquanto as regras do jogo ficam centralizadas no servidor.

![Mapa de mundos de Cidade das Brumas](assets/world/word-map.png)

## Estado atual

- Seleção de mundo, missão, investigador e apoio.
- Tela de investigação com locais, pessoas de interesse, diário e cartas.
- Pontos de ação, ações de investigação e registros dinâmicos no diário.
- API local para criar partidas, executar ações e encerrar turnos.
- Testes, lint, formatação e verificação de tipos reunidos em um único comando.

O multiplayer, autenticação e persistência em banco de dados fazem parte das próximas etapas.

## Tecnologias

- **Frontend:** Vue 3, TypeScript, Vite e Pinia.
- **Backend:** Node.js, TypeScript e Fastify.
- **Qualidade:** ESLint, Prettier, Vitest e Vue TSC.

## Como rodar

### Pré-requisitos

- Node.js 22.12 ou mais recente.
- npm.

### Instalação

```bash
npm ci
```

### Desenvolvimento

Em um terminal, inicie a interface:

```bash
npm run dev
```

Em outro terminal, inicie a API:

```bash
npm run server:dev
```

Abra no navegador o endereço exibido pelo Vite. A API local fica disponível em `http://127.0.0.1:3333`; use `http://127.0.0.1:3333/health` para confirmar que ela está ativa.

### Verificação

```bash
npm run check
```

Esse comando executa lint, checagem de formatação, testes, tipos do servidor e build da aplicação.

### Configuração de ambiente

Copie `.env.example` e preencha as variáveis no ambiente de execução. O servidor usa `PORT`, `DATABASE_PATH` e `ALLOWED_ORIGIN`; em produção, as duas últimas são obrigatórias. O build do cliente usa `VITE_API_URL` para apontar à API publicada.

O cliente é gerado somente em `dist/`. A API não serve arquivos estáticos: publique `dist/` em uma hospedagem estática e execute o servidor como serviço separado, mantendo `server/` e `docs/` fora do ambiente público.

## Organização

```text
src/       interface, componentes e estado de apresentação
server/    regras de domínio, casos de uso e API HTTP
assets/    artes de cartas, mapas, locais e interface
tests/     testes automatizados
```

As regras que definem o resultado de uma ação pertencem ao servidor. A interface exibe o estado da partida e envia as intenções do jogador, mantendo cada área do projeto independente e mais fácil de evoluir.

As regras públicas e limites técnicos do MVP estão em [Project rules](documents/PROJECT_RULES.md). Leia esse documento antes de revisar ou alterar o jogo.

## Contribuindo

Use a convenção descrita em [Commit conventions](documents/COMMIT_CONVENTIONS.md) para mensagens de commit. O formato adotado é `type(scope): description`, por exemplo:

```text
feat(ui): add clue discovery toast
```

Consulte o [backlog](documents/BACKLOG.md) para as próximas tarefas priorizadas.
