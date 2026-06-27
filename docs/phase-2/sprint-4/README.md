# Sprint 4 — Tasks detalhadas (Equipe de 3 Devs)

Cada arquivo neste diretório descreve **uma task** do [sprint-4-deploy-polish.md](../sprint-4-deploy-polish.md) com:

- contexto e racional técnico (aterrado no estado real do repo)
- **Dependências detalhadas** (o que **bloqueia** a tarefa e o que ela **desbloqueia**)
- passo-a-passo de implementação (comandos, snippets)
- validação e critérios de aceite
- gotchas conhecidas
- branch recomendada e fluxo de PR

> Voltar para: [sprint-4-deploy-polish.md](../sprint-4-deploy-polish.md) · [team-allocation.md](../team-allocation.md) · [PLAN.md](../PLAN.md) · Anterior: [sprint-3](../sprint-3/README.md)

> ℹ️ **3 devs (vigente).** O documento-resumo [sprint-4-deploy-polish.md](../sprint-4-deploy-polish.md) ainda nomeia os 5 tracks históricos (`dev1-infra` … `dev5-transactions`). Aqui as tasks já estão **consolidadas nos 3 papéis** vigentes desde a Sprint 1 e **reordenadas para que tudo que está desbloqueado venha primeiro**.

---

## Papéis (3 desenvolvedores)

| Papel                           | Foco                                 | Responsabilidades na Sprint 4                                                                            |
| :------------------------------ | :----------------------------------- | :------------------------------------------------------------------------------------------------------- |
| **Dev 1 (Infra & Backend)**     | Docker, deploy, CI, backend/CORS     | Dockerfiles + compose, deploy independente dos MFEs, CORS travado, E2E no CI, README raiz.               |
| **Dev 2 (DS & UI Pages)**       | Design System e acessibilidade       | Auditoria A11y (Storybook addon + Lighthouse), correções WCAG 2.1 AA, relatório `a11y-audit.md`.         |
| **Dev 3 (State & Integration)** | Charts, transações, perf, E2E, vídeo | Auditoria + otimização de performance, escrita dos testes E2E Playwright, gravação/edição do vídeo demo. |

> O mapeamento vem de [team-allocation.md](../team-allocation.md): Dev 1 = `dev1-infra` + `dev2-backend`; Dev 2 = `dev3-ds`; Dev 3 = `dev4-dashboard` + `dev5-transactions`.

---

## Ordem de execução (desbloqueadas primeiro)

| #   | Status | Task                                                                 | Owner         | Duração | Bloqueada por        | Arquivo                                                |
| --- | ------ | -------------------------------------------------------------------- | ------------- | ------- | -------------------- | ------------------------------------------------------ |
| 01  | ⏳     | Docker: `Dockerfile` do shell (Next standalone) + `.dockerignore`    | Dev 1         | 1 dia   | — (dia 1)            | [01-docker-shell.md](./01-docker-shell.md)             |
| 02  | ⏳     | Docker: `Dockerfile`s dos MFEs (Rsbuild → nginx) + `nginx.conf`      | Dev 1         | 1 dia   | — (dia 1)            | [02-docker-mfes.md](./02-docker-mfes.md)               |
| 03  | ⏳     | Cloud deploy independente dos MFEs + env vars no shell               | Dev 1         | 1 dia   | — (dia 1)            | [03-cloud-deploy-mfes.md](./03-cloud-deploy-mfes.md)   |
| 04  | ⏳     | A11y: auditoria Storybook (addon `a11y`, zerar erros)                | Dev 2         | 1 dia   | — (dia 1)            | [04-a11y-storybook.md](./04-a11y-storybook.md)         |
| 05  | ⏳     | E2E: config Playwright (prod local) + 3 testes críticos              | Dev 3         | 2 dias  | — (dia 1)            | [05-e2e-playwright.md](./05-e2e-playwright.md)         |
| 06  | ⏳     | Docker Compose (estende o atual: db + shell + MFEs) + `.env.example` | Dev 1         | 0.5 dia | ⬅ 01, 02             | [06-docker-compose.md](./06-docker-compose.md)         |
| 07  | ⏳     | Backend/Infra: CORS travado na origin do shell                       | Dev 1         | 0.5 dia | ⬅ 03                 | [07-cors-cross-origin.md](./07-cors-cross-origin.md)   |
| 08  | ⏳     | A11y: Lighthouse ≥ 95 + correções (skip-link, ARIA, contraste)       | Dev 2         | 1.5 dia | ⬅ 04 (03 p/ prod)    | [08-a11y-lighthouse.md](./08-a11y-lighthouse.md)       |
| 09  | ⏳     | A11y: relatório `docs/phase-2/a11y-audit.md`                         | Dev 2         | 0.5 dia | ⬅ 04, 08             | [09-a11y-report.md](./09-a11y-report.md)               |
| 10  | ⏳     | Perf: auditoria Lighthouse + `@next/bundle-analyzer`                 | Dev 3         | 1 dia   | ⬅ 03, 07             | [10-perf-audit.md](./10-perf-audit.md)                 |
| 11  | ⏳     | Perf: otimizações + `docs/phase-2/perf-audit.md` (antes/depois)      | Dev 3         | 1 dia   | ⬅ 10                 | [11-perf-optimizations.md](./11-perf-optimizations.md) |
| 12  | ⏳     | E2E: setup no CI (Chromium + Firefox, report artifact)               | Dev 1         | 0.5 dia | ⬅ 05 (06/03 p/ amb)  | [12-e2e-ci.md](./12-e2e-ci.md)                         |
| 13  | ⏳     | README raiz + READMEs por package                                    | Dev 1 + donos | 1.5 dia | ⬅ 01–12              | [13-readme-docs.md](./13-readme-docs.md)               |
| 14  | ⏳     | Vídeo demo (roteiro 6 min + gravação + edição)                       | Dev 3 + time  | 1 dia   | ⬅ 03, 05, 06 + feats | [14-video-demo.md](./14-video-demo.md)                 |
| 15  | ⏳     | Buffer + bugfix + retrospectiva (`retrospective.md`)                 | Todo time     | 3 dias  | ⬅ 01–14              | [15-buffer-retro.md](./15-buffer-retro.md)             |

