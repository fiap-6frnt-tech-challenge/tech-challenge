# Sprint 2 — Tasks detalhadas (Equipe de 3 Devs)

Cada arquivo neste diretório descreve **uma task** do [sprint-2-dashboard.md](../sprint-2-dashboard.md) com:

- contexto e racional técnico
- pré-condições de execução
- passo-a-passo de implementação (comandos, snippets de código)
- **Dependências detalhadas** (o que bloqueia a tarefa e o que ela desbloqueia)
- validação e critérios de aceite
- gotchas conhecidas
- branch recomendada e fluxo de PR

> Voltar para: [sprint-2-dashboard.md](../sprint-2-dashboard.md) · [team-allocation.md](../team-allocation.md) · [PLAN.md](../PLAN.md)

---

## Papéis (3 desenvolvedores)

Mantemos os 3 papéis consolidados na [Sprint 1](../sprint-1-reallocation.md):

| Papel                           | Foco                                 | Responsabilidades na Sprint 2                                                                            |
| :------------------------------ | :----------------------------------- | :------------------------------------------------------------------------------------------------------- |
| **Dev 1 (Infra & Backend)**     | Backend, DB, performance, testes     | Endpoint de summary + agregações, seed histórico, cadastro de usuário, SSR/perf no shell.                |
| **Dev 2 (DS & UI Pages)**       | Design System e páginas do host      | Componentes de gráfico (Bar/Line/Pie/Kpi/Widget), `RegisterForm`, página `/register` e logout no Header. |
| **Dev 3 (State & Integration)** | Redux, React Query, MFE e integração | `dashboard-mfe`, consumo no shell, hook de summary, sync de estado auth, layout/integração dos widgets.  |

---

## Ordem de execução

> As tasks estão numeradas **na ordem em que devem ser executadas**: primeiro as que **podem rodar em paralelo** (sem dependências dentro do sprint — tasks 1 a 6), depois as **dependentes** (7 a 13). Os 3 devs começam o dia 1 simultaneamente, cada um na primeira task da sua trilha.

| #   | Status | Task                                                     | Owner       | Duração | Paralela? | Arquivo                                                                  |
| --- | ------ | -------------------------------------------------------- | ----------- | ------- | --------- | ------------------------------------------------------------------------ |
| 1   | ⏳     | Backend: Endpoint de Summary + Agregações + Seed         | Dev 1       | 2 dias  | ✅ sim    | [01-backend-summary-seed.md](./01-backend-summary-seed.md)               |
| 2   | ⏳     | Backend: Cadastro de Usuário (tabela `users` + endpoint) | Dev 1       | 1 dia   | ✅ sim    | [02-backend-register-endpoint.md](./02-backend-register-endpoint.md)     |
| 3   | ⏳     | DS: Componentes de Gráfico + KpiCard + DashboardWidget   | Dev 2       | 4 dias  | ✅ sim    | [03-ds-chart-components.md](./03-ds-chart-components.md)                 |
| 4   | ⏳     | DS: `RegisterForm` + revisão do `UserMenu`               | Dev 2       | 1 dia   | ✅ sim    | [04-ds-register-form-usermenu.md](./04-ds-register-form-usermenu.md)     |
| 5   | ⏳     | Criar `apps/dashboard-mfe` (Rsbuild + MF)                | Dev 3       | 1 dia   | ✅ sim    | [05-create-dashboard-mfe.md](./05-create-dashboard-mfe.md)               |
| 6   | ⏳     | State: Sincronizar Redux ↔ NextAuth (login/logout)       | Dev 3       | 1 dia   | ✅ sim    | [06-state-session-sync.md](./06-state-session-sync.md)                   |
| 7   | ⏳     | Hook `useDashboardSummary` no api-client                 | Dev 3       | 0.5 dia | ⬅ Task 1  | [07-hook-dashboard-summary.md](./07-hook-dashboard-summary.md)           |
| 8   | ⏳     | Shell consome o `dashboard-mfe` em `/`                   | Dev 3       | 1 dia   | ⬅ Task 5  | [08-shell-consume-mfe.md](./08-shell-consume-mfe.md)                     |
| 9   | ⏳     | Página `/register` + Logout no Header                    | Dev 2       | 1.5 dia | ⬅ 2,4,6   | [09-register-page-logout-wiring.md](./09-register-page-logout-wiring.md) |
| 10  | ⏳     | Layout do Dashboard + Integração dos Widgets             | Dev 3       | 3 dias  | ⬅ 3,7,8   | [10-dashboard-layout-widgets.md](./10-dashboard-layout-widgets.md)       |
| 11  | ⏳     | SSR no Shell para SEO + Performance                      | Dev 1       | 1 dia   | ⬅ 8,10    | [11-ssr-shell.md](./11-ssr-shell.md)                                     |
| 12  | ⏳     | Testes (agregações, hook, session sync, stories)         | Distribuído | 1.5 dia | ⬅ impl    | [12-tests.md](./12-tests.md)                                             |
| 13  | ⏳     | Smoke Test Final & Vídeo Demo                            | Todos       | 0.5 dia | ⬅ tudo    | [13-smoke-test-demo.md](./13-smoke-test-demo.md)                         |

