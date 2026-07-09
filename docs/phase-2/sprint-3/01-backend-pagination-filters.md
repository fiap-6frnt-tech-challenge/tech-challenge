# Task 01 — Backend: Paginação offset no banco + Filtros avançados em `/api/transactions`

|                        |                                                                           |
| ---------------------- | ------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md) |
| **Owner**              | Dev 1 (Infra & Backend)                                                   |
| **Duração estimada**   | 1 dia                                                                     |
| **Branch recomendada** | `dev1/pagination-filters`                                                 |
| **Depende de**         | — (pode iniciar no dia 1)                                                 |
| **PR só abre**         | Após endpoint paginar no banco e os novos filtros passarem nos testes     |
| **Status**             | ✅ Implementado e validado (`store.listTransactions` + `route.ts`)        |

---

## Dependências

- **O que bloqueia esta tarefa:** Nada. Começa no dia 1.
- **O que esta tarefa desbloqueia:** [Task 11 — Hook `usePaginatedTransactions` com filtros](./11-hook-paginated-transactions.md) e [Task 13 — Integração Paginação](./13-integration-pagination.md). Os filtros novos (`q`, `amount_gte/lte`, `category`) também alimentam a [Task 12 — Filtros Avançados](./12-integration-filters.md).

---

## Contexto

O desafio (Fase 2 — _Listagem de Transações_) pede **paginação OU scroll infinito** para "otimizar o carregamento de grandes volumes de dados". A entrega adota **paginação**: previsível, deep-linkável por URL, compatível com SSR e com navegação por teclado/leitor de tela (item de acessibilidade da nota).

Hoje o endpoint em `apps/shell/src/app/api/transactions/route.ts` **carrega todas as transações** (`store.getAll()`), filtra/ordena **em memória** e fatia a página com `slice`. Isso não escala para "grandes volumes". Esta task move paginação, filtragem e ordenação para o **banco** (Drizzle: `WHERE` + `ORDER BY` + `LIMIT`/`OFFSET` + `COUNT`) e adiciona os filtros avançados que a listagem do MFE vai consumir.

O contrato de resposta atual — `{ data, pages, items }` (ver `PaginatedResponse` em `packages/api-client/src/http.ts`) — é **mantido**, então o front existente continua funcionando sem mudança de shape.

---

## Implementação

### 1. Nova função `listTransactions` paginada no `store.ts`

Em `apps/shell/src/app/api/transactions/store.ts`, adicionar uma função que pagina no banco (em vez de `getAll()` + `slice`):

```ts
import { and, eq, gte, lte, ilike, inArray, desc, asc, sql } from 'drizzle-orm';

export type ListParams = {
  userId?: string;
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  q?: string; // busca textual em description
  category?: string[]; // multi-seleção
  amount_gte?: number;
  amount_lte?: number;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
  page: number;
  perPage: number;
};

export type PaginatedResult = {
  data: Transaction[];
  pages: number;
  items: number;
};

export async function listTransactions(params: ListParams): Promise<PaginatedResult> {
  const conditions = [];
  if (params.userId) conditions.push(eq(transactions.userId, params.userId));
  if (params.type) conditions.push(eq(transactions.type, params.type));
  if (params.dateFrom) conditions.push(gte(transactions.date, params.dateFrom));
  if (params.dateTo) conditions.push(lte(transactions.date, params.dateTo));
  if (params.q) conditions.push(ilike(transactions.description, `%${params.q}%`));
  if (params.category?.length) conditions.push(inArray(transactions.category, params.category));
  if (params.amount_gte !== undefined) conditions.push(gte(transactions.amount, params.amount_gte));
  if (params.amount_lte !== undefined) conditions.push(lte(transactions.amount, params.amount_lte));

  const where = conditions.length ? and(...conditions) : undefined;

  const sortCol = params.sortBy === 'amount' ? transactions.amount : transactions.date;
  const orderBy = params.sortOrder === 'asc' ? asc(sortCol) : desc(sortCol);

  const offset = (params.page - 1) * params.perPage;

  // COUNT total (para calcular nº de páginas) + página atual em paralelo
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(where);

  const rows = await db.query.transactions.findMany({
    where,
    orderBy: [orderBy],
    limit: params.perPage,
    offset,
    with: { attachments: true },
  });

  const items = countRow?.count ?? 0;
  return {
    data: rows.map((row) => toTransaction(row)),
    pages: Math.max(1, Math.ceil(items / params.perPage)),
    items,
  };
}
```

