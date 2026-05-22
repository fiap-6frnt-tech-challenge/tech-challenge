# Module Federation — Decisão de Arquitetura (ADR)

**Data do PoC:** 2026-05-19
**Data do merge (PR #42):** 2026-05-22
**Sprint:** 0 (Foundation), Task 6
**Status:** ✅ **Decidido — Opção A** (ratificado via merge do [PR #42](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/42); sign-off formal pendente na Gate Task 7)
**Decisores:** dev1-infra, dev2-backend, dev3-ds, dev4-dashboard, dev5-transactions

---

## Decisão

> **Opção A — Rsbuild remotes + `@module-federation/enhanced` runtime API**, com shell Next.js 16 App Router consumindo via `dynamic({ ssr: false })` envolto em error boundary.

## Contexto

A spec da Fase 2 exige microfrontends com Module Federation ou Single SPA ([POSTECH Tech Challenge Fase 2, p.3](../POSTECH - Tech Challenge - Fase 2.pdf)). Análise inicial elegeu **Opção A** ([PLAN.md](../PLAN.md#decisão-module-federation--opção-a-validada-via-poc)) com 3 alternativas documentadas:

- **B.** Vite + `@originjs/vite-plugin-federation` — plugin não-oficial
- **C.** Downgrade shell para Next 14 Pages Router + `@module-federation/nextjs-mf` — regressão de framework
- **D.** Build-time MFE via workspace packages — não é federação runtime; reservado como fallback

O risco era que `@module-federation/nextjs-mf` (plugin tradicional) **não suporta Next 16 App Router**. Esta decisão valida que conseguimos usar a **runtime API** (`@module-federation/enhanced/runtime`) bypassando o plugin webpack/turbopack.

## Evidências

- **PR (mergeado em phase-2):** [#42](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/42) — `team-mfe/poc → phase-2`
- **Build logs em produção (critérios #11–#13):** [`poc-mf-evidence/5-prod-build-logs.txt`](./poc-mf-evidence/5-prod-build-logs.txt) — `npm run build` passa em hello-mfe (~3s, gera `mf-manifest.json`) e shell (`/poc` listada como rota static)
- **Screenshots (critérios #1–#7):** [`poc-mf-evidence/`](./poc-mf-evidence/) — 4 PNGs a coletar antes do Gate (instruções no [README](./poc-mf-evidence/README.md))
- **Commits do PoC (10):** ver `git log --oneline phase-2` filtrar pelo período 2026-05-17 → 2026-05-22. Principais:
  - `feat(shell)`: MF runtime consumer + /poc route (Track B)
  - `fix(shell)`: error boundary em RemoteHello
  - `refactor(shell)`: migração runtime para `createInstance` API
  - `feat(hello-mfe)`: Rsbuild remote (Track A)
  - `fix(shell)`: 'two Reacts' bug — sync lib factory
  - `chore(hello-mfe)`: vercel.json com CORS para cross-origin federation
  - `fix(eslint)`: `tsconfigRootDir` para typescript-eslint v8

### Matriz de validação (16 critérios, ≥14 verde = aprovado; obrigatórios #3, #6, #11-#13)

| #      | Critério                                                         | Status                                                      |
| ------ | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| 1      | hello-mfe `:3001` retorna `mf-manifest.json` 200                 | ✅                                                          |
| 2      | shell `:3000` /poc carrega 200                                   | ✅                                                          |
| **3**  | **`<Hello />` renderiza dentro do shell**                        | ✅ **(obrigatório)**                                        |
| 4      | DevTools Network: `mf-manifest.json` carregado                   | ✅                                                          |
| 5      | DevTools Network: chunks remotos carregados                      | ✅                                                          |
| **6**  | **Árvore React única (sem two-Reacts)**                          | ✅ **(obrigatório)**                                        |
| 7      | Singleton React (1 instância na árvore)                          | ✅                                                          |
| 8      | Tokens DS aplicados                                              | N/A (Hello usa inline styles — DS extraído só em Tasks 3+4) |
| 9      | `onClick` do botão do remote funciona                            | ✅                                                          |
| 10     | Hot reload entre apps reflete em <5s                             | ✅                                                          |
| **11** | **`npm run build -w @bytebank/hello-mfe`**                       | ✅ **(obrigatório)**                                        |
| **12** | **`npm run build -w @bytebank/shell`**                           | ✅ **(obrigatório)**                                        |
| **13** | **Integração em produção** (`npm run preview` + `npm run start`) | ✅ **(obrigatório)**                                        |
| 14     | Vercel preview verde                                             | ⏳ pendente (após push) — não bloqueante                    |
| 15     | Sem warnings de version mismatch                                 | ✅                                                          |
| 16     | Sem erros de hydration                                           | ✅                                                          |

**Score: 14/16 ✅ + 1 N/A + 1 pendente** → **Acima do threshold de aprovação.**

## Racional

Opção A foi escolhida porque:

1. **Atende literalmente a spec** — "Module Federation" runtime via `remoteEntry.js` + `mf-manifest.json` visíveis em DevTools, federação real entre dois apps com bundlers distintos
2. **Preserva shell Next.js 16 + App Router** — nenhuma regressão de framework necessária
3. **Bypass do plugin webpack via runtime API** — `createInstance` + `loadRemote` funcionam com Turbopack
4. **Deploy independente** — `apps/shell` (Vercel Next) e `apps/hello-mfe` (Vercel Static/Cloudflare Pages) deployam separados
5. **Singletons React funcionando** — após pattern correto descoberto no PoC (ver lições aprendidas)

### Por que NÃO as alternativas

- **B (Vite plugin):** plugin não-oficial, comunidade ativa mas não evolui em par com MF spec. Risco de bugs futuros sem fixes rápidos.
- **C (Next 14 downgrade):** perderíamos App Router + RSC + Turbopack. Regressão significativa por solução teoricamente "mais oficial Next".
- **D (build-time):** não é "federação runtime" — não satisfaz a spec na sua interpretação mais rigorosa. Reservado como fallback **não acionado**.

## Consequências

### O que ganhamos

- Stack moderno: Next 16 App Router + Rsbuild/Rspack (build mais rápido que webpack tradicional)
- Federação visível em runtime — demonstrável no vídeo demo (DevTools mostrando `remoteEntry.js` + chunks federados)
- Deploys independentes — cada MFE pode atualizar sem rebuild do shell
- Sprints 2 e 3 têm padrão estabelecido (`apps/hello-mfe` é referência)

### O que abrimos mão

- **SSR dos remotes** — MFEs são CSR (`ssr: false` em `next/dynamic`). Aceitável porque MFEs são autenticadas (`noindex`) e o shell faz SSR de skeleton + metadata para perceived performance.
- **Plugin oficial Next** — usamos runtime API direto (`createInstance`), o que é menos integrado com o lifecycle do Next mas mais flexível.

## Impacto em sprints subsequentes

- **Sprint 2 (`dashboard-mfe`):** copia padrão de `apps/hello-mfe` — Rsbuild + `pluginModuleFederation` expõe `./Dashboard`. Shell consome via `dynamic` em `/`.
- **Sprint 3 (`transactions-mfe`):** idem — expõe `./TransactionsPage`. Shell consome em `/transactions`.
- **Sprint 4:** documenta Module Federation no README final + vídeo demo mostra DevTools Network com federação ao vivo.

## 🔥 Lições aprendidas durante o PoC (CRÍTICO para Sprints 2-3)

3 gotchas descobertos que custariam horas/dias se ignorados:

### 1. `init()` está DEPRECADO em `@module-federation/enhanced` v2+

```ts
// ❌ ERRADO — gera warning de deprecação
import { init, loadRemote } from '@module-federation/enhanced/runtime';
init({ ... });

// ✅ CORRETO
import { createInstance, getInstance } from '@module-federation/enhanced/runtime';
const mf = getInstance() ?? createInstance({ ... });
await mf.loadRemote('hello/Hello');
```

Pattern `getInstance() ?? createInstance` adiciona resilência a HMR (em dev a module re-avalua, instância global persiste).

### 2. `lib: () => React` (SÍNCRONO), não `() => import('react')` (async)

```ts
// ❌ ERRADO — duplica React entre shell e remote
shared: {
  react: { lib: () => import('react'), ... }
}

// ✅ CORRETO — singleton funciona
import * as React from 'react';
shared: {
  react: { lib: () => React, ... }
}
```

**Sintoma do bug:** `TypeError: Cannot read properties of undefined (reading 'recentlyCreatedOwnerStacks')` no primeiro render do componente federado. React 19 detecta dessincronização entre 2 instâncias coexistindo via owner stacks (dev-only).

**Por que aconteceu:** runtime API do MF espera factory síncrona retornando o módulo já carregado. Async com Promise não consegue identificar o React já presente no shell, registra cópia separada do remote, gera dupla árvore.

### 3. Error boundary OBRIGATÓRIO ao redor do componente federado

Sem error boundary:

- **Em dev:** Next dispara overlay full-screen no primeiro fetch falhado do manifest
- **Em prod:** página inteira crash (white screen of death)

Solução: `<MFErrorBoundary>` (ver [Task 6 B3](./06-poc-module-federation.md#b3-criar-wrapper-appsshellsrccomponentsremotehellotsx)) com UI inline "MFE indisponível" + `role="alert"` + `<details>` com stack + `console.error` para observabilidade.

### Bônus: convenção de branches

Descobrimos que **não é possível criar branches `phase-2/<dev>/<task>`** porque já existe um ref `phase-2`. Git trata refs como paths no filesystem. **Convenção atualizada:** branches usam só `<dev-handle>/<task>` (sem prefixo `phase-2/`). Base do PR continua `phase-2`. Veremos [project_phase2_git_workflow.md](../../../.claude/projects/.../memory/) atualizar.

## Alternativas avaliadas (e descartadas durante o PoC)

| Opção                                               | Motivo de não escolha                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **B.** Vite + `@originjs/vite-plugin-federation`    | Plugin não-oficial; risco de divergência futura da spec MF                                                                                 |
| **C.** Downgrade Next 14 Pages Router + `nextjs-mf` | Regressão de framework; perde App Router/RSC/Turbopack                                                                                     |
| **D.** Build-time MFE (workspace packages)          | Não é federação runtime; reservado como fallback **não acionado**                                                                          |
| **E.** Single SPA                                   | Exigiria reescrever shell Next.js; +5 dias de retrabalho sem ganho proporcional para time 100% React (avaliado e descartado em 2026-05-17) |

## Sign-off (Task 7 Gate decisório)

PoC validado e mergeado em `phase-2` via PR #42 (2026-05-22). A reunião do Gate é a **formalização do consenso** + revisão dos artefatos abaixo.

**Artefatos para revisar antes do Gate:**

- Este ADR
- [`poc-mf-evidence/README.md`](./poc-mf-evidence/README.md) — descreve cada PNG + onde os critérios são validados
- [`poc-mf-evidence/5-prod-build-logs.txt`](./poc-mf-evidence/5-prod-build-logs.txt) — builds prod
- Demo ao vivo na reunião — ver [agenda da Task 7](./07-gate-decision.md#agenda-30-min)

**Sign-off** (cada dev marca após reunião):

- [ ] dev1-infra
- [ ] dev2-backend
- [ ] dev3-ds
- [ ] dev4-dashboard
- [ ] dev5-transactions
