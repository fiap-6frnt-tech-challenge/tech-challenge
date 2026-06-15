# Task 06 — DS: `CategorySelect`

|                        |                                                                           |
| ---------------------- | ------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md) |
| **Owner**              | Dev 2 (DS & UI Pages)                                                     |
| **Duração estimada**   | 1 dia                                                                     |
| **Branch recomendada** | `dev2/ds-category-select`                                                 |
| **Depende de**         | Task 03 (tipo `CategoryId` de `@bytebank/shared`)                         |
| **PR só abre**         | Após Task 03 mergeada e Chromatic verde                                   |

---

## Dependências

- **O que bloqueia esta tarefa:** [Task 03](./03-shared-categories-suggest.md) — precisa do tipo `CategoryId` e da lista `CATEGORIES`.
- **O que esta tarefa desbloqueia:** [Task 14 — Integração CategorySelect no form](./14-integration-category-form.md).

---

## Props

```ts
import type { CategoryId } from '@bytebank/shared';

interface ICategorySelect {
  value: CategoryId | '';
  onChange: (value: CategoryId) => void;
  suggestedCategory?: CategoryId | null;
  disabled?: boolean;
  error?: string;
}
```

---

## Comportamento

- Combobox single-select com lista das categorias de `CATEGORIES` (importado de `@bytebank/shared`).
- Quando `suggestedCategory` é passado:
  - A opção correspondente aparece no topo da lista com badge **"Sugerido"** (cor accent/DS).
  - Não seleciona automaticamente — o usuário decide.
- Keyboard nav: `↓`/`↑` navega, `Enter` seleciona, `Esc` fecha.
- Campo obrigatório: exibe `error` abaixo se `value === ''` e o form foi submetido.

---

## Stories obrigatórias

- `Empty` — sem seleção
- `ComSugestao` — `suggestedCategory="transport"`, badge "Sugerido" visível na opção Transporte
- `Selecionado` — valor pré-selecionado
- `Disabled`
- `ComErro` — com mensagem de erro
- `Interaction: aceitar sugestão` — `userEvent` clica na opção sugerida

---

## Gotchas

1. **Não duplicar a opção sugerida** — a opção sugerida aparece no topo E na posição normal da lista. Deixar claro visualmente qual está em evidência, mas garantir que a lista não duplica a opção (ou deduplique explicitamente).
2. **`CategoryId` como tipo externo** — ao escrever a story, importar `CATEGORIES` de `@bytebank/shared` para gerar as opções dinamicamente, evitando lista hardcoded no DS.
