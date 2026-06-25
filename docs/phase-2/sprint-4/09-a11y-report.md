# Task 09 — A11y: relatório `docs/phase-2/a11y-audit.md`

|                        |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md) |
| **Owner**              | Dev 2 (DS & UI Pages)                                             |
| **Duração estimada**   | 0.5 dia                                                           |
| **Branch recomendada** | `dev2/a11y-report`                                                |
| **Status**             | ⏳ Pendente                                                       |

---

## Dependências

- **O que bloqueia esta tarefa:** [Task 04 — A11y Storybook](./04-a11y-storybook.md) e [Task 08 — Lighthouse A11y](./08-a11y-lighthouse.md). O relatório consolida os resultados das duas.
- **O que esta tarefa desbloqueia:** o **entregável de auditoria** exigido no aceite da Sprint 4 ("relatório de auditoria em `docs/phase-2/a11y-audit.md`"). Insumo direto para a seção de decisões do [README (Task 13)](./13-readme-docs.md).

---

## Contexto

Documento de evidência da auditoria de acessibilidade — mostra que a nota de "acessibilidade" foi perseguida com método, não só "parece acessível". Serve de checklist auditável para a banca.

---

## Conteúdo do `docs/phase-2/a11y-audit.md`

1. **Escopo e padrão:** WCAG 2.1 AA; ferramentas (axe via `@storybook/addon-a11y`, Lighthouse, teste manual com NVDA/VoiceOver + teclado).
2. **Scores Lighthouse A11y** por página (`/`, `/transactions`, `/login`) — antes/depois.
3. **Storybook addon:** estado final (0 violations) + link para o Storybook publicado (Chromatic).
4. **Correções aplicadas** (tabela): item → componente/página → o que foi feito → PR.
5. **Navegação por teclado:** descrição do percurso (skip link → header → conteúdo → modais → paginação).
6. **Charts acessíveis:** como `AccessibleChartData` expõe os dados a leitores de tela.
7. **Itens conhecidos / fora de escopo** (se houver), com justificativa.

```markdown
## Scores Lighthouse — Accessibility

| Página        | Antes | Depois |
| ------------- | ----- | ------ |
| /             | 8x    | ≥95    |
| /transactions | 8x    | ≥95    |
| /login        | 9x    | ≥95    |
```

---

## Validação

- [ ] `docs/phase-2/a11y-audit.md` existe e cobre as 3 páginas críticas.
- [ ] Tabela antes/depois preenchida com números reais.
- [ ] Lista de correções referencia PRs reais.
- [ ] Linkado a partir do README raiz (Task 13) e do `sprint-4-deploy-polish.md`.

---

## Gotchas

1. **Números reais, não aspiracionais** — rodar o Lighthouse e colar o score; a banca pode reproduzir.
2. **Datar o relatório** e indicar o commit/deploy avaliado (scores mudam com o código).
3. **Não duplicar** o checklist da Task 08 inteiro; aqui é o **resultado**, lá é a execução.
