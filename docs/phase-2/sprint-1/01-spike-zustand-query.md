# Task 1 — Spike: Zustand + TanStack Query

> 🟢 **Status: Implementada** — sandbox em [/sandbox](../../../apps/shell/src/app/sandbox) e onboarding em [state-onboarding.md](./state-onboarding.md).

> 📝 **Ressalva:** a reunião de pair programming (passo 1 abaixo) foi **substituída** por um documento auto-ditata para devs jr: [state-onboarding.md](./state-onboarding.md). O conteúdo cobre os mesmos pontos da agenda original (Zustand vs TanStack Query, seletores, query keys, mutations e optimistic updates) com exemplos e exercícios autoguiados no sandbox.

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

Antes de iniciar a alteração do código produtivo da aplicação, todo o time de desenvolvimento deve estar alinhado em relação ao gerenciamento de estado cliente e servidor que guiará a Fase 2. A transição da Context API atual para Zustand + TanStack Query reduzirá o boilerplate e resolverá problemas históricos de re-renderização desnecessária e complexidade de cache.

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

- Quando usar Zustand (UI State global) vs TanStack Query (Server Cache).
- Importância do uso de seletores no Zustand (`useUIStore(state => state.property)`).
- Chaves de busca estruturadas no TanStack Query.
- Como funcionam as mutations e o fluxo de invalidação/optimistic updates.

### 2. Implementação do Sandbox Local

Na branch `dev1-infra/state-spike`, instale as bibliotecas temporariamente na raiz do monorepo para brincar no shell ou crie uma rota `/sandbox` temporária no `apps/shell`:

#### 2.1. Instalar dependências no shell para o spike

```bash
npm install zustand @tanstack/react-query @tanstack/react-query-devtools -w @bytebank/shell
```

#### 2.2. Exemplo de Store Zustand (Counter)

Crie um arquivo temporário `apps/shell/src/app/sandbox/store.ts`:

```typescript
import { create } from 'zustand';

interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));
```

#### 2.3. Exemplo de Componente Sandbox

Crie `apps/shell/src/app/sandbox/page.tsx` exibindo o contador e uma chamada de API fake via TanStack Query:

```typescript
'use client';

import { useCounterStore } from './store';
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
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);

  return (
    <div className="p-4 border rounded shadow-md max-w-sm">
      <h2 className="text-xl font-bold mb-2">Contador Zustand: {count}</h2>
      <div className="flex gap-2">
        <button onClick={decrement} className="px-4 py-2 bg-red-500 text-white rounded">-</button>
        <button onClick={increment} className="px-4 py-2 bg-blue-500 text-white rounded">+</button>
      </div>
    </div>
  );
}

export default function SandboxPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="p-8 flex flex-col gap-6">
        <h1 className="text-3xl font-extrabold">Sandbox Zustand + TanStack Query</h1>
        <CounterUI />
        <div>
          <h2 className="text-xl font-bold">Dados do Servidor (TanStack Query)</h2>
          <TodoList />
        </div>
      </main>
    </QueryClientProvider>
  );
}
```

---

## Validação

- [x] A rota `http://localhost:3000/sandbox` renderiza com sucesso.
- [x] Interação com o contador incrementa/decrementa o estado sem recarregar a lista.
- [x] A lista de todos carrega e é cacheada corretamente (pode ser validada vendo que não há novo fetch ao remontar o componente rapidamente).
- Observação: rota deletada após validação

---

## Gotchas

1. **Hydration Error (SSR vs Client)**: O Zustand consome dados direto do `localStorage` se usado com `persist` middleware. Lembre-se de fazer um guard `mounted` no React antes de renderizar propriedades que variam entre servidor e cliente.
2. **Missing query client provider**: Se esquecer de envolver o topo da árvore com `<QueryClientProvider>`, as queries lançam uma exceção no runtime.

---

## Próximo passo

→ **Iniciar o desenvolvimento da persistência real de banco de dados no backend com a [Task 2 — Persistência real](./02-real-persistence.md).**
