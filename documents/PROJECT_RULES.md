# Regras do projeto

Leia este documento antes de revisar, ampliar ou modificar o projeto. Ele reúne
as regras públicas do MVP, os limites de arquitetura e os padrões de
desenvolvimento já definidos.

## Documentação e conteúdo

- `documents/` reúne material seguro para acompanhar o repositório público.
- `docs/` contém material privado de trabalho. Não publique, importe no
  frontend ou copie seu conteúdo para documentos públicos.
- Conteúdo narrativo, condições ocultas e soluções de casos não pertencem ao
  código público do cliente nem a esta documentação.

## Limites do produto

- O MVP é um jogo investigativo de cartas, por turnos, para navegador.
- O modo jogável atual é solo: um investigador ativo e um apoio diferente,
  escolhidos antes da missão.
- Uma futura partida cooperativa terá exatamente dois investigadores, definidos
  no início e mantidos até o fim da missão.
- Uma missão tem, no máximo, seis rodadas. Toda rodada começa com seu evento.
- A acusação é desbloqueada somente após o encerramento da Rodada 4. Ela pode
  ser escolhida no início de um turno das Rodadas 5 ou 6 e consome esse turno.

## Turnos e pontos de ação

- Os pontos de ação (PA) são restaurados no começo de cada turno.
- Ações básicas consomem os PA aplicáveis e precisam ser resolvidas pelo motor
  do jogo, nunca apenas pela interface.
- Examinar, analisar, pesquisar e conversar dependem do contexto selecionado.
- Uma ação pode revelar pista, alterar o diário, abrir caminho ou registrar que
  a abordagem não encontrou nada. Mesmo uma tentativa sem resultado deve gerar
  um registro útil para orientar a próxima abordagem.
- O jogador deve receber confirmação antes de encerrar o turno ainda tendo PA.

## Regras das cartas

- Cada investigador possui quatro tipos de carta, com duas cópias de cada:
  oito cartas no total.
- A missão começa com quatro cartas na mão. No início de cada rodada, compra-se
  até voltar a quatro cartas.
- Uma carta usada vai para o descarte. Quando o baralho acaba, o descarte é
  embaralhado e se torna o novo baralho.
- Cartas não retornam automaticamente no fim do turno.
- Uma carta só pode ser usada no turno de seu dono, mas pode beneficiar pistas
  e diário compartilhados.
- Os custos possíveis são 0, 1 ou 2 PA. Uma carta de 0 PA não substitui uma
  ação básica.
- Uma carta exige contexto compatível e nunca pode revelar automaticamente a
  solução de um caso.
- Conversas podem conceder cartas temporárias a quem as conduziu. Elas são
  descartadas ao uso e não entram na coleção permanente.
- Na interface, clicar na carta prepara ou remove a preparação. O controle `+`
  abre os detalhes sem preparar a carta.

## Fronteiras entre frontend e backend

- O frontend em Vue renderiza o estado atual e envia as intenções do jogador.
- O backend Node/Fastify é a autoridade para partida, PA, resolução de ações,
  alterações de baralho, avanço de turnos e registros do diário.
- Um estado local pode apoiar o desenvolvimento, mas não pode se tornar a fonte
  de verdade de uma partida online.
- Não inclua resultados secretos ou condições de solução em `src/content` nem
  em qualquer pacote enviado ao navegador.
- Estado de interação pertence à feature ou store apropriada; regras de negócio
  não pertencem a componentes Vue.

## Organização

```text
src/                    aplicação frontend
src/features/           interface e estilos de cada funcionalidade
src/components/         componentes reutilizáveis
src/stores/             estado de apresentação
server/src/domain/      regras puras e modelos de domínio
server/src/application/ casos de uso e orquestração de partidas
server/src/http/        rotas Fastify e responsabilidades HTTP
assets/                 artes aprovadas
documents/              documentação pública do projeto
docs/                   material privado do projeto
```

## Padrões de engenharia

- Prefira componentes e módulos pequenos, focados e com entradas e saídas
  explícitas.
- Mantenha o domínio determinístico e sem detalhes de HTTP, Vue ou persistência.
- Mantenha rotas finas: validam dados, chamam um caso de uso e retornam resposta.
- Atualize testes significativos sempre que um comportamento mudar, sobretudo
  regras de jogo e respostas da API.
- Execute `npm run check` antes de considerar uma implementação concluída.
- Siga [COMMIT_CONVENTIONS.md](COMMIT_CONVENTIONS.md): commits são diretos,
  em inglês, e usam `type(scope): description`.

## Estado atual e próximos passos

- A API armazena partidas em memória; reiniciá-la limpa o estado.
- Autenticação, persistência, salas multiplayer, sincronização em tempo real,
  escolhas completas de conversa, efeitos completos de cartas e notificações
  ainda são trabalho planejado.
- Consulte [BACKLOG.md](BACKLOG.md) antes de alterar prioridade ou desenho
  dessas evoluções.
- Se uma regra deste documento divergir de um comportamento temporário da
  interface, preserve a regra e registre ou atualize a pendência no backlog.
