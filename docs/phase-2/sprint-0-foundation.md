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

### 3. Extrair packages/shared (0.5 dia · **dev2-backend**)

> 📋 **Passo-a-passo completo:** [sprint-0/03-extract-shared.md](./sprint-0/03-extract-shared.md)
> Reordenada antes do DS porque DS depende de `cn`, `getInputBorderColor` e tipos do shared.

Resumo:

- [ ] Criar `packages/shared/{package.json, tsconfig.json, README.md, src/index.ts}` (name: `@bytebank/shared`, sem deps de UI ou framework)
- [ ] `git mv apps/shell/src/types/* packages/shared/src/types/`
- [ ] `git mv apps/shell/src/lib/* packages/shared/src/lib/` (classes, format, input, transactions)
- [ ] `git mv apps/shell/src/shared/constants/* packages/shared/src/constants/`
- [ ] Em `constants/transaction.ts`: remover import de `@/components/ui/Select`; inline `SelectOption` estrutural (evita ciclo)
- [ ] Ajustar imports internos do shared (`@/types` → `../types`, etc.) para caminhos relativos
- [ ] No `apps/shell/package.json`: adicionar dep `"@bytebank/shared": "*"`
- [ ] No `apps/shell/next.config.ts`: adicionar `transpilePackages: ['@bytebank/shared']`
- [ ] Codemod ~40 arquivos em `apps/shell/src/`: `@/types`, `@/lib/*`, `@/shared/constants/*` → `@bytebank/shared` (cobre tanto features quanto DS components que ainda vivem no shell)

**Aceite:** `npm run build/lint -w @bytebank/shell` passa; home + transactions idênticas à Fase 1; `grep` por imports antigos retorna vazio.

### 4. Extrair packages/design-system (1 dia · **dev3-ds**)

> 📋 **Passo-a-passo completo:** [sprint-0/04-extract-design-system.md](./sprint-0/04-extract-design-system.md)
> Depende de Task 3 — DS importa `cn`, `getInputBorderColor` e mock `Transaction` de `@bytebank/shared`.

Resumo:

- [ ] Criar `packages/design-system/{package.json, tsconfig.json, README.md}` (name: `@bytebank/design-system`, dep `@bytebank/shared: "*"`)
- [ ] `git mv apps/shell/src/components/ui/* packages/design-system/src/components/`
- [ ] `git mv apps/shell/.storybook/* packages/design-system/.storybook/`
- [ ] `git mv apps/shell/stories packages/design-system/stories`
- [ ] `git mv apps/shell/src/app/tokens.css packages/design-system/src/styles/tokens.css`
- [ ] `git mv apps/shell/src/app/globals.css packages/design-system/src/styles/globals.css` (+ adicionar `@source "../components/**"` para Tailwind v4)
- [ ] Criar `packages/design-system/src/index.ts` com barrel exports (incluir `ErrorState` e `ViewportFix` que estavam fora)
- [ ] No `apps/shell/package.json`: adicionar dep `"@bytebank/design-system": "*"`; remover devDeps de storybook/chromatic + scripts correspondentes
- [ ] No `apps/shell/next.config.ts`: adicionar `@bytebank/design-system` ao `transpilePackages`
- [ ] Criar novo `apps/shell/src/app/globals.css` thin shim que importa do DS + `@source "../**"` para features
- [ ] Codemod de imports no shell: `@/components/ui` → `@bytebank/design-system` (28 arquivos)
- [ ] Atualizar `.github/workflows/chromatic.yml`: target `phase-2`, `workingDir: packages/design-system`, Node 20

**Aceite:** `npm run storybook -w @bytebank/design-system` sobe em `:6006` com todos os componentes; shell consome via workspace dep; home + transactions visualmente idênticas à Fase 1.

### 5. Criar packages/api-client e packages/stores (vazios) (0.5 dia · **dev2-backend**)

> 📋 **Passo-a-passo completo:** [sprint-0/05-create-empty-packages.md](./sprint-0/05-create-empty-packages.md)
> Independente de Tasks 3 e 4 — pode rodar em paralelo. Sprint 1 preenche os stubs.

Resumo:

- [ ] Criar `packages/api-client/{package.json, tsconfig.json, src/index.ts, README.md}` (name: `@bytebank/api-client`, sem runtime deps, `react` como peerDep)
- [ ] Criar `packages/stores/{package.json, tsconfig.json, src/index.ts, README.md}` (name: `@bytebank/stores`, mesma estrutura)
- [ ] `src/index.ts` em ambos com `export {}` + TODO comment apontando para Sprint 1 tasks 7 e 8
- [ ] Em `apps/shell/package.json`: adicionar deps `"@bytebank/api-client": "*"` e `"@bytebank/stores": "*"` para validar workspace resolution

**Aceite:** `npm install` resolve workspace deps sem erro; shell continua subindo idêntico.

### 6. PoC Module Federation — Opção A (3 dias · **dev4-dashboard** [remote] + **dev5-transactions** [shell consumer] em paralelo)

> 📋 **Passo-a-passo completo:** [sprint-0/06-poc-module-federation.md](./sprint-0/06-poc-module-federation.md)
> ⚠️ **Maior risco do Sprint 0.** Se PoC falhar, aciona fallback Opção D (build-time MFE via workspace packages).

Resumo:

