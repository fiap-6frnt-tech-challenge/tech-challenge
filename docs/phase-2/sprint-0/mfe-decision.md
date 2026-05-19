# Module Federation — Decisão de Arquitetura (ADR)

**Data do PoC:** 2026-05-19
**Sprint:** 0 (Foundation), Task 6
**Status:** ✅ **Decidido — Opção A**
**Decisores (sign-off pendente no Gate Task 7):** dev1-infra, dev2-backend, dev3-ds, dev4-dashboard, dev5-transactions

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

- **Branch do PoC:** [`team-mfe/poc`](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/tree/team-mfe/poc)
- **Commits (5):**
  1. `6d87af0` feat(shell): Module Federation runtime consumer + /poc route (Track B dia 1)
  2. `8d905fe` fix(shell): add error boundary to RemoteHello for graceful MFE failure
  3. `cf87705` refactor(shell): migrate federation runtime to createInstance API
  4. `5b5564f` feat(hello-mfe): Rsbuild remote consumível via Module Federation (Track A)
  5. `ee82d3d` fix(shell): resolve 'two Reacts' bug — use sync lib factory in MF shared

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

## Sign-off (Task 7 Gate decisório — pendente formal)

A reunião do Gate (Task 7, Dia 5 do Sprint 0) terá esse ADR pronto. Os 5 devs apenas verificam evidências e assinam:

- [ ] dev1-infra
- [ ] dev2-backend
- [ ] dev3-ds
- [ ] dev4-dashboard
- [ ] dev5-transactions

Decisão registrada antes da Gate por **PoC já completo e validado visualmente em 2026-05-19** — Gate vira formalidade para garantir consenso explícito.
