# Task 05 — DS: `MultiSelect`

|                        |                                                                           |
| ---------------------- | ------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md) |
| **Owner**              | Dev 2 (DS & UI Pages)                                                     |
| **Duração estimada**   | 1.5 dias                                                                  |
| **Branch recomendada** | `dev2/ds-multiselect`                                                     |
| **Depende de**         | — (pode iniciar no dia 1)                                                 |
| **PR só abre**         | Após Chromatic + interações de keyboard funcionando                       |

---

## Dependências

- **O que bloqueia esta tarefa:** Nada.
- **O que esta tarefa desbloqueia:** [Task 12 — Integração Filtros](./12-integration-filters.md).

---

## Props

```ts
interface IMultiSelect<T extends string = string> {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (selected: T[]) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  error?: string;
}
```

---

## Comportamento

### Controle

- Componente controlado: `value` é a fonte de verdade; `onChange` notifica mudanças.
- Cada opção pode ser selecionada ou desmarcada; a ordem de seleção é preservada.

### Visual

- **Input area:** mostra pills dos itens selecionados + input de busca (quando `searchable`).
- **Pills:** cada item selecionado tem um `×` para remover individualmente; tokens DS para cor/borda.
- **Dropdown:** abre abaixo do input, lista opções filtradas (se searchable) com checkmark nos selecionados.
- **Botão "Limpar tudo"** aparece quando `value.length > 0`, dentro do dropdown.

### Keyboard navigation

| Tecla         | Ação                                    |
| ------------- | --------------------------------------- |
| `↓` / `↑`     | Navega entre opções                     |
| `Enter` / ` ` | Seleciona/deseleciona opção focada      |
| `Backspace`   | Remove o último pill quando input vazio |
| `Esc`         | Fecha o dropdown, foco volta ao trigger |
| `Tab`         | Fecha o dropdown e move foco para fora  |

### A11y

- `role="combobox"` no input; `role="listbox"` no dropdown; `role="option"` em cada item.
- `aria-multiselectable="true"` no listbox.
- `aria-selected` em cada opção.
- `aria-expanded` no combobox.

---

## Stories obrigatórias

- `Empty` — sem seleção
- `OneSelected` — 1 pill
- `ManySelected` — 3+ pills
- `Searchable` — filtra opções ao digitar
- `Disabled`
- `WithError`
- `Interaction: selecionar e remover via teclado` (Story interaction com `userEvent`)

---

## Gotchas

1. **Fechar ao clicar fora** — usar `useEffect` com `mousedown` no `document` ou `onBlur` + `relatedTarget` para detectar clique fora sem fechar ao clicar dentro do dropdown.
2. **`Backspace` no input** — só remove pill quando `inputValue === ''`, para não interferir com a edição de texto.
3. **Performance em listas grandes** — virtualizar o dropdown se `options.length > 100` (fora do escopo desta sprint, mas deixar uma nota no componente).
