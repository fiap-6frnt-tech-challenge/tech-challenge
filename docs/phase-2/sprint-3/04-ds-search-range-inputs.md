# Task 04 — DS: `SearchInput` + `RangeInput`

|                        |                                                                           |
| ---------------------- | ------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md) |
| **Owner**              | Dev 2 (DS & UI Pages)                                                     |
| **Duração estimada**   | 1 dia (0.5d cada)                                                         |
| **Branch recomendada** | `dev2/ds-search-range-inputs`                                             |
| **Depende de**         | — (pode iniciar no dia 1)                                                 |
| **PR só abre**         | Após Chromatic não reportar regressões visuais                            |

---

## Dependências

- **O que bloqueia esta tarefa:** Nada.
- **O que esta tarefa desbloqueia:** [Task 12 — Integração Filtros](./12-integration-filters.md).

---

## `SearchInput`

### Props

```ts
interface ISearchInput {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number; // default 300
  disabled?: boolean;
}
```

### Comportamento

- Ícone de lupa (`🔍`) à esquerda, fixo.
- Botão X (clear) à direita, visível apenas quando `value !== ''`.
- Debounce interno: `onValueChange` só dispara após `debounceMs` de inatividade.
- Ao limpar, foco retorna ao input.
- Anuncia resultados externamente: o **consumidor** adiciona `aria-live="polite"` na área de resultados. O componente em si expõe `aria-label` e `role="searchbox"`.

### Stories obrigatórias

- `Empty` — valor vazio, placeholder visível
- `Filled` — com valor, botão X visível
- `Disabled`
- `Interaction: digitar e limpar` (via `userEvent` do Storybook)

---

## `RangeInput`

### Props

```ts
interface IRangeInput {
  minValue: number | '';
  maxValue: number | '';
  onMinChange: (v: number | '') => void;
  onMaxChange: (v: number | '') => void;
  currency?: string; // default 'BRL'
  error?: string; // mensagem quando min > max
}
```

### Comportamento

- Dois inputs numéricos (reutilizar `CurrencyInput` do DS se existir, ou input `type="number"` com formatação).
- Labels visuais "De" e "Até".
- Validação client-side: se `minValue > maxValue`, exibir `error` em `role="alert"`.
- Não bloqueia a digitação — erro é informativo, não impede o onChange.

### Stories obrigatórias

- `Empty`
- `Filled` — ambos preenchidos
- `InvalidRange` — min > max, erro visível

---

## Convenções DS

- Tokens de cor/espaçamento de `@bytebank/design-system` (sem valores hard-coded).
- `aria-label` em todos os inputs.
- Acessível por teclado: Tab navega entre os campos; Enter no X do SearchInput limpa.
