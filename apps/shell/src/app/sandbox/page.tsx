'use client';

import { useQuery } from '@tanstack/react-query';
import { useCounterStore } from './store';
import { SandboxProviders } from './providers';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

function TodoList() {
  const {
    data: todos,
    isLoading,
    isError,
    isFetching,
  } = useQuery<Todo[]>({
    queryKey: ['sandbox', 'todos'],
    queryFn: () =>
      fetch('https://jsonplaceholder.typicode.com/todos?_limit=5').then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar todos');
        return res.json();
      }),
  });

  if (isLoading) return <p className="text-content-secondary">Carregando todos…</p>;
  if (isError) return <p className="text-red-600">Erro ao carregar a lista.</p>;

  return (
    <div className="flex flex-col gap-sm">
      <p className="text-xs text-content-secondary">
        {isFetching ? 'Atualizando do servidor…' : 'Servido do cache do TanStack Query.'}
      </p>
      <ul className="list-disc pl-5 flex flex-col gap-xs">
        {todos?.map((todo) => (
          <li key={todo.id} className={todo.completed ? 'line-through text-content-secondary' : ''}>
            {todo.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CounterUI() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);
  const reset = useCounterStore((state) => state.reset);

  return (
    <section
      aria-labelledby="counter-heading"
      className="p-lg border border-border rounded-lg shadow-sm bg-white max-w-md"
    >
      <h2 id="counter-heading" className="text-xl font-bold mb-md">
        Contador Zustand: <span data-testid="counter-value">{count}</span>
      </h2>
      <div className="flex gap-sm">
        <button
          type="button"
          onClick={decrement}
          className="px-md py-sm bg-red-500 text-white rounded font-medium hover:bg-red-600"
          aria-label="Decrementar contador"
        >
          −
        </button>
        <button
          type="button"
          onClick={increment}
          className="px-md py-sm bg-blue-500 text-white rounded font-medium hover:bg-blue-600"
          aria-label="Incrementar contador"
        >
          +
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-md py-sm bg-gray-200 text-gray-800 rounded font-medium hover:bg-gray-300"
          aria-label="Resetar contador"
        >
          Reset
        </button>
      </div>
      <p className="text-xs text-content-secondary mt-md">
        O contador vive em uma store Zustand. Aumentar o número não dispara fetch da lista abaixo.
      </p>
    </section>
  );
}

export default function SandboxPage() {
  return (
    <SandboxProviders>
      <main className="p-xl flex flex-col gap-xl max-w-3xl">
        <header className="flex flex-col gap-sm">
          <h1 className="text-3xl font-extrabold">Sandbox · Zustand + TanStack Query</h1>
          <p className="text-content-secondary">
            Spike da{' '}
            <a href="/docs/phase-2/sprint-1/01-spike-zustand-query.md" className="underline">
              Task 1 da Sprint 1
            </a>
            . Brinque à vontade — esta rota é descartável.
          </p>
        </header>

        <CounterUI />

        <section
          aria-labelledby="todos-heading"
          className="p-lg border border-border rounded-lg shadow-sm bg-white"
        >
          <h2 id="todos-heading" className="text-xl font-bold mb-md">
            Lista de Todos (TanStack Query)
          </h2>
          <TodoList />
        </section>

        <aside className="text-sm text-content-secondary">
          <p className="font-semibold">Tente:</p>
          <ul className="list-disc pl-5 mt-xs flex flex-col gap-xs">
            <li>Clicar várias vezes em &quot;+&quot; — a lista não refaz fetch.</li>
            <li>Abrir o React DevTools e ver que só o contador re-renderiza.</li>
            <li>Abrir o painel do TanStack Query no canto inferior direito.</li>
          </ul>
        </aside>
      </main>
    </SandboxProviders>
  );
}
