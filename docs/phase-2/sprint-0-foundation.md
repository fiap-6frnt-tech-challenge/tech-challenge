# Sprint 0 — Foundation

**Duração:** 7 dias · 2026-05-13 → 2026-05-19
**Objetivo:** Monorepo Turborepo + npm workspaces funcionando, Design System extraído, PoC de Module Federation verde (ou fallback decidido).

> Voltar para o [PLAN.md](./PLAN.md) · **Alocação de tarefas por dev:** [team-allocation.md#sprint-0](./team-allocation.md#sprint-0--foundation-7-dias)

---

## Pré-requisitos

- [x] **Decisão MF: Opção A — Rsbuild + `@module-federation/enhanced`** (ver PLAN.md)
- [x] Branch de integração `phase-2` já criada e disponível em `origin` (long-lived; recebe todos os PRs da fase)
- [ ] Cada track cria sub-branch a partir de `phase-2`: `phase-2/dev1-infra/<task>`, `phase-2/dev3-ds/<task>`, etc. — ver [Git Workflow no PLAN.md](./PLAN.md#git-workflow--fase-2)
- [ ] Node 20+ e npm 10+ instalados em todas as máquinas
- [ ] Acesso ao Chromatic atualizado (token `chpt_330cd685ba026e8`)

---

## Tasks

> 🔗 **Tasks 1 e 2 são bundled num PR único atômico** ([sprint-0/README.md](./sprint-0/README.md#princípio-do-sprint-0-e-da-fase-inteira)). Task 1 isolada quebraria `phase-2` (sem deps do Next no root). As 2 saem juntas em `phase-2/dev1-infra/monorepo-migration` com 2 commits e 1 PR.

### 1. Bootstrap monorepo (1 dia · **dev1-infra**)

- [ ] Criar `tech-challenge/package.json` workspace root (private, no deps) com:
  ```json
  {
    "name": "bytebank-monorepo",
    "private": true,
    "workspaces": ["apps/*", "packages/*"],
    "scripts": {
      "dev": "turbo run dev",
      "build": "turbo run build",
      "lint": "turbo run lint",
      "test": "turbo run test",
      "storybook": "turbo run storybook"
    }
  }
  ```
- [ ] Criar `tech-challenge/turbo.json` com pipelines: `build`, `dev`, `lint`, `test`, `storybook`
- [ ] Mover `package-lock.json` antigo do shell para a raiz (ou regenerar com `npm install`)
- [ ] Criar `.gitignore` raiz herdando do shell (node_modules, .next, dist, .turbo)

**Aceite:** `npm install` na raiz hidrata `node_modules` para todos os futuros packages (hoisting nativo do npm).

### 2. Migrar shell para apps/shell (1 dia · **dev1-infra**)

> 📋 **Passo-a-passo completo:** [sprint-0/02-migrate-shell.md](./sprint-0/02-migrate-shell.md)

Resumo:

- [ ] Mover folders de código fonte (`app/`, `components/`, `context/`, `hooks/`, `lib/`, `services/`, `shared/`, `types/`) → `apps/shell/src/`
- [ ] Mover folders app-level (`data/`, `public/`, `stories/`, `.storybook/`) → `apps/shell/`
- [ ] Mover config files (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `next-env.d.ts`, `global.d.ts`, `vitest.config.ts`, `vitest.shims.d.ts`, `.env.local`) → `apps/shell/`
- [ ] Restaurar `package.json` original (do backup `.package.json.fase1.bak` da Task 1) em `apps/shell/package.json` e renomear para `@bytebank/shell`
- [ ] Atualizar `apps/shell/tsconfig.json` paths: `"@/*": ["./src/*"]`
- [ ] Atualizar `apps/shell/.storybook/main.ts` para apontar `../src/components/**`
- [ ] `.husky/` e `.prettierrc` **permanecem no root** (monorepo root = `tech-challenge/`)
- [ ] `npm install` na raiz + `npm run dev -w @bytebank/shell` sobe shell em `:3000` igual a antes

**Aceite:** shell roda no mesmo estado da Fase 1, mas agora em `apps/shell/`. Todos `npm run dev/build/lint/test/storybook -w @bytebank/shell` passam.

### 3. Extrair packages/design-system (1 dia · **dev3-ds**)

- [ ] Criar `packages/design-system/package.json` (name: `@bytebank/design-system`, type: module)
- [ ] `git mv apps/shell/src/components/ui packages/design-system/src/components`
- [ ] `git mv apps/shell/.storybook packages/design-system/.storybook`
- [ ] `git mv apps/shell/stories packages/design-system/stories`
- [ ] Mover `app/tokens.css` e `app/globals.css` → criar `packages/design-system/src/styles/{tokens,globals}.css` (manter cópia compatibility no shell se necessário)
- [ ] Criar `packages/design-system/src/index.ts` com barrel exports
- [ ] Configurar `tsconfig.json` do package (composite, declarationMap)
- [ ] Configurar build via `tsup` ou simplesmente `tsc` — exports `./components/*` e `./styles/*`
- [ ] No `apps/shell/package.json`, adicionar `"@bytebank/design-system": "workspace:*"`
- [ ] Atualizar imports do shell: `@/components/ui` → `@bytebank/design-system`
- [ ] Mover Storybook scripts para `packages/design-system/package.json`
- [ ] Mover `chromatic.yml` para apontar para `packages/design-system/`

**Aceite:** `npm run storybook -w @bytebank/design-system` sobe em `:6006` com todos os componentes; shell consome via workspace dep.

### 4. Extrair packages/shared (0.5 dia · **dev2-backend**)

- [ ] Criar `packages/shared/package.json` (name: `@bytebank/shared`)
- [ ] `git mv apps/shell/src/types packages/shared/src/types`
- [ ] `git mv apps/shell/src/lib packages/shared/src/lib`
- [ ] `git mv apps/shell/src/shared/constants packages/shared/src/constants`
- [ ] Criar `packages/shared/src/index.ts` com barrel
- [ ] Adicionar `"@bytebank/shared": "workspace:*"` no shell
- [ ] Atualizar imports `@/types`, `@/lib/*`, `@/shared/constants/*` → `@bytebank/shared`

**Aceite:** shell continua compilando após swap dos imports.

### 5. Criar packages/api-client e packages/stores (vazios) (0.5 dia · **dev2-backend**)

- [ ] `packages/api-client/package.json` (deps placeholder)
- [ ] `packages/api-client/src/index.ts` (vazio, comment: "preenchido no Sprint 1")
- [ ] `packages/stores/package.json`
- [ ] `packages/stores/src/index.ts` (vazio)
- [ ] Workspace deps registradas no shell

**Aceite:** `npm install` resolve workspace deps sem erro.

### 6. PoC Module Federation — Opção A (3 dias · **dev4-dashboard** [remote] + **dev5-transactions** [shell consumer] em paralelo)

> **Timebox rigoroso: 3 dias. Gate no dia 5 do sprint.**

#### Setup do remote `hello-mfe` (Rsbuild + Rspack)

- [ ] `npm create rsbuild@latest apps/hello-mfe` (template React-ts)
- [ ] `npm install @module-federation/enhanced @module-federation/rsbuild-plugin -w @bytebank/hello-mfe`
- [ ] Configurar `apps/hello-mfe/rsbuild.config.ts`:

  ```ts
  import { defineConfig } from '@rsbuild/core';
  import { pluginReact } from '@rsbuild/plugin-react';
  import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

  export default defineConfig({
    plugins: [
      pluginReact(),
      pluginModuleFederation({
        name: 'hello',
        exposes: { './Hello': './src/Hello.tsx' },
        shared: {
          react: { singleton: true, requiredVersion: '^19.0.0' },
          'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        },
      }),
    ],
    server: { port: 3001 },
  });
  ```

- [ ] Criar `apps/hello-mfe/src/Hello.tsx` simples (usa DS Button + tokens para validar consumo de workspace deps)

#### Setup do shell consumindo o remote (Next 16 App Router)

- [ ] `npm install @module-federation/enhanced @module-federation/nextjs-mf -w @bytebank/shell`
- [ ] Configurar `apps/shell/next.config.ts` para registrar o remote:
  ```ts
  import { NextFederationPlugin } from '@module-federation/enhanced/nextjs';
  // ... config com remotes: { hello: 'hello@http://localhost:3001/mf-manifest.json' }
  ```
- [ ] Criar `apps/shell/src/components/RemoteHello.tsx`:
  ```tsx
  'use client';
  import dynamic from 'next/dynamic';
  const Hello = dynamic(() => import('hello/Hello'), {
    ssr: false,
    loading: () => <div>Carregando MFE...</div>,
  });
  export { Hello as RemoteHello };
  ```
- [ ] Adicionar `<RemoteHello />` em uma rota temporária `/poc` do shell para validar
- [ ] Configurar singletons compartilhados (`@bytebank/design-system`, `@bytebank/shared`)

#### Validações obrigatórias do PoC

- [ ] DevTools Network: `hello/mf-manifest.json` e chunks remotos carregados
- [ ] DevTools React: árvore única (sem duplicação de React)
- [ ] Tokens do DS aplicados corretamente no MFE (mesma cor de `--color-brand-primary`)
- [ ] Hot reload funciona em ambos shell e MFE
- [ ] `npm run build` em ambos passa
- [ ] Deploy preview Vercel: shell carrega MFE deployed independentemente

#### Fallback opção D (apenas se PoC falhar no Gate dia 5)

- [ ] `hello-mfe` é transformado em `packages/hello-mfe` workspace package
- [ ] Shell consome via import direto em build time
- [ ] Documentar trade-off em `docs/phase-2/mfe-decision.md` (criar)
- [ ] Atualizar PLAN.md marcando opção D como decisão final

**Aceite:** `hello-mfe` rodando em `:3001` aparece dentro do shell em `:3000` com tokens DS aplicados (ou opção D ativada e documentada após gate).

### 7. Gate decisório (Dia 5 · **todo time**)

- [ ] Reunião de 30 min com time + usuário
- [ ] Demo do PoC funcionando OU declarar fallback para opção D
- [ ] Atualizar `PLAN.md` e este arquivo com decisão final
- [ ] Se opção D: documentar trade-off no README

### 8. CI atualizado (0.5 dia · **dev1-infra**)

- [ ] `.github/workflows/ci.yml` (novo): rodar `turbo run lint build test --filter=...[origin/main]`
- [ ] Configurar Turborepo Remote Cache (Vercel ou self-hosted)
- [ ] Atualizar `chromatic.yml` para rodar dentro de `packages/design-system/`
- [ ] Husky hook na raiz: `lint-staged` por package

**Aceite:** PR contra `phase-2/foundation` aciona CI verde.

### 9. Smoke test final (0.5 dia · **todo time**)

- [ ] Clone limpo do repo → `npm install && npm run dev` sobe shell + hello-mfe (via Turborepo)
- [ ] `npm run storybook -w @bytebank/design-system` sobe :6006
- [ ] `npm run build` (raiz, todos workspaces via Turbo) passa
- [ ] `npm test` rodando (mesmo que sem testes ainda)
- [ ] Vercel preview da branch verde com shell deployado

---

## Critério de aceite do sprint

- [x] Monorepo Turborepo + npm workspaces funcional dentro de `tech-challenge/`
- [x] Shell consome `@bytebank/design-system` e `@bytebank/shared` via workspace deps
- [x] Storybook + Chromatic vivendo em `packages/design-system/`
- [x] PoC MF verde (Opção A — Rsbuild + `@module-federation/enhanced`) OU fallback para opção D documentado
- [x] CI verde (lint + build + test em todos packages)
- [x] Vercel preview do shell renderiza igual à Fase 1

## Riscos do sprint

| Risco                                                     | Plano B                                                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| PoC MF estoura 3 dias                                     | Gate dia 5 aciona opção D imediatamente                                                         |
| Imports quebram após migração                             | Codemod com `jscodeshift` ou regex search-replace cuidadoso                                     |
| Tailwind v4 + monorepo: tokens não carregam               | Importar `tokens.css` no shell `layout.tsx`; configurar `@source` no `tailwind.config` do shell |
| Storybook + workspace deps: stories não acham componentes | Story files vivem dentro do package; barrel export correto                                      |

## Definição de Pronto

- Cada PR mergeado para `phase-2/foundation`:
  - CI verde
  - Sem regressão visual no Chromatic
  - Aprovado por 1 revisor
- Sprint só encerra com smoke test passando em clone limpo