- [ ] Branch compartilhada `phase-2/dev4+5/poc-module-federation` (ambos devs commitam)
- [ ] **Track A** (`dev4-dashboard`): criar `apps/hello-mfe` Rsbuild + `@module-federation/rsbuild-plugin`, expor `<Hello />` consumindo `@bytebank/design-system` e `@bytebank/shared` com `singleton: true`
- [ ] **Track B** (`dev5-transactions`): instalar `@module-federation/enhanced` no shell, criar `src/lib/federation.ts` com runtime `init()` + `loadRemote()`, criar `<RemoteHello />` wrapper com `dynamic(...)`, rota temporária `/poc` para validar
- [ ] **Dia 3:** integrar; preencher matriz de validação de 16 critérios (NetworkTab, React DevTools, tokens DS, hot reload, build prod, Vercel preview)
- [ ] Salvar evidências (screenshots + logs) em `docs/phase-2/sprint-0/poc-mf-evidence/`

**Decisão técnica importante:** usamos **runtime API** (`@module-federation/enhanced/runtime`) ao invés de webpack/turbopack plugin — `@module-federation/nextjs-mf` não suporta Next 16 App Router. Runtime API bypassa o bundler do shell e funciona com Turbopack.

**Aceite (Task 7 — Gate dia 5):**

- ≥ 14/16 critérios verdes → Opção A confirmada; Sprints 2/3 copiam padrão
- < 14/16 OU bloqueio em critérios obrigatórios → fallback Opção D (criar `docs/phase-2/sprint-0/mfe-decision.md` documentando)

**Aceite:** `hello-mfe` rodando em `:3001` aparece dentro do shell em `:3000` com tokens DS aplicados (ou opção D ativada e documentada após gate).

### 7. Gate decisório (Dia 5 · **todo time** · 30 min)

> 📋 **Passo-a-passo completo:** [sprint-0/07-gate-decision.md](./sprint-0/07-gate-decision.md)
> Reunião decisória — sem código. Outputs: `mfe-decision.md` + atualização do PLAN.md + merge (ou não) do PR da Task 6.

Resumo da agenda (30 min):

- [ ] **0-10 min:** Demo Track A (hello-mfe :3001) + Demo Track B (shell :3000 → /poc)
- [ ] **10-15 min:** Walkthrough da matriz de validação 16 itens
- [ ] **15-20 min:** Bloqueios e dúvidas — última chance de levantar problemas
- [ ] **20-25 min:** Votação informada (A, D, ou abster) — maioria simples decide; empate: dev1-infra desempata
- [ ] **25-30 min:** Ação imediata — escrever `mfe-decision.md`, mergear PR (se A) ou planejar fallback (se D)

**Critérios:**

- ≥ 14/16 verdes (com #3, #6, #11-#13 obrigatórios) → **Opção A confirmada**
- 10-13/16 → discussão; workaround < 1 dia vai pra A
- < 10/16 OU bloqueio sem workaround → **Opção D acionada**

**Outputs obrigatórios:**

- `docs/phase-2/sprint-0/mfe-decision.md` (Decision Record com sign-off de todos os 5 devs)
- PLAN.md atualizado com status final
- Merge ou archive do PR da Task 6

### 8. CI atualizado (0.5 dia · **dev1-infra**)

> 📋 **Passo-a-passo completo:** [sprint-0/08-update-ci.md](./sprint-0/08-update-ci.md)
> Depende do Gate (Task 7) — workflows divergem ligeiramente conforme Opção A ou D.

Resumo:

- [ ] Criar `.github/workflows/ci.yml` rodando `turbo run lint type-check build test --affected` com `fetch-depth: 2`
- [ ] Atualizar `.github/workflows/chromatic.yml`: trigger inclui `phase-2`, `workingDir: packages/design-system`, `onlyChanged: true`
- [ ] Configurar Turborepo Remote Cache (Vercel — `TURBO_TOKEN` secret + `TURBO_TEAM` variable) OU fallback GH Actions cache
- [ ] Garantir scripts `type-check` em todos packages (`tsc --noEmit`)
- [ ] Husky `.husky/pre-commit` rodando `npx lint-staged` (já configurado no root `package.json` em Task 1)
- [ ] Validar PR de teste — ambos workflows verdes, `--affected` funciona

**Aceite:** PR contra `phase-2` aciona CI verde em ~5 min cold / ~2 min cache hit; Chromatic publica DS storybook.

### 9. Smoke test final (0.5 dia · **todo time**)

> 📋 **Passo-a-passo completo:** [sprint-0/09-smoke-test-final.md](./sprint-0/09-smoke-test-final.md)
> Última task do Sprint 0 — validação end-to-end em clone limpo + retrospectiva síncrona.

Resumo:

- [ ] Cada dev clona o repo em diretório novo (`git clone` + `git checkout phase-2`)
- [ ] `npm install` resolve todos workspaces sem warnings críticos
- [ ] Validar matriz de 18 critérios (build, lint, test, storybook, CI, Vercel preview, hot reload, git history preservado, etc.)
- [ ] Investigar e corrigir falhas via issues label `sprint-0-blocker`
- [ ] **Retrospectiva síncrona 1h:** o que foi bem, o que foi difícil, ajustes para Sprint 1, pontuação de saúde do time (1-5)
- [ ] Documentar em `docs/phase-2/sprint-0/retrospective.md` com sign-off dos 5 devs

**Critério final para fechar Sprint 0:** matriz 100% ✅, retrospective committed, sign-off de todos, PLAN.md atualizado com data real de fechamento.

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
