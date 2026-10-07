# @bytebank/api-client

TanStack Query hooks and HTTP fetchers for the shell API (`/api/*`).

## Usage

```ts
import { useAccountOverview, useCreateTransaction } from '@bytebank/api-client';

const { data, isLoading } = useAccountOverview(); // { balance, recent }
const { mutate } = useCreateTransaction();
```

## Exports

- `useAccountOverview` — balance + 5 most recent transactions for the home (`GET /api/transactions/overview`).
- `usePaginatedTransactions`, `useTransaction` — transaction queries. The list endpoint is always paginated (max 100 items per page).
- `useDashboardSummary` — chart aggregates (`GET /api/transactions/summary`).
- `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction` — mutations that invalidate the transaction lists, the overview and the summary on success.
- `queryClient` — shared TanStack Query client (`client.ts`).
- `transactionKeys`, `overviewKeys`, `summaryKeys` — query key factories (`keys.ts`).
- `TransactionService` — HTTP layer over `/api/transactions` (`http.ts`).
