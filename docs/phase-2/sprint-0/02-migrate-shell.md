# Task 2 — Migrar shell para `apps/shell/`

> ✅ **Status: Done** — bundled com Task 1 em [PR #40](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/40), mergeado em `phase-2` em 2026-05-19.

> 🔗 **Esta task é bundled com [Task 1 — Bootstrap monorepo](./01-bootstrap-monorepo.md) num único PR atômico.**
> Razão: Task 1 isolada deixa `phase-2` quebrada (sem deps do Next no root). Esta task fecha a transição e valida que tudo funciona antes de pushar. Use a mesma branch (`dev1-infra/monorepo-migration`) que a Task 1 deixou com o commit local.

|                          |                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**               | [Sprint 0 — Foundation](../sprint-0-foundation.md)                                                                                    |
| **Owner**                | `dev1-infra`                                                                                                                          |
| **Duração estimada**     | 1 dia (parte 2 de 2 dias do bundle)                                                                                                   |
| **Branch compartilhada** | `dev1-infra/monorepo-migration` (mesma da Task 1, com commit 1/2 já feito)                                                            |
| **Depende de**           | [Task 1 — Bootstrap monorepo](./01-bootstrap-monorepo.md) commit local feito (NÃO mergeada — ainda não foi pushada)                   |
| **Desbloqueia**          | Task 3 (extract DS), Task 4 (extract shared), Task 5 (empty packages), Task 6 (PoC MF) — todas após o PR atômico mergear em `phase-2` |

---

## Contexto

A Task 1 deixou o monorepo bootstrap pronto mas **vazio** (`apps/` e `packages/` só com `.gitkeep`). O código Next.js da Fase 1 ainda está no root de `tech-challenge/`, fora dos workspaces.

Esta task **move todo o código existente** (folders + configs) para `apps/shell/`, criando o primeiro workspace consumível: `@bytebank/shell`. Após essa task, `npm install` na raiz funciona, `npm run dev -w @bytebank/shell` sobe o shell em `:3000` **exatamente como na Fase 1** — só que agora dentro do monorepo.

Esta task não extrai nada para `packages/` ainda — isso fica para Tasks 3 e 4. Aqui o objetivo é só **realocar fisicamente** o shell para sua posição final no monorepo.

## Mapa de migração

### Folders de código fonte

| Atual (root)  | Destino (apps/shell)         | Por quê está aqui                                      |
| ------------- | ---------------------------- | ------------------------------------------------------ |
| `app/`        | `apps/shell/src/app/`        | App Router pages + layouts + API routes                |
| `components/` | `apps/shell/src/components/` | UI + features (Task 3 extrai `ui/` → DS)               |
| `context/`    | `apps/shell/src/context/`    | TransactionsContext, FeedbackContext (Sprint 1 remove) |
| `hooks/`      | `apps/shell/src/hooks/`      | useTransactionFilters etc.                             |
| `lib/`        | `apps/shell/src/lib/`        | format, classes, transactions (Task 4 extrai → shared) |
| `services/`   | `apps/shell/src/services/`   | TransactionService (Sprint 1 vira api-client)          |
| `shared/`     | `apps/shell/src/shared/`     | constants/transaction (Task 4 extrai → shared)         |
| `types/`      | `apps/shell/src/types/`      | Transaction, Account (Task 4 extrai → shared)          |
| `data/`       | `apps/shell/data/`           | seed JSON consumido pela API route                     |
| `public/`     | `apps/shell/public/`         | assets estáticos (logo, piggy-bank, etc.)              |
| `stories/`    | `apps/shell/stories/`        | foundations + mocks Storybook (Task 3 move → DS)       |
| `.storybook/` | `apps/shell/.storybook/`     | config Storybook (Task 3 move → DS)                    |

### Config files (root → `apps/shell/`)

| Arquivo              | Por quê move                                      |
| -------------------- | ------------------------------------------------- |
| `next.config.ts`     | Config do app Next, pertence ao shell             |
| `tsconfig.json`      | Compile config do shell                           |
| `eslint.config.mjs`  | Lint do shell (configs base ficam no root depois) |
| `postcss.config.mjs` | Tailwind v4 PostCSS, pertence ao shell            |
| `next-env.d.ts`      | Auto-gerado pelo Next                             |
| `global.d.ts`        | Tipagens globais do shell                         |
| `vitest.config.ts`   | Test config do shell                              |
| `vitest.shims.d.ts`  | Shims do Vitest                                   |
| `.env.local`         | Env vars do shell (`NEXT_PUBLIC_API_URL=/api`)    |

### Files que **permanecem no root** do monorepo

| Arquivo / Pasta     | Por quê fica no root                             |
| ------------------- | ------------------------------------------------ |
| `package.json`      | Workspace manifest (já criado em Task 1)         |
| `turbo.json`        | Pipeline manager (Task 1)                        |
| `package-lock.json` | Lockfile único para todos workspaces (npm hoist) |
| `.gitignore`        | Cobre todo o monorepo                            |
| `.husky/`           | Pre-commit hook roda na raiz do repo             |
| `.prettierrc`       | Config compartilhada por todos workspaces        |
| `.github/`          | Workflows CI (Task 8 ajusta para Turbo)          |
| `.claude/`          | Configs Claude/IDE — não é parte do monorepo     |
| `docs/`             | Docs top-level (incluindo `phase-2/`)            |
| `README.md`         | README do projeto (Sprint 4 atualiza)            |

## Pré-condições

- [x] [Task 1](./01-bootstrap-monorepo.md) com commit local **na mesma branch** `dev1-infra/monorepo-migration` (NÃO mergeada em `phase-2` ainda — PR único sai daqui)
- [ ] Você continua na mesma branch — confirme com:
  ```bash
  git branch --show-current   # deve mostrar: dev1-infra/monorepo-migration
  git log --oneline -1        # deve mostrar o commit "chore(monorepo): bootstrap Turborepo..."
  ```
- [ ] Working tree limpa (`git status` zerado)
- [ ] Backup local `tech-challenge/.package.json.fase1.bak` ainda existe (criado na Task 1)

## Implementação passo-a-passo

> Todos os comandos rodam a partir de `tech-challenge/`. Use **`git mv`** (não `mv`) para preservar histórico — `git blame` e `git log --follow` continuarão funcionando.

### Phase A — Mover folders de código

```bash
# Source code que vai dentro de src/
git mv app apps/shell/src/app
git mv components apps/shell/src/components
git mv context apps/shell/src/context
git mv hooks apps/shell/src/hooks
git mv lib apps/shell/src/lib
git mv services apps/shell/src/services
git mv shared apps/shell/src/shared
git mv types apps/shell/src/types

# Folders no nível do app (não dentro de src)
git mv data apps/shell/data
git mv public apps/shell/public
git mv stories apps/shell/stories
git mv .storybook apps/shell/.storybook

# Remover .gitkeep do apps/ (já tem conteúdo)
git rm apps/.gitkeep
```

> Para verificar movimentos: `git status --short` deve listar várias linhas começando com `R` (renamed).

### Phase B — Mover config files

```bash
git mv next.config.ts apps/shell/next.config.ts
git mv tsconfig.json apps/shell/tsconfig.json
git mv eslint.config.mjs apps/shell/eslint.config.mjs
git mv postcss.config.mjs apps/shell/postcss.config.mjs
git mv next-env.d.ts apps/shell/next-env.d.ts
git mv global.d.ts apps/shell/global.d.ts
git mv vitest.config.ts apps/shell/vitest.config.ts
git mv vitest.shims.d.ts apps/shell/vitest.shims.d.ts
git mv .env.local apps/shell/.env.local
```

### Phase C — Restaurar `package.json` original em `apps/shell/`

O backup local `.package.json.fase1.bak` (criado na Task 1) contém o `package.json` original da Fase 1. Vamos restaurá-lo dentro do shell **e renomear** para `@bytebank/shell`:

```bash
# Restaura no destino correto
cp .package.json.fase1.bak apps/shell/package.json

# Apaga o backup local (não é mais necessário)
rm .package.json.fase1.bak
```

Edite `apps/shell/package.json`:

1. **Renomear** `"name": "tech-challenge"` → `"name": "@bytebank/shell"`
2. **Remover scripts redundantes** que agora vivem no root (`format`, `prepare` movidos para root; `lint-staged` config movido para root)
3. **Adicionar workspace deps placeholders** (vazios por ora — Tasks 3, 4, 5 popularão; declaramos as deps já para o `npm install` não dar warning quando elas existirem):

Estado final mínimo do `apps/shell/package.json`:

```json
{
  "name": "@bytebank/shell",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "chromatic": "npx chromatic --project-token=chpt_330cd685ba026e8",
    "test": "vitest"
  },
  "browserslist": [
    "last 2 Chrome versions",
    "last 2 Firefox versions",
    "last 2 Safari versions",
    "last 2 Edge versions"
  ],
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "lucide-react": "^0.577.0",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-hook-form": "^7.72.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@chromatic-com/storybook": "^5.0.1",
    "@storybook/addon-a11y": "^10.2.16",
    "@storybook/addon-docs": "^10.2.16",
    "@storybook/addon-onboarding": "^10.2.16",
    "@storybook/addon-vitest": "^10.2.16",
    "@storybook/nextjs-vite": "^10.2.16",
    "@storybook/test-runner": "^0.24.3",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitest/browser-playwright": "^4.0.18",
    "@vitest/coverage-v8": "^4.0.18",
    "chromatic": "^16.1.0",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-storybook": "^10.2.16",
    "playwright": "^1.58.2",
    "storybook": "^10.2.16",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vite": "^7.3.1",
    "vitest": "^4.0.18"
  }
}
```

> **Comparação com o original:** removemos `format`, `prepare`, `lint-staged` config — todos migrados para o root no Task 1.

### Phase D — Atualizar paths em configs

O `app/` virou `src/app/`. Os imports `@/...` precisam continuar resolvendo. E o Storybook precisa achar os componentes na nova localização.

#### D1 — `apps/shell/tsconfig.json`

Editar paths para apontar para `src/`:

```jsonc
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
    },
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts",
  ],
  "exclude": ["node_modules", ".next"],
}
```

> **Mudança:** `"@/*": ["./*"]` → `"@/*": ["./src/*"]`. Imports tipo `@/components/ui` agora resolvem para `apps/shell/src/components/ui`.

#### D2 — `apps/shell/.storybook/main.ts`

O Storybook config tinha `'../components/**/*.stories...'`. Como `components/` agora vive em `apps/shell/src/components/`, o path relativo precisa ajustar:

```ts
import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
  ],
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
};
export default config;
```

> **Mudança:** linha 3 do array `stories` passa de `'../components/...'` para `'../src/components/...'`. Os outros paths (`'../stories'` e `'../public'`) continuam válidos porque foram movidos para `apps/shell/stories/` e `apps/shell/public/` respectivamente.

#### D3 — Verificar imports `@/` no código

A maioria deve continuar funcionando porque `@/*` aponta para `./src/*` e os arquivos migraram para `src/`. Para garantir:

```bash
cd apps/shell
grep -rn "from '@/" src/ | head -20
# Cada import @/X deve resolver para src/X
# Ex: @/components/ui → src/components/ui ✓
# Ex: @/lib/format    → src/lib/format ✓
# Ex: @/types         → src/types ✓
```

> Nada para alterar nos imports nesta task. Apenas após Task 3 (extract DS) e Task 4 (extract shared), alguns `@/...` vão virar `@bytebank/design-system` / `@bytebank/shared`.

### Phase E — Regenerar lockfile e validar

```bash
# Da raiz do monorepo
cd /Users/feliperosa/studies/fiap-frontend-engineering/tech-challenge
rm -rf node_modules package-lock.json
npm install
```

> `npm install` agora detecta o workspace `apps/shell` via glob `apps/*` no root `package.json`. Vai criar um único `node_modules/` na raiz com hoisting nativo.

Sanity checks:

```bash
# 1) Workspace registrado?
npm ls --workspaces --depth=0
# Esperado: @bytebank/shell@0.1.0 -> apps/shell

# 2) Dev server sobe?
npm run dev -w @bytebank/shell
# Esperado: ▲ Next.js 16.1.6 ... Local: http://localhost:3000
# Abrir http://localhost:3000 → home renderiza igual à Fase 1
# Abrir http://localhost:3000/transactions → listagem renderiza igual

# 3) Storybook sobe?
npm run storybook -w @bytebank/shell
# Esperado: Storybook em http://localhost:6006 com componentes da Fase 1

# 4) Build de produção passa?
npm run build -w @bytebank/shell

# 5) Lint passa?
npm run lint -w @bytebank/shell
```

Se algum passo falhar, ver [Gotchas](#gotchas) abaixo.

### Phase F — Commit (commit 2/2 do bundle)

Este é o **segundo commit** na mesma branch `dev1-infra/monorepo-migration` (o primeiro é o da Task 1 — "bootstrap Turborepo + npm workspaces"). Os dois saem juntos no PR único.

```bash
git add .
git status
# Confirmar:
# - Muitos renamed (R) de root → apps/shell/*
# - apps/shell/package.json novo
# - apps/shell/tsconfig.json modificado (paths)
# - apps/shell/.storybook/main.ts modificado
# - apps/.gitkeep deletado
# - package-lock.json modificado (npm install regenerou)
# - Nada órfão em tech-challenge/ exceto arquivos que devem ficar (.husky, docs, etc.)

git commit -m "chore(shell): migrate Next.js app to apps/shell workspace

- Move app/, components/, context/, hooks/, lib/, services/, shared/,
  types/, data/, public/, stories/, .storybook/ to apps/shell/
- Move next.config.ts, tsconfig.json, eslint.config.mjs,
  postcss.config.mjs, vitest.config.ts and .env.local to apps/shell/
- Restore package.json content as @bytebank/shell with deps unchanged
- Update tsconfig paths to @/* → ./src/*
- Update .storybook/main.ts to ../src/components/**
- Regenerate package-lock.json for npm workspaces layout

Validated:
- npm install resolves workspace
- npm run dev -w @bytebank/shell starts on :3000
- npm run storybook -w @bytebank/shell starts on :6006
- npm run build -w @bytebank/shell passes
- npm run lint -w @bytebank/shell passes

Parte 2/2 do monorepo migration bundle (continua de Task 1).
Refs: docs/phase-2/sprint-0/02-migrate-shell.md"
```

Confirme que a branch tem **2 commits**:

```bash
git log --oneline phase-2..HEAD
# Esperado:
#   <hash> chore(shell): migrate Next.js app to apps/shell workspace
#   <hash> chore(monorepo): bootstrap Turborepo + npm workspaces
```

### Phase G — CI mínimo (commit 3/3 do bundle)

> **Por que aqui:** Tasks 3-7 vão mergear em `phase-2` antes da Task 8 (que adiciona CI completo). Sem nenhum CI, ninguém pega regressões durante a semana. Adicionamos um workflow **mínimo** agora (~30 min de setup) que valida `npm install + build + lint` em todo PR. Task 8 estende com Turbo cache, Chromatic refactor, etc.

Criar `.github/workflows/ci-minimal.yml`:

```yaml
name: CI (minimal)

on:
  pull_request:
    branches:
      - phase-2
      - main
  push:
    branches:
      - phase-2

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-shell:
    name: Build shell
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: '20.18.0'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint -w @bytebank/shell
      - run: npm run build -w @bytebank/shell
```

> **Limitações conhecidas (resolvidas em Task 8):**
>
> - Não usa Turbo `--affected` (builda shell inteiro toda vez, ~2 min)
> - Não tem Remote Cache
> - Cobre só `@bytebank/shell` — quando Tasks 3-5 mergearem novos workspaces, este workflow não roda lint/build neles
> - Sem `type-check` separado (Next build já faz)
>
> Aceitável temporariamente: a meta é apenas detectar "shell quebrou em algum PR". Task 8 substitui este workflow pelo `ci.yml` completo (mesma branch trigger, mesmo nome de workflow conceitualmente — Task 8 pode renomear `ci-minimal.yml` → `ci.yml`).

Commit:

```bash
git add .github/workflows/ci-minimal.yml
git commit -m "ci(minimal): build + lint shell em PRs contra phase-2

Workflow temporário para detectar regressões durante Sprint 0
enquanto Tasks 3-7 mergeiam. Task 8 substitui pelo ci.yml completo
com Turbo --affected e Remote Cache.

Parte 3/3 do monorepo migration bundle.
Refs: docs/phase-2/sprint-0/02-migrate-shell.md"
```

Branch agora tem **3 commits**:

```bash
git log --oneline phase-2..HEAD
# Esperado:
#   <hash> ci(minimal): build + lint shell em PRs contra phase-2
#   <hash> chore(shell): migrate Next.js app to apps/shell workspace
#   <hash> chore(monorepo): bootstrap Turborepo + npm workspaces
```

## Estado final esperado

Após esta task:

```
tech-challenge/
├── apps/
│   └── shell/
│       ├── .env.local
│       ├── .storybook/
│       ├── data/
│       ├── public/
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── context/
│       │   ├── hooks/
│       │   ├── lib/
│       │   ├── services/
│       │   ├── shared/
│       │   └── types/
│       ├── stories/
│       ├── eslint.config.mjs
│       ├── global.d.ts
│       ├── next-env.d.ts
│       ├── next.config.ts
│       ├── package.json          ← @bytebank/shell
│       ├── postcss.config.mjs
│       ├── tsconfig.json         ← @/* → ./src/*
│       ├── vitest.config.ts
│       └── vitest.shims.d.ts
├── packages/
│   └── .gitkeep                  ← removido em Task 3
├── docs/
│   └── phase-2/                  ← este diretório
├── .github/
├── .husky/
├── .claude/
├── .gitignore
├── .prettierrc
├── README.md
├── package.json                  ← workspace root (de Task 1)
├── turbo.json                    ← (de Task 1)
└── package-lock.json             ← regenerado
```

## Validação

### Local (pré-merge)

- [ ] `npm ls --workspaces --depth=0` lista `@bytebank/shell`
- [ ] `npm run dev -w @bytebank/shell` sobe em `:3000` sem erros
- [ ] `http://localhost:3000` renderiza home idêntica à Fase 1 (BalanceCard + NewTransaction + lista recente)
- [ ] `http://localhost:3000/transactions` renderiza listagem com filtros, paginação, CRUD funcionais
- [ ] Edit / Delete / Create de transação funcionam (modais abrem, feedback aparece)
- [ ] `npm run storybook -w @bytebank/shell` sobe em `:6006` com componentes visíveis
- [ ] `npm run build -w @bytebank/shell` produz `.next/` em `apps/shell/.next/`
- [ ] `npm run lint -w @bytebank/shell` passa sem erros
- [ ] `git log --follow apps/shell/src/app/page.tsx` mostra histórico desde Fase 1 (provando que `git mv` preservou history)

### Pós-merge (ação obrigatória — não opcional)

- [ ] **Atualizar Vercel Project Settings** (qualquer dev com acesso admin faz **no mesmo dia do merge**):
  - Acessar **Vercel Dashboard → seu Project → Settings → General → Root Directory**
  - Trocar valor de `.` (ou vazio) para `apps/shell`
  - Trocar **Build Command** se hardcoded: deixar em branco (Vercel auto-detecta Next.js) ou usar `npm run build`
  - Trocar **Output Directory** se hardcoded: deixar em branco (Vercel detecta `.next/`)
  - Trigger redeploy do último commit em `phase-2` para validar
- [ ] Sanity check pós-redeploy: URL preview da `phase-2` renderiza home + transactions idênticos a local
- [ ] Sem esse ajuste, **todos os deploys preview de `phase-2` quebram** até o final do Sprint 0

> **Comunicar:** mensagem em #bytebank-eng (Slack/Discord) avisando o time que Vercel foi reajustado. Quem tem acesso admin: dev1-infra.

## Gotchas

1. **`git mv` exige working tree limpa.** Se houver mudanças não committadas em qualquer arquivo que será movido, o `git mv` vai falhar. `git stash` antes se necessário.

2. **`.env.local` é gitignored.** O `git mv .env.local apps/shell/.env.local` pode mostrar warning mas funciona porque o conteúdo é mantido localmente. Em CI, ele simplesmente não existe — env vars vêm do Vercel/GitHub Secrets.

3. **`next-env.d.ts` é auto-gerado.** Pode ser que ele apareça regenerado em `apps/shell/` na primeira `npm run dev`. Tudo bem — committar essa regeneração.

4. **Imports de `@/...` que falham após o move.** Provavelmente porque o arquivo de origem NÃO estava em `src/` originalmente. Verificar: o import era `@/components/Foo`? Se Foo estava em `components/Foo` (root) e foi movido para `src/components/Foo`, o tsconfig path `"@/*": ["./src/*"]` resolve corretamente. Mas se Foo era importado por path relativo e está em outro folder, pode precisar ajuste.

5. **Tailwind v4 globals.** O `app/globals.css` (agora em `src/app/globals.css`) importa tokens via `@import 'tailwindcss'` e custom properties. Após o move, o Tailwind continua compilando porque PostCSS é resolvido a partir de `apps/shell/postcss.config.mjs`.

6. **Husky `prepare` não falha mais.** O script `prepare: husky` no root `package.json` agora encontra `.husky/` no root (não no shell). `npm install` deve passar sem warning.

7. **Vercel deploy vai quebrar até atualizar Project Settings.** Após mergear na `phase-2`, o Vercel Project apontará para o root antigo. Em **Vercel Dashboard → Project Settings → General → Root Directory**, mudar para `apps/shell`. Documentar isso no PR. (Sprint 4 formaliza isso, mas a `phase-2` preview pode quebrar até ajustar.)

8. **`stories/foundations/` vs `src/components/*/`.** Storybook acha 2 tipos de stories: as standalone em `stories/` (foundations: tokens, mocks) e as `*.stories.tsx` ao lado dos componentes em `src/components/`. Ambas funcionam após o ajuste do `main.ts` (D2).

9. **`tsconfig.json` `paths` aceita só uma localização.** Se você precisar de paths que apontem fora de `src/` (ex: `@root/*`), adicione separadamente. Por ora, só `@/*` é necessário.

## Pull Request (cobre Tasks 1 + 2)

Este é o **único PR** do bundle. Ele agrega os 2 commits (Task 1 + Task 2) e só abre agora, com `phase-2` em estado funcional validado.

```bash
git push -u origin dev1-infra/monorepo-migration
gh pr create --base phase-2 --title "chore(monorepo): migrate to Turborepo workspaces with apps/shell" \
  --body "$(cat <<'EOF'
## Sumário

PR atômico cobrindo **Tasks 1 e 2 do Sprint 0** (não podem mergear separadas — Task 1 isolada deixa o app sem deps no root). Transforma `tech-challenge/` em monorepo Turborepo + npm workspaces, com o app Next.js da Fase 1 realocado para `apps/shell/`.

### Commits (2)

1. `chore(monorepo): bootstrap Turborepo + npm workspaces` — root manifest, turbo.json, dirs apps/ packages/, .gitignore
2. `chore(shell): migrate Next.js app to apps/shell workspace` — move código + configs + ajusta paths + regenera lockfile

### O que move

- **Source folders** (`app/`, `components/`, `context/`, `hooks/`, `lib/`, `services/`, `shared/`, `types/`) → `apps/shell/src/`
- **App-level folders** (`data/`, `public/`, `stories/`, `.storybook/`) → `apps/shell/`
- **Config files** (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.ts`, etc.) → `apps/shell/`
- **`.env.local`** → `apps/shell/.env.local`

### O que é novo no root

- `package.json` workspace manifest (`workspaces: ["apps/*", "packages/*"]`)
- `turbo.json` com pipelines build/dev/lint/test/storybook (Turbo 2.x syntax)
- `apps/` e `packages/` dirs (com `.gitkeep` em `packages/` — apps/ já tem shell)

### O que NÃO se move (continua no root)

`.husky/`, `.prettierrc`, `.github/`, `.claude/`, `docs/`, `README.md`, `package-lock.json` (regenerado)

### Ajustes

- `apps/shell/package.json`: rename → `@bytebank/shell`; remove scripts `format`, `prepare`, e config `lint-staged` (agora vivem no root)
- `apps/shell/tsconfig.json`: paths `@/*` → `./src/*` (era `./*`)
- `apps/shell/.storybook/main.ts`: `../components/**` → `../src/components/**`
- `package-lock.json`: regenerado via `npm install` no novo layout de workspaces

## Test plan

- [x] `npm install` na raiz resolve `@bytebank/shell` como workspace
- [x] `npm run dev -w @bytebank/shell` sobe em `:3000` (home + transactions renderizam)
- [x] CRUD de transação (add/edit/delete) funciona end-to-end
- [x] `npm run storybook -w @bytebank/shell` lista componentes
- [x] `npm run build -w @bytebank/shell` produz bundle
- [x] `npm run lint -w @bytebank/shell` passa
- [x] `git log --follow apps/shell/src/app/page.tsx` preserva histórico da Fase 1

## Pós-merge

- Atualizar **Root Directory** do Vercel Project para `apps/shell` (manual, uma vez só)
- Tasks 3 (`dev3-ds`), 4 + 5 (`dev2-backend`), e 6 (`dev4-dashboard` + `dev5-transactions`) podem iniciar em paralelo

## Tasks relacionadas

- [Task 1 — Bootstrap monorepo](../sprint-0/01-bootstrap-monorepo.md)
- [Task 2 — Migrar shell](../sprint-0/02-migrate-shell.md)
EOF
)"
```

## Próximo passo

→ **Task 3:** Extrair `packages/design-system` (dono: `dev3-ds`) — pode começar imediatamente após esta PR mergear em `phase-2`. Em paralelo:

- **Task 4** (`dev2-backend`): extrair `packages/shared`
- **Task 5** (`dev2-backend`): criar `packages/api-client` e `packages/stores` vazios
- **Task 6** (`dev4-dashboard` + `dev5-transactions`): PoC Module Federation já pode iniciar (não depende de Task 3/4/5)

Após esta task, **o trabalho do time pode se paralelizar de verdade pela primeira vez**.
