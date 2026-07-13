# @bytebank/api-client

TanStack Query hooks and HTTP fetchers for the shell API (`/api/*`).

## Usage

```ts
import { useCreateTransaction, useTransactions } from '@bytebank/api-client';

const { data, isLoading } = useTransactions({ type: 'deposit' });
const { mutate } = useCreateTransaction();
```

## Exports

- `useTransactions`, `usePaginatedTransactions`, `useTransaction` — transaction queries.
- `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction` — mutations that invalidate the transaction lists on success.
- `queryClient` — shared TanStack Query client (`client.ts`).
- `transactionKeys` — query key factory (`keys.ts`).
- `TransactionService` — HTTP layer over `/api/transactions` (`http.ts`).
