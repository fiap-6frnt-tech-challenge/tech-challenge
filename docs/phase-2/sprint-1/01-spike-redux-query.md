# Task 1 — Spike: Redux Toolkit + TanStack Query

> 🟢 **Status: Implementada** — convenções consolidadas em [state-conventions.md](../state-conventions.md).

> 📝 **Ressalva:** a reunião de pair programming (passo 1 abaixo) foi **substituída** pela documentação em [state-conventions.md](../state-conventions.md), que cobre os mesmos pontos da agenda original (Redux Toolkit vs TanStack Query, seletores/hooks tipados, query keys, mutations e optimistic updates).
>
> 🔁 **Atualização de decisão:** a gestão de estado cliente foi definida como **Redux Toolkit** (antes prototipada com Zustand), para alinhar com a lista da spec do Tech Challenge ("Redux, Recoil ou NgRx"). Os exemplos abaixo refletem Redux Toolkit e foram **revalidados com RTK** em 2026-05-30 (ver [Validação](#validação)).

|                        |                                                                |
| ---------------------- | -------------------------------------------------------------- |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md) |
| **Owner**              | `Dev 1` (lidera, todos participam)                             |
| **Duração estimada**   | 1 dia                                                          |
| **Branch recomendada** | `dev1/state-spike` (sandbox descartável)                       |
| **Depende de**         | — (Sem bloqueios de código)                                    |
| **PR só abre**         | Não abre PR (estudo/sandbox descartável). Fechamento via daily |

---

## Dependências

- **O que bloqueia esta tarefa**: Nada. Ela é o ponto de partida conceitual da Sprint 1.
- **O que esta tarefa desbloqueia**: Todas as tarefas subsequentes da Sprint 1 (**Tasks 2 a 11**), visto que alinha os padrões estáticos e dinâmicos de estado antes do time escrever código de produção.

---

## Contexto

Antes de iniciar a alteração do código produtivo da aplicação, todo o time de desenvolvimento deve estar alinhado em relação ao gerenciamento de estado cliente e servidor que guiará a Fase 2. A transição da Context API atual para Redux Toolkit + TanStack Query reduzirá o boilerplate (graças ao `createSlice` + Immer) e resolverá problemas históricos de re-renderização desnecessária e complexidade de cache.

Esta task consiste em um **Spike de 1 dia** com duas entregas:

1. Alinhamento conceitual e prático das convenções em `docs/phase-2/state-conventions.md`.
2. Criação de um mini sandbox interativo (descartável) testando as duas bibliotecas juntas.

---

## Pré-condições

- [ ] Ter lido as regras em [state-conventions.md](../state-conventions.md).
- [ ] Ter a branch `phase-2` atualizada em sua máquina local.

---

## Implementação passo-a-passo

### 1. Reunião de Alinhamento (2 horas)

O time deve se reunir em uma sessão de pair programming liderada pelo `dev1-infra` para abordar:

- Quando usar Redux Toolkit (UI/global client state) vs TanStack Query (Server Cache).
- Estrutura de um slice (`createSlice`), hooks tipados (`useAppSelector`/`useAppDispatch`) e seletores enxutos.
- Chaves de busca estruturadas no TanStack Query.
- Como funcionam as mutations e o fluxo de invalidação/optimistic updates.

### 2. Implementação do Sandbox Local

Na branch `dev1/state-spike`, instale as bibliotecas temporariamente na raiz do monorepo para brincar no shell ou crie uma rota `/sandbox` temporária no `apps/shell`:

#### 2.1. Instalar dependências no shell para o spike

```bash
npm install @reduxjs/toolkit react-redux @tanstack/react-query @tanstack/react-query-devtools -w @bytebank/shell
```

#### 2.2. Exemplo de Slice Redux Toolkit (Counter)

Crie um arquivo temporário `apps/shell/src/app/sandbox/counterSlice.ts`:

```typescript
import { createSlice } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  reducers: {
    increment: (state) => {
      state.count += 1;
    },
    decrement: (state) => {
      state.count -= 1;
    },
  },
});

export const { increment, decrement } = counterSlice.actions;

export const store = configureStore({
  reducer: { counter: counterSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

#### 2.3. Exemplo de Componente Sandbox

Crie `apps/shell/src/app/sandbox/page.tsx` exibindo o contador e uma chamada de API fake via TanStack Query:

```typescript
'use client';

import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, increment, decrement, type RootState, type AppDispatch } from './counterSlice';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function TodoList() {
  const { data: todos, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: () => fetch('https://jsonplaceholder.typicode.com/todos?_limit=5').then(res => res.json()),
  });

  if (isLoading) return <p>Carregando todos...</p>;

  return (
    <ul className="list-disc pl-5 mt-4">
      {todos?.map((todo: any) => (
        <li key={todo.id} className={todo.completed ? 'line-through text-gray-400' : ''}>
          {todo.title}
        </li>
      ))}
    </ul>
  );
}

