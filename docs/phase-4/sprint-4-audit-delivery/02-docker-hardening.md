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

## Validação

- [ ] `docker compose exec shell whoami` → `node`
- [ ] Postgres inacessível por outra máquina da rede
- [ ] `bytebank_app` não consegue `DROP TABLE` nem `ALTER TABLE`
- [ ] Trivy (S3-09) verde nas 3 imagens
- [ ] `docker compose up --build` funciona do zero com as portas novas

## Gotchas

1. `nginx-unprivileged` não consegue escutar na porta 80: use 8080 e ajuste o compose (e o README).
2. `read_only: true` quebra escritas do Next (cache de imagens): monte `tmpfs` onde ele escreve.
3. Scripts em `docker-entrypoint-initdb.d` só rodam com volume vazio: `docker compose down -v` para reaplicar (documente no README).
4. Sem `ALTER DEFAULT PRIVILEGES`, tabelas criadas por migrações futuras ficam sem permissão para o `bytebank_app`.