**Legenda:** ✅ mergeada · 🟢 implementada (validada, aguarda merge) · ⏳ pendente · ⬅ depende de

**Esforço alocado:** Dev 1 ~5.5 dias · Dev 2 ~3 dias · Dev 3 ~5 dias (≈13.5 dev-days + 3 dias de buffer compartilhado, de 33 de capacidade). Dev 2, mais folgado, faz pair na A11y dos charts (Dev 3) e ajuda nos READMEs por package.

---

## Dependências entre tasks

```
DESBLOQUEADAS (dia 1, sem dependência dentro do sprint)
┌─ Dev 1 ─ Task 01: Dockerfile shell ─────────────────────────┐
│          Task 02: Dockerfiles MFEs (nginx) ─────────────────┤
│          Task 03: Cloud deploy MFEs + env vars no shell ────┤
├─ Dev 2 ─ Task 04: A11y Storybook (addon a11y) ──────────────┤
└─ Dev 3 ─ Task 05: E2E Playwright (3 testes, prod local) ────┘

DEPENDENTES
  Tasks 01 + 02 ────────────────────→ Task 06: docker-compose (db+shell+MFEs)  (Dev 1)
  Task 03 ──────────────────────────→ Task 07: CORS travado na origin do shell (Dev 1)
  Task 04 ──────────────────────────→ Task 08: Lighthouse A11y + correções     (Dev 2)
  Tasks 04, 08 ─────────────────────→ Task 09: relatório a11y-audit.md         (Dev 2)
  Tasks 03, 07 ─────────────────────→ Task 10: Perf audit (prod + bundle)      (Dev 3)
  Task 10 ──────────────────────────→ Task 11: Perf otimizações + perf-audit   (Dev 3)
  Task 05 (+ 03/06) ────────────────→ Task 12: E2E no CI                       (Dev 1)
  Tasks 01–12 ──────────────────────→ Task 13: README raiz + por package       (Dev 1 + donos)
  Tasks 03, 05, 06 + features ──────→ Task 14: Vídeo demo                      (Dev 3 + time)
                                              │
                                              ↓
                                     Task 15: Buffer + bugfix + Retrospectiva  (Todo time)
```

---

## Prioridade de entrega (caso o sprint aperte)

Ordem do que **vale nota da spec** primeiro; polish depois:

1. **Tasks 01, 02, 06** (Docker + compose) — requisito técnico explícito da Fase 2.
2. **Tasks 03, 07** (deploy independente por MFE + CORS) — requisito de "cloud deploy" + roteamento/comunicação entre MFEs.
3. **Tasks 04, 08, 09** (A11y) — vale nota ("acessibilidade") e é fácil de perder ponto.
4. **Tasks 05, 12** (E2E + CI) — garante que nada regrediu antes da entrega.
5. **Tasks 10, 11** (Perf) — alvo de nota, mas degrada com elegância (dá para entregar com scores parciais documentados).
6. **Tasks 13, 14** (README + vídeo) — entregáveis obrigatórios; sem eles a entrega não conta.

> Se faltar tempo: o **vídeo (14)** e o **README (13)** são inegociáveis (entregáveis); as otimizações de perf (11) podem entregar parcial desde que o relatório documente o gap.

---

## Diretrizes de PR

1. Todas as branches partem de `phase-2` e o PR aponta para `phase-2`.
2. Nomeie as branches como `dev<N>/<nome-da-task>` (ex.: `dev1/docker-shell`). **Sem** o prefixo `phase-2/`.
3. Rode `npm run lint` e `npm run build` antes de submeter o PR.
4. PR que toca o Design System (correções A11y) exige Chromatic visual review aprovado.
5. PR pequeno e frequente: cada Dockerfile = 1 PR; cada teste E2E pode ir junto, mas o setup de CI é PR à parte; cada README de package = 1 PR.
6. Mudanças de infra que afetam deploy (env vars, `output: 'standalone'`, CORS) precisam de smoke em **preview** antes de merge.
