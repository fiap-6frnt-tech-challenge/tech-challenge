# Task 02 — Hardening de Docker e infraestrutura

|                 |                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 4 — Auditoria e entrega](./README.md)                                                                        |
| **Owner**       | Dev 1 (Backend & Segurança)                                                                                          |
| **Duração**     | 0.5 dia                                                                                                              |
| **Prioridade**  | P1                                                                                                                   |
| **Branch**      | `dev1-sec/docker-hardening`                                                                                          |
| **Depende de**  | S3-09 (Trivy nas imagens)                                                                                            |
| **Desbloqueia** | Task 03                                                                                                              |
| **Requisito**   | Segurança no desenvolvimento                                                                                         |
| **Embasamento** | Desenvolvimento Seguro — Aula 5 (menor privilégio, portas, gerenciamento de usuários, atualizações) e Aula 7 (Trivy) |

---

## Contexto

- O estágio final do `apps/shell/Dockerfile` roda como **root** (não há `USER`).
- Os MFEs usam `nginx:alpine` na porta 80.
- O `docker-compose.yml` publica o Postgres em `0.0.0.0:5432` com `bytebank:bytebank` fixo no arquivo.
- A aplicação usa o mesmo usuário de banco que roda as migrações (dono do schema).

## Implementação

1. **Shell:** `COPY --chown=node:node ...` + `USER node` (a imagem `node:22-alpine` já tem esse usuário); `ENV NEXT_TELEMETRY_DISABLED=1`; `HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/login > /dev/null || exit 1`.
2. **MFEs:** `FROM nginxinc/nginx-unprivileged:alpine` (porta 8080); `listen 8080;` e `server_tokens off;` no `nginx.conf`; header `X-Content-Type-Options: nosniff`. No compose: `3002:8080` e `3003:8080`.
3. **Compose:**
   - `db.ports: ['127.0.0.1:5432:5432']`
   - credenciais via `.env` (`${POSTGRES_PASSWORD}`), com o valor de dev só no `.env.example`
   - serviços da aplicação com `security_opt: ['no-new-privileges:true']` e `cap_drop: [ALL]`
   - shell com `read_only: true` + `tmpfs` para `/tmp` e `/app/apps/shell/.next/cache`
4. **Menor privilégio no banco:** script `docker/postgres/init/01-app-role.sql` cria o `bytebank_app` só com `SELECT, INSERT, UPDATE, DELETE` (+ `USAGE` no schema e `ALTER DEFAULT PRIVILEGES`). As migrações rodam com o dono (`bytebank`); o shell conecta como `bytebank_app`. No Neon, criar um role equivalente no console.
5. Conferir que a checagem do `COPY packages/core/package.json` (S1-01) está nos três Dockerfiles.

## Notas de implementação

- **Shell.**
  - O `USER node` já existia antes desta task (o Contexto acima estava desatualizado).
  - O código do standalone continua com dono `root`, um desvio do `COPY --chown=node:node` do passo 1. Assim o processo lê o código, mas não consegue reescrevê-lo. Só `/app/.uploads` e `.next/cache` pertencem ao `node`.
  - `ENV HOSTNAME=0.0.0.0`: o Docker define `HOSTNAME` com o id do container, e o `server.js` do standalone escuta nesse endereço. Sem o override, o healthcheck em `127.0.0.1` falha.
  - O `tmpfs` de `.next/cache` precisa de `uid=1000,gid=1000`. Sem isso, ele monta como `root:root 755`, e o otimizador de imagens falha com `EACCES` (`unhandledRejection` e imagem vazia). O `/tmp` já monta `1777`.
- **MFEs.**
  - O `nginx-unprivileged` termina em `USER 101`. O Dockerfile volta para `root` só para o `apk -U upgrade` e retorna ao `101` antes de copiar o `dist`. Os arquivos ficam com dono `root` e só leitura para o nginx.
  - `nosniff` foi repetido nos dois `location` que têm `add_header` próprio, porque eles não herdam os headers do `server`.
  - `read_only` + `tmpfs` em `/tmp` também nos MFEs, além do que o passo 3 pedia. O `nginx-unprivileged` só grava pid e temporários em `/tmp`.
- **Senhas.**
  - O compose usa `${POSTGRES_PASSWORD:?…}` e `${POSTGRES_APP_PASSWORD:?…}`. Sem `.env`, ele para com uma mensagem clara, em vez de subir o Postgres sem senha.
  - O dev local (`npm run dev`) também passa a precisar do `.env` da raiz para o `docker compose up -d db`. O README foi ajustado.
  - O valor de dev do dono continua `bytebank`, então os `DATABASE_URL` do `.env.local`, da CI e dos defaults do E2E seguem válidos.
