# Alocação de Time — 5 Devs

**Time:** 5 devs frontend
**Estratégia:** 5 tracks paralelos por responsabilidade, cada dev "dono" de uma vertical através das 5 sprints. Continuidade reduz onboarding e overlap.

> Voltar para o [PLAN.md](./PLAN.md)

---

## Tracks (donos sugeridos)

| Handle                | Track                | Foco                                                          | Skills demandadas                          |
| --------------------- | -------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| **dev1-infra**        | **Infra & Build**    | Monorepo, MF tooling, CI/CD, Docker, deploy, perf             | Turbo, Rsbuild, Docker, Vercel, Lighthouse |
| **dev2-backend**      | **Backend & Auth**   | NextAuth, API Routes, persistência (KV/Postgres), Vercel Blob | Node, REST, DB, OAuth flows                |
| **dev3-ds**           | **Design System**    | Componentes DS, Storybook, Chromatic, A11y, tokens            | React, Tailwind v4, ARIA, WCAG             |
| **dev4-dashboard**    | **Dashboard MFE**    | dashboard-mfe, charts, agregações, KPIs                       | React, data viz, Recharts                  |
| **dev5-transactions** | **Transactions MFE** | transactions-mfe, filtros, busca, scroll infinito, anexos     | React, UX patterns, forms, RHF             |

**Princípios:**

1. **Cada dev tem 1 track principal**, mas pode pegar tarefas auxiliares de outro track quando estiver sem dependências
2. **Dependências marcadas explicitamente** (`⇐ depende de`) para que o time saiba o que sequenciar
3. **DS-first:** dev3-ds entrega componentes nos primeiros dias do sprint para desbloquear dev4-dashboard/dev5-transactions
4. **Backend-first:** dev2-backend entrega endpoints/schemas cedo para desbloquear dev4-dashboard/dev5-transactions
5. **Smoke test sempre no fim do sprint** — todo time

---

## Sprint 0 — Foundation (7 dias)

| Tarefa                                                                         | Owner                              | Dias | Depende de              |
| ------------------------------------------------------------------------------ | ---------------------------------- | ---- | ----------------------- |
| Bootstrap monorepo (Turborepo + npm workspaces)                                | dev1-infra                         | 1    | —                       |
| Migrar `tech-challenge/` → `apps/shell/` + renomear `app/` → `src/app/`        | dev1-infra                         | 1    | monorepo bootstrap      |
| Extrair `packages/design-system` + Storybook + Chromatic                       | dev3-ds                            | 2    | shell migration (dia 2) |
| Extrair `packages/shared` (types, lib, constants)                              | dev2-backend                       | 0.5  | shell migration (dia 2) |
| Criar `packages/api-client` e `packages/stores` (vazios)                       | dev2-backend                       | 0.5  | monorepo bootstrap      |
| **PoC MF — remote** (`hello-mfe` Rsbuild config + componente teste)            | dev4-dashboard                     | 2    | — (branch isolada)      |
| **PoC MF — shell consumer** (`next.config.ts` + dynamic import + `/poc` route) | dev5-transactions                  | 2    | shell migration (dia 2) |
| Integração do PoC (merge remote + shell)                                       | dev4-dashboard + dev5-transactions | 1    | ambos PoC sides prontos |
| CI atualizado (Turbo + Chromatic per package)                                  | dev1-infra                         | 0.5  | packages extraídos      |
| Smoke test final em clone limpo                                                | Todo time                          | 0.5  | tudo acima              |
| **Gate dia 5** — decidir continuar Opção A ou fallback D                       | Todo time                          | —    | PoC integrado           |

**Capacidade:** 5 devs × 7 dias = 35 dev-days. Alocados: ~11. Buffer: ~24 dev-days para imprevistos, refinamento, e dev2-backend-dev5-transactions preparam-se para Sprint 1.

**Dep crítica:** dev3-ds e dev2-backend esperam dev1-infra finalizar migração shell no fim do dia 2 — eles podem usar dia 1 para preparar configs locais e estudar Rsbuild.

