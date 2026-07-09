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

> **Status: ✅ Implementado e verificado no browser** (login → `/transactions`, 52 transações / 6 páginas). A paginação já vinha cabeada na página do MFE; faltavam o feedback de `isPlaceholderData` e o scroll-to-top, agora concluídos.
>
> Arquivos alterados:
>
> - [apps/transactions-mfe/src/TransactionsPage.tsx](../../../apps/transactions-mfe/src/TransactionsPage.tsx) — consome `isPlaceholderData`; `handlePageChange` rola a lista ao topo via `listRef`.
> - [apps/transactions-mfe/src/components/TransactionList/TransactionList.tsx](../../../apps/transactions-mfe/src/components/TransactionList/TransactionList.tsx) — `aria-busy={isPlaceholderData}` + opacidade reduzida na lista; aceita `containerRef`.
> - [apps/transactions-mfe/src/components/TransactionList/ITransactionList.ts](../../../apps/transactions-mfe/src/components/TransactionList/ITransactionList.ts) — novas props `isPlaceholderData` e `containerRef`.
> - [apps/transactions-mfe/src/hooks/useTransactionFilters.ts](../../../apps/transactions-mfe/src/hooks/useTransactionFilters.ts) — **fix:** `hasActiveFilters` passou a derivar de `buildFilterParams(filters)` (que exclui `page`), em vez de "qualquer query string". Antes, recarregar em `?page=2` abria o painel de filtros sozinho.
>
> Já existente (sem alteração): `usePaginatedTransactions` (`placeholderData`) e o `<Pagination>` do DS (a11y completa).

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

- [x] Controles de página são `<button>` navegáveis por `Tab`/`Enter`/`Espaço`
- [x] A página atual expõe `aria-current="page"` (já garantido no componente `<Pagination>` do DS)
- [x] `nav` de paginação tem `aria-label` — o DS usa o rótulo genérico `"Paginação"` (landmark rotulado). Mantido genérico de propósito por ser componente reutilizado também pelo shell.
- [x] Botões "anterior/próxima" desabilitados — o DS usa o atributo nativo `disabled` (removidos da ordem de tabulação → sem foco-armadilha e anunciados como desabilitados pelo leitor de tela)
- [x] Ao trocar de página, a lista rola para o topo (`listRef.current?.scrollTo`) — o `<TransactionList>` do MFE é seu próprio container de scroll (`overflow-y-auto`), então `window.scrollTo` não serviria; rolamos o container via `containerRef`

> O `<Pagination>` do DS já tinha `aria-current`/`aria-label`/`disabled`, então nenhum PR no DS foi necessário.

---

## Validação

> ✅ Verificado no browser (shell :3000 + transactions-mfe :3003, seed com 52 transações → 6 páginas).

- [x] `/transactions` lista a página 1 e mostra controles de paginação quando `pages > 1` (DS `<Pagination>` retorna `null` quando `totalPages <= 1`; observados botões `1..6` + prev/next)
- [x] Clicar "próxima" carrega a página seguinte; URL vira `?page=2` e o conteúdo muda (`setPage` via `history.replaceState` no `useTransactionFilters`)
- [x] Recarregar (F5) em `?page=2` mantém a página 2 (`aria-current=2` após reload)
- [x] Mudar qualquer filtro reseta para a página 1 (busca em `?page=3` → URL vira `?q=a`, `aria-current=1`)
- [x] Durante a troca de página, a lista anterior fica visível (sem flash de skeleton) graças ao `placeholderData` — `aria-busy="true"` observado na transição + opacidade reduzida (`opacity-60`)
- [x] Funciona em mobile (375px) e desktop; controles acessíveis por teclado (prev desabilitado na página 1)
- [x] **(regressão corrigida)** Recarregar em página > 1 **sem** filtros mantém o painel de filtros oculto; só abre quando há filtro real na URL

---

## Gotchas

1. **`page` fora do range após filtrar:** se o usuário está na página 5 e aplica um filtro que reduz para 2 páginas, o reset para `page=1` no `setFilter` evita "página vazia". Confirme que todo `setFilter` (menos o de `page`) reseta a página.
2. **`placeholderData` + `isPlaceholderData`:** use `isPlaceholderData` para `aria-busy`/opacidade enquanto a nova página chega — feedback sem remover a lista.
3. **`totalPages` mínimo 1:** `Math.max(1, data?.pages ?? 1)` evita `<Pagination>` com 0 páginas durante o loading inicial.
4. **MFE não tem `next/navigation`:** a leitura/escrita de `page` na URL usa o `useTransactionFilters` reimplementado no MFE (Task 12, `window.location` + `history.replaceState`), não o router do Next.
