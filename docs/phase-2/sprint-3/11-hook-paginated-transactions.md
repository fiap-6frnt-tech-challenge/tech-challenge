# Task 11 — Hook `usePaginatedTransactions` com filtros avançados

|                        |                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md)                                                     |
| **Owner**              | Dev 3 (State & Integration)                                                                                                   |
| **Duração estimada**   | 0.5 dia                                                                                                                       |
| **Branch recomendada** | `dev3/hook-paginated-filters`                                                                                                 |
| **Depende de**         | [Task 01 — Paginação + Filtros](./01-backend-pagination-filters.md) — endpoint aceitando `q`, `amount_gte/lte`, `category[]`  |
| **Desbloqueia**        | [Task 13 — Integração Paginação](./13-integration-pagination.md) · [Task 12 — Filtros Avançados](./12-integration-filters.md) |

---

## Contexto

O `api-client` **já tem** `usePaginatedTransactions` (offset-based, via `useQuery` do TanStack Query) — ver `packages/api-client/src/hooks.ts`. Esta task **estende** esse hook (e o `TransactionService.getPaginated`) para passar os filtros avançados novos: busca textual (`q`), faixa de valor (`amount_gte`/`amount_lte`) e multi-seleção de categorias (`category[]`). **Não criamos um hook novo** — reaproveitamos o existente, que já cuida de cache, `placeholderData`, e invalidação pelas mutações.

> Decisão de arquitetura: a Sprint 3 usa **paginação**, não scroll infinito. Logo, não há `useInfiniteQuery` — o `useQuery` paginado já implementado é a base. Ver racional em [sprint-3-transactions.md](../sprint-3-transactions.md#paginação-vs-scroll-infinito).

---

## Implementação

### 1. Estender `GetPaginatedParams` e `getPaginated` no `http.ts`

```ts
// packages/api-client/src/http.ts
export interface GetPaginatedParams {
  page: number;
  perPage?: number;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
  // --- novos (Sprint 3) ---
  q?: string;
  amount_gte?: number;
  amount_lte?: number;
  category?: string[];
}
```

```ts
async getPaginated({
  page,
  perPage = TRANSACTIONS_PER_PAGE,
  type,
  dateFrom,
  dateTo,
  sortBy = 'date',
  sortOrder = 'desc',
  q,
  amount_gte,
  amount_lte,
  category,
}: GetPaginatedParams): Promise<PaginatedResponse> {
  const query = new URLSearchParams();
  query.set('_page', String(page));
  query.set('_per_page', String(perPage));

  if (type && type !== 'all') query.set('type', type);
  if (dateFrom) query.set('date_gte', dateFrom);
  if (dateTo) query.set('date_lte', dateTo);
  if (q) query.set('q', q);
  if (amount_gte !== undefined) query.set('amount_gte', String(amount_gte));
  if (amount_lte !== undefined) query.set('amount_lte', String(amount_lte));
  category?.forEach((c) => query.append('category', c));

  const sortPrefix = sortOrder === 'asc' ? '' : '-';
  query.set('_sort', `${sortPrefix}${sortBy}`);

  const res = await fetch(`${apiBaseUrl}/transactions?${query.toString()}`);
  if (!res.ok) throw new Error('Falha ao buscar transações');
  return res.json();
}
```

### 2. Normalizar os novos filtros em `usePaginatedTransactions`

O hook já normaliza os params para alinhar a `queryKey` ao request real (omitindo filtros vazios). Estender com os novos campos:

```ts
// packages/api-client/src/hooks.ts
export function usePaginatedTransactions(params: GetPaginatedParams) {
  const normalizedParams: GetPaginatedParams = {
    page: params.page,
    perPage: params.perPage ?? 10,
    sortBy: params.sortBy ?? 'date',
    sortOrder: params.sortOrder ?? 'desc',
    ...(params.type && params.type !== 'all' ? { type: params.type } : {}),
    ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
    ...(params.dateTo ? { dateTo: params.dateTo } : {}),
    ...(params.q ? { q: params.q } : {}),
    ...(params.amount_gte !== undefined ? { amount_gte: params.amount_gte } : {}),
    ...(params.amount_lte !== undefined ? { amount_lte: params.amount_lte } : {}),
    ...(params.category?.length ? { category: params.category } : {}),
  };

  return useQuery({
    queryKey: transactionKeys.list({ ...normalizedParams }),
    queryFn: () => TransactionService.getPaginated(normalizedParams),
    placeholderData: (prev) => prev, // mantém a página anterior visível durante a troca
  });
}
```

> Nada muda em `keys.ts`: `transactionKeys.list(filters)` já serializa o objeto de filtros inteiro na key, então cada combinação de filtro/página tem cache próprio.

### 3. Invalidação (já coberta)

As mutações `useCreateTransaction`/`useUpdateTransaction`/`useDeleteTransaction` já invalidam `transactionKeys.lists()` no sucesso — isso cobre **todas** as combinações de filtro/página automaticamente. Não é preciso código novo.

---

## Validação

- [ ] `usePaginatedTransactions({ page, q: 'uber' })` dispara request com `?q=uber` e atualiza a lista
- [ ] `category: ['food','transport']` vira `?category=food&category=transport`
- [ ] `amount_gte`/`amount_lte` aparecem no request quando definidos; ausentes quando `undefined`
- [ ] Mudar qualquer filtro gera nova `queryKey` (novo cache); voltar à combinação anterior reusa o cache
- [ ] Trocar de página mantém a anterior na tela até a nova chegar (`placeholderData`)
- [ ] Criar/editar/excluir transação refaz a lista paginada atual

---

## Gotchas

1. **Normalize antes da `queryKey`** — se passar `category: []` ou `q: ''` direto, a key muda à toa e quebra o cache. O spread condicional (`...(x ? {x} : {})`) garante chaves estáveis.
2. **`placeholderData: (prev) => prev`** (equivalente a `keepPreviousData` no v5) evita o "flash" de skeleton a cada troca de página — essencial para a UX de paginação.
3. **Ordem dos `category` na key** — venha sempre da mesma fonte (URL via `getAll`), que preserva a ordem; assim a key é determinística.
