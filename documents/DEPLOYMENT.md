# Publicação no Cloudflare

O projeto possui dois ambientes independentes. Cada um publica interface e API pelo mesmo Worker, mas utiliza seu próprio banco D1 e seus próprios namespaces de limite de taxa.

| Ambiente | Worker | Banco D1 | Disparo |
| --- | --- | --- | --- |
| Desenvolvimento | `cidade-das-brumas-dev` | `cidade-das-brumas-dev` | Push na branch `dev` |
| Produção | `cidade-das-brumas` | `cidade-das-brumas` | Tag `v*` criada a partir de `main` |

## Primeiro preparo do ambiente de desenvolvimento

Com o Wrangler autenticado na conta Cloudflare, aplique as migrações uma vez no banco de desenvolvimento:

```bash
npm run cloudflare:d1:migrate:development
```

O primeiro deploy do Worker de desenvolvimento pode ser feito pelo GitHub Actions depois de configurar os segredos abaixo. Ele também pode ser executado localmente, quando necessário:

```bash
npm run build
npx wrangler deploy --env development
```

## GitHub Actions

No repositório GitHub, crie os ambientes `development` e `production` em **Settings → Environments**. Em cada ambiente, adicione estes segredos:

- `CLOUDFLARE_API_TOKEN`: token com permissão mínima para publicar Workers e acessar D1.
- `CLOUDFLARE_ACCOUNT_ID`: identificador da conta Cloudflare, obtido no painel da conta ou com `npx wrangler whoami`.

Nem o token nem o identificador da conta devem ser salvos em arquivos do projeto, commits, issues ou mensagens. A execução de publicação depende desses segredos e cada uma executa `npm run check` antes de enviar o Worker.

## Fluxo de publicação

1. Desenvolva e valide alterações na branch `dev`; cada push publica o ambiente de desenvolvimento.
2. Abra e aprove a alteração de `dev` para `main`.
3. Na `main` atualizada, crie uma tag de versão no formato `vX.Y.Z`.
4. Envie a tag ao GitHub. O fluxo de produção confirma que ela pertence à `main` antes de publicar.

Exemplo:

```bash
git switch main
git pull --ff-only
git tag v0.1.0
git push origin v0.1.0
```

As migrações D1 são uma etapa deliberada e separada do deploy do Worker. Antes de uma versão que inclua uma nova migração, aplique-a primeiro no ambiente correspondente e valide o resultado.
