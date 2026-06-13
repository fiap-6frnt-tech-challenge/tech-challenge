# Sprint 2 — Dashboard MFE + Charts (+ correções de Auth)

**Duração:** 14 dias · 2026-06-03 → 2026-06-16
**Time:** 3 desenvolvedores — Dev 1 (Infra & Backend) · Dev 2 (DS & UI Pages) · Dev 3 (State & Integration)
**Objetivo:** Primeiro MFE federado em produção — a home renderiza `dashboard-mfe` com 4+ widgets analíticos (KPIs, gráficos receita/despesa, evolução do saldo, breakdown por categoria) — **e** fechamento dos buracos de Auth deixados pela Sprint 1: **botão de logout**, **área de cadastro** e **sincronização do estado Redux no login/logout**.

> Voltar para o [PLAN.md](./PLAN.md) · Anterior: [sprint-1](./sprint-1-auth-state.md) · Próximo: [sprint-3](./sprint-3-transactions.md)
> **Tasks detalhadas (1 arquivo por task):** [sprint-2/README.md](./sprint-2/README.md)
> **Alocação de tarefas por dev:** [team-allocation.md#sprint-2](./team-allocation.md#sprint-2--dashboard-mfe--charts-14-dias)

---

## ⚠️ Correção de escopo herdada da Sprint 1

A Sprint 1 entregou a tela de **login**, mas o planejamento falhou em três pontos que esta sprint precisa cobrir:

1. **Não há botão de logout** — o componente `UserMenu` (com "Sair") existe no Design System, mas **nunca foi conectado ao `Header`** do app. → Tasks **4** e **9**.
2. **Não há área de cadastro** — não existe tabela `users`, endpoint de registro nem página `/register`; o `authorize()` é um mock (`senha123`). → Tasks **2**, **4** e **9**. _Backend ✅ concluído (Task 2): tabela `users`, `POST /api/auth/register` e `authorize` real contra o banco (mock `senha123` mantido só como fallback de dev). Falta a UI — Tasks 4 e 9._
3. **O estado Redux não reflete login/logout** — o `authSlice` tem `setSession`/`clearSession`/`logout`, mas **nada despacha** essas actions a partir da sessão NextAuth. → Task **6** (e logout fechado na Task **9**).

Essas correções entram na fila de tasks **paralelas** (sem custo de bloqueio no Dashboard) e convergem na Task 9.

---

## Pré-requisitos

- [x] Sprint 1 fechada (auth + state + persistência Postgres/Drizzle)
- [x] Opção A (Rsbuild + `@module-federation/enhanced`) validada no Sprint 0
- [ ] Backend retorna `userId` e `category` em cada transação (já no schema; validar no summary)
- [ ] `DATABASE_URL` e migrações em dia em todos os ambientes

---

## Trilhas e alocação (3 devs)

| Dev       | Tasks                                                                                        | Esforço   |
| :-------- | :------------------------------------------------------------------------------------------- | :-------- |
| **Dev 1** | 1 (Summary+Seed) · 2 (Cadastro backend) · 11 (SSR) · 12 (testes agreg.) · 13 (smoke)         | ~5 dias   |
| **Dev 2** | 3 (Gráficos DS) · 4 (RegisterForm) · 9 (/register + Logout) · 12 (stories) · 13 (smoke)      | ~7.5 dias |
| **Dev 3** | 5 (dashboard-mfe) · 6 (Session sync) · 7 (Hook) · 8 (Shell consome) · 10 (Widgets) · 12 · 13 | ~7.5 dias |

**Capacidade:** 42 dev-days. Alocados ~20 → buffer para imprevistos, code review e pair. Dev 1 (mais folgado) apoia testes e adianta o setup de Docker da Sprint 4.

---

## Tasks (na ordem de execução — paralelas primeiro)

> Detalhe completo, snippets e gotchas em [sprint-2/](./sprint-2/). As tasks 1–6 **não têm dependência dentro do sprint** e começam no dia 1; 7–13 dependem das primeiras.

### Paralelas (dia 1)

1. **Backend: Summary + Agregações + Seed histórico** (2d · Dev 1) — `GET /api/transactions/summary` agregando no servidor (`aggregateByMonth`, `cumulativeBalance`, `groupByCategory`) + enriquecer seed com 6+ meses. → [01](./sprint-2/01-backend-summary-seed.md)
2. ✅ **Backend: Cadastro de usuário** (1d · Dev 1) — tabela `users`, `POST /api/auth/register` (hash bcrypt), `authorize` real contra o banco. **Concluída** (2026-06-07). → [02](./sprint-2/02-backend-register-endpoint.md)
3. **DS: Componentes de gráfico** (4d · Dev 2) — `BarChart`, `LineChart`, `PieChart`, `KpiCard`, `DashboardWidget` (Recharts + tokens DS + a11y). → [03](./sprint-2/03-ds-chart-components.md)
4. **DS: `RegisterForm` + revisão do `UserMenu`** (1d · Dev 2) — form de cadastro acessível + estado "saindo…" no UserMenu. → [04](./sprint-2/04-ds-register-form-usermenu.md)
5. **Criar `apps/dashboard-mfe`** (1d · Dev 3) — Rsbuild + Module Federation expondo `./Dashboard` em `:3002`. → [05](./sprint-2/05-create-dashboard-mfe.md)
6. **State: Sincronizar Redux ↔ NextAuth** (1d · Dev 3) — `SessionSync` despacha `setSession`/`clearSession` conforme a sessão. → [06](./sprint-2/06-state-session-sync.md)

### Dependentes

7. **Hook `useDashboardSummary`** (0.5d · Dev 3) — ⬅ Task 1. → [07](./sprint-2/07-hook-dashboard-summary.md)
8. **Shell consome o `dashboard-mfe`** (1d · Dev 3) — ⬅ Task 5; `dynamic(import('dashboard/Dashboard'), { ssr:false })`. → [08](./sprint-2/08-shell-consume-mfe.md)
9. **Página `/register` + Logout no Header** (1.5d · Dev 2) — ⬅ Tasks 2, 4, 6; **fecha os 3 buracos de Auth**. → [09](./sprint-2/09-register-page-logout-wiring.md)
10. **Layout do Dashboard + Widgets** (3d · Dev 3) — ⬅ Tasks 3, 7, 8. → [10](./sprint-2/10-dashboard-layout-widgets.md)
11. **SSR no Shell para SEO + perf** (1d · Dev 1) — ⬅ Tasks 8, 10. → [11](./sprint-2/11-ssr-shell.md)
12. **Testes** (1.5d · distribuído) — agregações, hook, session sync, stories de gráfico. → [12](./sprint-2/12-tests.md)
13. **Smoke Test Final & Demo** (0.5d · Todos). → [13](./sprint-2/13-smoke-test-demo.md)

---

## Critério de aceite do sprint

### Dashboard / MFE

- [ ] Home (`/`) carrega `dashboard-mfe` federado em runtime; Network mostra `remoteEntry.js`
- [ ] 4 KPIs corretos com delta vs mês anterior
- [ ] BarChart, LineChart e PieChart renderizam dados reais
- [ ] `/api/transactions/summary` agrega no servidor e filtra por `userId`
- [ ] 5 chart components no DS publicados no Chromatic; a11y (`role="img"` + `aria-label`)
- [ ] Lighthouse Performance ≥ 85 (mobile), 90 (desktop)

### Auth (correção da Sprint 1)

- [ ] **Cadastro** funcional: `/register` cria conta, loga e redireciona para `/`
- [ ] **Logout** funcional: `UserMenu` no Header desloga e bloqueia rotas privadas
- [ ] **Estado Redux** reflete login/logout (`auth.user`/`isAuthenticated` via Redux DevTools)
- [ ] Senha persistida apenas como hash; e-mail duplicado tratado com erro acessível

### Qualidade

- [ ] Coverage > 80% nas funções de agregação; `npx turbo run test` verde
- [ ] Vercel preview de shell + dashboard-mfe funcionando

---

## Riscos do sprint

| Risco                                           | Mitigação                                                                                                                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recharts hydration mismatch no MFE              | `dynamic(..., { ssr: false })` + componentes de chart `'use client'` + `ResponsiveContainer`                                                                      |
| Edge vs Node runtime no `authorize` (bcrypt/pg) | ✅ Resolvido (Task 2): config base edge-safe em `auth.config.ts`; `authorize` em `auth.ts` (Node); `proxy.ts` usa `NextAuth(authConfig)`; rota `runtime='nodejs'` |
| `remoteEntry.js` 404 / CORS em prod             | Env vars corretas + CORS no deploy do MFE; fallback graceful no shell                                                                                             |
| Pie chart com >5 categorias ilegível            | Agrupar em "Outros"; testes garantem o limite                                                                                                                     |
| Seed insuficiente para gráficos                 | Enriquecer `data/transactions.json` com 6+ meses no início (Task 1)                                                                                               |
| Só 3 devs: Dev 2 e Dev 3 sobrecarregados        | DS entrega 1 chart/dia; Dev 1 (folgado) apoia testes/integração; pair na Task 9                                                                                   |

## Definição de Pronto

- Cada PR: CI verde + 1 revisor + (se tocar DS) Chromatic aprovado + testes
- Sprint encerra com demo gravada (3 min): cadastrar → dashboard federado → criar transação → logout (estado Redux zerando)
