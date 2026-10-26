# Cidade das Brumas

> Um MVP de jogo investigativo de cartas para navegador, com partidas solo e uma base preparada para cooperação online.

O projeto explora investigação por turnos: o jogador escolhe um investigador, visita locais, realiza ações, usa cartas e registra descobertas no diário. A interface é construída para evoluir aos poucos, enquanto as regras do jogo ficam centralizadas no servidor.

![Mapa de mundos de Cidade das Brumas](assets/world/word-map.png)

## Estado atual

- Seleção de mundo, missão, investigador e apoio.
- Tela de investigação com locais, pessoas de interesse, diário e cartas.
- Pontos de ação, ações de investigação e registros dinâmicos no diário.
- API autoritativa executada por Cloudflare Worker com persistência em D1.
- Testes, lint, formatação e verificação de tipos reunidos em um único comando.

O multiplayer permanece planejado para uma etapa futura.

## Tecnologias

- **Frontend:** Vue 3, TypeScript, Vite e Pinia.
- **Backend de produção:** Cloudflare Workers, D1 e TypeScript.
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

Inicie o Worker local, que atende a interface e a API no mesmo endereço:

```bash
npm run dev
```

Abra no navegador o endereço informado pelo Wrangler. Use `/health` nesse mesmo endereço para confirmar que a API está ativa.

### Verificação

```bash
npm run check
```

Esse comando executa lint, checagem de formatação, testes, tipos do Worker e build da aplicação.

### Configuração local

O desenvolvimento integrado inicia o Vite em `http://127.0.0.1:5173` com atualização imediata da interface e o Worker local em `http://127.0.0.1:8787`. Requisições para `/api` feitas pelo Vite são encaminhadas automaticamente ao Worker, que usa D1 local e não exige arquivo `.env`. Opcionalmente, `VITE_API_URL` pode apontar o build do cliente para uma API externa.

### Produção no Cloudflare

O Worker publica apenas o conteúdo gerado em `dist/` e atende a API no mesmo domínio, em `/api/*`. Assim, o cliente não precisa de `VITE_API_URL` em produção e não há CORS entre interface e API.

As fontes de `backend/`, `worker/`, `shared/`, migrações, arquivos de configuração e as pastas privadas `docs/` e `documents/` não pertencem aos assets publicados. O Worker também rejeita diretamente tentativas de acesso a esses caminhos, inclusive quando codificados na URL. Respostas da interface e da API recebem cabeçalhos restritivos de segurança; falhas inesperadas devolvem apenas uma mensagem genérica.

Antes do primeiro deploy, crie o banco D1 configurado em `wrangler.jsonc`, aplique as migrações e autentique o Wrangler na conta Cloudflare. Em seguida, use:

```bash
npm run cloudflare:d1:migrate
npm run cloudflare:deploy
```

O fluxo de publicação contínua e a separação entre desenvolvimento e produção estão documentados em [Deploy no Cloudflare](documents/DEPLOYMENT.md).

## Organização

```text
src/       interface, componentes e estado de apresentação
backend/   núcleo privado: regras, casos de uso, conteúdo de casos e presenters
worker/    API publicada: Cloudflare Worker e persistência D1
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
