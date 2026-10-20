# Task 02 — Dados pessoais cifrados (blind index do e-mail)

|                 |                                                                               |
| --------------- | ----------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 3 — Cache e criptografia](./README.md)                                |
| **Owner**       | Dev 1 (Backend & Segurança)                                                   |
| **Duração**     | 1.5 dia                                                                       |
| **Prioridade**  | P1 (cortável se o sprint atrasar; os anexos da Task 01 já cobrem o requisito) |
| **Branch**      | `dev1-sec/pii-encryption`                                                     |
| **Depende de**  | Task 01 (`Cipher`)                                                            |
| **Desbloqueia** | Task 10 (segredo do MFA cifrado)                                              |
| **Requisito**   | Criptografia de dados sensíveis                                               |
| **Embasamento** | Desenvolvimento Seguro — Aula 1 e Aula 5 (cifra em repouso)                   |

---

## Contexto

A tabela `users` guarda `email` e `name` em claro. Um dump do banco (backup vazado, SQL injection, acesso indevido) expõe a lista de clientes. Cifrar o e-mail tem um problema: o login precisa **buscar** por ele. A solução é o **blind index** — um HMAC do e-mail normalizado, que permite busca por igualdade sem guardar o e-mail em claro.

## Implementação

Migração em etapas (expand → backfill → contract):

1. **Expand:** adicionar `email_hash text unique`, `email_enc text`, `name_enc text` e `pii_version integer default 0`.
2. **Escrita dupla:** o `DrizzleUserRepository` grava as colunas novas (e, por enquanto, as antigas) e lê as cifradas quando existirem.
3. **Backfill:** `npm run db:backfill-pii -w @bytebank/shell` (idempotente, em lotes).
4. **Troca da busca:** login e "e-mail já cadastrado" passam a usar `email_hash`:
   ```ts
   export const blindIndex = (value: string) =>
     createHmac('sha256', blindIndexKey).update(value.trim().toLowerCase()).digest('base64url');
   ```
   Contextos de cifra: `user:<id>:email` e `user:<id>:name`.
5. **Contract:** migração separada remove `email` e `name`, **depois** de verificar em produção.
6. **Seed** (`db/seed.ts`) passa a gravar cifrado. A chave de rate limit por e-mail (S2-05) reusa o `blindIndex`.

## Notas de implementação

- **Contract no mesmo PR.** Por decisão do time, expand, backfill e contract entram juntos. Não existe versão intermediária no ar: o código final só conhece as colunas cifradas, e a transição de dados é feita pelo `db:backfill-pii`. Por isso não há escrita dupla (passo 2).
- **Migrações.**
  - `0009_pii_encryption` (expand): só `ADD COLUMN` (`email_hash` com `UNIQUE`, `email_enc`, `name_enc`). O `pii_version` previsto ficou de fora, porque só serviria à fase de escrita dupla. O próprio payload cifrado já carrega versão e `keyId`.
  - `0010_pii_contract`: remove `email` e `name` (com a `UNIQUE` do e-mail) e torna as três colunas `NOT NULL`. Abre com uma trava: se houver usuário com algum campo cifrado nulo, a migração aborta.
  - O `drizzle-kit migrate` aplica tudo numa transação só. Por isso, num banco com usuários em claro, um `db:migrate` direto aborta na trava e desfaz também a `0009`, sem perder dado. O `drizzle-kit` não mostra o motivo, só `command failed`.
