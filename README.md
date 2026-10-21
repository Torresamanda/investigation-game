# Cidade das Brumas

Primeira etapa do MVP: frontend Vue 3 + TypeScript com seleção de missão e prévia da investigação. As 16 artes das cartas estão vinculadas aos quatro investigadores; cenários e retratos continuam como espaços reservados.

## Desenvolvimento

Requer Node.js 22.12+ (ou versão LTS mais recente compatível) e npm.

```sh
npm ci
npm run dev
```

Abra o endereço exibido pelo servidor. Para verificar:

```sh
npm run check
```

## Escopo atual

- Mapa de mundo, missão, seleção de investigador e apoio distintos.
- Museu com locais, diário, hipóteses salvas em memória e os quatro tipos de carta do investigador escolhido, com arte, moldura, custo e detalhes ao clicar.
- O catálogo cria oito instâncias por investigador (duas de cada tipo). A exibição dos quatro tipos é uma prévia das artes, não uma mão sorteada; compra, uso e descarte ainda não são executados.
- Interface responsiva e navegação por teclado.
- Ações não gastam PA nem revelam evidências. Não há partida, persistência, login ou multiplayer implementados.
- Recarregar a página perde a sessão; acesso direto à investigação retorna à seleção.
- Iniciar investigação abre o briefing de Sofia. Retornar ao mundo abandona a sessão, incluindo rascunhos, hipóteses e introdução; um novo início recomeça do zero. As anotações são salvas somente durante a sessão atual, sem armazenamento persistente ou servidor.

## Retratos

Os espaços de retrato ficam disponíveis enquanto as artes são produzidas. O carregamento é automático ao adicionar PNG, WebP, JPG, JPEG ou AVIF com estes nomes:

- `assets/investigators/sofia-moura.png`
- `assets/investigators/livia-serrano.png`
- `assets/investigators/dr-rafael-monteiro.png`
- `assets/investigators/isadora-queiroz.png`
- `assets/investigators/otavio-leme.png`

O componente `CharacterPortrait` oferece o espaço reservado. `CardArtwork` aplica a mesma moldura de `assets/ui/moldura-investigativa.png` à mão e aos detalhes. `AppModal` centraliza Escape, clique fora e foco nativo para os modais.

## Organização

`src/app`: inicialização e rotas; `src/content`: catálogos públicos de investigadores, locais e suspeitos; `src/stores`: estado de apresentação; `src/styles`: identidade visual global.

Cada funcionalidade fica em `src/features/`. Na investigação, a página coordena os componentes de barra superior, locais, cenário, ações, suspeitos, cartas e diário. Os componentes recebem dados e emitem intenções; o estado de abertura do diário fica em `composables/useJournalDisclosure.ts`. Os estilos de cada área e suas variantes responsivas ficam em `styles/`; `investigation.css` apenas os reúne. Na home, mapa e seleção de equipe são componentes separados.

Mantenha estado de navegação e interação na interface. As futuras regras de PA, cartas, eventos e acusação pertencem ao motor, não aos componentes. Os dados em `src/content` são públicos: não adicionar a solução ou condições secretas do caso.

`npm run check` executa ESLint, conferência de formatação, testes e compilação com verificação de tipos. `npm run format` formata o código. Testes de integração da tela verificam os fluxos entre componentes, incluindo preservação das anotações ao recolher o diário.

Artes originais ficam em `assets/`, fora de `public/`. Quando forem integradas, publicar somente arquivos selecionados e otimizados. Nunca copiar documentos de `docs/private/` para `public/` ou importar soluções no frontend.

## Próximas etapas

Resolver detalhes pendentes de PA/descontos, apoio e conexões, implementar motor puro com testes e depois integrar solo online com Supabase. Cooperação usa exatamente dois investigadores fixos. Acusação somente no início de um turno das Rodadas 5 ou 6, consumindo-o inteiro.

O diretório `dist/` é o artefato estático para Cloudflare Pages; `_redirects` mantém as rotas da aplicação. Nenhum serviço pago ou remoto foi criado.
