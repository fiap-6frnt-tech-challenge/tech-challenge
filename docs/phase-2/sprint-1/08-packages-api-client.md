# Task 8 — Criar hooks TanStack Query em packages/api-client

> ⏳ **Status: Pending**

|                        |                                                                 |
| ---------------------- | --------------------------------------------------------------- |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)  |
| **Owner**              | `dev4-dashboard`                                                |
| **Duração estimada**   | 2 dias                                                          |
| **Branch recomendada** | `dev4-dashboard/packages-api-client`                            |
| **Depende de**         | [Task 6 — Schema de Transação Evoluído](./06-evolved-schema.md) |
| **PR só abre**         | Após todos os hooks passarem no mock unitário do Vitest local   |

---

## Contexto

As chamadas HTTP diretas da Context API serão substituídas pelo **TanStack Query** (React Query). Para centralizar as chaves de cache, os comportamentos de refetch e simplificar o consumo no shell e nos futuros remotes, os hooks customizados de transações e a lógica de optimistic updates serão expostos através do pacote compartilhado `@bytebank/api-client`.

---

## Pré-condições

- Estar na branch `dev4-dashboard/packages-api-client`.
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

- [ ] Execute os testes unitários do vitest simulando chamadas com MSW (Mock Service Worker) para validar chaves de cache e optimistic updates.
- [ ] O pacote compila corretamente: `npm run build -w @bytebank/api-client`.

---

## Gotchas

1. **Optimistic updates e concorrência**: Sempre certifique-se de executar `await queryClient.cancelQueries()` no `onMutate` para que requisições antigas em voo não retornem dados desatualizados e sobrescrevam o estado atualizado localmente de forma temporária.
2. **Relative Fetch URLs**: O fetcher em `http.ts` usa caminhos relativos (`/api/transactions`). Isso funciona perfeitamente no shell (NextJS), mas para rodar em testes de integração do Vitest (onde o ambiente é JSDOM e não há browser real) você deve mockar a rede globalmente com MSW ou injetar um base URL.

---

## Próximo passo

→ **Realizar a refatoração do frontend removendo a Context API antiga na [Task 9 — Migração: Remover Context API](./09-migrate-context-api.md).**
