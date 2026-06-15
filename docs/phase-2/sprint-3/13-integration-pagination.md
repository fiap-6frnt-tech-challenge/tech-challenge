# Task 13 — Integração: Paginação na lista de transações do MFE

|                        |                                                                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md)                                                                                                                                                          |
| **Owner**              | Dev 3 (State & Integration)                                                                                                                                                                                                        |
| **Duração estimada**   | 1 dia                                                                                                                                                                                                                              |
| **Branch recomendada** | `dev3/integration-pagination`                                                                                                                                                                                                      |
| **Depende de**         | [Task 01 — Paginação + Filtros](./01-backend-pagination-filters.md) · [Task 11 — Hook `usePaginatedTransactions`](./11-hook-paginated-transactions.md) · [Task 12 — Filtros](./12-integration-filters.md) (page reseta ao filtrar) |
| **Desbloqueia**        | — (funcionalidade autônoma; unblocks [Task 18 — Testes](./18-tests.md))                                                                                                                                                            |

---

## Contexto

Cabear a **paginação** na `TransactionList` dentro do `transactions-mfe`, reusando o componente `<Pagination>` do Design System (já existe em `packages/design-system/src/components/Pagination`) e o hook `usePaginatedTransactions`. A página atual vive na URL (`?page=N`), assim como já acontece hoje no shell ([apps/shell/src/app/transactions/page.tsx](../../../apps/shell/src/app/transactions/page.tsx)).

**Por que paginação e não scroll infinito:** previsível para grandes volumes (carrega só a página atual), deep-linkável e compatível com SSR, e — relevante para a nota — totalmente acessível por teclado/leitor de tela via os controles do `<Pagination>`. Racional completo em [sprint-3-transactions.md](../sprint-3-transactions.md#paginação-vs-scroll-infinito).

Esta task é majoritariamente **portar** o padrão que já funciona no shell para dentro do MFE, agora alimentado pelos filtros avançados da Task 12.

---

## Implementação

### 1. `TransactionList` no MFE consumindo o hook paginado

```tsx
// apps/transactions-mfe/src/components/TransactionList.tsx
import { usePaginatedTransactions } from '@bytebank/api-client';
import { Pagination, SkeletonList, EmptyState, ErrorState } from '@bytebank/design-system';
import { useTransactionFilters } from '../hooks/useTransactionFilters';
import { TransactionItem } from './TransactionItem';

export function TransactionList() {
  const { page, setFilter, q, type, dateFrom, dateTo, amount_gte, amount_lte, category } =
    useTransactionFilters();

  const { data, isLoading, isError, isPlaceholderData } = usePaginatedTransactions({
    page,
    q: q || undefined,
    type: type || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    amount_gte: amount_gte !== '' ? amount_gte : undefined,
    amount_lte: amount_lte !== '' ? amount_lte : undefined,
    category: category.length ? category : undefined,
  });

  if (isError) return <ErrorState />;
  if (isLoading) return <SkeletonList lines={5} />;

  const transactions = data?.data ?? [];
  const totalPages = Math.max(1, data?.pages ?? 1);

  if (transactions.length === 0) return <EmptyState title="Nenhuma transação encontrada" />;

  return (
    <div aria-busy={isPlaceholderData}>
      <ul className="flex flex-col">
        {transactions.map((tx) => (
          <TransactionItem key={tx.id} transaction={tx} />
        ))}
      </ul>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => {
          setFilter('page', String(p));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
```

### 2. `page` na URL via `useTransactionFilters`

O hook de filtros do MFy (Task 12) já lê `page` da URL e expõe `setFilter('page', ...)`. **Regra-chave:** qualquer mudança de filtro reseta `page` para `1` — isso já está implementado no `setFilter` da Task 12 (`next.set('page', '1')`). Trocar de página **não** mexe nos outros filtros.

### 3. `<Pagination>` permanece o componente do DS

Nada é deletado nem reescrito no Design System — apenas consumimos `<Pagination>` como no shell. Se a UX pedir, o DS pode ganhar um seletor de "itens por página" depois (fora do escopo desta task).

---

## Acessibilidade (item de nota)

- [ ] Controles de página são `<button>` navegáveis por `Tab`/`Enter`/`Espaço`
- [ ] A página atual expõe `aria-current="page"` (verificar/garantir no componente `<Pagination>`)
- [ ] `nav` de paginação tem `aria-label="Paginação de transações"`
- [ ] Botões "anterior/próxima" desabilitados têm `aria-disabled` e não recebem foco-armadilha
- [ ] Ao trocar de página, mover foco para o topo da lista (ou `scrollTo`) evita desorientação

> Se faltar `aria-current`/`aria-label` no `<Pagination>` atual, abrir um PR pequeno no DS (coordenar com Dev 2) — conta como melhoria de a11y na nota.

---

## Validação

- [ ] `/transactions` lista a página 1 e mostra controles de paginação quando `pages > 1`
- [ ] Clicar "próxima" carrega a página seguinte (Network: `?_page=2`); URL vira `?page=2`
- [ ] Recarregar (F5) em `?page=2` mantém a página 2 (estado na URL)
- [ ] Mudar qualquer filtro reseta para a página 1 e recalcula o total de páginas
- [ ] Durante a troca de página, a lista anterior fica visível (sem flash de skeleton) graças ao `placeholderData`
- [ ] Funciona em mobile (375px) e desktop; controles acessíveis por teclado

---

## Gotchas

1. **`page` fora do range após filtrar:** se o usuário está na página 5 e aplica um filtro que reduz para 2 páginas, o reset para `page=1` no `setFilter` evita "página vazia". Confirme que todo `setFilter` (menos o de `page`) reseta a página.
2. **`placeholderData` + `isPlaceholderData`:** use `isPlaceholderData` para `aria-busy`/opacidade enquanto a nova página chega — feedback sem remover a lista.
3. **`totalPages` mínimo 1:** `Math.max(1, data?.pages ?? 1)` evita `<Pagination>` com 0 páginas durante o loading inicial.
4. **MFE não tem `next/navigation`:** a leitura/escrita de `page` na URL usa o `useTransactionFilters` reimplementado no MFE (Task 12, `window.location` + `history.replaceState`), não o router do Next.
