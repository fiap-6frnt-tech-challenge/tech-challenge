# Bytebank — Gerenciamento Financeiro

Aplicação de gestão financeira pessoal construída como monorepo (Turborepo) com **arquitetura de microfrontends**: shell Next.js 16 + remotes React federados em runtime via Module Federation, Design System próprio, autenticação NextAuth e persistência em PostgreSQL via Drizzle ORM. Desenvolvida como Tech Challenge (Fase 2) da pós-graduação FIAP Frontend Engineering.

🚀 **[Acessar aplicação →](https://fiap-6frnt-tech-challenge.vercel.app/)**

![Bytebank — home (desktop)](docs/screenshots/home-transaction-desktop.png)

---

## Funcionalidades

- **Autenticação** — cadastro e login com email/senha (NextAuth v5 + bcrypt) e Google OAuth opcional; rotas e API protegidas por sessão JWT; cada usuário vê apenas suas transações
- **Dashboard** — KPIs do mês (receitas, despesas e economia com variação vs. mês anterior) e gráficos de análise financeira: evolução do saldo, receitas × despesas e distribuição de gastos por categoria (Recharts)
- **Lista de transações** — busca por descrição, filtros por tipo e intervalo de datas, ordenação e paginação server-side; estado dos filtros persiste na URL via query params
- **CRUD completo** — adicionar, editar e excluir transações com modais de confirmação e feedback visual
- **Categorias com sugestão automática** — a categoria é sugerida a partir da descrição digitada no formulário
- **Anexos** — upload de recibos/comprovantes por transação (Vercel Blob)
- **Design System** — biblioteca de componentes documentada no Storybook (publicada via Chromatic) com tokens de cor, tipografia e espaçamento
- **Acessibilidade** — WCAG 2.1 AA: navegação por teclado, ARIA, foco gerenciado, contrastes auditados

---

## Arquitetura de microfrontends

O app é composto em runtime por um **shell** Next.js e dois **remotes** React independentes, federados com `@module-federation/enhanced` (runtime API + `mf-manifest.json`):

| App                | Porta | Papel                                                                                                           |
| ------------------ | ----- | --------------------------------------------------------------------------------------------------------------- |
| `shell`            | 3000  | Host Next.js 16 (App Router): autenticação, layout, SSR, API Routes (`/api/*`)                                  |
| `dashboard-mfe`    | 3002  | Remote Rsbuild — dashboard com KPIs e gráficos, montado na home (`/`)                                           |
| `transactions-mfe` | 3003  | Remote Rsbuild — página de transações (`/transactions`: lista, filtros, CRUD, anexos) e widget de saldo da home |
| `hello-mfe`        | 3001  | Remote de PoC (Sprint 0) — mantido como referência histórica em `/poc`                                          |

Pontos-chave:

- **Deploys independentes** — cada remote é um projeto próprio na Vercel; o shell carrega os manifests pelas URLs em `NEXT_PUBLIC_*_MFE_URL`.
- **Singletons compartilhados** — `react`, `react-dom` e os pacotes `@bytebank/*` são compartilhados como singletons, então Redux store, TanStack Query client e sessão são os mesmos objetos em shell e remotes (é assim que os MFEs se comunicam).
- **Auth centralizada no shell** — os remotes consomem a sessão via `SessionProvider` do shell e falam apenas com `/api/*`; nunca tocam o JWT.
- **SSR + SEO** — o shell faz SSR de layout, skeleton e metadata; os remotes hidratam client-side com `preload` do manifest.

---

## Pré-requisitos

| Ferramenta | Versão mínima                   |
| ---------- | ------------------------------- |
| Node.js    | 20.19+ (ou 22 LTS, usada na CI) |
| npm        | 10+                             |
| Docker     | 24+                             |

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

### 4. Subir o banco de dados

```bash
docker compose up -d db
```

### 5. Executar as migrations

```bash
npm run db:migrate -w @bytebank/shell
```

### 6. Popular o banco com dados iniciais

```bash
npm run db:seed -w @bytebank/shell
```

### 7. Iniciar os servidores de desenvolvimento

```bash
npm run dev
```

O Turborepo sobe todos os apps em paralelo: shell em `http://localhost:3000` e os remotes em `:3001`–`:3003`. A API é servida pelo próprio Next.js em `/api/*`.

### 8. Criar uma conta e entrar

Acesse `http://localhost:3000/register`, crie uma conta e faça login com ela — não há usuário de demonstração. As transações são por usuário, então contas novas começam vazias; crie transações pelo app para popular o dashboard.

---

## Rodando tudo com Docker Compose

Para subir a stack completa containerizada (Postgres + shell + os dois MFEs em builds de produção):

```bash
cp .env.example .env        # gere e preencha o AUTH_SECRET
docker compose up -d db
npm run db:migrate -w @bytebank/shell
npm run db:seed -w @bytebank/shell
docker compose up --build
```

Acesse `http://localhost:3000`, crie uma conta em `/register` e faça login. `BLOB_READ_WRITE_TOKEN` é opcional — sem ele o upload de anexos usa um storage mock local.

---

## Scripts disponíveis

### Raiz do monorepo

| Comando          | Descrição                                                                           |
| ---------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`    | Inicia todos os apps em paralelo (Turborepo)                                        |
| `npm run build`  | Build de produção de todos os pacotes e apps                                        |
| `npm run lint`   | Executa o ESLint em todo o monorepo                                                 |
| `npm run test`   | Executa todos os testes (Vitest; stories do Storybook são os testes)                |
| `npm run e2e`    | Builda os apps e roda a suíte E2E (Playwright) — ver [e2e/README.md](e2e/README.md) |
| `npm run format` | Formata todos os arquivos com Prettier                                              |

### Workspaces

| Comando                                        | Descrição                                     |
| ---------------------------------------------- | --------------------------------------------- |
| `npm run dev -w @bytebank/shell`               | Inicia só o shell em `http://localhost:3000`  |
| `npm run db:generate -w @bytebank/shell`       | Gera arquivos de migration a partir do schema |
| `npm run db:migrate -w @bytebank/shell`        | Aplica as migrations no banco                 |
| `npm run db:seed -w @bytebank/shell`           | Popula o banco com dados iniciais             |
| `npm run storybook -w @bytebank/design-system` | Abre o Storybook em `http://localhost:6006`   |

---

## Testes

- **Componentes** — as stories do Storybook são executadas como testes num Chromium headless (`@storybook/addon-vitest`); pacotes `shared`/`stores` têm testes unitários Vitest. Rode tudo com `npm run test`.
- **E2E** — Playwright cobre os fluxos críticos (auth + CRUD, filtros, anexos) contra builds de produção locais. Requer Postgres migrado e browsers instalados (`npx playwright install chromium firefox`); rode com `npm run e2e`. Detalhes em [e2e/README.md](e2e/README.md).
- **CI** — GitHub Actions roda lint, type-check, build e testes (Turbo `--affected` + cache remoto) em PRs e pushes; o workflow do Chromatic publica o Storybook e faz review visual.

---

## Variáveis de ambiente

Em dev, todas ficam em `apps/shell/.env.local` (criado no passo 3). O `.env` da raiz é usado apenas pelo Docker Compose.

| Variável                                | Obrigatória | Descrição                                                                    | Padrão (local)                                         |
| --------------------------------------- | ----------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`                          | **Sim**     | Connection string do PostgreSQL                                              | `postgres://bytebank:bytebank@localhost:5432/bytebank` |
| `AUTH_SECRET`                           | **Sim**     | Segredo de assinatura dos JWTs (NextAuth) — gere um por ambiente             | —                                                      |
| `AUTH_URL`                              | Em produção | URL base do app para o NextAuth                                              | `http://localhost:3000`                                |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Não         | Credenciais do Google OAuth; sem elas o botão "Entrar com Google" é ocultado | —                                                      |
| `NEXT_PUBLIC_API_URL`                   | Não         | URL base da API interna                                                      | `/api`                                                 |
| `NEXT_PUBLIC_DASHBOARD_MFE_URL`         | Não         | URL do manifest do dashboard-mfe                                             | `http://localhost:3002/mf-manifest.json`               |
| `NEXT_PUBLIC_TRANSACTIONS_MFE_URL`      | Não         | URL do manifest do transactions-mfe                                          | `http://localhost:3003/mf-manifest.json`               |
| `NEXT_PUBLIC_HELLO_MFE_URL`             | Não         | URL do manifest do hello-mfe (PoC)                                           | `http://localhost:3001/mf-manifest.json`               |
| `BLOB_READ_WRITE_TOKEN`                 | Não         | Token do Vercel Blob para upload de anexos; sem ele, usa storage mock local  | —                                                      |

---

## Estrutura do monorepo

```
tech-challenge/
├── apps/
│   ├── shell/             # Next.js 16 — host: auth, layout, /api/*, SSR (porta 3000)
│   ├── dashboard-mfe/     # Rsbuild — dashboard federado: KPIs + gráficos (porta 3002)
│   ├── transactions-mfe/  # Rsbuild — transações federadas: lista, CRUD, anexos (porta 3003)
│   └── hello-mfe/         # Rsbuild — PoC Module Federation, Sprint 0 (porta 3001)
│
├── packages/
│   ├── design-system/     # Componentes, tokens, charts e Storybook
│   ├── shared/            # Tipos, schemas Zod, categorias e utilitários
│   ├── stores/            # Redux Toolkit — slices de UI e auth
│   └── api-client/        # TanStack Query — hooks de dados + cliente HTTP
│
├── e2e/                   # Suíte Playwright (specs + setup)
├── docs/phase-2/          # Plano, sprints e auditorias (a11y, performance)
├── docker-compose.yml     # Postgres 16 + shell + MFEs
└── turbo.json             # Configuração do Turborepo
```

---

## Tech stack

| Preocupação        | Escolha                                           | Motivo                                                                     |
| ------------------ | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Monorepo           | Turborepo + npm workspaces                        | Build incremental, execução paralela de tasks, cache na CI                 |
| Microfrontends     | `@module-federation/enhanced` (runtime) + Rsbuild | Federação real em runtime com deploys independentes; shell Next.js mantido |
| Framework (host)   | Next.js 16 (App Router)                           | SSR/SEO no shell, API Routes integradas                                    |
| Linguagem          | TypeScript                                        | Type safety de ponta a ponta (schemas → API → UI)                          |
| Autenticação       | NextAuth v5 (Credentials + Google)                | Sessão JWT no shell; senha com hash bcrypt                                 |
| Estilização        | Tailwind CSS v4                                   | Utility-first, integração nativa com os tokens do Design System            |
| Design System      | Custom + Storybook + Chromatic                    | Exigência do challenge; review visual automatizado na CI                   |
| Gráficos           | Recharts                                          | Declarativo; estilizado com os tokens do DS                                |
| Estado servidor    | TanStack Query                                    | Cache e invalidação de dados da API, compartilhado entre shell e MFEs      |
| Estado cliente     | Redux Toolkit                                     | Estado global tipado (UI/feedback/auth) cross-MFE                          |
| Banco de dados     | PostgreSQL 16 (Docker/Neon)                       | Persistência real                                                          |
| ORM                | Drizzle ORM                                       | Type-safe, migrations versionadas, zero overhead                           |
| Upload de arquivos | Vercel Blob                                       | Storage de anexos zero-config na Vercel                                    |
| Formulários        | React Hook Form + Zod                             | Validação com inferência de tipos a partir do schema                       |
| Testes             | Vitest + Playwright                               | Stories como testes de componente; E2E dos fluxos críticos                 |
| CI/CD              | GitHub Actions + Vercel                           | Lint/build/test por PR; deploys independentes de shell e MFEs              |
| Commit hooks       | Husky + lint-staged                               | Garante lint e formatação em todo commit                                   |

---

## Deploy

Deploy na **Vercel** em três projetos independentes:

- **Shell** — [fiap-6frnt-tech-challenge.vercel.app](https://fiap-6frnt-tech-challenge.vercel.app/)
- **Dashboard MFE** — `tech-challenge-dashboard-mfe.vercel.app`
- **Transactions MFE** — `tech-challenge-transactions-mfe.vercel.app`

O shell aponta para os remotes publicados via `NEXT_PUBLIC_*_MFE_URL`; banco em Postgres gerenciado (Neon) e anexos no Vercel Blob.

---

## Design System

Biblioteca de componentes documentada com variantes, props, acessibilidade e exemplos interativos.

📖 **[Acessar Storybook →](https://phase-2--69d58ff921fbab085884a584.chromatic.com/)**

📋 **[Relatório de acessibilidade →](docs/phase-2/a11y-audit.md)** · ⚡ **[Auditoria de performance →](docs/phase-2/perf-audit.md)**

Destaques:

- **Tokens de design** — cores, espaçamento, tipografia e sombras via CSS custom properties
- **Acessibilidade** — WCAG 2.1 AA: ARIA, navegação por teclado, foco gerenciado nos modais
- **Responsivo** — mobile-first: 375px · 768px · 1024px+

---

## Screenshots

### Home

Card de saldo com toggle de visibilidade e as transações mais recentes. O widget de saldo (`AccountOverview`) é exposto pelo transactions-mfe e montado na home pelo shell.

| Desktop (1280px)                                               | Mobile (375px)                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| ![Home desktop](docs/screenshots/home-transaction-desktop.png) | ![Home mobile](docs/screenshots/home-transaction-mobile.png) |

### Dashboard

KPIs do mês (com variação vs. mês anterior) e os três gráficos de análise renderizados pelo dashboard-mfe com Recharts.

![Dashboard — KPIs e Receita vs Despesa](docs/screenshots/home-dashboard-desktop-1.png)

![Dashboard — Despesas por Categoria](docs/screenshots/home-dashboard-desktop-2.png)

![Dashboard — Evolução do Saldo](docs/screenshots/home-dashboard-desktop-3.png)

<img src="docs/screenshots/home-dashboard-mobile.png" width="375" alt="Dashboard mobile (375px)" />

### Transações

Lista paginada (10 por página) com busca por descrição e filtros avançados por tipo, período, faixa de valor e categoria.

| Lista + paginação                                                                      | Filtros avançados                                                         |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| ![Transações — lista e paginação](docs/screenshots/transaction-desktop-pagination.png) | ![Transações — filtros](docs/screenshots/transaction-desktop-filters.png) |

### Nova transação

Formulário com sugestão automática de categoria e upload de anexos; modal de confirmação de sucesso ao concluir.

| Formulário + anexos                                                    | Sucesso                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------- |
| ![Modal de nova transação](docs/screenshots/modal-new-transaction.png) | ![Modal de sucesso](docs/screenshots/modal-success.png) |