- **`HmacBlindIndex`** (infra, `node:crypto`): HMAC-SHA256 em base64url do valor com `trim().toLowerCase()`. `BLIND_INDEX_KEY` é base64 de exatamente 32 bytes, validada ao carregar o container. Em produção, sem a chave, nada sobe. O `next build` e o dev usam uma chave local fixa, como o `Cipher`. Não há fallback para o `AUTH_SECRET`: trocar o segredo da sessão não pode invalidar o índice.
- **`DrizzleUserRepository(db, cipher, blindIndex)`.** Grava só `email_hash`, `email_enc` e `name_enc` (contextos `user:<id>:email` e `user:<id>:name`) e decifra na leitura. A busca é `email_hash = blindIndex(email)`. A duplicidade vem do `ON CONFLICT (email_hash) DO NOTHING`, então e-mails que só diferem na caixa também dão "e-mail já cadastrado".
- **`db:backfill-pii`** (tsx com `tsconfig.scripts.json`):
  1. Lê as colunas de `users` no `information_schema`. Sem `email`, o contract já foi feito e o script sai sem mexer em nada.
  2. Sem `email_hash`, aplica as migrações até a `0009`. Usa o migrador do drizzle-orm sobre uma cópia temporária do journal, cortada na `0009`; o registro em `__drizzle_migrations` fica igual ao do `drizzle-kit`.
  3. Confere as chaves num usuário já cifrado: a chave de cifra precisa decifrar, e o blind index do e-mail decifrado precisa bater.
  4. Cifra os legados com `EncryptLegacyUsers` (core) e o `DrizzleLegacyUserRepository`. Esse repositório usa SQL cru, porque o schema do Drizzle já não tem as colunas em claro. São lotes de 100 com cursor por id, e `UPDATE … WHERE email_hash IS NULL` (idempotente). Um e-mail duplicado após normalizar é recusado com "Outro usuário já usa o mesmo e-mail normalizado".
  5. Sem nenhuma falha, aplica o contract (todas as migrações pendentes) pelo migrador, que mostra o erro do Postgres. Com falha, para antes e o texto em claro fica no banco.
  - Flags: `--dry-run` só conta, sem aplicar nada. `--dev-keys` usa as chaves locais do `next dev` e só é aceita com banco em `localhost`/`127.0.0.1`/`[::1]`/`db`. Sem `--dev-keys`, `DATA_ENCRYPTION_KEYS`, `DATA_ENCRYPTION_ACTIVE_KEY_ID` e `BLIND_INDEX_KEY` são obrigatórias.
- **Rate limit.** `HmacRateLimitKeyGenerator` recebe o `HmacBlindIndex`: a chave é `login:email:<blindIndex>`. Se produção usava o fallback do `AUTH_SECRET`, os bloqueios em andamento zeram no deploy.
- **Seeds e testes.**
  - `db/seed.ts` só insere transações, sem dados pessoais. Quem cria usuário passa pelo repositório e grava cifrado: o `db:seed-load` (agora com `tsconfig.scripts.json`) e o `globalSetup` do E2E.
  - Para o `globalSetup`, o Playwright usa `e2e/tsconfig.json`, que mapeia `@/*` e `server-only`. As chaves de teste do E2E ficam em `e2e/keys.ts`, compartilhadas com o servidor do E2E. O Docker Compose tem chaves de smoke próprias.
  - `integrationScope` apaga usuários por id; quem cria usuário com id aleatório (registro) chama `scope.adoptUser(id)`.
- **Google.** Desde o S2-07, o `ResolveOAuthUser` grava o usuário do Google na tabela. Ele passa pelo mesmo repositório, então também fica cifrado (ver gotcha 3).

## Testes

- [x] `HmacBlindIndex`: HMAC do valor normalizado, sem o valor em claro, muda com a chave, recusa chave fora de 32 bytes
- [x] `resolveBlindIndex` e container: chave configurada, chave inválida, obrigatória em produção, chave local no dev e no build
- [x] `EncryptLegacyUsers` (core): lotes, idempotência, falha registrada sem travar o lote, linha já migrada por outra execução
- [x] `DrizzleUserRepository` (integração): banco sem colunas em claro, campos cifrados, busca ignorando caixa, `name_enc` de outro usuário recusado (contexto), duplicidade em outra caixa
- [x] `DrizzleLegacyUserRepository` (integração, tabela temporária no formato da `0009` numa conexão própria): cursor e limite, backfill idempotente com os contextos do repositório, e-mail duplicado após normalizar, conferência das chaves
- [x] Container (integração): registro grava cifrado, login pelo blind index, mesmo e-mail em outra caixa → "E-mail já existe", rehash de bcrypt antigo

## Validação

- [x] `SELECT email_hash, email_enc, name_enc FROM users LIMIT 3;` sem nenhum dado em claro (local; print para o vídeo pendente)
- [x] Login, registro e "e-mail já cadastrado" funcionando
- [x] Sessão mostra nome e e-mail corretos (decifrados no `authorize`)
- [x] Backfill idempotente (rodar 2× não quebra)

