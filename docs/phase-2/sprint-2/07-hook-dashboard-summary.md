# Task 7 — Hook `useDashboardSummary` no `@bytebank/api-client`

> ⏳ **Status: Pending**

|                        |                                                                         |
| ---------------------- | ----------------------------------------------------------------------- |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md)           |
| **Owner**              | `Dev 3` (State & Integration)                                           |
| **Duração estimada**   | 0.5 dia                                                                 |
| **Branch recomendada** | `dev3/hook-dashboard-summary`                                           |
| **Depende de**         | [Task 1 — Backend: Endpoint de Summary](./01-backend-summary-seed.md)   |
| **PR só abre**         | Após o hook retornar o summary tipado e consumível pelo `dashboard-mfe` |

---

## Dependências

- **O que bloqueia esta tarefa**: Bloqueada pela **[Task 1](./01-backend-summary-seed.md)** (Dev 1) — o hook consome `GET /api/transactions/summary`. Enquanto o endpoint não existir, mockar contra o shape acordado (o tipo é o contrato).
- **O que esta tarefa desbloqueia**: Desbloqueia a **[Task 10 — Layout do Dashboard + Widgets](./10-dashboard-layout-widgets.md)**, que lê os dados via este hook.

---

## Contexto

O `@bytebank/api-client` já centraliza o estado servidor em TanStack Query (`client.ts`, `keys.ts`, `http.ts`, `hooks.ts`). Esta task adiciona o hook `useDashboardSummary` seguindo os mesmos padrões: fetch tipado no `http.ts`, query key versionada em `keys.ts`, hook em `hooks.ts`, e re-export pelo barrel `index.ts`.

---

## Pré-condições

- Estar na branch `dev3/hook-dashboard-summary`.
- Tipo `DashboardSummary` definido (idealmente em `@bytebank/shared`, reaproveitando os tipos `MonthlyAggregate`/`BalancePoint`/`CategoryAggregate` da Task 1).

---

## Implementação passo-a-passo

### 1. Tipo de resposta (em `@bytebank/shared`)

```typescript
import type { MonthlyAggregate, BalancePoint, CategoryAggregate } from '../lib/transactions';

export interface DashboardSummary {
  balance: number;
  incomeMonth: number;
  expenseMonth: number;
  savingsMonth: number;
  deltaIncome: number;
  deltaExpense: number;
  byMonth: MonthlyAggregate[];
  balanceOverTime: BalancePoint[];
  byCategory: CategoryAggregate[];
}
```

### 2. Fetcher no `http.ts` (`packages/api-client/src/http.ts`)

```typescript
export interface SummaryRange {
  from?: string;
  to?: string;
}

export const SummaryService = {
  async get({ from, to }: SummaryRange = {}): Promise<DashboardSummary> {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    const qs = query.toString();
    const res = await fetch(`${apiBaseUrl}/transactions/summary${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error('Falha ao buscar o resumo financeiro');
    return res.json();
  },
};
```

### 3. Query keys (`packages/api-client/src/keys.ts`)

```typescript
export const summaryKeys = {
  all: ['summary'] as const,
  range: (range: { from?: string; to?: string }) => [...summaryKeys.all, range] as const,
};
```

### 4. Hook (`packages/api-client/src/hooks.ts`)

```typescript
import { useQuery } from '@tanstack/react-query';
import { SummaryService, type SummaryRange } from './http';
import { summaryKeys } from './keys';

/** Default: últimos 6 meses até hoje. */
function defaultRange(): Required<SummaryRange> {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 5, 1);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function useDashboardSummary(range?: SummaryRange) {
  const effective = { ...defaultRange(), ...range };
  return useQuery({
    queryKey: summaryKeys.range(effective),
    queryFn: () => SummaryService.get(effective),
    staleTime: 60_000,
  });
}
```

### 5. Barrel export

Garanta que `index.ts` (que já faz `export * from './keys' | './http' | './client' | './hooks'`) cobre os novos símbolos.

---

## Validação

- [ ] Em um componente de teste do shell/MFE, `const { data, isLoading } = useDashboardSummary()` retorna o summary tipado.
- [ ] A query key inclui o range — mudar `from`/`to` refaz o fetch e mantém cache por range.
- [ ] As mutations de transação (`useCreateTransaction` etc.) que invalidam `transactionKeys.lists()` **também** devem invalidar `summaryKeys.all` (ver Gotcha 1) para o dashboard refletir novas transações.

---

## Gotchas

1. **Invalidar o summary nas mutations**: ao criar/editar/excluir transação, o resumo muda. Adicione `queryClient.invalidateQueries({ queryKey: summaryKeys.all })` no `onSuccess` das mutations existentes — senão o KPI/gráficos ficam defasados.
2. **Default range estável**: recalcular `new Date()` a cada render muda a key e refaz fetch infinito. Calcule o range uma vez (ou memoize) antes de passar para a key.
3. **`staleTime`**: 60s evita refetch agressivo ao navegar entre widgets.
4. **Sem `userId` no client**: o endpoint deriva o usuário da sessão (cookie httpOnly). O hook **não** envia `userId` — apenas o range.

---

## Próximo passo

→ **Consumir o hook nos widgets com a [Task 10 — Layout do Dashboard + Widgets](./10-dashboard-layout-widgets.md).**
