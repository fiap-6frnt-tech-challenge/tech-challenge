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

## Entrega

- **ESLint:** `eslint.boundaries.mjs` na raiz exporta `coreBoundaries`, `mfeBoundaries`, `shellBoundaries` e `sharedDeprecations`, aplicadas pelo `eslint.config.mjs` de cada workspace (`turbo run lint`) e pelo da raiz (pre-commit via `lint-staged`). Está em `globalDependencies` do `turbo.json`, então uma mudança nas regras invalida o cache e entra no `--affected`.
- **Severidade:** as fronteiras já nascem em `error`, porque as Tasks 04 e 06 tinham migrado os imports e não há nenhuma violação. O aviso de símbolos movidos do `@bytebank/shared` usa outra regra (`@typescript-eslint/no-restricted-imports`, em `warn`) para ter severidade própria: hoje são 36 avisos (api-client, design-system, transactions-mfe e shell), migrados em fatias. O `apps/shell/src/lib/federation.ts` fica fora do aviso porque compartilha o módulo `shared` inteiro com os MFEs.
- **Ajustes na tabela de regras:**
  - core: também `react-dom` e `@vercel/blob/*`.
  - MFEs: também `next-auth` e `pg`; `**/shell/**` pega imports relativos para o shell.
  - shell: a regra de `app/api/**` vale para toda a apresentação do shell (`src/app/**`, `src/components/**`, `src/server/http/**`), proibindo `@/db`, `**/infrastructure/**`, `drizzle-orm` e `pg` (ADR-001).
  - `**/presentation/**`: aplicada nos MFEs, os únicos com essa pasta.
  - Atomic Design: o lint continua no `eslint.layers.mjs` do S1-09 e as regras entram no `dependency-cruiser`.
- **dependency-cruiser 17:** a 18 exige Node 22, e o `engines` da raiz aceita 20. O `.dependency-cruiser.cjs` repete as regras (menos o aviso por símbolo, que o depcruise não enxerga) e acrescenta `nao-resolvido`: sem ela, um alias que deixasse de resolver faria as regras de caminho passarem em silêncio. Varre só `src/`, sem configs nem stories. O `tsconfig.depcruise.json` mapeia o alias `@/` do shell.
- **Scripts:** `arch:check` usa `--output-type err-long`, que mostra o motivo de cada regra. `arch:graph` usa `--include-only "^(apps|packages)/"` (pacotes npm ficam fora do grafo) e `--output-to` em vez de `>`.
- **CI:** step `Architecture check` depois do Lint, sem `--affected` (repo inteiro).
- **Grafo:** [`docs/phase-4/assets/dependency-graph.mmd`](../assets/dependency-graph.mmd). O GitHub renderiza `.mmd` ao abrir o arquivo (aba Preview), mas não no diff do PR nem como imagem dentro de um Markdown: o S4-06 precisa colar o conteúdo num bloco ` ```mermaid `.
- **Achado fora do escopo:** `DeleteTransactionModal.stories.tsx` e `EditTransactionModal.stories.tsx` (transactions-mfe) importam `../../../../stories/mocks/transactions`, que não existe. Ninguém percebeu porque o tsconfig e o ESLint do MFE ignoram stories.

## Validação

- [x] Um import proibido de teste (ex.: `drizzle-orm` numa rota) quebra o lint e o `arch:check`: sondas em core, rota, MFE, apresentação e átomo geraram 11 erros no ESLint do workspace, no da raiz e no depcruise
- [x] `arch:check` roda na CI (step adicionado; confirmar no PR)
- [x] `docs/phase-4/assets/dependency-graph.mmd` gerado e renderizando no GitHub (aba Preview ao abrir o arquivo; o diff do PR mostra só o código)
- [x] Regras em modo `error` no fim do sprint (o aviso de símbolos movidos segue em `warn`, como definido na tabela)

## Gotchas

1. `--output-type mermaid` dispensa o Graphviz (que não vem instalado no Windows), e o GitHub renderiza Mermaid no Markdown.
2. O ESLint (flat config) é por workspace: aplique as regras num config compartilhado ou em cada app/pacote.
3. Comece com as regras em `warn` no dia 1 e passe para `error` quando as Tasks 04 e 06 migrarem os imports. Senão a CI trava o time no meio da refatoração.
4. No flat config, `no-restricted-imports` não se acumula: a última config que casa com o arquivo substitui as anteriores. Por isso a zona de apresentação dos MFEs repete os padrões do MFE, e o aviso de símbolos movidos usa a variante `@typescript-eslint/` para ter outra severidade.
5. No depcruise, use `doNotFollow` para `node_modules`, nunca `exclude`: excluir `node_modules` silencia as regras sobre `drizzle-orm`, `next` etc. O `exclude` também é testado nos diretórios sem a barra final (`apps/shell/src`).
6. O depcruise resolve `paths` de um tsconfig sem `baseUrl` a partir do cwd, não da pasta do tsconfig. Daí o `tsconfig.depcruise.json` na raiz, referenciado por caminho absoluto: no Windows, o relativo dá TS18003.