- **`01-app-role.sql`.**
  - A senha vem do ambiente do container via `\getenv` (psql 15+). O arquivo continua `.sql`, sem credencial embutida.
  - Funciona com CRLF (checkout no Windows com `autocrlf`).
  - Num volume já existente, o README documenta como aplicar o script sem `down -v`.
- **`.dockerignore`** passou a excluir `.env*` em qualquer nível. O `.env*.local` só casava na raiz, então o `apps/shell/.env.local` de quem builda localmente entrava no `next build` da imagem.
- **Neon.** O role tem que ser criado pelo SQL Editor (SQL no README). Um role criado pela aba Roles do console entra no `neon_superuser`.
- **Postgres em `127.0.0.1`.** O bind é só IPv4. Clientes Node resolvem `localhost` nas duas famílias e conectam. Um cliente que use só `::1` precisa de `127.0.0.1` na URL.
- **Passo 5.** Os três Dockerfiles copiam o `package.json` dos 5 packages, incluindo o `packages/core`.

## Validação

- [x] `docker compose exec shell whoami` → `node`
- [x] Postgres inacessível por outra máquina da rede
- [x] `bytebank_app` não consegue `DROP TABLE` nem `ALTER TABLE`
- [x] Trivy (S3-09) verde nas 3 imagens (local; a CI roda no PR)
- [x] `docker compose up --build` funciona do zero com as portas novas

## Gotchas

1. `nginx-unprivileged` não consegue escutar na porta 80: use 8080 e ajuste o compose (e o README).
2. `read_only: true` quebra escritas do Next (cache de imagens): monte `tmpfs` onde ele escreve.
3. Scripts em `docker-entrypoint-initdb.d` só rodam com volume vazio: `docker compose down -v` para reaplicar (documente no README).
4. Sem `ALTER DEFAULT PRIVILEGES`, tabelas criadas por migrações futuras ficam sem permissão para o `bytebank_app`.

## Evidências — 2026-10-28

Stack num projeto compose isolado (`-p s402`), com volumes novos e os valores do `.env.example`. Docker 29.5.2.

| Validação                                          | Resultado                                                                                                                                                                                                                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose up --build` do zero                | volumes novos; o `up --build` refez o build das 3 apps (`npm ci` só parcialmente em cache); `db` healthy, init aplicado (`CREATE ROLE`, 2× `GRANT`, `ALTER DEFAULT PRIVILEGES`); migrações 0000–0012 e seed (54 transações) rodando no host como `bytebank`; shell `healthy` |
| Usuário e restrições                               | shell `node` (uid 1000), MFEs `nginx` (uid 101); `ReadonlyRootfs=true`, `CapDrop=[ALL]`, `CapEff=0`, `NoNewPrivs=1`; `touch /app/x` → `Read-only file system`                                                                                                                |
| Sem `.env`                                         | `docker compose config` para com `required variable POSTGRES_PASSWORD is missing a value`                                                                                                                                                                                    |
| Postgres na rede                                   | `127.0.0.1:5432` aberto; IP de LAN `:5432` → `ECONNREFUSED` (controle: LAN `:3002` aberto); `localhost:5432` via Node conecta                                                                                                                                                |
| `bytebank_app`                                     | `SELECT`/`UPDATE` ok; `DROP`/`ALTER` → `must be owner`; `TRUNCATE`, `CREATE TABLE` e schema `drizzle` → `permission denied`; sem superuser/createdb/createrole/bypassrls; tabela criada depois pelo dono já legível                                                          |
| Init com CRLF e em volume existente                | Script com CRLF aplica e autentica com a senha do ambiente; em banco já migrado, o `psql -f` do README cria o role e libera as 54 linhas                                                                                                                                     |
| Shell como `bytebank_app` (API)                    | cadastro 201, login 302 com sessão, overview 200, criar 201, anexo 201 (arquivo no volume, uid 1000), download 200 com os mesmos 10.865 bytes, excluir 204; o pool do shell só abre conexões `bytebank_app`                                                                  |
| Cache do Next em `tmpfs`                           | `/_next/image` → `MISS` e depois `HIT`, sem `EACCES`/`EROFS` nos logs                                                                                                                                                                                                        |
| Navegador (Playwright, Chromium)                   | login → home carrega `Dashboard` (:3002) e `AccountOverview` (:3003); `/transactions` carrega `TransactionsPage`; sem erros de console                                                                                                                                       |
| nginx dos MFEs                                     | `nginx -t` ok; `Server: nginx` sem versão (inclusive na página de 404); `nosniff` em manifest, chunk, 404 e OPTIONS 204; CORS, `no-cache` no manifest e `immutable` nos chunks preservados                                                                                   |
| Trivy 0.76.1 (`CRITICAL,HIGH`, `--ignore-unfixed`) | shell, dashboard-mfe e transactions-mfe: exit 0                                                                                                                                                                                                                              |
| gitleaks (config do repo, arquivos alterados)      | `no leaks found`                                                                                                                                                                                                                                                             |