> `count(*)::int` mantém o total alinhado ao `WHERE` filtrado — o número de páginas reflete os filtros ativos, não o banco inteiro.

### 2. Route handler (`route.ts`) usando `listTransactions`

Substituir o fluxo "carrega tudo + filtra em memória" por uma chamada à nova função. Mantemos os nomes de query param já usados pelo front (estilo json-server: `_page`, `_per_page`, `_sort`, `date_gte`, `date_lte`) e adicionamos os novos:

```ts
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const page = searchParams.get('_page');
  const perPage = searchParams.get('_per_page');

  // sem paginação → mantém compat: retorna a lista completa (usada por useTransactions na home)
  if (!page || !perPage) {
    return NextResponse.json(await store.getAll());
  }

  const sort = searchParams.get('_sort') ?? '-date';
  const sortOrder = sort.startsWith('-') ? 'desc' : 'asc';
  const sortBy = sort.replace(/^-/, '') as 'date' | 'amount';

  const amountGte = searchParams.get('amount_gte');
  const amountLte = searchParams.get('amount_lte');

  const result = await store.listTransactions({
    page: Number(page),
    perPage: Number(perPage),
    type: (searchParams.get('type') as TransactionType) ?? undefined,
    dateFrom: searchParams.get('date_gte') ?? undefined,
    dateTo: searchParams.get('date_lte') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    category: searchParams.getAll('category'), // múltiplos valores
    amount_gte: amountGte !== null ? Number(amountGte) : undefined,
    amount_lte: amountLte !== null ? Number(amountLte) : undefined,
    sortBy,
    sortOrder,
  });

  return NextResponse.json(result); // { data, pages, items }
}
```

### 3. Novos query params (contrato para Tasks 11/12)

| Param        | Tipo                                    | Efeito                                           |
| ------------ | --------------------------------------- | ------------------------------------------------ |
| `q`          | string                                  | `ILIKE %q%` em `description` (busca textual)     |
| `amount_gte` | number                                  | valor mínimo                                     |
| `amount_lte` | number                                  | valor máximo                                     |
| `category`   | string (repetível)                      | `?category=food&category=transport` → `IN (...)` |
| `_sort`      | `date` \| `amount` (prefixo `-` = desc) | ordenação                                        |

---

## Validação

- [x] `GET /api/transactions?_page=1&_per_page=10` retorna `{ data (≤10), pages, items }` paginado **no banco** (não carrega tudo em memória) — `items=53, pages=6, data=10`
- [x] `GET /api/transactions?_page=2&_per_page=10` retorna a 2ª página (offset correto) — 1º id da p2 (`txn-303`) ≠ 1º id da p1 (`txn-406`)
- [x] `GET /api/transactions?q=...` retorna apenas transações com o termo na description (case-insensitive) — `q=super` e `q=SUPER` → ambos `6` (`ILIKE`)
- [x] `GET /api/transactions?amount_gte=100&amount_lte=500` filtra por faixa de valor — `items=25, pages=3`
- [x] `GET /api/transactions?category=...&category=...` retorna apenas essas categorias — `Alimentação`+`Transporte` → `13` (7+6)
- [x] `items` e `pages` refletem o **total filtrado** (não o banco inteiro)
- [x] `GET /api/transactions` (sem `_page`) continua retornando a lista completa (compat `useTransactions` da home) — `53` itens

---

## Gotchas

1. **`COUNT` deve usar o mesmo `WHERE` da página** — senão `pages` fica errado quando há filtros. Reutilize a variável `where` nas duas queries.
2. **Filtro em memória → DB:** a versão antiga filtrava com `Array.filter` após `getAll()`. Garanta que **todos** os filtros (incl. `type`, datas) agora vão para o `WHERE` do Drizzle; não deixe filtragem dupla.
3. **`category` vazio:** `searchParams.getAll('category')` retorna `[]` quando ausente — só adicione a condição `inArray` se `category.length > 0`, senão a query nunca casa.
4. **`amount` é sempre positivo** no schema (direção vem do `type`); o range filtra magnitude, não sinal.
5. **Índices:** para "grandes volumes", crie índice em `(date)` e, se a busca textual ficar lenta, considere índice `GIN`/`pg_trgm` para `ILIKE`. Fora do escopo desta task, mas anote no PR. _(⏳ pendente — follow-up para o PR)_
