# Bytebank — Gerenciamento Financeiro

Aplicação de gestão financeira pessoal construída como monorepo (Turborepo) com **arquitetura de microfrontends**: shell Next.js 16 + remotes React federados em runtime via Module Federation, Design System próprio, autenticação NextAuth e persistência em PostgreSQL via Drizzle ORM. Desenvolvida como Tech Challenge (Fases 2 e 4) da pós-graduação FIAP Frontend Engineering. A Fase 4 acrescentou Clean Architecture, programação reativa, cache em camadas, otimização de carregamento e segurança da aplicação.

🚀 **[Acessar aplicação →](https://tech-challenge-phase2.vercel.app/)** · 🎥 **Vídeo da Fase 4:** _em breve_ <!-- TODO S4-08: trocar "em breve" pelo link do vídeo da Fase 4 --> · 🎞️ [Vídeo da Fase 2](https://youtu.be/4URo48RXs_8)

---

## Funcionalidades

### Base (Fase 2)

- **Autenticação** — cadastro e login com email/senha (NextAuth v5 + bcrypt) e Google OAuth opcional; rotas e API protegidas por sessão JWT; cada usuário vê apenas suas transações
- **Dashboard** — KPIs do mês (receitas, despesas e economia com variação vs. mês anterior) e gráficos de análise financeira: evolução do saldo, receitas × despesas e distribuição de gastos por categoria (Recharts)
- **Lista de transações** — busca por descrição, filtros por tipo e intervalo de datas, ordenação e paginação server-side; estado dos filtros persiste na URL via query params
- **CRUD completo** — adicionar, editar e excluir transações com modais de confirmação e feedback visual
- **Categorias com sugestão automática** — a categoria é sugerida a partir da descrição digitada no formulário
- **Anexos** — upload de recibos/comprovantes por transação (Vercel Blob)
- **Design System** — biblioteca de componentes documentada no Storybook (publicada via Chromatic) com tokens de cor, tipografia e espaçamento
- **Acessibilidade** — WCAG 2.1 AA: navegação por teclado, ARIA, foco gerenciado, contrastes auditados

### Adicionado na Fase 4

- **Segurança da conta** — senha de 12 a 128 caracteres recusada se aparecer em vazamentos (HIBP), bloqueio após 5 senhas erradas, expiração e revogação de sessão, logout por inatividade e MFA TOTP opcional com códigos de recuperação (`/settings/security`)
- **Dados cifrados** — anexos, e-mail e nome em AES-256-GCM; o login usa um blind index do e-mail
- **Autorização e validação no servidor** — recurso de outra conta responde `404`; corpo com campos extras responde `422`
- **Programação reativa (RxJS)** — busca com debounce e cancelamento das requisições obsoletas; upload de anexos com progresso por arquivo, concorrência limitada, retry e cancelamento
- **Cache em camadas** — HTTP com ETag/`304`, cache no servidor, prefetch no SSR e TanStack Query com atualização otimista
- **Carregamento** — pré-carregamento de remotes e dados por rota, lazy loading dos gráficos e elemento de LCP pintado direto do HTML do servidor
- **Estado avançado** — Redux com entity adapter, seletores memoizados e listeners; máquina de estados no fluxo de transação; contrato tipado de eventos e navegação entre MFEs

---

## Tecnologias

| Preocupação          | Escolha                                                     | Motivo                                                                     |
| -------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| Monorepo             | Turborepo + npm workspaces                                  | Build incremental, execução paralela de tasks, cache na CI                 |
| Microfrontends       | `@module-federation/enhanced` (runtime) + Rsbuild           | Federação real em runtime com deploys independentes; shell Next.js mantido |
| Framework (host)     | Next.js 16 (App Router) + React 19                          | SSR/SEO no shell, API Routes integradas                                    |
| Linguagem            | TypeScript                                                  | Type safety de ponta a ponta (schemas → API → UI)                          |
| Autenticação         | NextAuth v5 (Credentials + Google)                          | Sessão JWT no shell; senha com hash bcrypt                                 |
| Estilização          | Tailwind CSS v4                                             | Utility-first, integração nativa com os tokens do Design System            |
| Design System        | Custom + Storybook + Chromatic                              | Exigência do challenge; review visual automatizado na CI                   |
| Gráficos             | Recharts                                                    | Declarativo; estilizado com os tokens do DS                                |
| Estado servidor      | TanStack Query                                              | Cache e invalidação de dados da API, compartilhado entre shell e MFEs      |
| Estado cliente       | Redux Toolkit                                               | Estado global tipado (UI/feedback/auth) cross-MFE                          |
| Programação reativa  | RxJS                                                        | Busca, upload e inatividade como fluxos canceláveis                        |
| Banco de dados       | PostgreSQL 16 (Docker/Neon)                                 | Persistência real                                                          |
| ORM                  | Drizzle ORM                                                 | Type-safe, migrations versionadas, zero overhead                           |
| Upload de arquivos   | Vercel Blob                                                 | Storage dos anexos (cifrados) na Vercel; em disco no ambiente local        |
| Formulários          | React Hook Form + Zod                                       | Validação com inferência de tipos a partir do schema                       |
| Testes               | Vitest + Playwright                                         | Unitários, stories como testes de componente e E2E dos fluxos críticos     |
| Fronteiras de código | ESLint (boundaries) + dependency-cruiser                    | Impede import que viole as camadas e o grafo de pacotes                    |
| Containers           | Docker + Docker Compose                                     | Stack completa local, com containers não-root                              |
| CI/CD                | GitHub Actions + Vercel                                     | Lint/build/test por PR; deploys independentes de shell e MFEs              |
| Segurança            | npm audit, Dependabot, Semgrep, gitleaks, Trivy e OWASP ZAP | Dependências, código, segredos, imagens e varredura da aplicação           |
| Commit hooks         | Husky + lint-staged                                         | Garante lint e formatação em todo commit                                   |

---

## Arquitetura de microfrontends

O app é composto em runtime por um **shell** Next.js e dois **remotes** React independentes, federados com `@module-federation/enhanced` (runtime API + `mf-manifest.json`):

| App                | Porta | Papel                                                                                                           |
| ------------------ | ----- | --------------------------------------------------------------------------------------------------------------- |
| `shell`            | 3000  | Host Next.js 16 (App Router): autenticação, layout, SSR, API Routes (`/api/*`)                                  |
| `dashboard-mfe`    | 3002  | Remote Rsbuild — dashboard com KPIs e gráficos, montado na home (`/`)                                           |
| `transactions-mfe` | 3003  | Remote Rsbuild — página de transações (`/transactions`: lista, filtros, CRUD, anexos) e widget de saldo da home |

Pontos-chave:

- **Deploys independentes** — cada remote é um projeto próprio na Vercel; o shell carrega os manifests pelas URLs em `NEXT_PUBLIC_*_MFE_URL`.
- **Singletons compartilhados** — `react`, `react-dom` e os pacotes `@bytebank/*` são compartilhados como singletons, então Redux store, TanStack Query client e sessão são os mesmos objetos em shell e remotes (é assim que os MFEs se comunicam).
- **Auth centralizada no shell** — os remotes consomem a sessão via `SessionProvider` do shell e falam apenas com `/api/*`; nunca tocam o JWT.
- **SSR + SEO** — o shell faz SSR de layout e metadata e pré-busca os dados da rota no servidor; os remotes montam no cliente com esses dados, com `preload` do manifest.

### Camadas (Fase 4)

O código segue Clean Architecture, e os imports sempre apontam para o domínio:

| Camada         | Onde fica                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Domínio        | `packages/core/src/domain`: entidades, regras e erros em TypeScript puro                                   |
| Aplicação      | `packages/core/src/application` (casos de uso e portas) e `apps/*-mfe/src/application` (view-models, RxJS) |
| Infraestrutura | `apps/shell/src/server/infrastructure` (Drizzle, Blob, cifra, rate limit, logs) e `packages/api-client`    |
| Apresentação   | Páginas e rotas `/api` do shell, `apps/*-mfe/src/presentation` e `packages/design-system`                  |

O ESLint e o `npm run arch:check` barram imports que violem essa direção. Detalhes (grafo de dependências, estado, reatividade, cache, segurança e contratos entre MFEs) em [docs/phase-4/architecture.md](./docs/phase-4/architecture.md). As decisões estão nos [ADRs](./docs/phase-4/adr/).

---

## Pré-requisitos

| Ferramenta                       | Versão mínima                   |
| -------------------------------- | ------------------------------- |
| Node.js                          | 20.19+ (ou 22 LTS, usada na CI) |
| npm                              | 10+                             |
| Docker                           | 24+                             |
| Visual C++ Redistributable (x64) | Só no Windows                   |

> **Windows:** o Turborepo (usado por `npm run dev`, `build`, `lint` e `test`) é um binário nativo que depende do **Microsoft Visual C++ Redistributable**. Sem ele, o `npm run dev` falha de forma silenciosa no PowerShell/cmd.

---

## Instalação e execução (dev)

### 1. Clonar o repositório

```bash
git clone git@github.com:fiap-6frnt-tech-challenge/tech-challenge.git
cd tech-challenge
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp apps/shell/.env.example apps/shell/.env.local
```

Os valores padrão já funcionam para desenvolvimento local com Docker. Apenas gere um `AUTH_SECRET` e cole no `.env.local`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

As variáveis novas da Fase 4 têm padrão para o dev, então não é preciso preenchê-las para rodar localmente. Em produção, as chaves são obrigatórias e o shell não sobe sem elas:

| Variável                                         | Como gerar ou preencher                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `DATA_ENCRYPTION_KEYS`                           | `node -e "console.log('1:'+require('crypto').randomBytes(32).toString('base64'))"` |
| `DATA_ENCRYPTION_ACTIVE_KEY_ID`                  | O id da chave acima (`1`)                                                          |
| `BLIND_INDEX_KEY`                                | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`      |
| `HIBP_ENABLED`                                   | `true` (padrão) consulta senhas vazadas; `false` desliga                           |
| `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES`               | Minutos até o logout por inatividade (padrão `15`)                                 |
| `CSP_MODE`                                       | `report-only` (padrão local) ou `enforce`                                          |
| `LOCAL_UPLOADS_DIR`                              | Pasta dos anexos quando não há token do Blob (padrão no dev: `.uploads`)           |
| `AUTH_MAX_FAILURES`, `AUTH_LOCK_SECONDS` e afins | Limites do rate limit de login e cadastro; os padrões estão no `.env.example`      |

> **Mantenha as mesmas chaves entre reinícios.** Trocar `DATA_ENCRYPTION_KEYS` ou `BLIND_INDEX_KEY` sem rotação deixa anexos e e-mails já gravados ilegíveis, e as contas existentes param de entrar. Para rotacionar a chave de cifra, mantenha a antiga na lista (`1:<antiga>,2:<nova>`) e aponte `DATA_ENCRYPTION_ACTIVE_KEY_ID` para a nova. Nunca commite chaves reais: elas só entram no `.env.local`, no `.env` e nas variáveis da Vercel.

### 4. Subir o banco de dados

```bash
cp .env.example .env
docker compose up -d db
```

O compose lê as senhas do Postgres do `.env` da raiz (`POSTGRES_PASSWORD`, `POSTGRES_APP_PASSWORD`). Com os valores de dev do `.env.example`, o `DATABASE_URL` do `.env.local` funciona sem ajuste. O Postgres só aceita conexões de `127.0.0.1:5432`.

### 5. Executar as migrations

```bash
npm run db:migrate -w @bytebank/shell
```

> Num banco com usuários da Fase 2 (e-mail em claro), o `db:migrate` para de propósito na migração `0010`. Rode `npm run db:backfill-pii -w @bytebank/shell -- --dev-keys` no lugar dele: o script aplica as migrações, cifra os dados e conclui o restante. Para cifrar anexos antigos, use `npm run db:migrate-attachments -w @bytebank/shell`, que exige as chaves definidas no ambiente.

### 6. Popular o banco com dados iniciais

```bash
npm run db:seed -w @bytebank/shell
```

### 7. Iniciar os servidores de desenvolvimento

```bash
npm run dev
```

O Turborepo sobe todos os apps em paralelo: shell em `http://localhost:3000`, `dashboard-mfe` em `:3002` e `transactions-mfe` em `:3003`. A API é servida pelo próprio Next.js em `/api/*`.

### 8. Criar uma conta e entrar

Acesse `http://localhost:3000/register`, crie uma conta e faça login com ela — não há usuário de demonstração. A senha precisa ter de 12 a 128 caracteres e não pode constar em vazamentos conhecidos. As transações são por usuário, então contas novas começam vazias; crie transações pelo app para popular o dashboard.

---

## Rodando tudo com Docker Compose

Para subir a stack completa containerizada (Postgres + shell + os dois MFEs em builds de produção):

```bash
cp .env.example .env                              # gere e preencha o AUTH_SECRET
cp apps/shell/.env.example apps/shell/.env.local  # necessário p/ migrate/seed rodarem no host
docker compose up -d db
npm run db:migrate -w @bytebank/shell
npm run db:seed -w @bytebank/shell
docker compose up --build
```

> `db:migrate` e `db:seed` rodam no host e leem `DATABASE_URL` de `apps/shell/.env.local` — por isso o segundo `cp`. O `.env` da raiz é consumido apenas pelos containers do Docker Compose.

Acesse `http://localhost:3000`, crie uma conta em `/register` e faça login. `BLOB_READ_WRITE_TOKEN` é opcional — sem ele os anexos ficam cifrados no volume `bytebank-uploads`.

> Com as chaves vazias no `.env`, o compose usa chaves de smoke, diferentes das chaves locais do `npm run dev`. Contas criadas em um modo não entram no outro, a não ser que os dois usem as mesmas `DATA_ENCRYPTION_KEYS`, `DATA_ENCRYPTION_ACTIVE_KEY_ID` e `BLIND_INDEX_KEY`.

### Hardening dos containers

| Serviço            | Porta (host → container) | Usuário                        | Restrições                                                          |
| ------------------ | ------------------------ | ------------------------------ | ------------------------------------------------------------------- |
| `db`               | `127.0.0.1:5432 → 5432`  | `postgres`                     | Fora da rede local; senhas só no `.env`                             |
| `shell`            | `3000 → 3000`            | `node`                         | `read_only` (+ `tmpfs` em `/tmp` e `.next/cache`), sem capabilities |
| `dashboard-mfe`    | `3002 → 8080`            | `nginx` (`nginx-unprivileged`) | `read_only` (+ `tmpfs` em `/tmp`), sem capabilities                 |
| `transactions-mfe` | `3003 → 8080`            | `nginx` (`nginx-unprivileged`) | `read_only` (+ `tmpfs` em `/tmp`), sem capabilities                 |

Todos os serviços da aplicação rodam com `no-new-privileges`. O banco tem dois roles:

- **`bytebank`** (dono do schema): usado por `db:migrate` e `db:seed`, que rodam no host.
- **`bytebank_app`**: usado pelo shell no compose. Só tem `SELECT`, `INSERT`, `UPDATE` e `DELETE`, então não consegue `DROP` nem `ALTER`. É criado por [`docker/postgres/init/01-app-role.sql`](docker/postgres/init/01-app-role.sql), que também concede acesso às tabelas de migrações futuras.

> Os scripts de `docker/postgres/init` só rodam quando o volume do Postgres está vazio. Num volume criado antes desse script, o shell não consegue conectar como `bytebank_app`. Para aplicar o script sem perder dados, rode `docker compose exec db psql -U bytebank -d bytebank -f /docker-entrypoint-initdb.d/01-app-role.sql`. Para recriar o banco do zero, use `docker compose down -v` (apaga os dados) e repita o passo a passo.

No Neon, crie o role equivalente pelo **SQL Editor**. Um role criado pela aba Roles do console entra no `neon_superuser` e ganha privilégios demais. Troque `<owner>` pelo dono do banco (ex.: `neondb_owner`):

```sql
CREATE ROLE bytebank_app LOGIN PASSWORD '<senha forte>';
GRANT USAGE ON SCHEMA public TO bytebank_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bytebank_app;
ALTER DEFAULT PRIVILEGES FOR ROLE <owner> IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bytebank_app;
```

Depois, o `DATABASE_URL` da Vercel passa a usar o `bytebank_app`, e as migrações continuam rodando com a connection string do dono.

---

## Scripts disponíveis

### Raiz do monorepo

| Comando              | Descrição                                                                             |
| -------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`        | Inicia todos os apps em paralelo (Turborepo)                                          |
| `npm run build`      | Build de produção de todos os pacotes e apps                                          |
| `npm run lint`       | Executa o ESLint em todo o monorepo                                                   |
| `npm run test`       | Executa todos os testes (Vitest: stories do Storybook + testes unitários dos pacotes) |
| `npm run e2e`        | Builda os apps e roda a suíte E2E (Playwright) — ver [e2e/README.md](e2e/README.md)   |
| `npm run format`     | Formata todos os arquivos com Prettier                                                |
| `npm run arch:check` | Valida as fronteiras entre camadas e pacotes (dependency-cruiser)                     |

### Workspaces

| Comando                                             | Descrição                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `npm run dev -w @bytebank/shell`                    | Inicia só o shell em `http://localhost:3000`                     |
| `npm run db:generate -w @bytebank/shell`            | Gera arquivos de migration a partir do schema                    |
| `npm run db:migrate -w @bytebank/shell`             | Aplica as migrations no banco                                    |
| `npm run db:seed -w @bytebank/shell`                | Popula o banco com dados iniciais                                |
| `npm run db:backfill-pii -w @bytebank/shell`        | Cifra e-mail e nome de usuários antigos (`--dry-run` só informa) |
| `npm run db:migrate-attachments -w @bytebank/shell` | Cifra anexos antigos                                             |
| `npm run test:integration -w @bytebank/shell`       | Testes de integração contra o Postgres                           |
| `npm run storybook -w @bytebank/design-system`      | Abre o Storybook em `http://localhost:6006`                      |
| `npm run storybook -w @bytebank/transactions-mfe`   | Abre o Storybook do MFE de transações em `http://localhost:6007` |

---

## Testes

Instale os navegadores uma vez, antes da primeira execução:

```bash
npx playwright install chromium firefox
```

| Comando                                       | O que roda                                                                                  | Precisa de                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `npm run test`                                | Unitários (Vitest) e stories do Storybook como testes de componente em Chromium headless    | Chromium do Playwright                             |
| `npm run test:integration -w @bytebank/shell` | Repositórios, cache e rotas contra um banco real                                            | Postgres com migrations e `DATABASE_URL` exportada |
| `npm run e2e`                                 | Builda os apps e roda os fluxos críticos no Playwright — ver [e2e/README.md](e2e/README.md) | Postgres com migrations                            |
| `npm run arch:check`                          | Fronteiras entre camadas e pacotes                                                          | —                                                  |
| `npm run lint`                                | ESLint, inclusive as regras de fronteira                                                    | —                                                  |

Os testes de integração não leem o `.env.local`, então passe o banco no comando:

```bash
DATABASE_URL=postgres://bytebank:bytebank@localhost:5432/bytebank npm run test:integration -w @bytebank/shell
```

No Windows, rode o E2E via Git Bash ou WSL: o script `e2e:build` usa sintaxe de variáveis inline (`VAR=valor …`) que não funciona no PowerShell/CMD. O setup do E2E recria os dados do usuário de teste, então use um banco local.

**CI** — o GitHub Actions roda lint, fronteiras, type-check, build, testes e E2E em PRs e pushes; o workflow `Security` roda `npm audit`, gitleaks, Semgrep e Trivy; o Chromatic publica o Storybook e faz review visual.

### Varreduras de segurança locais

```bash
# Dependências de produção
npm audit --omit=dev --audit-level=high

# Segredos no histórico do Git
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source /repo --redact -v

# Análise estática
docker run --rm -v "$PWD:/src" semgrep/semgrep semgrep scan --config p/owasp-top-ten --config p/typescript --config p/react --error
```

O OWASP ZAP roda contra a stack do Docker Compose, já no ar. O comando usa a rede do container do shell e grava os relatórios em `zap-report/`:

```bash
mkdir -p zap-report && chmod 777 zap-report
docker run --rm --network container:bytebank-shell -v "$PWD/zap-report:/zap/wrk:rw" -t zaproxy/zap-stable \
  zap-baseline.py -t http://localhost:3000 -r zap-baseline.html -J zap-baseline.json
```

O ZAP encerra com código 2 quando há apenas avisos. O que reprova é `FAIL-NEW` maior que zero. Use apenas o baseline passivo e somente contra o ambiente local. Não rode varredura ativa contra a produção.

---

## Variáveis de ambiente

Em dev, todas ficam em `apps/shell/.env.local` (criado no passo 3). O `.env` da raiz é usado apenas pelo Docker Compose. A lista completa, com os limites do rate limit, está nos arquivos `.env.example`.

| Variável                                      | Obrigatória | Descrição                                                                    | Padrão (local)                                         |
| --------------------------------------------- | ----------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`                                | **Sim**     | Connection string do PostgreSQL                                              | `postgres://bytebank:bytebank@localhost:5432/bytebank` |
| `AUTH_SECRET`                                 | **Sim**     | Segredo de assinatura dos JWTs (NextAuth) — gere um por ambiente             | —                                                      |
| `AUTH_URL`                                    | Em produção | URL base do app para o NextAuth                                              | `http://localhost:3000`                                |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`       | Não         | Credenciais do Google OAuth; sem elas o botão "Entrar com Google" é ocultado | —                                                      |
| `NEXT_PUBLIC_API_URL`                         | Não         | URL base da API interna                                                      | `/api`                                                 |
| `NEXT_PUBLIC_DASHBOARD_MFE_URL`               | Não         | URL do manifest do dashboard-mfe                                             | `http://localhost:3002/mf-manifest.json`               |
| `NEXT_PUBLIC_TRANSACTIONS_MFE_URL`            | Não         | URL do manifest do transactions-mfe                                          | `http://localhost:3003/mf-manifest.json`               |
| `BLOB_READ_WRITE_TOKEN`                       | Em produção | Token do Vercel Blob para upload de anexos; sem ele, grava em disco          | —                                                      |
| `LOCAL_UPLOADS_DIR`                           | Não         | Pasta dos anexos quando não há token do Blob                                 | `.uploads`                                             |
| `DATA_ENCRYPTION_KEYS`                        | Em produção | Chaves AES-256-GCM dos anexos e dados pessoais (`id:base64`, 32 bytes)       | —                                                      |
| `DATA_ENCRYPTION_ACTIVE_KEY_ID`               | Em produção | Id da chave das novas cifras (as demais seguem decifrando)                   | —                                                      |
| `BLIND_INDEX_KEY`                             | Em produção | Chave HMAC do blind index do e-mail (base64, 32 bytes); no dev, chave local  | —                                                      |
| `HIBP_ENABLED`                                | Não         | Recusa senhas vazadas no cadastro (Have I Been Pwned)                        | `true`                                                 |
| `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES`            | Não         | Minutos de inatividade até o logout; aviso 1 minuto antes                    | `15`                                                   |
| `CSP_MODE`                                    | Não         | `report-only` só reporta violações; `enforce` bloqueia                       | `report-only`                                          |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Não         | Cloudflare Turnstile: CAPTCHA após 3 falhas de login                         | —                                                      |

---

## Segurança

| Área           | Controles                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| Acesso         | O `userId` vem sempre da sessão; toda consulta filtra por dono; recurso de outra conta responde `404`   |
| Entrada        | Schemas Zod estritos no servidor (`422` para campos extras); upload validado por magic bytes            |
| Autenticação   | HIBP, bcrypt custo 12, rate limit por e-mail e IP, MFA TOTP opcional, expiração e revogação de sessão   |
| Dados          | AES-256-GCM em anexos, e-mail e nome, com rotação de chave; blind index HMAC para login                 |
| Navegador      | CSP com nonce, HSTS, `nosniff`, `frame-ancestors 'none'`; mutações de outra origem respondem `403`      |
| Logs           | Eventos de segurança em JSON, com e-mail mascarado e IP como HMAC                                       |
| Infraestrutura | Containers não-root e somente leitura; Postgres só em `127.0.0.1`; role da aplicação sem `DROP`/`ALTER` |
| Pipeline       | `npm audit`, Dependabot, gitleaks, Semgrep e Trivy na CI                                                |

O baseline do OWASP ZAP não encontrou achados High. A auditoria completa, com as evidências e os avisos residuais justificados, está em [docs/phase-4/security/owasp-top10.md](./docs/phase-4/security/owasp-top10.md), e o checklist ASVS em [asvs-level1.md](./docs/phase-4/security/asvs-level1.md).

---

## Performance

| Métrica                                     |         Baseline (S0-04) |    Fase 4 (build local) | Meta               |
| ------------------------------------------- | -----------------------: | ----------------------: | ------------------ |
| LCP mobile `/`                              |        4,62 s (produção) |                  2,08 s | —                  |
| LCP mobile `/transactions`                  |        4,53 s (produção) |                  2,79 s | —                  |
| Lighthouse mobile `/` · `/transactions`     |       68 · 71 (produção) |                 83 · 74 | ≥ 85 em produção   |
| Lighthouse desktop (3 páginas)              | 100 · 99 · 98 (produção) |         100 · 100 · 100 | ≥ 95, CLS = 0      |
| recharts no carregamento de `/transactions` |              138 kB gzip |                       0 | não carregar       |
| p95 do resumo (5 mil transações)            |                 1.622 ms |                   62 ms | ≤ 811 ms           |
| Vazão da lista paginada (10 conexões)       |                 80 req/s |               156 req/s | acima da baseline  |
| Dados da home no carregamento               |                 848,5 kB | 0 requisições (no HTML) | saldo + 5 recentes |

A meta de Lighthouse mobile vale para produção, medida depois do deploy da Fase 4. Metodologia, comandos para reproduzir e o efeito de cada otimização estão no [relatório de performance](./docs/phase-4/perf/report.md).

---

## Estrutura do monorepo

```
tech-challenge/
├── apps/
│   ├── shell/             # Next.js 16 — host: auth, layout, /api/*, SSR (porta 3000)
│   ├── dashboard-mfe/     # Rsbuild — dashboard federado: KPIs + gráficos (porta 3002)
│   └── transactions-mfe/  # Rsbuild — transações federadas: lista, CRUD, anexos (porta 3003)
│
├── packages/
│   ├── core/              # Domínio e casos de uso, em TypeScript puro
│   ├── design-system/     # Componentes, tokens, charts e Storybook
│   ├── shared/            # Tipos, schemas Zod, categorias e utilitários
│   ├── stores/            # Redux Toolkit — slices de UI e auth
│   └── api-client/        # TanStack Query — hooks de dados + cliente HTTP
│
├── docs/phase-4/          # Plano, arquitetura, ADRs, auditoria OWASP e relatório de performance
├── docker/                # Inicialização do Postgres (role da aplicação)
├── scripts/perf/          # Scripts de medição usados no relatório de performance
├── e2e/                   # Suíte Playwright (specs + setup)
├── docker-compose.yml     # Postgres 16 + shell + MFEs
└── turbo.json             # Configuração do Turborepo
```

---

## Deploy

Deploy na **Vercel** em três projetos independentes:

- **Shell** — [tech-challenge-phase2.vercel.app](https://tech-challenge-phase2.vercel.app/)
- **Dashboard MFE** — [tech-challenge-dashboard-mfe.vercel.app](https://tech-challenge-dashboard-mfe.vercel.app/)
- **Transactions MFE** — [tech-challenge-transactions-mfe.vercel.app](https://tech-challenge-transactions-mfe.vercel.app/)

O shell aponta para os remotes publicados via `NEXT_PUBLIC_*_MFE_URL`; banco em Postgres gerenciado (Neon) e anexos no Vercel Blob.

---

## Design System

Biblioteca de componentes documentada com variantes, props, acessibilidade e exemplos interativos.

📖 **[Acessar Storybook →](https://phase-2--69d58ff921fbab085884a584.chromatic.com/)**

Destaques:

- **Tokens de design** — cores, espaçamento, tipografia e sombras via CSS custom properties
- **Acessibilidade** — WCAG 2.1 AA: ARIA, navegação por teclado, foco gerenciado nos modais
- **Responsivo** — mobile-first: 375px · 768px · 1024px+
