# Plano de Ação — Redistribuição da Sprint 1 para 3 Desenvolvedores (Redux + Backend Pós)

Devido à redução da equipe para **3 integrantes**, este documento oficializa a reestruturação dos papéis, o esforço e a sequência de execução das tarefas da **Sprint 1 (Auth + State Migration)** com o backend oficial da pós e o Redux Toolkit.

---

## 1. Reestruturação de Tracks (3 Papéis)

Os 5 tracks originais da Fase 2 foram fundidos em 3 papéis principais para balancear a carga técnica e evitar overlaps:

| Papel                           | Foco Principal                     | Responsabilidades na Sprint 1                                                                                                                |
| :------------------------------ | :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dev 1 (Infra, BFF & Testes)** | Infra, BFF e Testes                | Subir container do backend oficial, criar BFF no shell do Next.js (proxy seguro de APIs), adaptar schema de transação, CI/CD e testes.       |
| **Dev 2 (DS & UI Pages)**       | UI Components e Páginas do Host    | Componentes de autenticação do Design System (LoginForm, UserMenu, AuthGuard), NextAuth v5 setup conectado ao backend e telas de login/erro. |
| **Dev 3 (State & Integration)** | Redux Toolkit, Query e Refatoração | Configuração do package `@bytebank/stores` (slices do Redux), `@bytebank/api-client` (Query hooks) e migração completa das Context APIs.     |

---

## 2. Alocação Equivalente de Esforço (Estimativas)

A carga de trabalho total estimada para a Sprint 1 é de **~17.5 dev-days**. Com a redistribuição, o esforço foi balanceado de maneira equivalente entre os 3 membros da equipe:

| Dev       | Tarefas Atribuídas                                                                                             | Duração      |
| :-------- | :------------------------------------------------------------------------------------------------------------- | :----------- |
| **Dev 1** | Spike (1d) + Integração Backend Pós (2d) + Schema Evoluído (1.5d) + Vitest/CI & Env (1.5d) + Smoke Test (0.5d) | **6.5 dias** |
| **Dev 2** | Spike (1d) + NextAuth Setup (2d) + Componentes DS (2d) + Páginas Auth (1d) + Smoke Test (0.5d)                 | **6.5 dias** |
| **Dev 3** | Spike (1d) + Slices Redux (1d) + Hooks Query (2d) + Migração Context (2.5d) + Smoke Test (0.5d)                | **7.0 dias** |

---

## 3. Sequência Lógica de Execução (Fases e Dependências)

As tarefas devem ser executadas respeitando a seguinte ordem de prioridade técnica. Não há separação por dias — cada tarefa começa assim que seus pré-requisitos estiverem disponíveis:

### Fase 1 — Alinhamento (Todos)

- **Task 1: Spike Redux Toolkit + TanStack Query** — Ponto de partida. Sem bloqueios. Desbloqueia toda a sprint.

### Fase 2 — Fundação e Contratos (Dev 1 e Dev 2 em paralelo)

- **Task 2: Integração Backend Pós (BFF)** `[Dev 1]` — Inicia logo após Task 1. Desbloqueia o desenvolvimento das rotas.
- **Task 5: Componentes DS** `[Dev 2]` — Inicia logo após Task 1. Pode correr em paralelo com Task 2.
- **Task 6: Schema de Transação** `[Dev 1]` — Adaptação dos contratos para a assinatura da pós. **Principal gargalo da sprint**: desbloqueia as Tasks 3 e 8.

### Fase 3 — Autenticação e Telas (Dev 2)

- **Task 3: NextAuth Setup** `[Dev 2]` — Conecta o NextAuth ao backend da pós (`POST /user/auth`). Bloqueada pela Task 6 (precisa do formato do token).
- **Task 4: Páginas de Auth** `[Dev 2]` — Implementa `/login` e `/auth/error` usando componentes do DS. Bloqueada pelas Tasks 3 e 5.

### Fase 4 — Slices e Hooks (Dev 3)

- **Task 7: Slices Redux Toolkit** `[Dev 3]` — Cria as stores compartilhadas. Bloqueada pela Task 3 (precisa da session structure).
- **Task 8: Hooks TanStack Query** `[Dev 3]` — Hooks de fetching apontando para o BFF. Bloqueada pela Task 6.

### Fase 5 — Integração e Testes (Dev 1 e Dev 3)

- **Task 9: Migração Context API** `[Dev 3]` — Substituição total do Context pelo Redux + Query. Bloqueada pelas Tasks 7, 8 e 4.
- **Task 10: Vitest, CI e Env Vars** `[Dev 1]` — Testes unitários do BFF, slices e middlewares. Bloqueada pelas Tasks 3, 7 e 8.

### Fase 6 — Validação Final (Todos)

- **Task 11: Smoke Test & Vídeo Demo** — Bloqueada por todas as tarefas anteriores. Encerra a Sprint 1.

---

## 4. Visualização do Grafo de Dependências

```
[Task 1: Spike] (Todos)
         │
         ├──→ [Task 2: Integração Backend Pós (BFF)] (Dev 1)
         │              │
         │              └──→ [Task 6: Schema Evoluído] (Dev 1) ← GARGALO
         │                              │
         │                             ├──→ [Task 3: NextAuth] (Dev 2)
         │                             │              │
         │                             │              └──→ [Task 7: Slices Redux] (Dev 3) ──┐
         │                             │                                                     │
         │                             └──→ [Task 8: Query Hooks] (Dev 3) ──────────────────┤
         │                                                                                   │
         ├──→ [Task 5: Componentes DS] (Dev 2)                                              │
         │              │                                                                    │
         │              └──→ [Task 4: Páginas Auth] (Dev 2) ────────────────────────────────┤
         │                                                                                   │
         └───────────────────────────────────────────────────────────────────────────────────┼─→ [Task 9: Migração Context] (Dev 3)
                                                                                             │            │
                                                                 [Task 10: Vitest/CI] (Dev 1)┘            │
                                                                                                          ↓
                                                                                               [Task 11: Smoke Test] (Todos)
```

> **Atenção**: O Schema de Transação (Task 6) é o gargalo imediato. O Dev 3 pode adiantar a estrutura inicial das stores no package `@bytebank/stores` com mocks de dados durante o desenvolvimento da integração de banco.
