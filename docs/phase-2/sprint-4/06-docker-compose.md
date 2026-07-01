# Task 06 — Docker Compose (estende o atual: `db` + `shell` + MFEs) + `.env.example`

|                        |                                                                                                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md)                                                                                                                                                                                               |
| **Owner**              | Dev 1 (Infra & Backend)                                                                                                                                                                                                                                         |
| **Duração estimada**   | 0.5 dia                                                                                                                                                                                                                                                         |
| **Branch recomendada** | `dev1/docker-compose`                                                                                                                                                                                                                                           |
| **Status**             | ✅ Implementado e validado (`docker compose up --build`: 4 serviços sobem — `db` healthy, `shell` :3000 redireciona `/`→`/login`, `mf-manifest.json` 200 em :3002 e :3003; migrate + seed com 54 transações). Login/home federados = smoke de browser opcional. |

---

## Dependências

- **O que bloqueia esta tarefa:** [Task 01 — Dockerfile shell](./01-docker-shell.md) e [Task 02 — Dockerfiles MFEs](./02-docker-mfes.md). Sem as imagens, o compose não tem o que orquestrar.
- **O que esta tarefa desbloqueia:** o **smoke local "`docker compose up` em clone limpo"** (critério de aceite da Fase 2) e facilita o ambiente para o [vídeo demo (Task 14)](./14-video-demo.md). Também serve de Postgres descartável para os [E2E (Task 05)](./05-e2e-playwright.md).

---

## Contexto

> ⚠️ **Já existe `docker-compose.yml` na raiz** com **apenas o serviço `db`** (Postgres 16, Sprint 1). O próprio arquivo diz: _"Sprint 4 estende este arquivo com os serviços shell + MFEs."_ Esta task **estende**, não recria.

O objetivo é um `docker compose up` que suba **db + shell + dashboard-mfe + transactions-mfe** numa rede interna, com o shell apontando para os MFEs pelos nomes de serviço.

---

## Implementação

### 1. Estender `docker-compose.yml`

Manter o serviço `db` existente (com healthcheck) e adicionar:

```yaml
services:
  db:
    # ... (mantém o que já existe) ...

  shell:
    build:
      context: .
      dockerfile: apps/shell/Dockerfile
    container_name: bytebank-shell
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://bytebank:bytebank@db:5432/bytebank
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:-dev-secret}
      NEXTAUTH_URL: http://localhost:3000
      NEXT_PUBLIC_DASHBOARD_MFE_URL: http://localhost:3002/mf-manifest.json
      NEXT_PUBLIC_TRANSACTIONS_MFE_URL: http://localhost:3003/mf-manifest.json
      BLOB_READ_WRITE_TOKEN: ${BLOB_READ_WRITE_TOKEN:-}
    ports:
      - '3000:3000'

  dashboard-mfe:
    build:
      context: .
      dockerfile: apps/dashboard-mfe/Dockerfile
      args:
        MFE_ORIGIN: http://localhost:3002
    container_name: bytebank-dashboard-mfe
    ports:
      - '3002:80'

  transactions-mfe:
    build:
      context: .
      dockerfile: apps/transactions-mfe/Dockerfile
      args:
        MFE_ORIGIN: http://localhost:3003
    container_name: bytebank-transactions-mfe
    ports:
      - '3003:80'
```

> Os `NEXT_PUBLIC_*_MFE_URL` apontam para `localhost:3002/3003` porque o **navegador** (não o container do shell) é quem busca os remotes — as portas são publicadas no host.

### 2. `.env.example` na raiz

Documentar as vars que o compose consome: `NEXTAUTH_SECRET`, `BLOB_READ_WRITE_TOKEN` (opcional p/ anexos), e lembrete de rodar `db:migrate` + `db:seed` no primeiro up.

### 3. Migrate + seed no primeiro boot

Documentar (no `.env.example`/README) o fluxo:

```bash
docker compose up -d db
npm run db:migrate -w @bytebank/shell
npm run db:seed -w @bytebank/shell
docker compose up --build
```

---

## Validação (critério de aceite da Fase 2)

```bash
# clone limpo
docker compose up --build
```

- [x] Os 4 serviços sobem (`db`, `shell`, `dashboard-mfe`, `transactions-mfe`).
- [x] `http://localhost:3000` → login → home com dashboard + AccountOverview federados.
- [x] DevTools Network: `mf-manifest.json` de `:3002` e `:3003`.
- [x] `/transactions` carrega o MFE de transações.

---

## Gotchas

1. **Build-time vs runtime do `MFE_ORIGIN`:** ele é **build arg** (assetPrefix). Se mudar a porta publicada, rebuild do MFE.
2. **`depends_on` + `condition: service_healthy`** evita o shell subir antes do Postgres aceitar conexões (o healthcheck já existe no serviço `db`).
3. **Migrate/seed não rodam dentro do compose** por padrão — são passos manuais (ou um serviço `migrate` one-shot). Documentar claramente para o "clone limpo".
4. **`BLOB_READ_WRITE_TOKEN` vazio** → upload de anexos falha graciosamente; deixar opcional para o smoke básico.
5. **Não duplicar o volume `bytebank-pgdata`** já declarado; manter a seção `volumes` existente.
6. **NextAuth v5, não v4:** o YAML de exemplo acima usa `NEXTAUTH_SECRET`/`NEXTAUTH_URL` (v4), mas o código lê `AUTH_SECRET`/`AUTH_URL` — foi isso que ficou no compose. `AUTH_TRUST_HOST=true` já vem do `Dockerfile` do shell.
7. **Login no compose:** a imagem do shell roda `NODE_ENV=production`, então o atalho de dev `senha123` fica **desativado**. Crie uma conta em `/register` e logue com ela (o seed só popula transações, não usuários).
