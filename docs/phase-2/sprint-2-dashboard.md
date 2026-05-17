# Sprint 2 — Dashboard MFE + Charts

**Duração:** 14 dias · 2026-06-03 → 2026-06-16
**Objetivo:** Primeiro MFE federado em produção: home renderiza `dashboard-mfe` com 4+ widgets analíticos (KPIs, gráficos receita/despesa, evolução do saldo, breakdown por categoria).

> Voltar para o [PLAN.md](./PLAN.md) · Anterior: [sprint-1](./sprint-1-auth-state.md) · Próximo: [sprint-3](./sprint-3-transactions.md)
> **Alocação de tarefas por dev:** [team-allocation.md#sprint-2](./team-allocation.md#sprint-2--dashboard-mfe--charts-14-dias)

---

## Pré-requisitos

- [ ] Sprint 1 fechado (auth + state + persistência)
- [x] Opção A (Rsbuild + `@module-federation/enhanced`) validada no Sprint 0 — ou fallback D documentado
- [ ] Backend retorna `userId` e `category` em cada transação (mesmo que `category='default'`)

---

## Tasks

### 1. Criar apps/dashboard-mfe (1 dia · **dev4-dashboard**)

- [ ] `npm create rsbuild@latest apps/dashboard-mfe` (template React-ts)
- [ ] Adicionar `@module-federation/enhanced` e `@module-federation/rsbuild-plugin`
- [ ] Configurar `rsbuild.config.ts` espelhando o setup do `hello-mfe` do Sprint 0:
  - Expor: `./Dashboard` → `./src/Dashboard.tsx`
  - Shared singletons: `react`, `react-dom`, `@bytebank/design-system`, `@bytebank/shared`, `@bytebank/stores`, `@bytebank/api-client`
  - Dev server `:3001`
- [ ] Tailwind v4 PostCSS configurado (mesmo config do DS)
- [ ] Importa `tokens.css` e `globals.css` do `@bytebank/design-system`
- [ ] `apps/dashboard-mfe/src/Dashboard.tsx` skeleton inicial: `<div>Dashboard placeholder</div>`
- [ ] Workspace deps no package.json: `@bytebank/design-system`, `@bytebank/api-client`, `@bytebank/shared`, `@bytebank/stores`

> **Fallback opção D:** Se Sprint 0 acionou fallback, criar como `packages/dashboard-mfe/` exportando `<Dashboard />` para consumo em build time. Restante das tasks abaixo permanece idêntico.

**Aceite:** `npm run dev -w @bytebank/dashboard-mfe` sobe :3001 standalone com placeholder.

### 2. Shell consome dashboard-mfe (1 dia · **dev4-dashboard**)

- [ ] `apps/shell/src/app/page.tsx` reescrito:
  ```tsx
  'use client';
  import dynamic from 'next/dynamic';
  const Dashboard = dynamic(() => import('dashboard/Dashboard'), {
    ssr: false,
    loading: () => <DashboardSkeleton />,
  });
  export default function Home() {
    return <Dashboard />;
  }
  ```
- [ ] Wrapper `'use client'` para passar `SessionProvider` + `QueryClientProvider` se ainda não estiver no root layout
- [ ] Configurar `next.config.ts` remote URL (env: `NEXT_PUBLIC_DASHBOARD_MFE_URL`)
- [ ] Server component em `page.tsx` mantém SEO/metadata via `generateMetadata`

**Aceite:** abrir `localhost:3000/` mostra dashboard-mfe carregado em iframe-less runtime; DevTools Network mostra `remoteEntry.js`.

### 3. Backend: endpoint de summary (1 dia · **dev2-backend**)

- [ ] `apps/shell/src/app/api/transactions/summary/route.ts`:
  ```ts
  GET /api/transactions/summary?from=2026-01-01&to=2026-06-30
  Response: {
    balance: number,
    incomeMonth: number,
    expenseMonth: number,
    savingsMonth: number,
    byMonth: Array<{ month: 'YYYY-MM', income: number, expense: number }>,
    balanceOverTime: Array<{ date: 'YYYY-MM-DD', balance: number }>,
    byCategory: Array<{ category: string, total: number }>,
  }
  ```
- [ ] Agregação no servidor (não no cliente) — performance + escalabilidade
- [ ] Reusar/estender `packages/shared/src/lib/transactions.ts` com funções puras: `aggregateByMonth`, `cumulativeBalance`, `groupByCategory`
- [ ] Auth: ler `userId` da sessão; filtrar transações por usuário
- [ ] Testes Vitest das funções puras

**Aceite:** `curl /api/transactions/summary` retorna JSON correto; 100% cobertura nas funções de agregação.

### 4. Hook useDashboardSummary (0.5 dia · **dev4-dashboard**)

- [ ] `packages/api-client/src/useDashboardSummary.ts`:
  ```ts
  useDashboardSummary({ from, to }) → useQuery
  ```
- [ ] Cache key: `['summary', { from, to, userId }]`
- [ ] Default range: últimos 6 meses

**Aceite:** consumível do dashboard-mfe.

### 5. Chart components no Design System (4 dias · **dev3-ds**)

> **Cada um:** `I{Name}.ts`, `{Name}.tsx`, `{Name}.stories.tsx`, tokens DS, a11y (`role="img"` + `aria-label`).

- [ ] Instalar `recharts` em `packages/design-system`
- [ ] **`BarChart`** — props: `data`, `xKey`, `bars: Array<{ key, label, color }>`, `height`
  - Cores via tokens: `var(--color-badge-deposit-bg)`, `var(--color-badge-withdraw-bg)`
  - Tooltip estilizado com DS tokens
  - Story: empty / loading / error / com dados / responsive (mobile/desktop)
- [ ] **`LineChart`** — props: `data`, `xKey`, `lines: Array<{ key, label, color }>`, `height`
  - Suaviza curva (type: 'monotone'), pontos clicáveis
  - Story: idem
- [ ] **`PieChart`** — props: `data: Array<{ label, value }>`, `colors`, `height`
  - Legenda lateral; segmento clicável
  - Story: idem
- [ ] **`KpiCard`** — props: `label`, `value`, `delta?`, `icon?`, `loading`, `error`
  - Usa `Card` do DS como container
  - Formata via `formatCurrency` do shared
  - Story: positive delta / negative delta / loading / error / no-delta
- [ ] **`DashboardWidget`** — wrapper composable: `<DashboardWidget title="" loading error onRefresh>{children}</DashboardWidget>`
  - Header com title + refresh icon button + status
  - Skeleton enquanto `loading`
  - `ErrorState` interno se `error`
  - Story: loading / error / com children customizado

**Aceite:** 5 componentes no Chromatic; a11y addon passa; charts renderizam tokens DS dinamicamente.

### 6. Dashboard layout + widgets (3 dias · **dev4-dashboard** + apoio de **dev5-transactions** quando livre)

- [ ] `apps/dashboard-mfe/src/Dashboard.tsx` — layout responsivo:
  ```
  Mobile (1 coluna):           Desktop (3 colunas):
  ┌─────────┐                  ┌──┬──┬──┐
  │  KPIs   │                  │KPI│KPI│KPI│KPI
  ├─────────┤                  ├──┴──┼──┤
  │ Income  │                  │ Bar │Pie│
  │  Bar    │                  ├─────┴──┤
  ├─────────┤                  │  Line  │
  │ Balance │                  ├────────┤
  │  Line   │                  │ Recent │
  ├─────────┤                  └────────┘
  │ Pie     │
  ├─────────┤
  │ Recent  │
  └─────────┘
  ```
- [ ] 4 KPIs: Saldo total, Receita do mês, Despesa do mês, Economia do mês
- [ ] Cada KPI calcula `delta` vs mês anterior
- [ ] BarChart: receita vs despesa últimos 6 meses
- [ ] LineChart: evolução do saldo últimos 6 meses
- [ ] PieChart: top 5 categorias de despesa (com "Outros" se >5)
- [ ] Lista de transações recentes: reusar `TransactionList` do DS, somente leitura
- [ ] Botão "Nova transação" no canto: abre modal `NewTransaction` (vive no shell?) — decidir: ou MFE tem o seu, ou shell expõe via event bus

**Aceite:** desktop e mobile renderizam todos widgets; dados batem com agregação manual.

### 7. SSR no shell para SEO + perf (1 dia · **dev1-infra**)

- [ ] `apps/shell/src/app/page.tsx` server component:
  - `generateMetadata()` retorna title, description, OG tags
  - Wrapper client `<DashboardShell>` que faz dynamic import
  - Skeleton SSR enquanto MFE não hidrata
- [ ] Preload do `remoteEntry.js` via `<link rel="preload">` no head
- [ ] Lighthouse: First Contentful Paint < 1.5s desktop

**Aceite:** view-source mostra HTML com skeleton + metadata; MFE hidrata no client.

### 8. Testes (1.5 dia · distribuído entre **dev2-backend** [agregações], **dev3-ds** [stories chart], **dev4-dashboard** [hook])

- [ ] Funções de agregação (`aggregateByMonth`, `cumulativeBalance`, `groupByCategory`): unit tests com fixtures variadas
- [ ] Hook `useDashboardSummary`: mock fetch, verificar shape
- [ ] Storybook interactions test em `KpiCard`: simular `delta` positivo/negativo, verificar ARIA labels

**Aceite:** ≥ 15 testes novos; coverage > 80% nas funções de agregação.

---

## Critério de aceite do sprint

- [x] Home (`/`) carrega `dashboard-mfe` federado em runtime
- [x] DevTools Network mostra `remoteEntry.js` carregado
- [x] 4 KPIs corretos com delta vs mês anterior
- [x] BarChart, LineChart, PieChart renderizam dados reais
- [x] Endpoint `/api/transactions/summary` agrega no servidor
- [x] Lighthouse Performance ≥ 85 (mobile), 90 (desktop)
- [x] 5 chart components no DS publicados no Chromatic
- [x] Coverage > 80% em funções de agregação
- [x] A11y: charts têm `role="img"` + `aria-label` descritivo
- [x] Vercel preview de shell + dashboard-mfe funcionando

## Riscos do sprint

| Risco                                      | Mitigação                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| Recharts hydration mismatch                | `dynamic(..., { ssr: false })` em todos charts; wrapper `<ClientOnly>`                |
| Tailwind v4 + Rsbuild config divergente    | Compartilhar `tailwind.config.ts` via `@bytebank/design-system` ou copiar; documentar |
| `remoteEntry.js` 404 em prod               | Env vars corretas + CORS no MFE deploy; fallback graceful no shell                    |
| Pie chart com >10 categorias fica ilegível | Agrupar em "Outros" no servidor; testes garantem isso                                 |
| Dados de seed insuficientes para charts    | Enriquecer `data/transactions.json` com 6+ meses de histórico no início do sprint     |

## Definição de Pronto

- Cada PR: CI verde + 1 revisor + Chromatic visual review aprovado + testes
- Sprint encerra com demo gravada (3 min): navegar para `/`, mostrar widgets, abrir DevTools Network mostrando MFE federado
