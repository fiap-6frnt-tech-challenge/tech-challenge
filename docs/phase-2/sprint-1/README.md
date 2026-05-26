# Sprint 1 — Tasks detalhadas

Cada arquivo neste diretório descreve **uma task** do [sprint-1-auth-state.md](../sprint-1-auth-state.md) com:

- contexto e racional técnico
- pré-condições de execução
- passo-a-passo de implementação (comandos, mocks, snippets de código)
- validação e critérios de aceite
- gotchas conhecidas
- fluxo de PR e branch recomendados

> Voltar para: [sprint-1-auth-state.md](../sprint-1-auth-state.md) · [team-allocation.md](../team-allocation.md) · [PLAN.md](../PLAN.md)

## Ordem de execução e Alocação

| #   | Status | Task                                                          | Owner              | Duração  | PR      | Arquivo                                                  |
| --- | ------ | ------------------------------------------------------------- | ------------------ | -------- | ------- | -------------------------------------------------------- |
| 1   | ⏳     | Spike: Zustand + TanStack Query                               | dev1-infra (lider) | 1 dia    | pending | [01-spike-zustand-query.md](./01-spike-zustand-query.md) |
| 2   | ⏳     | Persistência real (Vercel KV ou Postgres)                     | dev2-backend       | 2 dias   | pending | [02-real-persistence.md](./02-real-persistence.md)       |
| 3   | ⏳     | Schema de Transação Evoluído & Seed                           | dev2-backend       | 1.5 dia  | pending | [06-evolved-schema.md](./06-evolved-schema.md)           |
| 4   | ⏳     | NextAuth v5 Setup no Shell & Middleware                       | dev2-backend       | 2 dias   | pending | [03-nextauth-setup.md](./03-nextauth-setup.md)           |
| 5   | ⏳     | Componentes de Autenticação no Design System                  | dev3-ds            | 2 dias   | pending | [05-ds-auth-components.md](./05-ds-auth-components.md)   |
| 6   | ⏳     | Criar stores Zustand em `packages/stores`                     | dev4-dashboard     | 1 dia    | pending | [07-packages-stores.md](./07-packages-stores.md)         |
| 7   | ⏳     | Criar hooks TanStack Query em `packages/api-client`           | dev4-dashboard     | 2 dias   | pending | [08-packages-api-client.md](./08-packages-api-client.md) |
| 8   | ⏳     | Páginas `/login` e `/auth/error` no Shell                     | dev5-transactions  | 1 dia    | pending | [04-auth-pages.md](./04-auth-pages.md)                   |
| 9   | ⏳     | Migração: Remover Context API (Transactions + Feedback)       | dev5-transactions  | 2.5 dias | pending | [09-migrate-context-api.md](./09-migrate-context-api.md) |
| 10  | ⏳     | Testes Vitest de Middleware/Stores & Configuração de CI e Env | dev1-infra         | 1.5 dia  | pending | [10-vitest-ci-setup.md](./10-vitest-ci-setup.md)         |
| 11  | ⏳     | Smoke test final & Vídeo Demo                                 | Todo time          | 0.5 dia  | pending | [11-smoke-test-demo.md](./11-smoke-test-demo.md)         |

**Legenda:** ✅ mergeada · 🟢 implementada (validada, aguarda merge) · ⏳ pendente

---

## Dependências entre tasks

```
[Task 1: Spike Zustand/Query] (Todo time)
   │
   ├──→ Task 2: Persistência backend ──→ Task 3: Schema Evoluído & Seed
   │                                                 │
   │                                                 ├──→ Task 4: NextAuth setup
   │                                                 │      │
   │                                                 │      ├──→ Task 6: packages/stores (useAuthStore) ──┐
   │                                                 │      │                                             │
   │                                                 │      └──→ Task 10: Vitest/CI & Env ──┐             │
   │                                                 │                                      │             │
   │                                                 └──→ Task 7: packages/api-client ──────┼──┐          │
   │                                                                                        │  │          │
   ├──→ Task 5: Componentes no DS ──→ Task 8: Páginas /login e /auth/error ───────────────┼──┼──┐       │
   │                                                                                        │  │  │       │
   └────────────────────────────────────────────────────────────────────────────────────────┴──┴──┼───────┘
                                                                                                  ↓
                                                                                        Task 9: Migração Context
                                                                                                  │
                                                                                                  ↓
                                                                                        Task 11: Smoke Test & Demo
```

## Diretrizes de PR

1. Todas as branches devem ser criadas a partir de `phase-2` e os PRs devem apontar para a branch `phase-2` como target.
2. Nomeie as branches de forma curta no formato: `<dev-handle>/<nome-da-task>` (ex: `dev2-backend/nextauth-setup`). Não use o prefixo `phase-2/`.
3. Certifique-se de executar `npm run lint` e `npm run build` na raiz do monorepo antes de submeter o PR para garantir que o Turborepo não detecte erros estáticos.
