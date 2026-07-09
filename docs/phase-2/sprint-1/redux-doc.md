# Documentação — Redux Toolkit + TanStack Query

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

- **Redux Toolkit** para estado client-side: UI, preferências, sessão derivada.
- **TanStack Query** para estado de servidor: cache, refetch, mutations.

As duas bibliotecas convivem. Cada uma resolve um problema diferente.

> **Por que Redux Toolkit?** A spec do Tech Challenge lista "Redux, Recoil ou NgRx". Adotamos **Redux Toolkit**, a forma oficial e moderna do Redux: `createSlice` + Immer eliminam o boilerplate clássico de actions/reducers, e o store compartilhado como singleton via Module Federation funciona bem entre MFEs.

---

## 2. Qual biblioteca usar

```
O dado vem de um endpoint HTTP?
 ├── Sim  →  TanStack Query (useQuery / useMutation)
 │           Ex.: lista de transações, detalhe por id, perfil do usuário
 │
 └── Não  →  É compartilhado entre componentes distantes ou entre MFEs?
              ├── Sim  →  slice Redux Toolkit
              │           Ex.: sidebar aberta/fechada, tema, feedback global
              │
              └── Não  →  React useState / useReducer local
                          Ex.: input controlado dentro de um form
```

Anti-padrão a evitar: copiar dados do servidor para um slice Redux "para deixar global". O TanStack Query é o dono dos dados do servidor. O Redux guarda apenas estado client-side.

---

## 3. Redux Toolkit

### 3.1. Conceito

Redux Toolkit (RTK) é a abordagem oficial recomendada do Redux. Você define **slices** (`createSlice`), que agrupam o estado inicial, os reducers e geram as actions automaticamente. Graças ao Immer embutido, os reducers podem "mutar" o estado diretamente — o RTK produz a atualização imutável por baixo. O `configureStore` junta os slices num store, exposto à árvore via `<Provider>`.

### 3.2. Estrutura de um slice

```typescript
import { createSlice, configureStore, type PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
  count: number;
}

const initialState: CounterState = { count: 0 };

const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.count += 1;
    },
    decrement: (state) => {
      state.count -= 1;
    },
    reset: (state) => {
      state.count = 0;
    },
    incrementBy: (state, action: PayloadAction<number>) => {
      state.count += action.payload;
    },
  },
});

export const { increment, decrement, reset, incrementBy } = counterSlice.actions;

export const store = configureStore({
  reducer: { counter: counterSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

Consumindo em um componente (com hooks tipados `useAppSelector`/`useAppDispatch`):

```tsx
function Counter() {
  const count = useAppSelector((state) => state.counter.count);
  const dispatch = useAppDispatch();

  return <button onClick={() => dispatch(increment())}>{count}</button>;
}
```

### 3.3. Use seletores enxutos — sempre

Selecione a menor fatia possível do estado para evitar re-renderizações desnecessárias:

```typescript
// Ruim — seleciona o objeto inteiro; re-renderiza se qualquer campo de counter mudar
const counter = useAppSelector((state) => state.counter);

// Correto — só re-renderiza se `count` mudar
const count = useAppSelector((state) => state.counter.count);
```

Para seletores derivados/custosos, use `createSelector` (Reselect, reexportado pelo RTK) para memoizar. Essa granularidade é a principal vantagem sobre a Context API: você assina apenas o pedaço que importa, sem re-renderizar o restante da árvore.

### 3.4. Provider na raiz

```tsx
import { Provider } from 'react-redux';
import { store } from '@bytebank/stores';

export function App() {
  return (
    <Provider store={store}>
      <SuaApp />
    </Provider>
  );
}
```

No monorepo, o shell instancia o `<Provider store={store}>` e compartilha o store com os MFEs como singleton via Module Federation.

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

|                      | Redux Toolkit                 | TanStack Query                      |
| -------------------- | ----------------------------- | ----------------------------------- |
| Origem dos dados     | Cliente (UI, sessão derivada) | Servidor (HTTP)                     |
| Dono da verdade      | O store                       | A API (o cache espelha)             |
| Cache                | Não                           | Sim, com TTL, invalidação e refetch |
| Precisa de Provider  | Sim (`<Provider store>`)      | Sim (`QueryClientProvider`)         |
| Evita re-renders com | Seletores enxutos             | Automático por queryKey             |
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
packages/stores/src/       <- authSlice, uiSlice, store, hooks tipados (Redux Toolkit)
packages/api-client/src/   <- useTransactions, useCreateTransaction etc. (TanStack Query)
apps/shell/src/            <- consome os hooks, sem Context
```

Os packages já existem como esqueleto (criados na Sprint 0). O conteúdo é implementado pelo Dev 3 nas [Tasks 7 e 8](./README.md).

---