---

## Sprint 1 — Auth + State Migration (14 dias)

| Tarefa                                                                  | Owner                                 | Dias | Depende de                                  |
| ----------------------------------------------------------------------- | ------------------------------------- | ---- | ------------------------------------------- |
| Spike: pair session Zustand + TanStack Query                            | dev1-infra (lidera, todos participam) | 1    | —                                           |
| Persistência real (Vercel KV ou Postgres) + migrar `store.ts`           | dev2-backend                          | 2    | —                                           |
| Schema da `Transaction` evoluído (`userId`, `category`, `attachments?`) | dev2-backend                          | 1    | persistência decidida                       |
| Migration do seed `data/transactions.json`                              | dev2-backend                          | 0.5  | schema evoluído                             |
| NextAuth setup (Credentials + Google) + middleware                      | dev2-backend                          | 2    | schema evoluído                             |
| DS: `LoginForm` + Storybook                                             | dev3-ds                               | 0.5  | —                                           |
| DS: `GoogleAuthButton` + Storybook                                      | dev3-ds                               | 0.5  | —                                           |
| DS: `UserMenu` + Storybook                                              | dev3-ds                               | 0.5  | —                                           |
| DS: `AuthGuard` + Storybook                                             | dev3-ds                               | 0.5  | —                                           |
| `packages/stores`: `useAuthStore` + `useUIStore` + Vitest               | dev4-dashboard                        | 1    | NextAuth session shape (dev2-backend dia 4) |
| `packages/api-client`: TanStack Query hooks transações                  | dev4-dashboard                        | 2    | schema evoluído (dev2-backend dia 3)        |
| Pages `/login` + `/auth/error`                                          | dev5-transactions                     | 1    | DS components prontos (dev3-ds dia 3)       |
| Migração: remover `TransactionsContext` + adaptar todos consumidores    | dev5-transactions                     | 2    | api-client pronto (dev4-dashboard dia 8)    |
| Migração: remover `FeedbackContext` + adaptar                           | dev5-transactions                     | 0.5  | useUIStore pronto (dev4-dashboard dia 6)    |
| Configurar env vars Vercel (preview + prod)                             | dev1-infra                            | 0.5  | NextAuth setup                              |
| Testes Vitest middleware + integração CI                                | dev1-infra                            | 1    | tudo acima                                  |
| Smoke test + vídeo curto demo                                           | Todo time                             | 0.5  | tudo                                        |

**Capacidade:** 70 dev-days. Alocados: ~17. Devs com folga (especialmente dev1-infra e dev3-ds após dia 5) podem adiantar Sprint 2: dev3-ds começa research/protótipo de charts; dev1-infra começa setup Rsbuild para `dashboard-mfe`.

**Deps críticas a vigiar:**

- dev4-dashboard espera dev2-backend entregar schema até dia 3 e session shape até dia 4
- dev5-transactions espera dev3-ds (componentes DS, dia 3) e dev4-dashboard (stores+hooks, dia 8)
- **Mitigação:** dev2-backend e dev3-ds são as duas primeiras prioridades; revisar progresso na daily do dia 3

---

## Sprint 2 — Dashboard MFE + Charts (14 dias)

