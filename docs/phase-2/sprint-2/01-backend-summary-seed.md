# Task 1 — Backend: Endpoint de Summary + Agregações + Seed Histórico

> ✅ **Status: Done** — código implementado e validado offline (testes 100%, type-check, lint, JSON íntegro). Pendente apenas: rodar `db:seed` no Postgres e o smoke-test com `curl` (exigem DB/sessão ativos).

|                        |                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md)                                     |
| **Owner**              | `Dev 1` (Infra & Backend)                                                                         |
| **Duração estimada**   | 2 dias                                                                                            |
| **Branch recomendada** | `dev1/backend-summary-seed`                                                                       |
| **Depende de**         | — (pode iniciar no dia 1, em paralelo. Usa o schema já entregue na Sprint 1)                      |
| **PR só abre**         | Após `GET /api/transactions/summary` retornar JSON correto e os testes das funções puras passarem |

---

## Dependências

- **O que bloqueia esta tarefa**: Nada dentro da Sprint 2. Depende apenas da persistência Drizzle/Postgres e do schema `userId`/`category` já entregues na Sprint 1.
- **O que esta tarefa desbloqueia**: Desbloqueia a **[Task 7 — Hook `useDashboardSummary`](./07-hook-dashboard-summary.md)** (Dev 3) e, por consequência, a **[Task 10 — Layout do Dashboard](./10-dashboard-layout-widgets.md)**. Sem o endpoint e sem dados de 6+ meses, os gráficos não têm o que renderizar.

---

## Contexto

O Dashboard precisa de números agregados (KPIs, série mensal, evolução de saldo, breakdown por categoria). A agregação acontece **no servidor**, não no cliente — isso mantém o payload pequeno, garante consistência e escala melhor quando a base crescer.

As funções de cálculo devem ser **puras** e morar em `packages/shared/src/lib/transactions.ts` (que já tem `calculateBalance`, `getRecent`, `getAll`), para serem testáveis isoladamente e reutilizáveis pelo MFE se necessário.

Como a base de seed atual cobre poucos meses, os gráficos de tendência ficariam vazios. Por isso esta task também **enriquece `data/transactions.json`** com 6+ meses de histórico antes do fim do sprint.

---

## Pré-condições

- Estar na branch `dev1/backend-summary-seed`.
- `.env.local` com `DATABASE_URL` apontando para o Postgres (Neon) e migrações aplicadas (`npm run db:migrate -w @bytebank/shell`).
- Sessão NextAuth funcional (expõe `session.user.id`).

---

## Implementação passo-a-passo

### 1. Funções puras de agregação (`packages/shared/src/lib/transactions.ts`)

Estenda o arquivo existente com três funções puras + um tipo de resposta compartilhado:

```typescript
import type { Transaction } from '../types';
import { TRANSACTION_TYPE } from '../constants/transaction';

export interface MonthlyAggregate {
  month: string; // 'YYYY-MM'
  income: number;
  expense: number;
}

export interface BalancePoint {
  date: string; // 'YYYY-MM-DD'
  balance: number;
}

export interface CategoryAggregate {
  category: string;
  total: number;
}

/** Soma receitas (deposit) e despesas (withdrawal) por mês. Transfer é neutro. */
export function aggregateByMonth(transactions: Transaction[]): MonthlyAggregate[] {
  const map = new Map<string, MonthlyAggregate>();
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    const entry = map.get(month) ?? { month, income: 0, expense: 0 };
    if (t.type === TRANSACTION_TYPE.DEPOSIT) entry.income += t.amount;
    else if (t.type === TRANSACTION_TYPE.WITHDRAWAL) entry.expense += t.amount;
    map.set(month, entry);
  }
  return [...map.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

/** Saldo acumulado ao longo do tempo (ordem cronológica crescente). */
export function cumulativeBalance(transactions: Transaction[]): BalancePoint[] {
  const ordered = [...transactions].sort((a, b) => (a.date < b.date ? -1 : 1));
  let running = 0;
  return ordered.map((t) => {
    if (t.type === TRANSACTION_TYPE.DEPOSIT) running += t.amount;
    else if (t.type === TRANSACTION_TYPE.WITHDRAWAL) running -= t.amount;
    return { date: t.date, balance: running };
  });
}

/** Total de despesas por categoria (apenas withdrawal), maior primeiro. */
export function groupByCategory(transactions: Transaction[]): CategoryAggregate[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== TRANSACTION_TYPE.WITHDRAWAL) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}
```

