# Task 10 — Mover features de transação para o MFE + Shell wiring

|                        |                                                                                                                                                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md)                                                                                                                                                                                            |
| **Owner**              | Dev 3 (State & Integration)                                                                                                                                                                                                                                          |
| **Duração estimada**   | 1.5 dias                                                                                                                                                                                                                                                             |
| **Branch recomendada** | `dev3/move-features-shell-wiring`                                                                                                                                                                                                                                    |
| **Depende de**         | [Task 09 — Criar transactions-mfe](./09-create-transactions-mfe.md) (MFE precisa existir antes do `git mv`)                                                                                                                                                          |
| **Desbloqueia**        | [Task 12 — Integração Filtros](./12-integration-filters.md) · [Task 13 — Paginação](./13-integration-pagination.md) · [Task 14 — CategorySelect no Form](./14-integration-category-form.md) · [Task 15 — FileUpload nos Forms](./15-integration-attachments-form.md) |

---

## Contexto

Todos os componentes de transação vivem hoje em `apps/shell/src/components/features/`. Esta task os move para o MFE e faz o shell consumir `./TransactionsPage` em `/transactions` e `./AccountOverview` na home via Module Federation — eliminando o acoplamento build-time.

---

## Implementação

### 1. `git mv` dos componentes

```bash
git mv apps/shell/src/components/features/TransactionFilters   apps/transactions-mfe/src/components/
git mv apps/shell/src/components/features/TransactionList      apps/transactions-mfe/src/components/
git mv apps/shell/src/components/features/TransactionItem      apps/transactions-mfe/src/components/
git mv apps/shell/src/components/features/TransactionForm      apps/transactions-mfe/src/components/
git mv apps/shell/src/components/features/TransactionInfo      apps/transactions-mfe/src/components/
git mv apps/shell/src/components/features/EditTransactionModal apps/transactions-mfe/src/components/
git mv apps/shell/src/components/features/DeleteTransactionModal apps/transactions-mfe/src/components/
git mv apps/shell/src/components/features/NewTransactionModal  apps/transactions-mfe/src/components/
git mv apps/shell/src/components/features/ConfirmTransactionModal apps/transactions-mfe/src/components/
git mv apps/shell/src/components/features/AccountOverview      apps/transactions-mfe/src/components/
```

### 2. Atualizar imports dentro do MFE

Após o `git mv`, os imports relativos quebram. Ajustar todos os caminhos dentro de `apps/transactions-mfe/src/`.

### 3. `TransactionsPage.tsx` (root do MFE)

Montar a página completa a partir dos componentes movidos. Deve reproduzir o comportamento atual de `apps/shell/src/app/transactions/page.tsx`:

```tsx
'use client';
import { TransactionFilters } from './components/TransactionFilters';
import { TransactionList } from './components/TransactionList';
import { NewTransactionModal } from './components/NewTransactionModal';

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-md">
      <TransactionFilters />
      <TransactionList />
      <NewTransactionModal />
    </div>
  );
}
```

### 4. Shell: `/transactions` consome o MFE

`apps/shell/src/app/transactions/page.tsx`:

```tsx
import dynamic from 'next/dynamic';

const TransactionsRemote = dynamic(() => import('transactions/TransactionsPage'), {
  ssr: false,
  loading: () => <TransactionsSkeleton />,
});

export default function TransactionsPage() {
  return <TransactionsRemote />;
}
```

`apps/shell/src/components/TransactionsSkeleton.tsx`: skeleton leve (ex: linhas cinzas de placeholder).

### 5. Shell: home (`/`) consome `AccountOverview` do MFE

O `AccountOverview` hoje está no shell e será removido por este `git mv`. O shell passa a carregá-lo via federação:

```tsx
// apps/shell/src/components/AccountOverviewRemote.tsx
'use client';
import dynamic from 'next/dynamic';
const AccountOverview = dynamic(() => import('transactions/AccountOverview'), { ssr: false });
export function AccountOverviewRemote() {
  return <AccountOverview />;
}
```

Substituir o import direto de `AccountOverview` na home pelo `AccountOverviewRemote`.

### 6. Limpar shell

- Remover `apps/shell/src/components/features/index.ts` se reexportava os componentes movidos.
- Remover re-exports quebrados.
- `useTransactionFilters` pode permanecer em `apps/shell/src/hooks/` por enquanto ou mover para o MFE — mover é ideal, mas só se não quebrar o shell.

---

## Validação

- [ ] `localhost:3000/transactions` carrega via Module Federation (Network mostra `remoteEntry.js` do `:3003`)
- [ ] `localhost:3000` (home) carrega `AccountOverview` do MFE federado
- [ ] `npm run build -w @bytebank/shell` sem erros (sem imports quebrados)
- [ ] `npm run build -w @bytebank/transactions-mfe` sem erros

---

## Gotchas

1. **`BalanceCard`** — permanece no shell (não é componente de transação, é de resumo financeiro da home). Não mover.
2. **`useTransactionFilters`** — o hook lê/escreve `useRouter`/`useSearchParams` do Next.js. Dentro do MFE (Rsbuild), `next/navigation` não existe. O MFE deve usar seu próprio router (via `@bytebank/shared` ou reimplementar com `window.history`). Ver alias de `next/navigation` → false se necessário (memória `ds-barrel-pulls-next-in-mfe`).
3. **`NewTransactionModal` acessível da home** — após a mudança, o botão "Nova transação" da home chama o modal que agora está no MFE. O `AccountOverview` federado lida com isso internamente.
