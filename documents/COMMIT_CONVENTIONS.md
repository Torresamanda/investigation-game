# Commit conventions

All commits in this repository use Conventional Commits and are written in
direct, lowercase English.

## Format

```text
<type>(<scope>): <short description>
```

The scope is required for this project. Use a concise description in the
imperative form, without a final period.

```text
feat(ui): add clue discovery toast
fix(cards): prevent overlapping card controls
```

## Types

| Type | Use when |
| --- | --- |
| `feat` | Adding a user-facing feature or game capability. |
| `fix` | Correcting an observable defect. |
| `refactor` | Improving code structure without changing behavior. |
| `test` | Adding or updating automated tests. |
| `docs` | Updating documentation or planning files. |
| `style` | Changing visual styling only. |
| `perf` | Improving performance. |
| `build` | Changing build tooling or dependencies used to build. |
| `ci` | Changing continuous-integration configuration. |
| `chore` | Maintenance that does not fit another type. |

## Scopes

Use the scope that best identifies the affected area. Prefer these scopes:

| Scope | Area |
| --- | --- |
| `ui` | Shared interface, layout, or visual components. |
| `world` | World map and mission selection. |
| `game` | Rules engine, turns, action points, or match state. |
| `cards` | Card decks, preparation, effects, or card interactions. |
| `journal` | Diary, clues, hypotheses, and annotations. |
| `case` | Case content, events, locations, or suspects. |
| `api` | HTTP API contracts and client integration. |
| `server` | Backend application and use cases. |
| `database` | Persistence, schema, or migrations. |
| `auth` | Authentication and authorization. |
| `realtime` | Multiplayer rooms and synchronization. |
| `icons` | Icon library and icon components. |
| `config` | Tooling and project configuration. |
| `deps` | Dependency updates. |
| `backlog` | Product backlog and task planning. |

Create a new concise scope when none of these describes the change clearly.

## Examples

```text
feat(game): resolve gallery examination outcome
feat(cards): prepare selected card on click
fix(ui): center suspect panel close button
fix(api): persist journal entries after actions
refactor(server): isolate match resolution use case
test(game): cover discard pile reshuffle
style(world): soften world map transition
docs(backlog): prioritize notification tasks
chore(deps): add phosphor icons
```

## Breaking changes

Add `!` after the type or scope when a change breaks a public API or saved
game contract. Explain the impact in the commit body or footer.

```text
feat(api)!: rename match action endpoint

BREAKING CHANGE: clients must use /actions instead of /turn-actions.
```

## Checklist

Before committing, confirm that the message:

- uses `type(scope): description`;
- is in direct English and lowercase;
- describes one coherent change;
- uses a scope from this document when possible; and
- avoids generic subjects such as `update`, `changes`, or `fix bug`.