| Tarefa                                                               | Owner             | Dias            | Depende de                        |
| -------------------------------------------------------------------- | ----------------- | --------------- | --------------------------------- |
| Criar `apps/dashboard-mfe` Rsbuild + MF config                       | dev4-dashboard    | 1               | Sprint 0 PoC verde                |
| Endpoint `/api/transactions/summary` + funções de agregação          | dev2-backend      | 1.5             | schema Sprint 1                   |
| Hook `useDashboardSummary` no api-client                             | dev4-dashboard    | 0.5             | summary endpoint                  |
| DS: `BarChart` + Storybook                                           | dev3-ds           | 1               | —                                 |
| DS: `LineChart` + Storybook                                          | dev3-ds           | 1               | —                                 |
| DS: `PieChart` + Storybook                                           | dev3-ds           | 1               | —                                 |
| DS: `KpiCard` + Storybook                                            | dev3-ds           | 0.5             | —                                 |
| DS: `DashboardWidget` (wrapper) + Storybook                          | dev3-ds           | 0.5             | —                                 |
| Dashboard layout responsivo + integração KPIs                        | dev4-dashboard    | 1.5             | KpiCard + summary endpoint        |
| Dashboard: integração BarChart receita vs despesa                    | dev4-dashboard    | 0.5             | BarChart DS                       |
| Dashboard: integração LineChart evolução saldo                       | dev4-dashboard    | 0.5             | LineChart DS                      |
| Dashboard: integração PieChart por categoria                         | dev4-dashboard    | 0.5             | PieChart DS                       |
| Shell consome `dashboard-mfe` em `/` via `dynamic`                   | dev4-dashboard    | 1               | dashboard-mfe expondo `Dashboard` |
| SSR no shell para `/` (metadata + skeleton)                          | dev1-infra        | 1               | dashboard-mfe integrado           |
| Enriquecer `data/transactions.json` com 6+ meses de histórico        | dev2-backend      | 0.5             | schema                            |
| Auth: garantir `userId` na sessão e em todas API routes              | dev2-backend      | 0.5             | NextAuth Sprint 1                 |
| **Track paralelo:** começar setup `apps/transactions-mfe` (skeleton) | dev5-transactions | 2               | Sprint 0 PoC pattern              |
| **Track paralelo:** research backend cursor pagination               | dev5-transactions | 1               | —                                 |
| Testes agregação + Storybook interactions                            | Todos             | 1.5 distribuído | implementação pronta              |
| Smoke test + vídeo 3 min                                             | Todo time         | 0.5             | tudo                              |

**Capacidade:** 70 dev-days. Alocados: ~18. dev5-transactions fica em "Sprint 3 prep" no início e ajuda dev4-dashboard com integração no fim.

**Deps críticas:**

- dev4-dashboard espera dev3-ds entregar charts (BarChart dia 3, LineChart dia 4, PieChart dia 5). Mitigação: dev3-ds entrega 1 chart/dia, dev4-dashboard integra incrementalmente
- dev4-dashboard espera dev2-backend entregar summary endpoint (dia 2). Prioridade alta para dev2-backend
- dev1-infra SSR no shell depende de dev4-dashboard finalizar integração (dia 10) — ele faz Docker prep enquanto espera

---

## Sprint 3 — Transactions MFE + Enhancements (14 dias)

| Tarefa                                                       | Owner             | Dias | Depende de                       |
| ------------------------------------------------------------ | ----------------- | ---- | -------------------------------- |
| Criar `apps/transactions-mfe` + MF config                    | dev5-transactions | 1    | Sprint 2 setup já feito          |
| Mover features de transação para o MFE                       | dev5-transactions | 1    | dashboard-mfe pattern            |
| Backend: cursor pagination em `/api/transactions`            | dev2-backend      | 1    | —                                |
| Backend: Vercel Blob storage + endpoints anexos              | dev2-backend      | 2    | token Blob configurado           |
| Backend: interface `StorageProvider` + impl                  | dev2-backend      | 0.5  | endpoints anexos                 |
| Categorias: lista padrão + `suggestCategory` (pura) + Vitest | dev4-dashboard    | 1    | —                                |
| DS: `SearchInput` + Storybook                                | dev3-ds           | 0.5  | —                                |
| DS: `RangeInput` + Storybook                                 | dev3-ds           | 0.5  | —                                |
| DS: `MultiSelect` + Storybook                                | dev3-ds           | 1.5  | —                                |
| DS: `CategorySelect` + Storybook                             | dev3-ds           | 1    | —                                |
| DS: `FileUpload` + Storybook                                 | dev3-ds           | 1.5  | —                                |
| DS: `AttachmentList` + Storybook                             | dev3-ds           | 0.5  | —                                |
| Integração: filtros avançados em `TransactionFilters`        | dev5-transactions | 2    | DS filter components             |
| Integração: scroll infinito com `useInfiniteQuery`           | dev5-transactions | 1.5  | cursor pagination (dev2-backend) |
| Integração: `CategorySelect` em `TransactionForm` + sugestão | dev5-transactions | 1    | suggestCategory + CategorySelect |
| Integração: `FileUpload` + `AttachmentList` em forms         | dev5-transactions | 1.5  | FileUpload + endpoints anexos    |
| Validação Zod avançada no schema                             | dev4-dashboard    | 0.5  | schema base                      |
| Infra: env var Blob token + CORS                             | dev1-infra        | 0.5  | —                                |
| Tests E2E exploratórios + DS interactions                    | dev1-infra        | 1    | features prontas                 |
| Smoke test + vídeo 4 min                                     | Todo time         | 0.5  | tudo                             |

