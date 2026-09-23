# Task 08 — Fronteiras de módulos (lint + grafo de dependências)

|                 |                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 1 — Clean Architecture](./README.md)                                                            |
| **Owner**       | Dev 3 (Performance & Plataforma)                                                                        |
| **Duração**     | 1 dia                                                                                                   |
| **Prioridade**  | P0                                                                                                      |
| **Branch**      | `dev3-perf/module-boundaries`                                                                           |
| **Depende de**  | Task 01 (pacote core existe)                                                                            |
| **Desbloqueia** | Documentação de arquitetura (S4-06), vídeo (S4-08)                                                      |
| **Requisito**   | Arquitetura modular · Clean Architecture                                                                |
| **Embasamento** | Princípios e Padrões — Aula 3 (Componentização e Arquitetura Modular) · Arquiteturas Avançadas — Aula 2 |

---

## Contexto

Camadas só existem se forem verificadas. Esta task transforma a regra de dependência em lint (quebra o build) e gera um grafo de dependências para o README e o vídeo.

## Regras

| Origem                                | Não pode importar                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `packages/core/**`                    | `react`, `next`, `next-auth`, `drizzle-orm`, `pg`, `@vercel/blob`, outros `@bytebank/*`, `node:*` |
| `apps/*-mfe/**`                       | `apps/shell/**`, `next/*`, `drizzle-orm`                                                          |
| `apps/shell/src/app/api/**`           | `@/db`, `drizzle-orm` (só `@/server/container` e `@/server/http`)                                 |
| `**/presentation/**`                  | `**/infrastructure/**` (só via composition root)                                                  |
| `packages/design-system/src/atoms/**` | `molecules`, `organisms` (Task 09)                                                                |
| qualquer arquivo                      | símbolos movidos de `@bytebank/shared` (aviso: "importe de `@bytebank/core`")                     |

Implementação com `no-restricted-imports` / `import/no-restricted-paths` (ou `eslint-plugin-boundaries`) no flat config de cada workspace.

## Grafo e checagem com `dependency-cruiser`

`.dependency-cruiser.cjs` na raiz com as mesmas regras, mais scripts no `package.json` raiz:

```json
{
  "arch:check": "depcruise apps packages --config .dependency-cruiser.cjs",
  "arch:graph": "depcruise packages apps --config .dependency-cruiser.cjs --collapse \"^(packages|apps)/[^/]+\" --output-type mermaid > docs/phase-4/assets/dependency-graph.mmd"
}
```

CI: adicionar `npm run arch:check` ao job `ci`.

## Validação

- [ ] Um import proibido de teste (ex.: `drizzle-orm` numa rota) quebra o lint e o `arch:check`
- [ ] `arch:check` roda na CI
- [ ] `docs/phase-4/assets/dependency-graph.mmd` gerado e renderizando no GitHub
- [ ] Regras em modo `error` no fim do sprint

## Gotchas

1. `--output-type mermaid` dispensa o Graphviz (que não vem instalado no Windows), e o GitHub renderiza Mermaid no Markdown.
2. O ESLint (flat config) é por workspace: aplique as regras num config compartilhado ou em cada app/pacote.
3. Comece com as regras em `warn` no dia 1 e passe para `error` quando as Tasks 04 e 06 migrarem os imports. Senão a CI trava o time no meio da refatoração.
