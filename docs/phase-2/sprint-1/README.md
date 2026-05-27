# Sprint 1 — Tasks detalhadas (Equipe de 3 Devs)

Cada arquivo neste diretório descreve **uma task** do [sprint-1-auth-state.md](../sprint-1-auth-state.md) com:

- contexto e racional técnico
- pré-condições de execução
- passo-a-passo de implementação (comandos, mocks, snippets de código)
- **Dependências detalhadas** (o que bloqueia a tarefa e o que ela bloqueia)
- validação e critérios de aceite
- gotchas conhecidas
- fluxo de PR e branch recomendados

> Voltar para: [sprint-1-reallocation.md](../sprint-1-reallocation.md) · [sprint-1-auth-state.md](../sprint-1-auth-state.md) · [PLAN.md](../PLAN.md)

## Ordem de execução e Alocação (Revisada)

| #   | Status | Task                                                          | Owner | Duração  | PR      | Arquivo                                                  |
| --- | ------ | ------------------------------------------------------------- | ----- | -------- | ------- | -------------------------------------------------------- |
| 1   | ⏳     | Spike: Zustand + TanStack Query                               | Dev 1 | 1 dia    | pending | [01-spike-zustand-query.md](./01-spike-zustand-query.md) |
| 2   | ⏳     | Persistência real (Vercel KV ou Postgres)                     | Dev 1 | 2 dias   | pending | [02-real-persistence.md](./02-real-persistence.md)       |
| 3   | ⏳     | Schema de Transação Evoluído & Seed                           | Dev 1 | 1.5 dia  | pending | [06-evolved-schema.md](./06-evolved-schema.md)           |
| 4   | ⏳     | NextAuth v5 Setup no Shell & Middleware                       | Dev 2 | 2 dias   | pending | [03-nextauth-setup.md](./03-nextauth-setup.md)           |
| 5   | ⏳     | Componentes de Autenticação no Design System                  | Dev 2 | 2 dias   | pending | [05-ds-auth-components.md](./05-ds-auth-components.md)   |
| 6   | ⏳     | Criar stores Zustand em `packages/stores`                     | Dev 3 | 1 dia    | pending | [07-packages-stores.md](./07-packages-stores.md)         |
| 7   | ⏳     | Criar hooks TanStack Query em `packages/api-client`           | Dev 3 | 2 dias   | pending | [08-packages-api-client.md](./08-packages-api-client.md) |
| 8   | ⏳     | Páginas `/login` e `/auth/error` no Shell                     | Dev 2 | 1 dia    | pending | [04-auth-pages.md](./04-auth-pages.md)                   |
| 9   | ⏳     | Migração: Remover Context API (Transactions + Feedback)       | Dev 3 | 2.5 dias | pending | [09-migrate-context-api.md](./09-migrate-context-api.md) |
| 10  | ⏳     | Testes Vitest de Middleware/Stores & Configuração de CI e Env | Dev 1 | 1.5 dia  | pending | [10-vitest-ci-setup.md](./10-vitest-ci-setup.md)         |
| 11  | ⏳     | Smoke test final & Vídeo Demo                                 | Todos | 0.5 dia  | pending | [11-smoke-test-demo.md](./11-smoke-test-demo.md)         |

**Legenda:** ✅ mergeada · 🟢 implementada (validada, aguarda merge) · ⏳ pendente

---

## Dependências entre tasks

```
[Task 1: Spike Zustand/Query] (Todos)
   │
   ├──→ Task 2: Persistência (Dev 1) ──→ Task 6: Schema Evoluído (Dev 1)
   │                                                 │
   │                                                 ├──→ Task 3: NextAuth setup (Dev 2)
   │                                                 │      │
   │                                                 │      ├──→ Task 7: packages/stores (Dev 3) ────┐
   │                                                 │      │                                        │
   │                                                 │      └──→ Task 10: Vitest/CI & Env (Dev 1) ──┐│
   │                                                 │                                              ││
   │                                                 └──→ Task 8: packages/api-client (Dev 3) ──────┼┼┐
   │                                                                                                │││
   ├──→ Task 5: Componentes no DS (Dev 2) ──→ Task 4: Páginas /login e error (Dev 2) ──────────────┼┼┼┐
   │                                                                                                ││││
   └────────────────────────────────────────────────────────────────────────────────────────────────┴┴┴┼────┘
                                                                                                       ↓
                                                                                            Task 9: Migração Context (Dev 3)
                                                                                                       │
                                                                                                       ↓
                                                                                            Task 11: Smoke Test & Demo (Todos)
```

## Diretrizes de PR

1. Todas as branches devem partir de `phase-2` e ter PR apontando para `phase-2`.
2. Nomeie as branches no formato: `<dev-handle>/<nome-da-task>` (ex: `dev1/nextauth-setup`). Não use o prefixo `phase-2/`.
3. Rode `npm run lint` e `npm run build` na raiz do monorepo antes de submeter o PR para certificar-se de que nada quebrou na build do Turborepo.
