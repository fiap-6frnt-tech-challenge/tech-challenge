# Sprint 1 — Clean Architecture

**Duração:** 9 dias · 2026-09-26 → 2026-10-04
**Time:** 3 devs — Dev 1 (Backend & Segurança) · Dev 2 (Arquitetura Front & Estado) · Dev 3 (Performance & Plataforma)
**Objetivo:** Separar **domínio, aplicação, infraestrutura e apresentação** no servidor e no front, com a regra de dependência verificada por lint. Tirar regras de negócio de componentes e rotas, acelerar a API (índices, agregação em SQL, endpoint de overview) e organizar o Design System em Atomic Design — **sem mudar o comportamento visível da Fase 2** (strangler + testes de contrato).

> Voltar para o [PLAN.md](../PLAN.md) · Alocação: [team-allocation.md#sprint-1--clean-architecture](../team-allocation.md#sprint-1--clean-architecture) · Anterior: [Sprint 0](../sprint-0-foundation/README.md) · Próximo: [Sprint 2](../sprint-2-state-reactive/README.md)

---

## Regra de dependência

```
        composition root (apps/shell/src/server/container.ts · bootstrap.tsx dos MFEs)
                                   │ monta
                                   ▼
 apresentação ── rotas /api finas, páginas, componentes, view-models
      │ chama
      ▼
 aplicação ───── casos de uso + portas (interfaces)  ◀── implementa ── infraestrutura
      │ usa                                                            (Drizzle, Blob, gateways HTTP,
      ▼                                                                 bcrypt, URL storage)
 domínio ─────── entidades, value objects, regras, erros, eventos
```

- O **domínio** não conhece React, Next, Drizzle nem `fetch`.
- A **aplicação** só conhece o domínio e as próprias portas.
- A **infraestrutura** implementa as portas; é trocável (ex.: `VercelBlobFileStorage` ↔ `LocalFileStorage`).
- A **apresentação** nunca acessa a infraestrutura direto: recebe tudo do composition root.

**Estratégia de migração (Strangler Fig):** o `@bytebank/shared` passa a reexportar do `@bytebank/core` os símbolos movidos. Imports antigos continuam funcionando; código novo importa do core; o lint (Task 08) avisa quem usa o caminho antigo. Cada PR migra uma fatia.

---

## Pré-requisitos

- [x] Sprint 0 fechado (IDOR corrigido, ADRs aceitos, spikes resolvidos)
- [ ] Baseline de performance disponível (S0-04)
- [ ] Schemas de API do S0-03 mergeados

---

## Ordem de execução

| #   | Status | Task                                          | Owner | Duração | Prio | Paralela?        | Arquivo                                                      |
| --- | ------ | --------------------------------------------- | ----- | ------- | ---- | ---------------- | ------------------------------------------------------------ |
| 01  | ⏳     | `@bytebank/core`: camada de domínio           | Dev 2 | 2 dias  | P0   | ✅ dia 1         | [01-core-domain.md](./01-core-domain.md)                     |
| 02  | ⏳     | Camada de aplicação: portas + casos de uso    | Dev 1 | 2 dias  | P0   | ⬅ 01 (esqueleto) | [02-application-use-cases.md](./02-application-use-cases.md) |
| 03  | ⏳     | Infraestrutura do servidor + composition root | Dev 1 | 1.5 dia | P0   | ⬅ 02             | [03-server-infrastructure.md](./03-server-infrastructure.md) |
| 04  | ⏳     | Rotas finas + mapeamento de erros             | Dev 1 | 1 dia   | P0   | ⬅ 03             | [04-thin-route-handlers.md](./04-thin-route-handlers.md)     |
| 05  | ⏳     | Tempo de resposta: índices, SQL, overview     | Dev 3 | 1.5 dia | P0   | ⬅ 03             | [05-db-response-time.md](./05-db-response-time.md)           |
| 06  | ⏳     | Front em camadas: gateways, queries, MFEs     | Dev 2 | 2 dias  | P0   | ⬅ 01             | [06-front-layers.md](./06-front-layers.md)                   |
| 07  | ⏳     | View-models e casos de uso de cliente         | Dev 2 | 1.5 dia | P0   | ⬅ 06             | [07-view-models.md](./07-view-models.md)                     |
| 08  | ⏳     | Fronteiras de módulos (lint + grafo)          | Dev 3 | 1 dia   | P0   | ⬅ 01             | [08-module-boundaries.md](./08-module-boundaries.md)         |
| 09  | ⏳     | Design System em Atomic Design                | Dev 3 | 1 dia   | P1   | ✅ dia 1         | [09-ds-atomic-design.md](./09-ds-atomic-design.md)           |
| 10  | ⏳     | Testes + smoke                                | Todos | 0.5 dia | P0   | ⬅ impl           | [10-tests-smoke.md](./10-tests-smoke.md)                     |

**Legenda:** ✅ mergeada · 🟢 implementada · ⏳ pendente

---

## Dependências entre tasks

```
01 (core/domínio) ─┬─→ 02 (casos de uso) ─→ 03 (infra) ─┬─→ 04 (rotas finas)
                   │                                    └─→ 05 (índices/SQL/overview)
                   ├─→ 06 (front em camadas) ─→ 07 (view-models)
                   └─→ 08 (fronteiras/lint)
09 (Atomic Design) — independente
tudo ─→ 10 (testes/smoke)
```

---

## Critério de aceite do sprint

### Camadas

- [ ] `@bytebank/core` não importa `react`, `next`, `drizzle-orm`, `@vercel/blob` nem `node:*` (o lint falha se importar)
- [ ] Nenhuma rota em `app/api/**` importa `@/db` ou `drizzle-orm`; todas usam o `container`
- [ ] Todo caso de uso tem teste unitário com fakes (sem banco), inclusive o de autorização (outro usuário → `NotFoundError`)
- [ ] Contratos HTTP idênticos aos da Fase 2 (testes de contrato das rotas verdes; E2E verdes)

### Front

- [ ] `Dashboard.tsx` só renderiza (cálculos no view-model)
- [ ] Filtros via `TransactionFilter` (codec único, usado também pelo servidor)
- [ ] `api-client` separado em `http/`, `gateways/` e `queries/`; MFEs em `presentation/`, `application/` e `infrastructure/`

### Performance

- [ ] Home não baixa mais a lista completa (endpoint de overview)
- [ ] Índices criados; p95 do resumo e da lista melhor que a baseline (anotado no PR)

### Modularidade

- [ ] `npm run arch:check` roda na CI; grafo de dependências gerado
- [ ] DS reorganizado em atoms/molecules/organisms com o barrel público intacto; Storybook com a nova hierarquia
