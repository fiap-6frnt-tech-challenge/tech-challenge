# Task 8 — Criar hooks TanStack Query em packages/api-client

> 🟢 **Status: Implementada e validada** (2026-05-30).
>
> **Decisões/correções em relação ao texto original:**
>
> - **Reaproveitou o `TransactionService` existente** (`apps/shell/src/services/TransactionService.ts`) movendo-o para `packages/api-client/src/http.ts`. O arquivo do shell virou um **shim de re-export** (`export { … } from '@bytebank/api-client'`), então os consumidores atuais (`@/services`) seguem funcionando; a Task 9 os troca pelos hooks e remove o shim.
> - **`update` usa `PATCH`** (a rota `[id]/route.ts` expõe PATCH, não PUT como no exemplo original).
> - **Adicionado `client.ts`** exportando `createQueryClient()` + a instância `queryClient` — necessária para o `<QueryClientProvider>` do shell (a Task 9 importa `queryClient`).
> - **Optimistic delete corrigido:** opera sobre `transactionKeys.lists()` via `setQueriesData` (o exemplo original mexia em `transactionKeys.all`, que não atinge o cache das listas `['transactions','list',…]`). O updater trata as duas formas de cache (array de `useTransactions` e `PaginatedResponse` de `usePaginatedTransactions`).
> - **`fetch` lança em status != 2xx** para o TanStack Query marcar `error`.
> - **Base da API sem `process.env`:** o pacote não lê variáveis de ambiente (evita erro de tipo `process` e `ReferenceError` no browser dos MFEs Rsbuild). Default relativo `/api` + `configureApiBaseUrl(baseUrl)`; o **shell injeta** a base via `NEXT_PUBLIC_API_URL` no shim de `@/services` (onde `process` é tipado). Override segue funcionando; MFEs podem apontar para a URL absoluta do shell quando preciso.
> - `@bytebank/api-client` adicionado ao `transpilePackages` do `next.config.ts`.
>
> **Hooks expostos:** `useTransactions`, `usePaginatedTransactions`, `useTransaction`, `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction` (+ `transactionKeys`, `queryClient`, `TransactionService`). `useInfiniteTransactions` fica para o Sprint 3.

|                        |                                                                 |
| ---------------------- | --------------------------------------------------------------- |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)  |
| **Owner**              | `Dev 3`                                                         |
| **Duração estimada**   | 2 dias                                                          |
| **Branch recomendada** | `dev3/packages-api-client`                                      |
| **Depende de**         | [Task 6 — Schema de Transação Evoluído](./06-evolved-schema.md) |
| **PR só abre**         | Após todos os hooks passarem no mock unitário do Vitest local   |

---

## Dependências

- **O que bloqueia esta tarefa**: Bloqueada pela **Task 6 (Schema Evoluído)** entregue pelo Dev 1. É mandatório que o tipo `Transaction` do `@bytebank/shared` contenha os novos campos de `userId` e `category` para que as chaves de query e os payloads das mutations do TanStack Query compilem de forma correta.
- **O que esta tarefa desbloqueia**: Desbloqueia diretamente a **Task 9 (Migração Context)**, pois a Context API das transações será substituída pelos custom hooks (`useTransactions`, `useCreateTransaction`) criados aqui.

---

## Pré-condições

- Estar na branch `dev3/packages-api-client`.
- Instalar as dependências necessárias no pacote:
  ```bash
  npm install @tanstack/react-query @bytebank/shared -w @bytebank/api-client
  npm install -D vitest msw @testing-library/react-hooks -w @bytebank/api-client
  ```

---

## Implementação passo-a-passo

### 1. Criar chaves de cache e client factory (`packages/api-client/src/keys.ts`)

```typescript
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};
```

---

### 2. Implementar HTTP client service (`packages/api-client/src/http.ts`)

Encapsule os fetches tradicionais apontando para as rotas do shell (`/api/transactions`):

```typescript
import type { Transaction, NewTransaction, UpdateTransaction } from '@bytebank/shared';

export const TransactionService = {
  async getAll(filters: Record<string, any> = {}): Promise<Transaction[]> {
    const query = new URLSearchParams(filters).toString();
    const res = await fetch(`/api/transactions?${query}`);
    if (!res.ok) throw new Error('Falha ao buscar transações');
    return res.json();
  },

  async getById(id: string): Promise<Transaction> {
    const res = await fetch(`/api/transactions/${id}`);
    if (!res.ok) throw new Error('Falha ao buscar transação');
    return res.json();
  },

  async create(data: NewTransaction): Promise<Transaction> {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao criar transação');
    return res.json();
  },

  async update(id: string, data: UpdateTransaction): Promise<Transaction> {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao atualizar transação');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Falha ao deletar transação');
  },
};
```

---

### 3. Criar os Hooks de Consulta e Mutação (`packages/api-client/src/hooks.ts`)

Escreva os hooks customizados que serão consumidos pelo frontend:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TransactionService } from './http';
import { transactionKeys } from './keys';
import type { Transaction, NewTransaction, UpdateTransaction } from '@bytebank/shared';

export function useTransactions(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => TransactionService.getAll(filters),
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => TransactionService.getById(id),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newTx: NewTransaction) => TransactionService.create(newTx),
    onSuccess: (data) => {
      // Invalida a listagem para forçar sincronização
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => TransactionService.delete(id),
    onMutate: async (idToDelete) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.all });
      const previousLists = queryClient.getQueryData(transactionKeys.all);

      // Remove otimisticamente
      queryClient.setQueryData(transactionKeys.all, (old: any) =>
        old ? old.filter((tx: Transaction) => tx.id !== idToDelete) : []
      );

      return { previousLists };
    },
    onError: (err, id, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(transactionKeys.all, context.previousLists);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
```

---

### 4. Configurar index.ts barrel export

```typescript
export * from './keys';
export * from './http';
export * from './hooks';
```

---

## Validação

- [x] Testes unitários (Vitest) passando — `keys.test.ts` (chaves hierárquicas) + `http.test.ts` (mock de `fetch`: POST/PATCH/params de `getPaginated`/throw em !ok). **6/6 verdes.** _(MSW + teste dos optimistic updates em nível de hook fica como melhoria futura.)_
- [x] O pacote type-checka (`npm run type-check -w @bytebank/api-client`) e o shell compila consumindo-o via shim (`type-check` + `next build` verdes).

---

## Gotchas

1. **Optimistic updates e concorrência**: Sempre certifique-se de executar `await queryClient.cancelQueries()` no `onMutate` para que requisições antigas em voo não retornem dados desatualizados e sobrescrevam o estado atualizado localmente de forma temporária.
2. **Relative Fetch URLs**: O fetcher em `http.ts` usa caminhos relativos (`/api/transactions`). Isso funciona perfeitamente no shell (NextJS), mas para rodar em testes de integração do Vitest (onde o ambiente é JSDOM e não há browser real) você deve mockar a rede globalmente com MSW ou injetar um base URL.

---

## Próximo passo

→ **Realizar a refatoração do frontend removendo a Context API antiga na [Task 9 — Migração: Remover Context API](./09-migrate-context-api.md).**
