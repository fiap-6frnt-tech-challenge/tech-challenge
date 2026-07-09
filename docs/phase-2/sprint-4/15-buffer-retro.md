# Task 15 — Buffer + bugfix + Retrospectiva da Fase 2

|                        |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md) |
| **Owner**              | Todo o time                                                       |
| **Duração estimada**   | 3 dias (dias 9–11 da Sprint 4)                                    |
| **Branch recomendada** | `dev<N>/bugfix-*` conforme necessário                             |
| **Status**             | ⏳ Pendente                                                       |

---

## Dependências

- **O que bloqueia esta tarefa:** depende dos **resultados de 01–14** — é onde se corrige o que os E2E (Task 05/12), a A11y (Task 08) e a perf (Task 11) revelarem.
- **O que esta tarefa desbloqueia:** a **Definição de Pronto da Fase 2** (PLAN.md): "tudo em ✓, entregáveis aprovados, time fez retrospectiva e documentou aprendizados em `docs/phase-2/retrospective.md`".

---

## Contexto

Reserva explícita (dias 9–11) para fechar pontas: bugs de E2E, ajustes finos de Lighthouse, polish de UX, code reviews pendentes, eventual retake do vídeo. E a retrospectiva, que é entregável da Fase 2.

---

## Escopo

### Bugfix + polish

- [ ] Corrigir bugs encontrados nos E2E (Tasks 05/12).
- [ ] Ajustar scores de Lighthouse que ficaram no limite (A11y e Perf).
- [ ] Polir UX: microinterações, transições, estados de loading/erro/empty.
- [ ] Resolver code reviews pendentes (todas as branches mergeadas em `phase-2`).
- [ ] Re-gravar trechos do vídeo se necessário.

### Priorização (quando o buffer apertar)

`spec-required > polish > nice-to-have`. O "plus" (dashboard personalizável com widgets de metas/alertas) **não vale nota** — só se sobrar tempo.

### Retrospectiva — `docs/phase-2/retrospective.md`

- [ ] O que funcionou (MFE, state split, DS-first, backend-first).
- [ ] O que doeu (deploy independente, singletons de federation, redução de 5→3 devs).
- [ ] Aprendizados técnicos (Module Federation runtime, standalone em monorepo, A11y de charts).
- [ ] Métricas finais (Lighthouse, cobertura, nº de testes).
- [ ] O que faríamos diferente.

---

## Checklist de fechamento da Fase 2 (Definição de Pronto)

- [ ] Tudo do PLAN.md em ✓.
- [ ] Spec compliance: charts, filtros/busca/paginação, validação/categorias/anexos, Docker, deploy + auth, MFE, state (Redux + TanStack Query), TS, SSR/SSG, A11y.
- [ ] Entregáveis: repo + README, live deploys (shell + 2 MFEs), Storybook no Chromatic, vídeo demo, E2E em CI.
- [ ] Métricas: Perf ≥ 90/85 · A11y ≥ 95 · Best Practices ≥ 95 · cobertura ≥ 80% em features críticas · 0 erros A11y no Storybook.
- [ ] `retrospective.md` escrito e revisado pelo time.

---

## Gotchas

1. **Buffer não é folga garantida** — proteger contra "vamos adicionar mais uma feature"; ele é para estabilizar o que já existe.
2. **Re-rodar A11y e Perf após bugfix** — correções de UX podem regredir scores; validar de novo (sync Tasks 08/11).
3. **Congelar o escopo** antes de gravar o vídeo final; mudança tardia = retake.
4. **Tag/release** do estado entregue em `phase-2` para a banca avaliar um ponto fixo.
