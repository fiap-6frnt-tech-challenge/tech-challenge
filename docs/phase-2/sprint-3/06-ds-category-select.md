# Task 06 — DS: `CategorySelect`

|                        |                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md)       |
| **Owner**              | Dev 2 (DS & UI Pages)                                                           |
| **Duração estimada**   | 1 dia                                                                           |
| **Branch recomendada** | `dev2/ds-category-select`                                                       |
| **Depende de**         | Task 03 (tipo `CategoryId` de `@bytebank/shared`)                               |
| **PR só abre**         | Após Task 03 mergeada e Chromatic verde                                         |
| **Status**             | ✅ Implementado (branch `dev2/ds-category-select`) — falta abrir PR + Chromatic |

---

## Status da implementação

Componente criado em `packages/design-system/src/components/CategorySelect/` (`CategorySelect.tsx`, `ICategorySelect.ts`, `index.ts`, `CategorySelect.stories.tsx`) e exportado no barrel `components/index.ts`.

- ✅ Props, comportamento, stories e gotchas abaixo concluídos (ver checklists).
- ✅ Validação local: `vitest --project storybook CategorySelect` → 6/6 verde (inclui a11y/axe); ESLint e `tsc --noEmit` limpos.
- ⬜ Abrir PR + Chromatic verde.

**Ajustes de a11y feitos:** badge "Sugerido" usa `bg-brand-primary` + `text-content-inverse` (~5.8:1) no lugar do token `transfer` (4.35:1, reprova no contraste); sem `aria-activedescendant` (proibido em `role="button"`), seguindo o padrão do `Select` existente.

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

- [x] Combobox single-select com lista das categorias de `CATEGORIES` (importado de `@bytebank/shared`).
- [x] Quando `suggestedCategory` é passado:
  - [x] A opção correspondente aparece no topo da lista com badge **"Sugerido"** (cor accent/DS).
  - [x] Não seleciona automaticamente — o usuário decide.
- [x] Keyboard nav: `↓`/`↑` navega, `Enter` seleciona, `Esc` fecha (+ `Home`/`End`/`Tab` e click-outside).
- [x] Campo obrigatório: exibe `error` abaixo (com `aria-invalid` + `aria-describedby`).

---

## Stories obrigatórias

- [x] `Empty` — sem seleção
- [x] `ComSugestao` — `suggestedCategory="transport"`, badge "Sugerido" visível na opção Transporte
- [x] `Selecionado` — valor pré-selecionado
- [x] `Disabled`
- [x] `ComErro` — com mensagem de erro
- [x] `Interaction: aceitar sugestão` — `userEvent` clica na opção sugerida

---

## Gotchas

1. [x] **Não duplicar a opção sugerida** — resolvido por dedupe explícito: a sugerida é fixada no topo (com badge) e **filtrada** da posição normal, então só aparece uma vez.
2. [x] **`CategoryId` como tipo externo** — as stories importam `CATEGORIES` de `@bytebank/shared` e geram as opções dinamicamente (sem lista hardcoded).