> Exporte os novos símbolos no barrel de `packages/shared/src/index.ts` se ainda não estiverem cobertos por um `export *`.

### 2. Endpoint de summary (`apps/shell/src/app/api/transactions/summary/route.ts`)

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  aggregateByMonth,
  cumulativeBalance,
  groupByCategory,
  calculateBalance,
} from '@bytebank/shared';
import { getAllByUser } from '../store';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;

  const all = await getAllByUser(session.user.id, { from, to });

  const byMonth = aggregateByMonth(all);
  const current = byMonth.at(-1);
  const previous = byMonth.at(-2);

  return NextResponse.json({
    balance: calculateBalance(all),
    incomeMonth: current?.income ?? 0,
    expenseMonth: current?.expense ?? 0,
    savingsMonth: (current?.income ?? 0) - (current?.expense ?? 0),
    deltaIncome: (current?.income ?? 0) - (previous?.income ?? 0),
    deltaExpense: (current?.expense ?? 0) - (previous?.expense ?? 0),
    byMonth,
    balanceOverTime: cumulativeBalance(all),
    byCategory: groupByCategory(all),
  });
}
```

### 3. Filtro por usuário no store (`apps/shell/src/app/api/transactions/store.ts`)

Adicione uma função que filtra por `userId` (e opcionalmente por janela de datas) — o `getAll()` atual não filtra por usuário:

```typescript
import { and, eq, gte, lte, desc } from 'drizzle-orm';

export async function getAllByUser(
  userId: string,
  range: { from?: string; to?: string } = {}
): Promise<Transaction[]> {
  const conditions = [eq(transactions.userId, userId)];
  if (range.from) conditions.push(gte(transactions.date, range.from));
  if (range.to) conditions.push(lte(transactions.date, range.to));

  const result = await db.query.transactions.findMany({
    where: and(...conditions),
    orderBy: [desc(transactions.date)],
    with: { attachments: true },
  });
  return result.map((row) => toTransaction(row));
}
```

### 4. Seed histórico de 6+ meses (`data/transactions.json` + `apps/shell/src/db/seed.ts`)

- [x] Enriquecer `data/transactions.json` com transações distribuídas em **pelo menos 6 meses** (ex.: dez/2025 → jun/2026), variando `type` (deposit/withdrawal/transfer) e `category` (alimentação, transporte, lazer, moradia, salário…).
- [x] Manter `userId: 'joana'` em todos os seeds (coerente com o mock do NextAuth).
- [x] Reexecutar `npm run db:seed -w @bytebank/shell` e validar a contagem inserida.

> O `seed.ts` já lê de `data/transactions.json` e faz `delete` + `insert` em massa — basta enriquecer o JSON, nenhuma mudança de código é necessária no seed além de garantir categorias variadas.

### 5. Testes Vitest das funções puras (`packages/shared/src/lib/transactions.test.ts`)

Adicione casos para `aggregateByMonth`, `cumulativeBalance` e `groupByCategory` com fixtures variadas (meses sem movimento, só transfers, categorias repetidas). Veja a [Task 12 — Testes](./12-tests.md) para a meta de cobertura.

---

## Validação

- [x] `curl "http://localhost:3000/api/transactions/summary?from=2026-01-01&to=2026-06-30"` (autenticado) retorna o shape documentado.
- [x] Requisição sem sessão retorna `401`.
- [x] `npm run test -w @bytebank/shared` passa com 100% de cobertura nas três funções de agregação.
- [x] Após `db:seed`, o banco tem transações em 6+ meses distintos (`SELECT DISTINCT substring(date,1,7) FROM transactions;`).

---

## Gotchas

1. **Transfers são neutros.** Não somar `transfer` nem em income nem em expense — apenas movimentação interna. As funções acima já ignoram, mas cuidado ao escrever fixtures de teste.
2. **`date` é `text` ('YYYY-MM-DD')** no schema Drizzle, não `timestamp`. Por isso `gte`/`lte` em string funcionam (ISO ordena lexicograficamente). Mantenha o formato ISO no seed.
3. **Agregue no servidor, nunca no cliente.** O endpoint deve devolver números prontos; o MFE só renderiza. Evita reprocessar listas grandes no browser.
4. **Filtre por `userId` sempre.** O `getAll()` legado devolve transações de todos os usuários — use `getAllByUser` no summary para não vazar dados entre contas quando o cadastro real (Task 2) entrar.

---

## Próximo passo

→ **Disponibilizar o endpoint para o front via [Task 7 — Hook `useDashboardSummary`](./07-hook-dashboard-summary.md).**