## Rollout em produção (pendente)

Com o contract no mesmo deploy, não há volta para a versão anterior pelo código: ela lê `email` e `name`. Rollback = restaurar o branch/backup do Neon.

1. Criar `BLIND_INDEX_KEY` na Vercel (Sensitive, base64 de 32 bytes, diferente da chave de cifra) e guardar uma cópia fora do repo. Se ela já existir em outro formato, o deploy não sobe.
2. Branch/backup do Neon. `vercel env pull` e `npm run db:backfill-pii -w @bytebank/shell -- --dry-run`, que mostra quantos usuários estão em claro.
3. Merge (deploy) e, assim que o deploy estiver no ar, `npm run db:backfill-pii -w @bytebank/shell`. Entre o deploy e o fim do script (segundos), login e cadastro falham. As sessões abertas continuam valendo, porque a validação da sessão só lê `session_version`.
4. Conferir: `SELECT email_hash, email_enc, name_enc FROM users LIMIT 3;` e o login de uma conta antiga.
5. Se o script parar com falha (e-mail duplicado após normalizar), o contract não roda: os já cifrados entram, mas o cadastro falha até resolver a linha e rodar o script de novo.

Banco local com usuários de teste: `npm run db:backfill-pii -w @bytebank/shell -- --dev-keys` (no lugar do `db:migrate`, que aborta na trava). Se o banco também é usado pelo shell do Docker Compose, passe as chaves do compose em vez de `--dev-keys`.

## Gotchas

1. Blind index só permite igualdade (login, duplicidade); não há busca parcial por e-mail no produto, então ok.
2. `BLIND_INDEX_KEY` é diferente da chave de cifra (separação de funções). Trocar a chave do blind index exige recalcular todos os hashes.
3. ~~O login com Google não grava usuário na tabela~~ Desde o S2-07, o `ResolveOAuthUser` grava o usuário do Google (para a revogação de sessão). Ele passa pelo `DrizzleUserRepository`, então nome e e-mail também ficam cifrados.
4. ~~A etapa contract só depois do backfill verificado em produção~~ O contract foi junto, mas ainda depende do backfill: a trava da `0010` e o `db:backfill-pii` garantem a ordem. Faça o branch/backup do Neon antes.

## Evidências — 2026-10-19

| Validação                                                     | Resultado                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Testes unitários (core e shell)                               | Core 172 e shell 214 aprovados, sem erros. O erro antigo do `clientEffects.test.ts` foi corrigido: o teste agora simula um `BeforeUnloadEvent` com `returnValue` gravável                                                                                 |
| Integração com PostgreSQL 16 descartável e migrations         | 77 testes aprovados em 8 arquivos                                                                                                                                                                                                                         |
| Rollout simulado (banco na `0008` com 3 usuários em claro)    | `db:migrate` direto aborta e desfaz tudo; `--dry-run` só conta; recusa sem chaves e `--dev-keys` com banco remoto; o script aplica a `0009`, cifra 3 e aplica o contract; nova execução: "nada a fazer"; chave de blind index errada é recusada           |
| Falha no backfill (e-mail duplicado após normalizar)          | Cifra o resto, informa o duplicado e não aplica o contract; depois de resolver, o script completa                                                                                                                                                         |
| Login de usuário migrado (pelo container)                     | E-mail em outra caixa entra, nome e e-mail decifrados, bcrypt reescrito em custo 12; senha errada → `null`                                                                                                                                                |
| `next build` sem `BLIND_INDEX_KEY` nem `DATA_ENCRYPTION_KEYS` | Build de produção aprovado                                                                                                                                                                                                                                |
| E2E Chromium (`npx playwright test --project=chromium`)       | 16 aprovados no banco após o contract; o usuário do E2E é criado cifrado e o login mostra o nome decifrado. Numa rodada, o teste de inatividade do S2-07 falhou no `goBack` e passou nas 3 repetições seguintes (intermitente, sem relação com esta task) |
| `npm run arch:check`                                          | Sem violações                                                                                                                                                                                                                                             |
