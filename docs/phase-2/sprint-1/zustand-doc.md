# Documentação — Zustand + TanStack Query

## 1. Por que estamos mudando

O Bytebank hoje usa Context API em dois lugares:

- [TransactionsContext](../../../apps/shell/src/context/TransactionsContext.tsx) — lista de transações, balance e CRUD.
- [FeedbackContext](../../../apps/shell/src/context/FeedbackContext.tsx) — modal de feedback global.

Funciona, mas causa três problemas:

| Problema                                                                   | Consequência                                                                      |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Qualquer mudança no `value` do Context re-renderiza todos os consumidores. | Atualizar uma transação re-renderiza Header, Sidebar, BalanceCard, lista inteira. |
| O flag `initialFetchDone` evita duplo fetch, mas é um workaround frágil.   | Sem invalidação, refetch on focus, deduplicação ou retries automáticos.           |
| O mesmo provider mistura cache de dados e lógica de UI.                    | Compartilhar Context entre MFEs (Dashboard, Transactions) é arriscado.            |

A substituição:

- **Zustand** para estado client-side: UI, preferências, sessão derivada.
- **TanStack Query** para estado de servidor: cache, refetch, mutations.

As duas bibliotecas convivem. Cada uma resolve um problema diferente.

---

## 2. Qual biblioteca usar

```
O dado vem de um endpoint HTTP?
 ├── Sim  →  TanStack Query (useQuery / useMutation)
 │           Ex.: lista de transações, detalhe por id, perfil do usuário
 │
 └── Não  →  É compartilhado entre componentes distantes ou entre MFEs?
              ├── Sim  →  Zustand store
              │           Ex.: sidebar aberta/fechada, tema, feedback global
              │
              └── Não  →  React useState / useReducer local
                          Ex.: input controlado dentro de um form
```

Anti-padrão a evitar: copiar dados do servidor para uma store Zustand "para deixar global". O TanStack Query é o dono dos dados do servidor. Zustand guarda apenas estado client-side.

---

## 3. Zustand

### 3.1. Conceito

Zustand é um gerenciador de estado minúsculo (~1KB). Você cria uma store (objeto com state + funções) e qualquer componente se inscreve via hook.

Não há `Provider`, `dispatch` nem `reducer`. Só a função `create`.

### 3.2. Estrutura de uma store

```typescript
import { create } from 'zustand';

interface CounterState {
  count: number;
}

interface CounterActions {
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

type CounterStore = CounterState & CounterActions;

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

Consumindo em um componente:

```tsx
function Counter() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);

  return <button onClick={increment}>{count}</button>;
}
```

### 3.3. Use seletores — sempre

Sem seletor, o componente re-renderiza a cada mudança em qualquer propriedade da store:

```typescript
// Ruim — re-renderiza se qualquer coisa na store mudar
const { count } = useCounterStore();

// Correto — só re-renderiza se `count` mudar
const count = useCounterStore((state) => state.count);
```

Acesse uma propriedade por chamada. Se precisar de duas, use dois `useCounterStore`.

Essa é a principal vantagem sobre a Context API: você assina apenas o pedaço que importa, sem re-renderizar o restante da árvore.

---

## 4. TanStack Query

### 4.1. Conceito

TanStack Query gerencia estado de servidor. Em vez de `useEffect + fetch + useState(isLoading) + useState(error)`, você escreve um hook. Ele cuida de:

- Cache compartilhado entre componentes.
- Deduplicação de requisições simultâneas.
- Refetch automático após reconexão.
- Estados loading / error / success.
- Invalidação programática após mutations.
- Optimistic updates com rollback.

### 4.2. Setup — QueryClientProvider

Toda a árvore que usa queries precisa estar envolvida pelo provider:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuaApp />
    </QueryClientProvider>
  );
}
```

Se esquecer o `QueryClientProvider`, o `useQuery` lança um erro em runtime.

### 4.3. Lendo dados — `useQuery`

```tsx
function TodoList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['todos'],
    queryFn: () => fetch('/api/todos').then((r) => r.json()),
  });

  if (isLoading) return <p>Carregando...</p>;
  if (isError) return <p>Falhou.</p>;

  return (
    <ul>
      {data.map((t) => (
        <li key={t.id}>{t.title}</li>
      ))}
    </ul>
  );
}
```

- `queryKey` — identificador único no cache. Duas queries com a mesma key compartilham a mesma resposta cacheada.
- `queryFn` — qualquer função que retorne uma Promise.

### 4.4. Query Keys — use arrays hierárquicos

Não passe strings soltas. Use a estrutura abaixo para poder invalidar por escopo:

```typescript
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters) => [...transactionKeys.lists(), filters] as const,
  detail: (id) => [...transactionKeys.all, 'detail', id] as const,
};
```

`invalidateQueries({ queryKey: transactionKeys.all })` invalida tudo. `invalidateQueries({ queryKey: transactionKeys.lists() })` invalida só as listas.

Detalhes em [state-conventions.md §3.1](../state-conventions.md).

### 4.5. Mudando dados — `useMutation`

```tsx
function NewTodoButton() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newTodo) => fetch('/api/todos', { method: 'POST', body: JSON.stringify(newTodo) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return <button onClick={() => mutation.mutate({ title: 'Novo' })}>Criar</button>;
}
```

### 4.6. Optimistic updates

Para feedback imediato (ex: deletar um item), atualize o cache antes da resposta e desfaça se der erro:

```typescript
useMutation({
  mutationFn: (id) => TransactionService.delete(id),

  onMutate: async (idToDelete) => {
    await queryClient.cancelQueries({ queryKey: transactionKeys.all });
    const previous = queryClient.getQueryData(transactionKeys.all);

    queryClient.setQueryData(transactionKeys.all, (old) => old.filter((t) => t.id !== idToDelete));

    return { previous };
  },

  onError: (_err, _id, context) => {
    queryClient.setQueryData(transactionKeys.all, context.previous);
  },

  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: transactionKeys.all });
  },
});
```

Detalhes em [state-conventions.md §3.4](../state-conventions.md).

---

## 5. Resumo comparativo

|                      | Zustand                       | TanStack Query                      |
| -------------------- | ----------------------------- | ----------------------------------- |
| Origem dos dados     | Cliente (UI, sessão derivada) | Servidor (HTTP)                     |
| Dono da verdade      | A store                       | A API (o cache espelha)             |
| Cache                | Não                           | Sim, com TTL, invalidação e refetch |
| Precisa de Provider  | Não                           | Sim (`QueryClientProvider`)         |
| Evita re-renders com | Seletores                     | Automático por queryKey             |
| Exemplos no Bytebank | Feedback modal, sidebar       | Transações, mutations CRUD          |

---

## 6. Estrutura no monorepo

Hoje:

```
apps/shell/src/context/    <- Context API (removido na Task 9)
apps/shell/src/hooks/      <- hooks ad-hoc (usePaginatedTransactions etc.)
packages/stores/           <- esqueleto vazio
packages/api-client/       <- esqueleto vazio
```

Após a Sprint 1:

```
packages/stores/src/       <- useAuthStore, useUIStore (Zustand)
packages/api-client/src/   <- useTransactions, useCreateTransaction etc. (TanStack Query)
apps/shell/src/            <- consome os hooks, sem Context
```

Os packages já existem como esqueleto (criados na Sprint 0). O conteúdo é implementado pelo Dev 3 nas [Tasks 7 e 8](./README.md).

---
