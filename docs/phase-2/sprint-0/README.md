# Sprint 0 — Tasks detalhadas

Cada arquivo neste diretório descreve **uma task** do [sprint-0-foundation.md](../sprint-0-foundation.md) com:

- contexto e racional
- pré-condições
- passo-a-passo de implementação (comandos, conteúdo de arquivos)
- validação e critério de aceite
- gotchas conhecidas
- template de PR

> Voltar para: [sprint-0-foundation.md](../sprint-0-foundation.md) · [team-allocation.md](../team-allocation.md) · [PLAN.md](../PLAN.md)

## Ordem de execução

| #   | Task                                        | Owner                              | Duração | PR                         | Arquivo                                                      |
| --- | ------------------------------------------- | ---------------------------------- | ------- | -------------------------- | ------------------------------------------------------------ |
| 1   | Bootstrap monorepo                          | dev1-infra                         | 1 dia   | 🔗 **PR único** com Task 2 | [01-bootstrap-monorepo.md](./01-bootstrap-monorepo.md)       |
| 2   | Migrar shell para apps/shell                | dev1-infra                         | 1 dia   | 🔗 **PR único** com Task 1 | [02-migrate-shell.md](./02-migrate-shell.md)                 |
| 3   | Extrair packages/shared                     | dev2-backend                       | 0.5 dia | PR próprio                 | [03-extract-shared.md](./03-extract-shared.md)               |
| 4   | Extrair packages/design-system              | dev3-ds                            | 1 dia   | PR próprio                 | [04-extract-design-system.md](./04-extract-design-system.md) |
| 5   | Criar packages/api-client e stores (vazios) | dev2-backend                       | 0.5 dia | PR próprio                 | [05-create-empty-packages.md](./05-create-empty-packages.md) |
| 6   | PoC Module Federation (Opção A — Rsbuild)   | dev4-dashboard + dev5-transactions | 3 dias  | PR próprio                 | [06-poc-module-federation.md](./06-poc-module-federation.md) |
| 7   | Gate decisório MF (Dia 5)                   | todo time                          | 30 min  | doc-only                   | [07-gate-decision.md](./07-gate-decision.md)                 |
| 8   | CI atualizado                               | dev1-infra                         | 0.5 dia | PR próprio                 | [08-update-ci.md](./08-update-ci.md)                         |
| 9   | Smoke test final                            | todo time                          | 0.5 dia | doc-only                   | [09-smoke-test-final.md](./09-smoke-test-final.md)           |

## Princípio do Sprint 0 (e da fase inteira)

**Cada PR mergeado em `phase-2` deixa o app funcional.** Por isso Tasks 1 e 2 são **bundled num único PR atômico**: Task 1 isolada deixaria `phase-2` sem deps do Next.js no root e quebraria o app. As demais tasks (3-9) já são naturalmente atômicas — cada uma mantém o app rodando.

## Dependências entre tasks

```
[Tasks 1+2 bundled PR] (monorepo migration)
   ↓
   ├──→ Task 3 (extract shared) ──→ Task 4 (extract DS)  ─┐
   ├──→ Task 5 (create empty pkgs)                       ─┤
   └──→ Task 6 (PoC MF)                                  ─┴──→ Task 8 (CI) ──→ Task 9 (smoke test)
                                       ↓
                                   Task 7 (Gate decisório dia 5)
                                       ↓
                                   continua ou aciona fallback opção D
```

**Importante:** Task 4 (DS) depende de Task 3 (shared) — DS importa `cn`, `getInputBorderColor` e tipos via `@bytebank/shared`. Tasks 5 e 6 são independentes e podem começar em paralelo. Tasks 3+4 juntas levam ~1.5 dia; o time pode usar Task 5/6 para preencher o gap.