function CounterUI() {
  const count = useSelector((state: RootState) => state.counter.count);
  const dispatch = useDispatch<AppDispatch>();

  return (
    <div className="p-4 border rounded shadow-md max-w-sm">
      <h2 className="text-xl font-bold mb-2">Contador Redux Toolkit: {count}</h2>
      <div className="flex gap-2">
        <button onClick={() => dispatch(decrement())} className="px-4 py-2 bg-red-500 text-white rounded">-</button>
        <button onClick={() => dispatch(increment())} className="px-4 py-2 bg-blue-500 text-white rounded">+</button>
      </div>
    </div>
  );
}

export default function SandboxPage() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <main className="p-8 flex flex-col gap-6">
          <h1 className="text-3xl font-extrabold">Sandbox Redux Toolkit + TanStack Query</h1>
          <CounterUI />
          <div>
            <h2 className="text-xl font-bold">Dados do Servidor (TanStack Query)</h2>
            <TodoList />
          </div>
        </main>
      </QueryClientProvider>
    </Provider>
  );
}
```

---

## Validação

**Revalidado com Redux Toolkit em 2026-05-30** (Next 16.1.6 + React 19.2.3, shell `@bytebank/shell`). Deps `@reduxjs/toolkit` + `react-redux` instaladas no shell; rota `/sandbox` recriada com o código acima.

- [x] A rota `http://localhost:3000/sandbox` renderiza com sucesso — `next dev` compilou a rota sem erros e respondeu `GET /sandbox 200`.
- [x] O `<Provider store>` + `useSelector` ligam o componente ao slice: o `CounterUI` renderiza o valor do store no SSR (store/seletor corretamente cabeados); `dispatch(increment/decrement)` é o fluxo padrão do react-redux.
- [x] A camada TanStack Query funciona sob o mesmo provider: a seção de dados renderiza o estado `isLoading` ("Carregando todos") e resolve a query no cliente.
- Observação: rota e arquivos do sandbox deletados após a validação (descartável). Deps `@reduxjs/toolkit`/`react-redux` permaneceram no shell (serão usadas pelo `<Provider>` do layout na Task 9).

---

## Gotchas

1. **Provider na raiz**: o `<Provider store={store}>` (react-redux) precisa envolver a árvore antes de qualquer `useSelector`/`useDispatch`, senão o hook lança exceção em runtime.
2. **Hydration Error (SSR vs Client)**: se usar `redux-persist` (que lê do `localStorage`), faça um guard `mounted` no React antes de renderizar propriedades que variam entre servidor e cliente.
3. **Missing query client provider**: Se esquecer de envolver o topo da árvore com `<QueryClientProvider>`, as queries lançam uma exceção no runtime.

---

## Próximo passo

→ **Iniciar o desenvolvimento da persistência real de banco de dados no backend com a [Task 2 — Persistência real](./02-real-persistence.md).**