**Legenda:** ✅ mergeada · 🟢 implementada (validada, aguarda merge) · ⏳ pendente

**Esforço alocado:** Dev 1 ~5 dias · Dev 2 ~7.5 dias · Dev 3 ~7.5 dias (≈20 dev-days de 42 de capacidade — buffer para imprevistos, code review e pair). Dev 1, mais folgado, apoia testes e adianta o setup de Docker da Sprint 4.

---

## Dependências entre tasks

```
PARALELAS (dia 1, sem dependência dentro do sprint)
┌─ Dev 1 ─ Task 1: Summary + Seed ───────────────┐
│          Task 2: Cadastro (users + endpoint) ──┼──┐
├─ Dev 2 ─ Task 3: Gráficos no DS ───────────────┤  │
│          Task 4: RegisterForm + UserMenu ──────┼──┤
├─ Dev 3 ─ Task 5: Criar dashboard-mfe ──────────┤  │
│          Task 6: Session Sync (Redux↔Auth) ────┼──┤
└─────────────────────────────────────────────────┘  │
                                                       │
DEPENDENTES                                            │
   Task 1 ─→ Task 7: useDashboardSummary (Dev 3)       │
   Task 5 ─→ Task 8: Shell consome MFE (Dev 3)         │
   Tasks 2 + 4 + 6 ─→ Task 9: /register + Logout (Dev 2) ◀┘  (fecha buracos de Auth)
   Tasks 3 + 7 + 8 ─→ Task 10: Layout + Widgets (Dev 3)
   Tasks 8 + 10 ─→ Task 11: SSR no Shell (Dev 1)
   (implementações) ─→ Task 12: Testes (distribuído)
                              │
                              ↓
                     Task 13: Smoke Test & Demo (Todos)
```

### Tópicos faltantes da Sprint 1 (corrigidos aqui)

| Tópico faltante                                  | Onde é resolvido                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| **Botão de logout**                              | Task 4 (UserMenu) + **Task 9** (UserMenu no Header + thunk)                         |
| **Área para cadastro**                           | Task 2 (endpoint + users) + Task 4 (RegisterForm) + **Task 9** (página `/register`) |
| **Atualização do state (Redux) no login/logout** | **Task 6** (SessionSync) + Task 9 (logout dispara o fluxo)                          |

---

## Diretrizes de PR

1. Todas as branches partem de `phase-2` e o PR aponta para `phase-2`.
2. Nomeie as branches como `dev<N>/<nome-da-task>` (ex.: `dev3/dashboard-layout-widgets`). **Sem** o prefixo `phase-2/`.
3. Rode `npm run lint` e `npm run build` antes de submeter o PR (Turborepo não pode quebrar).
4. PR que toca o Design System exige Chromatic visual review aprovado.
5. PR pequeno e frequente: cada componente DS = 1 PR; cada endpoint = 1 PR; cada integração = 1 PR.
