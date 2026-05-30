# Task 9 — Migração: Remover Context API (Transactions + Feedback)

> ⏳ **Status: Pending**

|                        |                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)                                         |
| **Owner**              | `Dev 3`                                                                                                |
| **Duração estimada**   | 2.5 dias                                                                                               |
| **Branch recomendada** | `dev3/migrate-context-api`                                                                             |
| **Depende de**         | [Task 7 — Criar stores](./07-packages-stores.md) e [Task 8 — Criar hooks](./08-packages-api-client.md) |
| **PR só abre**         | Após `grep` confirmar a total ausência de useContext para contextos internos                           |

---

## Dependências

- **O que bloqueia esta tarefa**: Bloqueada em conjunto pelas tarefas **Task 7 (Slices Redux Toolkit)** e **Task 8 (Query Hooks)**. Como vamos remover os arquivos de context que proviam dados e feedbacks, é necessário que tenhamos os slices Redux e os custom hooks prontos para substituirmos todas as chamadas.
- **O que esta tarefa desbloqueia**: Desbloqueia a **Task 11 (Smoke Test Final)**, pois ela representa a consolidação da migração do estado na UI da aplicação e unifica o funcionamento do front-end.

---

## Pré-condições

- Estar na branch `dev3/migrate-context-api`.
- Garantir que as tarefas 7 e 8 foram concluídas e mergeadas na branch de integração `phase-2` (ou traga o rebase delas para a sua branch).

---

## Implementação passo-a-passo

### 1. Remover Arquivos Físicos de Contexto

Delete os arquivos e referências físicas:

```bash
# Navegar até a pasta de contextos no shell
cd apps/shell/src/context
rm FeedbackContext.tsx TransactionsContext.tsx index.ts
```

---

### 2. Atualizar o Layout Principal do Shell (`apps/shell/src/app/layout.tsx`)

Remova os imports dos Providers deletados e limpe a árvore de componentes. Ela deve ficar envolvida agora por **três** providers: `<Provider store>` (Redux), `SessionProvider` (NextAuth) e `QueryClientProvider` (TanStack Query).

> ⚠️ **Os três são Client Components.** No App Router do Next, providers com contexto não podem ser instanciados direto num Server Component (e o `queryClient`/`store` não são serializáveis). Crie um wrapper `'use client'` e use-o no `layout.tsx`.

`apps/shell/src/app/providers.tsx`:

```typescript
'use client';

import { Provider } from 'react-redux';
import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '@bytebank/stores';
import { queryClient } from '@bytebank/api-client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SessionProvider>
    </Provider>
  );
}
```

`apps/shell/src/app/layout.tsx` (Server Component) apenas consome o wrapper:

```typescript
import { Providers } from './providers';
import '@bytebank/design-system/styles/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

> Sem o `<Provider store>` envolvendo a árvore, qualquer `useAppSelector`/`useAppDispatch` (seção 3) lança erro em runtime ("could not find react-redux context").

---

### 3. Substituir Consumidores de `FeedbackContext` pelo `uiSlice` (Redux)

Em componentes como o modal de mensagens (`FeedbackModal.tsx`):

- **Antes**: `const { feedback, clearFeedback } = useContext(FeedbackContext);`
- **Depois**:

  ```typescript
  import { useAppSelector, useAppDispatch, hideFeedback } from '@bytebank/stores';

  const feedback = useAppSelector((state) => state.ui.feedback);
  const dispatch = useAppDispatch();
  // dispatch(hideFeedback()) para fechar
  ```

Substitua também todos os disparadores de alertas (ex: ao criar transação ou falhar no login):

- **Antes**: `showFeedback('Erro', 'Mensagem', 'error');`
- **Depois**:

  ```typescript
  import { useAppDispatch, showFeedback } from '@bytebank/stores';

  const dispatch = useAppDispatch();
  // ...
  dispatch(showFeedback({ type: 'error', title: 'Erro', message: 'Mensagem' }));
  ```

---

### 4. Substituir Consumidores de `TransactionsContext` por `@bytebank/api-client`

Em locais como a listagem de transações (`apps/shell/src/app/transactions/page.tsx`) e nos componentes de saldo/extrato:

- **Antes**: `const { transactions, loading, addTransaction } = useContext(TransactionsContext);`
- **Depois**:

  ```typescript
  import { useTransactions, useCreateTransaction } from '@bytebank/api-client';

  const { data: transactions, isLoading } = useTransactions();
  const { mutate: createTransaction, isPending } = useCreateTransaction();
  ```

Lembre-se de tratar os estados de `isLoading` de forma acessível e visualmente limpa utilizando skeletons do DS.

---

## Validação

- [ ] Execute uma busca global no projeto no terminal para garantir que nenhum arquivo de código-fonte está importando Contexts deletados:
  ```bash
  grep -rn "TransactionsContext" apps/shell/src/
  ```
  O resultado do comando deve ser inteiramente vazio.
- [ ] O monorepo compila de forma limpa: `npm run build`.
- [ ] Abra a aplicação no navegador, crie uma transação, veja se ela entra na lista de extrato automaticamente (validando o cache do TanStack Query) e confirme que os feedbacks visuais de sucesso continuam aparecendo na tela.

---

## Gotchas

1. **Hydration Warning no NextJS**: Como o store Redux é provido no client (`<Provider>`) e o TanStack Query gerencia o estado no client, evite renderizações parciais condicionadas a variáveis globais logo no primeiro render do Server Component do Next.js. Certifique-se de envolver componentes dinâmicos no cliente.
2. **Prop Drilling de Callbacks**: Com a remoção do context, evite cair no erro de passar o hook de transações por múltiplos níveis de propriedades. Se um componente filho precisa das transações, invoque o hook `useTransactions()` diretamente dentro dele, pois o cache do TanStack Query garante que nenhuma chamada de rede redundante seja feita.

---

## Próximo passo

→ **Adicionar os testes de integração do Vitest, cobrir o Middleware e ajustar o CI na [Task 10 — Testes Vitest & CI](./10-vitest-ci-setup.md).**
