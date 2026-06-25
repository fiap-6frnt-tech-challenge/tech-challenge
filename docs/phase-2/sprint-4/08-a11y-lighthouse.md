# Task 08 — A11y: Lighthouse ≥ 95 + correções (skip-link, foco, ARIA, contraste)

|                        |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md) |
| **Owner**              | Dev 2 (DS & UI Pages)                                             |
| **Duração estimada**   | 1.5 dia                                                           |
| **Branch recomendada** | `dev2/a11y-lighthouse`                                            |
| **Status**             | ⏳ Pendente                                                       |

---

## Dependências

- **O que bloqueia esta tarefa:** [Task 04 — A11y Storybook](./04-a11y-storybook.md) (componentes do DS já saneados). Idealmente também [Task 03 — deploy](./03-cloud-deploy-mfes.md) para rodar o Lighthouse em **produção**, mas roda em build local (`npm run start`) enquanto o deploy não fecha.
- **O que esta tarefa desbloqueia:** [Task 09 — relatório a11y-audit.md](./09-a11y-report.md) e o critério de aceite **Lighthouse A11y ≥ 95** da Fase 2.

---

## Contexto

A spec dá nota para **acessibilidade** (navegação por teclado, leitores de tela, contraste). Esta task aplica o checklist WCAG 2.1 AA nas páginas reais (`/`, `/transactions`, `/login`), corrigindo o que o Lighthouse/axe apontar — incluindo gaps que só aparecem na composição (shell + MFEs montados juntos), não nas stories isoladas.

> ⚠️ **Atenção MFE:** os MFEs **não** podem usar `next/navigation`/`next/image`/`next/link` (são aliasados para `false` no rsbuild). O foco em a11y deve usar APIs nativas/DS, sem depender de Next.

---

## Implementação

### Checklist WCAG 2.1 AA

- [ ] **Skip link** no shell (`app/layout.tsx`): "Pular para o conteúdo principal" → `#main`, visível ao foco.
- [ ] **Foco visível** em todo elemento interativo (sem `outline: none` sem alternativa de `:focus-visible`).
- [ ] **Charts** (`BarChart`/`LineChart`/`PieChart`): `role="img"` + `aria-label` descritivo + `AccessibleChartData` (tabela `sr-only`) plugada; chart visual `aria-hidden` quando a tabela cobre os dados.
- [ ] **Modais:** focus trap (já via `useFocusTrap`), Escape fecha, `aria-modal="true"`, `aria-labelledby`.
- [ ] **Forms:** `<label htmlFor>` associada, erros com `role="alert"` / `aria-describedby`, `aria-invalid`.
- [ ] **Paginação:** `nav`/`role="navigation"` com `aria-label`, `aria-current="page"` no ativo, `aria-busy` durante troca de página, operável por teclado.
- [ ] **Contraste:** validar pares fg/bg do DS (mín. 4.5:1 texto, 3:1 UI/large).
- [ ] **Navegação por teclado E2E:** percorrer `/`, `/transactions`, `/login` só com Tab/Enter/Esc; ordem de foco lógica; sem armadilha de foco fora de modal.
- [ ] Lembrete do projeto: **nunca** `robots: noindex` (Lighthouse SEO penaliza, inclusive em rotas autenticadas).

### Execução do Lighthouse

```bash
npm run build && npm run start -w @bytebank/shell   # ou a URL de produção
npx lighthouse http://localhost:3000/ --only-categories=accessibility --view
npx lighthouse http://localhost:3000/transactions --only-categories=accessibility --view
npx lighthouse http://localhost:3000/login --only-categories=accessibility --view
```

---

## Validação (critério de aceite da Fase 2)

- [ ] Lighthouse Accessibility ≥ 95 em `/`, `/transactions`, `/login`.
- [ ] Skip link funciona por teclado.
- [ ] App inteiro navegável só com teclado (Tab/Enter/Esc), foco sempre visível.
- [ ] Leitor de tela (NVDA/VoiceOver) anuncia charts via tabela alternativa e erros de form via `role="alert"`.

---

## Gotchas

1. **`/transactions` é federado** — o conteúdo vem do `transactions-mfe`. Rode o Lighthouse com o MFE de pé (local ou deploy), senão a página mede um skeleton.
2. **Contraste de tokens** pode exigir mudança visual → **Chromatic review** (diretriz de PR) e re-sync com a Task 04.
3. **`aria-busy` na paginação** durante a troca de página evita o leitor anunciar a lista "vazia" no intervalo.
4. **Skip link "some" se mal posicionado** — ele precisa ser o **primeiro** elemento focável e ficar `sr-only` até receber foco.
5. **Login pré-hidratação:** garantir que o botão tem nome acessível mesmo antes da hidratação (não depender de JS para o `aria-label`).
