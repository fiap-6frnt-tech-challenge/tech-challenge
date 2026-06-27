# Task 04 — A11y: auditoria Storybook (addon `a11y`, zerar erros)

|                        |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md) |
| **Owner**              | Dev 2 (DS & UI Pages)                                             |
| **Duração estimada**   | 1 dia                                                             |
| **Branch recomendada** | `dev2/a11y-storybook`                                             |
| **Status**             | ⏳ Pendente                                                       |

---

## Dependências

- **O que bloqueia esta tarefa:** **Nada.** Começa no dia 1. O Design System já tem `@storybook/addon-a11y` instalado (ver `packages/design-system/.storybook/main.ts`).
- **O que esta tarefa desbloqueia:** [Task 08 — Lighthouse A11y](./08-a11y-lighthouse.md) (componentes já saneados reduzem o trabalho na app) e [Task 09 — relatório](./09-a11y-report.md). Também alimenta o critério de aceite **"Zero erros A11y no Storybook addon"** da Fase 2.

---

## Contexto

O addon `a11y` roda **axe-core** em cada story. A meta é **zerar violations** (erros) e tratar os warnings relevantes em **todos** os componentes do DS. Como os componentes federados (charts, forms, inputs) são reusados por shell e MFEs, sanear aqui propaga a correção para toda a aplicação.

Inventário relevante do DS (`packages/design-system/src/components`): `Button`, `Input`, `Select`, `Modal`, `FeedbackModal`, `Badge`, `Card`, `Pagination`, `BarChart`, `LineChart`, `PieChart`, `AccessibleChartData`, `SearchInput`, `RangeInput`, `MultiSelect`, `CategorySelect`, `FileUpload`, `AttachmentList`, `LoginForm`, `RegisterForm`, `UserMenu`, `Header`, `Sidebar`, `DatePicker`, `KpiCard`, `DashboardWidget`, etc.

> ℹ️ Já existe o componente **`AccessibleChartData`** — a tabela `sr-only` alternativa aos charts. Esta task garante que ele está **plugado em todos os charts** e exposto nas stories; a Task 08 valida na app real.

---

## Implementação

1. **Configurar o addon como gate** no Storybook (`test.dangerouslyIgnoreUnhandledErrors` desligado; `a11y` em modo de erro):

```ts
// .storybook/preview.ts
export const parameters = {
  a11y: { test: 'error' }, // falha o teste do addon-vitest em violations
};
```

2. **Rodar a varredura** e corrigir por componente:

```bash
npm run storybook                 # inspeção visual: painel Accessibility por story
npx vitest run packages/design-system   # addon-vitest executa axe em cada story
```

3. **Padrões de correção** mais comuns esperados:
   - `Button`/ícone-só: `aria-label` quando não há texto visível.
   - `Input`/`Select`/`SearchInput`: `<Label htmlFor>` associado; `aria-invalid` + `aria-describedby` no erro.
   - `Modal`/`FeedbackModal`: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (focus trap já existe via `useFocusTrap`).
   - `Pagination`: `nav` com `aria-label`, `aria-current="page"` no ativo.
   - Charts (`BarChart`/`LineChart`/`PieChart`): `role="img"` + `aria-label` + `AccessibleChartData` (tabela `sr-only`).
   - Contraste: ajustar tokens de cor que reprovarem no axe (mín. 4.5:1 texto normal, 3:1 large/UI).

4. **Cada correção de contraste/token** que altere visual exige **Chromatic review** aprovado (diretriz de PR).

---

## Validação

- [ ] `npx vitest run packages/design-system` verde com `a11y: { test: 'error' }`.
- [ ] Painel Accessibility de **toda** story: 0 violations.
- [ ] Todos os charts expõem `role="img"` + `aria-label` + `AccessibleChartData` renderizado.
- [ ] Warnings restantes documentados (com justificativa) para a Task 09.

---

## Gotchas

1. **Story sem `args` realistas** pode mascarar violations (ex.: input sem label porque a story não passa `label`). Garanta stories com o uso real.
2. **Contraste em estados hover/disabled** costuma reprovar mesmo quando o estado default passa — cubra os estados nas stories.
3. **`test: 'error'`** transforma violation em falha de CI (via `addon-vitest`) — combine com a Task 12, mas não bloqueie o merge dos outros devs até estabilizar; comece em `'todo'`/`'warn'` se necessário e suba para `'error'` ao fim.
4. **`AccessibleChartData` duplicando leitura:** marque o chart visual como `aria-hidden` quando a tabela `sr-only` já descreve os dados, para o leitor de tela não ler duas vezes.
