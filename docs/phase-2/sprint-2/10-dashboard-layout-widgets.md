# Task 10 — Layout do Dashboard + Integração dos Widgets

> ⏳ **Status: Pending**

|                        |                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md)                                                                                                                                          |
| **Owner**              | `Dev 3` (State & Integration)                                                                                                                                                                          |
| **Duração estimada**   | 3 dias                                                                                                                                                                                                 |
| **Branch recomendada** | `dev3/dashboard-layout-widgets`                                                                                                                                                                        |
| **Depende de**         | [Task 3 — Componentes de Gráfico no DS](./03-ds-chart-components.md), [Task 7 — Hook `useDashboardSummary`](./07-hook-dashboard-summary.md), [Task 8 — Shell consome o MFE](./08-shell-consume-mfe.md) |
| **PR só abre**         | Após desktop e mobile renderizarem todos os widgets com dados reais                                                                                                                                    |

---

## Dependências

- **O que bloqueia esta tarefa**: Depende de **[Task 3](./03-ds-chart-components.md)** (componentes de gráfico/KPI), **[Task 7](./07-hook-dashboard-summary.md)** (dados) e **[Task 8](./08-shell-consume-mfe.md)** (MFE montado no host). Como o Dev 2 entrega 1 chart/dia, integre incrementalmente: KPIs → BarChart → LineChart → PieChart → Recentes.
- **O que esta tarefa desbloqueia**: Desbloqueia a **[Task 11 — SSR no Shell](./11-ssr-shell.md)** (otimização sobre o layout final) e é o coração do critério de aceite do sprint.

---

## Contexto

Esta task transforma o placeholder do `dashboard-mfe` no dashboard completo: 4 KPIs com delta vs mês anterior, gráfico de barras (receita × despesa), linha (evolução do saldo), pizza (despesa por categoria) e lista de transações recentes (somente leitura). Tudo alimentado pelo `useDashboardSummary` e renderizado com os componentes do DS.

---

## Pré-condições

- Estar na branch `dev3/dashboard-layout-widgets`.
- MFE montando no shell (Task 8) e hook disponível (Task 7).
- Componentes do DS chegando incrementalmente (Task 3).

---

## Implementação passo-a-passo

### 1. Layout responsivo (`apps/dashboard-mfe/src/Dashboard.tsx`)

```
Mobile (1 coluna):           Desktop (3 colunas):
┌─────────┐                  ┌──┬──┬──┬──┐
│  KPIs   │                  │KPI│KPI│KPI│KPI│
├─────────┤                  ├──┴──┼──┴──┤
│ Bar     │                  │ Bar │ Pie │
├─────────┤                  ├─────┴─────┤
│ Line    │                  │   Line    │
├─────────┤                  ├───────────┤
│ Pie     │                  │  Recentes │
├─────────┤                  └───────────┘
│ Recentes│
└─────────┘
```

Use grid Tailwind v4 com os tokens de espaçamento do DS (`gap-lg`, `p-lg`). Envolva cada gráfico num `DashboardWidget` (título + loading + error + refresh).

### 2. KPIs (4 cards)

```tsx
const { data, isLoading, isError, refetch } = useDashboardSummary();

<KpiCard label="Saldo total"     value={data?.balance}      loading={isLoading} error={isError} />
<KpiCard label="Receita do mês"  value={data?.incomeMonth}  delta={data?.deltaIncome}  loading={isLoading} />
<KpiCard label="Despesa do mês"  value={data?.expenseMonth} delta={-(data?.deltaExpense ?? 0)} loading={isLoading} />
<KpiCard label="Economia do mês" value={data?.savingsMonth} loading={isLoading} />
```

> Para "Despesa", um delta **positivo** (gastou mais) é ruim — inverta o sinal/semântica ao passar para o `KpiCard` para a cor refletir corretamente.

### 3. Gráficos

- **BarChart**: `data={data?.byMonth}`, `xKey="month"`, `bars=[{key:'income',label:'Receita',color:'var(--color-badge-deposit-bg)'},{key:'expense',label:'Despesa',color:'var(--color-badge-withdraw-bg)'}]`.
- **LineChart**: `data={data?.balanceOverTime}`, `xKey="date"`, `lines=[{key:'balance',label:'Saldo',color:'var(--color-brand-primary)'}]`.
- **PieChart**: `data` = top 5 de `data?.byCategory` mapeado para `{label,value}`, agrupando o restante em "Outros".

### 4. Transações recentes (somente leitura)

Reusar `TransactionList`/`TransactionItem` do DS/features em modo leitura (sem ações de editar/excluir). Para a fase 2, no MFE, basta listar as últimas 5 (usar `useTransactions` do `@bytebank/api-client` ou um campo `recent` se preferir adicionar ao summary).

### 5. Botão "Nova transação"

Decisão de arquitetura: o modal `NewTransaction` vive no **shell**. O MFE dispara a abertura via Redux `uiSlice` (ex.: uma flag `newTransactionOpen`) ou via callback exposto pelo host. Para o escopo do sprint, basta um link/botão que leve a `/transactions` (onde o CRUD já existe) — manter simples e evitar event bus complexo.

---

## Validação

- [ ] Desktop (1024px+) e mobile (375px) renderizam **todos** os widgets sem overflow.
- [ ] Os números dos KPIs batem com agregação manual sobre o seed.
- [ ] Cada `DashboardWidget` mostra skeleton enquanto `isLoading` e `ErrorState` + retry quando `isError` (testar derrubando o backend).
- [ ] Criar uma transação em `/transactions` e voltar para `/` reflete nos KPIs/gráficos (invalidação do summary — ver [Task 7](./07-hook-dashboard-summary.md) Gotcha 1).
- [ ] Charts têm `role="img"` + `aria-label` descritivo.

---

## Gotchas

1. **Estados vazios**: usuário novo (cadastrado na Task 9) tem **zero** transações. Todos os widgets precisam de empty state elegante, não "NaN"/gráfico quebrado.
2. **Delta no primeiro mês**: sem mês anterior, `delta` é o próprio valor — trate como "sem comparação" no KpiCard em vez de mostrar +100%.
3. **Pizza com muitas categorias**: agrupar em "Outros" no cliente apenas para exibição; o ideal é o backend já limitar (alinhar com Task 1 se a base tiver muitas categorias).
4. **Não reprocessar no client**: consuma os números já agregados do summary; não recalcule saldo iterando a lista inteira no MFE.
5. **Singleton store/cache**: o MFE usa o mesmo `queryClient` e `store` do shell (compartilhados via MF). Não instanciar um `QueryClient` próprio dentro do MFE.

---

## Próximo passo

→ **Otimizar carregamento e SEO com a [Task 11 — SSR no Shell para SEO + Performance](./11-ssr-shell.md).**
