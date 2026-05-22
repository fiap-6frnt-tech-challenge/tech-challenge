# @bytebank/api-client

TanStack Query hooks and HTTP fetchers for the shell API (`/api/*`).

## Planned Usage

```ts
import { useCreateTransaction, useTransactions } from '@bytebank/api-client';

const { data, isLoading } = useTransactions({ type: 'deposit' });
const { mutate } = useCreateTransaction();
```

## Current Status

Empty Sprint 0 scaffold. Implementation is planned for Sprint 1 in `docs/phase-2/sprint-1-auth-state.md`.
