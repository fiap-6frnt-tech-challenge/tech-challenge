# Task 12 — Integração: Filtros Avançados em `TransactionFilters`

|                        |                                                                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md)                                                                                                                           |
| **Owner**              | Dev 3 (State & Integration)                                                                                                                                                                         |
| **Duração estimada**   | 2 dias                                                                                                                                                                                              |
| **Branch recomendada** | `dev3/integration-filters`                                                                                                                                                                          |
| **Depende de**         | [Task 04 — SearchInput + RangeInput](./04-ds-search-range-inputs.md) · [Task 05 — MultiSelect](./05-ds-multiselect.md) · backend de Task 01 aceitando `q`, `amount_gte`, `amount_lte`, `category[]` |
| **Desbloqueia**        | [Task 13 — Paginação](./13-integration-pagination.md) (filtros devem resetar para a página 1) · [Task 16 — Zod avançado](./16-zod-validation.md) (shape final dos filtros)                          |

---

## Contexto

`TransactionFilters` (agora em `apps/transactions-mfe/src/components/`) já tem filtros básicos (type, dateFrom, dateTo) via `useTransactionFilters`. Esta task adiciona busca textual, range de valor e multi-select de categorias — todos persistidos na URL.

---

## Implementação

### 1. Atualizar `useTransactionFilters` (ou equivalente no MFE)

O hook hoje usa `useRouter`/`useSearchParams` do Next.js — que não existem no Rsbuild MFE. Alternativas:

**Opção A (recomendada):** reimplementar `useTransactionFilters` no MFE usando `window.location.search` + `history.replaceState`:

```ts
// apps/transactions-mfe/src/hooks/useTransactionFilters.ts
import { useCallback, useMemo, useSyncExternalStore } from 'react';

function getSearch() {
  return window.location.search;
}
function subscribeToSearch(cb: () => void) {
  window.addEventListener('popstate', cb);
  return () => window.removeEventListener('popstate', cb);
}

export function useTransactionFilters() {
  const search = useSyncExternalStore(subscribeToSearch, getSearch, () => '');
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const setFilter = useCallback((key: string, value: string | string[] | undefined) => {
    const next = new URLSearchParams(window.location.search);
    next.delete(key);
    if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
    else if (value) next.set(key, value);
    next.set('page', '1'); // reset pagination
    history.replaceState(null, '', `?${next}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  return {
    q: params.get('q') ?? '',
    type: params.get('type') ?? '',
    dateFrom: params.get('dateFrom') ?? '',
    dateTo: params.get('dateTo') ?? '',
    amount_gte: params.get('amount_gte') ? Number(params.get('amount_gte')) : '',
    amount_lte: params.get('amount_lte') ? Number(params.get('amount_lte')) : '',
    category: params.getAll('category'),
    setFilter,
  };
}
```

**Opção B:** expor o shell router via `@bytebank/shared` (mais complexo, só se Opção A travar).

### 2. Atualizar `TransactionFilters`

```tsx
import { SearchInput } from '@bytebank/design-system';
import { RangeInput } from '@bytebank/design-system';
import { MultiSelect } from '@bytebank/design-system';
import { CATEGORIES } from '@bytebank/shared';
import { useTransactionFilters } from '../hooks/useTransactionFilters';

export function TransactionFilters() {
  const { q, amount_gte, amount_lte, category, setFilter } = useTransactionFilters();

  const categoryOptions = CATEGORIES.filter((c) => c.id !== 'other').map((c) => ({
    value: c.id,
    label: c.label,
  }));

  return (
    <div className="flex flex-col gap-sm">
      {/* Busca textual */}
      <SearchInput
        value={q}
        onValueChange={(v) => setFilter('q', v)}
        placeholder="Buscar por descrição..."
        debounceMs={300}
      />

      {/* Filtros existentes: type, dateFrom, dateTo */}
      {/* ... manter como estão ... */}

      {/* Range de valor */}
      <RangeInput
        minValue={amount_gte}
        maxValue={amount_lte}
        onMinChange={(v) => setFilter('amount_gte', v !== '' ? String(v) : undefined)}
        onMaxChange={(v) => setFilter('amount_lte', v !== '' ? String(v) : undefined)}
      />

      {/* Multi-select categorias */}
      <MultiSelect
        options={categoryOptions}
        value={category}
        onChange={(selected) => setFilter('category', selected.length ? selected : undefined)}
        placeholder="Todas as categorias"
        searchable
      />

      {/* Botão limpar */}
      <button
        onClick={() => {
          /* resetar todos os params */
        }}
      >
        Limpar filtros
      </button>
    </div>
  );
}
```

### 3. Limpar todos os filtros

```ts
function clearAll() {
  history.replaceState(null, '', window.location.pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
```

---

## Validação

- [ ] Digitar "uber" no `SearchInput` → após 300ms, lista filtra (Network: `?q=uber`)
- [ ] Definir range R$ 100–500 → lista filtra (`?amount_gte=100&amount_lte=500`)
- [ ] Selecionar "Alimentação" + "Transporte" → lista filtra (`?category=food&category=transport`)
- [ ] "Limpar filtros" reseta todos os params e mostra lista completa
- [ ] Mudar qualquer filtro reseta para página 1

---

## Gotchas

1. **Debounce no hook vs no componente** — o debounce deve ficar dentro do `SearchInput` (DS), não no hook. O hook aplica o valor imediatamente na URL.
2. **`popstate` não dispara com `history.replaceState`** — é necessário `dispatchEvent(new PopStateEvent('popstate'))` manualmente após cada `replaceState`.
3. **Coordenação com a paginação** — `setFilter` já força `page=1` em toda mudança de filtro (exceto na troca de página em si), então a lista sempre volta para a primeira página ao filtrar. Como a `queryKey` do `usePaginatedTransactions` inclui todos os filtros + `page`, o TanStack Query refaz a busca automaticamente — sem código extra.