**Capacidade:** 70 dev-days. Alocados: ~21. dev5-transactions é o mais carregado (~8 dias) por ser o integrador. Compensação: dev3-ds entrega DS rápido nos primeiros 5 dias; dev2-backend entrega backend cedo.

**Deps críticas:**

- dev5-transactions depende fortemente de dev3-ds (todos componentes DS) e dev2-backend (endpoints + cursor pagination)
- **Mitigação:** dev3-ds prioriza SearchInput → RangeInput → MultiSelect → CategorySelect → FileUpload → AttachmentList nessa ordem (mais usados primeiro). dev2-backend entrega cursor pagination no dia 2 e Blob no dia 5
- dev5-transactions começa o sprint integrando componentes existentes; à medida que dev3-ds libera novos, dev5-transactions progride

---

## Sprint 4 — Polish + Deploy + Demo (11 dias)

| Tarefa                                                                | Owner                                                  | Dias     | Depende de       |
| --------------------------------------------------------------------- | ------------------------------------------------------ | -------- | ---------------- |
| Dockerfile shell (multi-stage standalone) + .dockerignore             | dev1-infra                                             | 1        | —                |
| Dockerfile dashboard-mfe + nginx.conf                                 | dev1-infra                                             | 0.5      | —                |
| Dockerfile transactions-mfe + nginx.conf                              | dev1-infra                                             | 0.5      | —                |
| docker-compose.yml + .env.example                                     | dev1-infra                                             | 0.5      | dockerfiles      |
| Cloud deploy: shell na Vercel (env vars)                              | dev1-infra                                             | 0.5      | docker funcional |
| Cloud deploy: dashboard-mfe + transactions-mfe (projetos separados)   | dev1-infra                                             | 1        | —                |
| CORS + cross-origin headers ajustados                                 | dev2-backend                                           | 0.5      | deploys feitos   |
| A11y audit Storybook (zerar warnings)                                 | dev3-ds                                                | 1        | —                |
| A11y audit Lighthouse + correções (skip-link, contraste, ARIA charts) | dev3-ds                                                | 1        | —                |
| Documentar A11y em `docs/phase-2/a11y-audit.md`                       | dev3-ds                                                | 0.5      | audit feito      |
| Performance audit (Lighthouse + bundle analyzer)                      | dev4-dashboard                                         | 1        | deploys prod     |
| Otimizações perf (preload, lazy, fonts)                               | dev4-dashboard                                         | 1        | audit feito      |
| E2E Playwright: teste 1 (Auth + CRUD)                                 | dev5-transactions                                      | 1        | —                |
| E2E Playwright: teste 2 (Filtros + busca)                             | dev5-transactions                                      | 0.5      | —                |
| E2E Playwright: teste 3 (Anexo + persistência)                        | dev5-transactions                                      | 0.5      | —                |
| Setup Playwright em CI                                                | dev1-infra                                             | 0.5      | testes prontos   |
| README raiz (arquitetura, como rodar, decisões)                       | dev1-infra + dev2-backend                              | 1        | tudo funcionando |
| READMEs por package                                                   | Donos de cada track                                    | 0.5 cada | —                |
| Roteiro do vídeo demo                                                 | Todo time                                              | 0.5      | —                |
| Gravação + edição do vídeo (5-7 min)                                  | dev4-dashboard (gravação) + dev5-transactions (edição) | 1        | tudo funcional   |
| Retrospectiva da Fase 2                                               | Todo time                                              | 0.5      | —                |
| **Buffer/bugfix** (dias 9-11)                                         | Todo time                                              | 3        | —                |

