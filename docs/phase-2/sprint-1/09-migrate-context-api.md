# Task 9 — Migração: Remover Context API (Transactions + Feedback)

> ⏳ **Status: Pending**

|                        |                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)                                         |
| **Owner**              | `dev5-transactions` (auxiliado por `dev4-dashboard` em pair)                                           |
| **Duração estimada**   | 2.5 dias                                                                                               |
| **Branch recomendada** | `dev5-transactions/migrate-context-api`                                                                |
| **Depende de**         | [Task 7 — Criar stores](./07-packages-stores.md) e [Task 8 — Criar hooks](./08-packages-api-client.md) |
| **PR só abre**         | Após `grep` confirmar a total ausência de useContext para contextos internos                           |

---

## Contexto

Agora que temos as stores Zustand (`@bytebank/stores`) e os hooks de servidor da TanStack Query (`@bytebank/api-client`) prontos, podemos remover os contextos legados que gerenciavam o estado em memória no shell:

- `FeedbackContext.tsx`: Controlava modais de sucesso ou erro.
- `TransactionsContext.tsx`: Carregava, criava e filtrava transações na memória.

Esta task limpará o código morto, removerá os providers redundantes no layout e adaptará todos os componentes que consumiam essas dependências.

---

## Pré-condições

- Estar na branch `dev5-transactions/migrate-context-api`.
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

Remova os imports dos Providers deletados e limpe a árvore de componentes. Ela deve ficar assim (envolvida agora por `QueryClientProvider` e `SessionProvider`):

```typescript
import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@bytebank/api-client'; // Importe do pacote api-client
import '@bytebank/design-system/styles/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <SessionProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

---

### 3. Substituir Consumidores de `FeedbackContext` por `useUIStore`

Em componentes como o modal de mensagens (`FeedbackModal.tsx`):

- **Antes**: `const { feedback, clearFeedback } = useContext(FeedbackContext);`
- **Depois**:

  ```typescript
  import { useUIStore } from '@bytebank/stores';

  const feedback = useUIStore((state) => state.feedback);
  const hideFeedback = useUIStore((state) => state.hideFeedback);
  ```

Substitua também todos os disparadores de alertas (ex: ao criar transação ou falhar no login):

- **Antes**: `showFeedback('Erro', 'Mensagem', 'error');`
- **Depois**:
  ```typescript
  const showFeedback = useUIStore((state) => state.showFeedback);
  // ...
  showFeedback({ type: 'error', title: 'Erro', message: 'Mensagem' });
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

1. **Hydration Warning no NextJS**: Como o Zustand é importado do package e o TanStack Query gerencia o estado no client, evite renderizações parciais condicionadas a variáveis globais logo no primeiro render do Server Component do Next.js. Certifique-se de envolver componentes dinâmicos no cliente.
2. **Prop Drilling de Callbacks**: Com a remoção do context, evite cair no erro de passar o hook de transações por múltiplos níveis de propriedades. Se um componente filho precisa das transações, invoque o hook `useTransactions()` diretamente dentro dele, pois o cache do TanStack Query garante que nenhuma chamada de rede redundante seja feita.

---

## Próximo passo

→ **Adicionar os testes de integração do Vitest, cobrir o Middleware e ajustar o CI na [Task 10 — Testes Vitest & CI](./10-vitest-ci-setup.md).**