**Capacidade:** 55 dev-days. Alocados: ~18 + 3 buffer (todos × 3 dias = 15 dev-days). Folga total: ~22 dev-days para imprevistos, bugs E2E, ajustes de Lighthouse.

**Deps críticas:**

- Deploys (dev1-infra) precisam acontecer cedo para dev4-dashboard fazer perf audit em prod e dev5-transactions rodar E2E contra ambiente real
- A11y (dev3-ds) e Perf (dev4-dashboard) são paralelos e independentes
- Vídeo só pode ser gravado com tudo funcionando — buffer ajuda aqui

---

## Resumo: dias por dev em cada sprint

| Dev               | Sprint 0 | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | Total |
| ----------------- | -------- | -------- | -------- | -------- | -------- | ----- |
| dev1-infra        | 3        | 2.5      | 1        | 1.5      | 5        | 13    |
| dev2-backend      | 1        | 6        | 2.5      | 3.5      | 0.5      | 13.5  |
| dev3-ds           | 2        | 2        | 4        | 5.5      | 2.5      | 16    |
| dev4-dashboard    | 3        | 3        | 5.5      | 1.5      | 2        | 15    |
| dev5-transactions | 3        | 3.5      | 3        | 8        | 2        | 19.5  |

> Diferenças nos totais refletem natureza das features — dev5-transactions é integrador no Sprint 3, dev3-ds produz muitos componentes ao longo do tempo. Tarefas auxiliares (testes, code review, pair programming) compensam.

## Princípios para evitar bloqueios

1. **DS entrega cedo, sempre.** dev3-ds nunca acumula um sprint inteiro de componentes para o fim — entrega 1-2 por dia, em ordem de uso.
2. **Backend antes de UI.** dev2-backend finaliza endpoints e schemas na primeira metade do sprint; dev4-dashboard/dev5-transactions integram na segunda.
3. **Mocks contra schemas.** Se dev2-backend atrasa, dev4-dashboard/dev5-transactions mockam contra o schema acordado (zod). Schemas viram contratos.
4. **Daily standup focada em bloqueios.** 10 min, cada um diz: "Estou bloqueando alguém? Estou bloqueado por alguém?"
5. **Branch por track, base sempre `phase-2`.** Padrão: `phase-2/<dev-handle>/<task>` (ex: `phase-2/dev3-ds/login-form`). PRs apontam para `phase-2`. Rebase diário contra `phase-2` para evitar conflitos grandes. Ver [Git Workflow no PLAN.md](./PLAN.md#git-workflow--fase-2).
6. **PR pequeno e frequente.** Cada componente DS = 1 PR. Cada endpoint = 1 PR. Cada integração = 1 PR.
7. **Pair em mudanças que tocam múltiplos tracks.** Ex.: migration de Context (dev5-transactions) com revisão por dev4-dashboard (que conhece os hooks).

## Sinais de alerta (escalar imediatamente)

- dev3-ds atrasou um componente que dev5-transactions precisa em < 24h
- dev2-backend não fechou schema decision até o dia 3 de um sprint
- PoC MF deu sinais ruins no dia 3 do Sprint 0 → preparar fallback D imediatamente
- Vercel deploy quebra mais de 2 vezes no mesmo dia → dev1-infra dedicado a investigar root cause
