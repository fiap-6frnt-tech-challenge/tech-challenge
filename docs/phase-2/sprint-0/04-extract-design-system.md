# Task 4 — Extrair `packages/design-system`

|                      |                                                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**           | [Sprint 0 — Foundation](../sprint-0-foundation.md)                                                                                                         |
| **Owner**            | `dev3-ds`                                                                                                                                                  |
| **Duração estimada** | 1 dia                                                                                                                                                      |
| **Branch**           | `phase-2/dev3-ds/extract-design-system` (a partir de `phase-2`)                                                                                            |
| **Depende de**       | [Task 3 — Extrair shared](./03-extract-shared.md) mergeada em `phase-2` (DS importa `cn`, `getInputBorderColor`, mock `Transaction` de `@bytebank/shared`) |
| **Desbloqueia**      | Tasks 6 (PoC MF — consome DS no remote), Sprint 1 (novos componentes auth nascem no DS), Sprints 2/3 (charts + filtros + FileUpload no DS)                 |

---

## Contexto

A Task 2 deixou todos os componentes de UI em `apps/shell/src/components/ui/`. A Task 3 já extraiu `@bytebank/shared` com `cn`, `getInputBorderColor`, types e constants — os componentes do DS no shell **já importam de `@bytebank/shared`** (não mais de `@/lib`). Esta task **extrai esses componentes para um package npm workspace `@bytebank/design-system`**, transformando o DS em biblioteca consumível por todos os apps do monorepo (shell, dashboard-mfe, transactions-mfe).

Como os imports internos dos componentes do DS já apontam para `@bytebank/shared` (graças à Task 3), esta task praticamente só **move os arquivos fisicamente** e cabeia o shell pra consumir via workspace dep — sem precisar refatorar imports dentro dos componentes do DS.

### Por que extrair agora (Sprint 0)?

- **Desbloqueia paralelização** de Sprints 2 e 3 — dev3-ds entrega novos componentes (charts, FileUpload, MultiSelect) sem precisar mexer no shell
- **Desacopla deploy** — DS evolui independentemente; consumers escolhem quando atualizar (via Chromatic visual review)
- **Cria contrato claro** entre dev3-ds e os outros tracks via exports do package
- **Storybook + Chromatic centralizados** no DS

### O que NÃO é objetivo desta task

- Refatorar componentes (qualquer mudança de API fica fora de escopo — só move)
- Publicar no npm registry público (opcional, Sprint 4 ou nunca)
- Tornar DS framework-agnostic (Header/Sidebar usam `next/link` — continuam funcionando porque shell e MFEs são React e Next é peerDep)

## Mapa de migração

### Conteúdo que move (apps/shell → packages/design-system)

| Atual                            | Destino                                         | Notas                                                  |
| -------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| `apps/shell/src/components/ui/`  | `packages/design-system/src/components/`        | 18+ componentes + stories inline                       |
| `apps/shell/.storybook/`         | `packages/design-system/.storybook/`            | Config + preview + vitest.setup                        |
| `apps/shell/stories/`            | `packages/design-system/stories/`               | Foundations (tokens, mocks)                            |
| `apps/shell/src/app/tokens.css`  | `packages/design-system/src/styles/tokens.css`  | `@theme` Tailwind v4 + CSS vars                        |
| `apps/shell/src/app/globals.css` | `packages/design-system/src/styles/globals.css` | `@import 'tailwindcss'` + utility classes + animations |

### O que permanece no shell

| Local                                 | Por quê                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `apps/shell/src/components/features/` | Composições específicas do shell (BalanceCard, TransactionList, etc.) — consomem DS, não fazem parte dele |
| `apps/shell/src/app/`                 | App Router pages                                                                                          |
| `apps/shell/src/app/layout.tsx`       | Continua importando `globals.css` (agora via DS)                                                          |
| `apps/shell/postcss.config.mjs`       | Build do shell processa Tailwind (DS é só fonte)                                                          |

### Files novos criados no DS

| Caminho                                | Propósito                                     |
| -------------------------------------- | --------------------------------------------- |
| `packages/design-system/package.json`  | Workspace manifest                            |
| `packages/design-system/tsconfig.json` | TS config (composite para Project References) |
| `packages/design-system/src/index.ts`  | Barrel principal (re-export tudo)             |
| `packages/design-system/README.md`     | Doc do package                                |

### Imports que precisam mudar no shell (28 arquivos)

Todo `from '@/components/ui'` (e variantes `'@/components/ui/Button'`) vira `from '@bytebank/design-system'`. Codemod automatizável.

## Pré-condições

- [ ] Bundle Tasks 1+2 mergeado em `phase-2` (`apps/shell/` operacional)
- [ ] `npm run dev -w @bytebank/shell` sobe `:3000` antes de começar (baseline)
- [ ] Feature branch criada:
  ```bash
  git checkout phase-2 && git pull origin phase-2
  git checkout -b phase-2/dev3-ds/extract-design-system
  ```
- [ ] Working tree limpa

## Implementação passo-a-passo

> Todos os comandos rodam a partir de `tech-challenge/`. Use `git mv` para preservar histórico.

### Phase A — Criar skeleton do package

```bash
mkdir -p packages/design-system/src/{components,styles}
mkdir -p packages/design-system/.storybook
```

> Diretórios são placeholders — preencher nos passos seguintes via `git mv`.

### Phase B — Mover componentes UI

```bash
# Move componentes (preserva stories .stories.tsx ao lado dos componentes)
git mv apps/shell/src/components/ui/* packages/design-system/src/components/

# Remove o folder vazio (se git deixar)
rmdir apps/shell/src/components/ui 2>/dev/null || true

# Remove .gitkeep do packages/ se ainda existir
git rm packages/.gitkeep 2>/dev/null || true
```

Confirme:

```bash
ls packages/design-system/src/components/
# Esperado: Badge/ Button/ Card/ CurrencyInput/ DatePicker/ EmptyState/ ErrorState/
#           FeedbackModal/ FormField/ Header/ HelperText/ Input/ Label/ Modal/
#           Pagination/ Select/ Sidebar/ Skeleton/ Tooltip/ ViewportFix/ index.ts
```

### Phase C — Mover Storybook config e stories foundations

```bash
git mv apps/shell/.storybook/* packages/design-system/.storybook/
rmdir apps/shell/.storybook 2>/dev/null || true

git mv apps/shell/stories packages/design-system/stories
```

### Phase D — Mover CSS (tokens + globals)

```bash
git mv apps/shell/src/app/tokens.css packages/design-system/src/styles/tokens.css
git mv apps/shell/src/app/globals.css packages/design-system/src/styles/globals.css
```

Edite `packages/design-system/src/styles/globals.css` para apontar Tailwind aos componentes do DS:

```css
@import 'tailwindcss';
@import './tokens.css';
@source "../components/**/*.{ts,tsx}";

@layer components {
  /* ... (manter como estava: .heading, .body-default, etc.) ... */
}

/* ... (resto inalterado: html, body, animations, etc.) ... */
```

> A diretiva `@source` (Tailwind v4) diz onde estão os arquivos com classes utilitárias. Aqui escaneamos `../components/**` (= `packages/design-system/src/components/**`). O shell adiciona seu próprio `@source` no seu globals.css local (Phase F).

Edite `packages/design-system/src/styles/tokens.css` — nenhum ajuste necessário, o conteúdo já é independente de path.

### Phase E — Configurar package.json e tsconfig do DS

Crie `packages/design-system/package.json`:

```json
{
  "name": "@bytebank/design-system",
  "version": "0.1.0",
  "private": true,
  "description": "Bytebank Design System — componentes, tokens e estilos compartilhados",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./styles/tokens.css": "./src/styles/tokens.css",
    "./styles/globals.css": "./src/styles/globals.css"
  },
  "files": ["src"],
  "scripts": {
    "lint": "eslint src",
    "test": "vitest",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "chromatic": "chromatic --project-token=chpt_330cd685ba026e8"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next": "^16.0.0"
  },
  "dependencies": {
    "@bytebank/shared": "*",
    "lucide-react": "^0.577.0"
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
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitest/browser-playwright": "^4.0.18",
    "chromatic": "^16.1.0",
    "eslint": "^9",
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

**Decisões importantes:**

- **`main`/`types` apontam para `.ts` source** — não há build step. Cada consumer (shell, MFEs) transpila o DS via seu próprio bundler. Simples e suporta hot reload entre packages
- **`peerDependencies`** (`react`, `react-dom`, `next`) — consumer fornece; garante uma única cópia na árvore
- **`dependencies.@bytebank/shared`** — DS usa `cn`, `getInputBorderColor` e tipos do shared. Workspace dep via `*`
- **`exports` field** controla o que pode ser importado: API pública (`.`), CSS (`./styles/*`)
- **`lucide-react`** é dep direta (componentes importam ícones)
- Storybook + Chromatic agora vivem aqui — `chromatic` script com token preservado da Fase 1

Crie `packages/design-system/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "noEmit": false,
    "outDir": "./dist-types",
    "rootDir": "./src",
    "incremental": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.stories.tsx", "**/*.test.tsx"]
}
```

> **Composite + declaration** habilita TypeScript Project References (build incremental entre packages). `outDir: ./dist-types` recebe só os `.d.ts` — o JS continua sendo transpilado pelo consumer.

Crie `packages/design-system/src/index.ts` (barrel principal):

```ts
// Re-export from the original components barrel
export * from './components';
```

E mova o conteúdo do antigo `apps/shell/src/components/ui/index.ts` (agora em `packages/design-system/src/components/index.ts`) — confirme que ele segue exportando tudo:

```ts
// packages/design-system/src/components/index.ts
export * from './CurrencyInput';
export * from './HelperText';
export * from './Label';
export * from './Tooltip';
export * from './DatePicker';
export * from './FormField';
export * from './Select';
export * from './Header';
export * from './Sidebar';
export * from './EmptyState';
export * from './Skeleton';
export * from './Modal';
export * from './FeedbackModal';
export * from './Button';
export * from './Input';
export * from './Badge';
export * from './Card';
export * from './Pagination';
export * from './ErrorState';
export * from './ViewportFix';
```

> Conferir que `ErrorState` e `ViewportFix` estão no barrel — não estavam no original (esquecimento da Fase 1). Aproveitar para incluir.

Crie `packages/design-system/README.md` mínimo:

````markdown
# @bytebank/design-system

Componentes, tokens e estilos do Bytebank.

## Uso

```ts
import { Button, Card } from '@bytebank/design-system';
import '@bytebank/design-system/styles/globals.css';
```
````

## Desenvolvimento

```bash
npm run storybook -w @bytebank/design-system   # :6006
npm run chromatic -w @bytebank/design-system   # publicar visuais
```

## Convenções

Ver [bytebank-design-system.md](../../.claude/bytebank-design-system.md).

````

### Phase F — Atualizar shell para consumir o DS

#### F1 — Adicionar dep no shell

Edite `apps/shell/package.json`:

```diff
   "dependencies": {
+    "@bytebank/design-system": "*",
     "@hookform/resolvers": "^5.2.2",
     "lucide-react": "^0.577.0",
     ...
   }
````

> `"*"` é a sintaxe npm workspaces — resolve para a versão local do workspace. Não use `"workspace:*"` (sintaxe pnpm).

E remova do shell as devDeps que migraram para o DS (vão duplicar em `node_modules` senão):

```diff
-    "@chromatic-com/storybook": "^5.0.1",
-    "@storybook/addon-a11y": "^10.2.16",
-    "@storybook/addon-docs": "^10.2.16",
-    "@storybook/addon-onboarding": "^10.2.16",
-    "@storybook/addon-vitest": "^10.2.16",
-    "@storybook/nextjs-vite": "^10.2.16",
-    "@storybook/test-runner": "^0.24.3",
-    "@vitest/browser-playwright": "^4.0.18",
-    "chromatic": "^16.1.0",
-    "eslint-plugin-storybook": "^10.2.16",
-    "playwright": "^1.58.2",
-    "storybook": "^10.2.16",
```

Remova scripts do shell que agora vivem no DS:

```diff
-    "storybook": "storybook dev -p 6006",
-    "build-storybook": "storybook build",
-    "chromatic": "npx chromatic --project-token=chpt_330cd685ba026e8",
```

#### F2 — Configurar `transpilePackages` no shell

Edite `apps/shell/next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@bytebank/design-system'],
  experimental: {
    optimizePackageImports: ['@hookform/resolvers', 'lucide-react', '@bytebank/design-system'],
  },
};

export default nextConfig;
```

> **`transpilePackages`** diz ao Next.js para passar o código do DS pelo seu pipeline de build (suporta TS source diretamente). **`optimizePackageImports`** ativa tree-shaking automático para imports nomeados — incluir o DS aqui economiza bundle.

#### F3 — Atualizar CSS imports no shell

O shell atualmente importa `globals.css` em `src/app/layout.tsx` via `import './globals.css'`. Como o arquivo se mudou para o DS, substituímos.

Crie `apps/shell/src/app/globals.css` (novo arquivo, thin shim):

```css
@import '@bytebank/design-system/styles/globals.css';
@source "../**/*.{ts,tsx}";
```

> O `@source "../**/*.{ts,tsx}"` (relativo a `apps/shell/src/app/`) escaneia `apps/shell/src/**` — features do shell. Junto com o `@source` que vem do DS (componentes do DS), Tailwind tem todas as fontes.

Confirme que `apps/shell/src/app/layout.tsx` continua com `import './globals.css';` — sem mudança.

#### F4 — Codemod nos imports `@/components/ui` → `@bytebank/design-system`

```bash
cd apps/shell/src

# Imports nomeados (Button, Card, etc.)
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec \
  sed -i.bak "s|from '@/components/ui'|from '@bytebank/design-system'|g" {} +

find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec \
  sed -i.bak -E "s|from '@/components/ui/[^']+'|from '@bytebank/design-system'|g" {} +

# Limpar backups do sed
find . -name "*.bak" -delete
```

> No macOS o `sed -i` precisa de argumento (`-i.bak`). O segundo comando reduz qualquer `@/components/ui/Modal/Modal` → `@bytebank/design-system` (tudo barrel agora).

Confirme que zerou:

```bash
grep -rn "@/components/ui" apps/shell/src/ || echo "OK - zero imports antigos"
```

> Pode sobrar algum caso onde o import era subpath (ex: `@/components/ui/Modal/IModal`). Inspecione com `git diff` e ajuste manualmente se necessário.

### Phase G — Atualizar Storybook config para o DS

Edite `packages/design-system/.storybook/main.ts`:

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
  staticDirs: ['../../../apps/shell/public'],
};
export default config;
```

> **`staticDirs`**: aponta para `apps/shell/public/` (relativo a `packages/design-system/.storybook/`). Storybook precisa do `piggy-bank.png` e outros assets que continuam no shell. Alternativa: copiar `public/` para o DS — mais isolado mas duplica binários. Deixe apontando para o shell por ora.

Confirme `packages/design-system/.storybook/preview.ts` (se existir) e ajuste qualquer import de CSS:

```ts
// preview.ts
import '../src/styles/globals.css';
```

### Phase H — Atualizar Chromatic CI

Edite `.github/workflows/chromatic.yml`:

```yaml
name: Chromatic

on:
  push:
    branches:
      - main
      - phase-2

jobs:
  chromatic:
    name: Run Chromatic
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Chromatic on design-system
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          workingDir: packages/design-system
```

> **Mudanças:** branch `phase-1` removida, `phase-2` adicionada. `workingDir: packages/design-system` faz a action rodar `npm run chromatic` no DS package. Node 20 ao invés de 24 (compatibilidade com Vercel/Next 16).
>
> **Boundary com Task 8:** Esta task faz a mudança **mecânica** (paths + branches). [Task 8](./08-update-ci.md) **estende** o mesmo workflow adicionando `TURBO_TOKEN`/`TURBO_TEAM` env vars + `onlyChanged: true`. Coordenar para evitar conflito de merge.

### Phase H1 — Reparar vitest.config do shell

O `apps/shell/vitest.config.ts` atual referencia `.storybook/` que acabou de sair do shell. Após Phase C deste task, `npm run test -w @bytebank/shell` falha com "ENOENT: no such file or directory '.storybook'". Esta phase resolve.

**Decisão:** simplificar o vitest do shell para **não** integrar com Storybook (Storybook agora vive no DS). Shell terá seu vitest "limpo" pronto para tests que o Sprint 1 vai escrever (auth middleware, hooks, etc.).

Substituir conteúdo de `apps/shell/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', // shell roda majoritariamente em Node (API routes + server components)
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
  },
});
```

Atualizar `apps/shell/package.json` removendo devDeps de Storybook-Vitest integration:

```diff
   "devDependencies": {
-    "@storybook/addon-vitest": "^10.2.16",
-    "@vitest/browser-playwright": "^4.0.18",
     "@vitest/coverage-v8": "^4.0.18",
+    // playwright fica para testes E2E no Sprint 4
     "vitest": "^4.0.18"
   }
```

> `@vitest/browser-playwright` e `@storybook/addon-vitest` migram para `packages/design-system/devDependencies` (já incluídos no `package.json` da Phase E desta task).

Criar `packages/design-system/vitest.config.ts` (era do shell) na DS:

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
```

Validar:

```bash
npm run test -w @bytebank/shell         # passa (mesmo sem testes ainda)
npm run test -w @bytebank/design-system # roda stories como tests via storybookTest
```

### Phase I — Instalar, validar e commit

```bash
cd tech-challenge
npm install   # resolve novo workspace + atualiza lockfile

# Validações
npm run dev -w @bytebank/shell &
SHELL_PID=$!
sleep 5
curl -s http://localhost:3000 | grep -c "Bytebank" || echo "Home não renderizou"
kill $SHELL_PID

npm run storybook -w @bytebank/design-system &
SB_PID=$!
sleep 8
curl -s http://localhost:6006 | grep -c "storybook" || echo "Storybook não renderizou"
kill $SB_PID

npm run build -w @bytebank/shell
npm run lint -w @bytebank/shell
npm run lint -w @bytebank/design-system
```

Sanity checks manuais:

- [ ] `http://localhost:3000/` — home renderiza igual à Fase 1, com Badge, Button, Card visuais idênticos
- [ ] `http://localhost:3000/transactions` — listagem com filtros, paginação, modais funcionais
- [ ] CRUD de transação (add/edit/delete) end-to-end funciona
- [ ] `http://localhost:6006/` — Storybook lista todos 18+ componentes com stories
- [ ] DevTools Network: CSS do globals carrega sem 404
- [ ] DevTools React: nenhum warning de "two copies of React" (singleton OK via peerDep)

Commit:

```bash
git add .
git status

git commit -m "feat(design-system): extract UI components to @bytebank/design-system package

- Move components/ui/, .storybook/, stories/ from apps/shell to packages/design-system
- Move app/tokens.css and app/globals.css to packages/design-system/src/styles/
- Create packages/design-system/package.json with exports for components + CSS
- Add transpilePackages: ['@bytebank/design-system'] to shell next.config.ts
- Replace 'from \"@/components/ui\"' imports with 'from \"@bytebank/design-system\"' (28 files)
- Shell consumes DS via workspace dep, imports globals.css from package
- Update Chromatic CI to run inside packages/design-system, target phase-2

Validated:
- npm run dev -w @bytebank/shell renders home + transactions identical to Fase 1
- npm run storybook -w @bytebank/design-system lists all components
- npm run build -w @bytebank/shell passes
- npm run lint passes in both workspaces

Refs: docs/phase-2/sprint-0/03-extract-design-system.md"
```

## Estado final esperado

```
tech-challenge/
├── apps/
│   └── shell/
│       ├── src/
│       │   ├── app/
│       │   │   ├── globals.css         ← novo (thin shim → @bytebank/design-system)
│       │   │   └── layout.tsx          ← import './globals.css' (inalterado)
│       │   ├── components/
│       │   │   └── features/           ← UI extraída; só features ficam
│       │   ├── context/, hooks/, lib/, services/, shared/, types/
│       │   └── ...
│       ├── next.config.ts              ← +transpilePackages
│       ├── package.json                ← +@bytebank/design-system; storybook/chromatic devDeps removidas
│       └── ...
├── packages/
│   └── design-system/                  ← NOVO PACKAGE
│       ├── .storybook/
│       │   ├── main.ts
│       │   ├── preview.ts
│       │   └── vitest.setup.ts
│       ├── src/
│       │   ├── components/
│       │   │   ├── Badge/, Button/, Card/, ... (18+)
│       │   │   └── index.ts            ← barrel
│       │   ├── styles/
│       │   │   ├── tokens.css
│       │   │   └── globals.css         ← com @source para components
│       │   └── index.ts                ← re-export ./components
│       ├── stories/                    ← foundations
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
├── .github/workflows/
│   └── chromatic.yml                   ← targets phase-2, workingDir=packages/design-system
└── ...
```

## Validação

- [ ] `npm install` na raiz resolve `@bytebank/design-system` como workspace
- [ ] `npm run dev -w @bytebank/shell` em `:3000` — home + transactions visualmente idênticas à Fase 1
- [ ] CRUD completo de transação funciona end-to-end
- [ ] Animações (modal in/out, drawer, filter panel) funcionam
- [ ] `npm run storybook -w @bytebank/design-system` em `:6006` — todos 18+ componentes listados
- [ ] A11y addon do Storybook não regrediu (mesmos warnings/erros que na Fase 1, ou menos)
- [ ] `npm run build -w @bytebank/shell` produz `.next/` válido
- [ ] `npm run lint -w @bytebank/shell` passa
- [ ] `npm run lint -w @bytebank/design-system` passa
- [ ] `grep -rn "@/components/ui" apps/shell/src/` retorna vazio (todos imports atualizados)
- [ ] `git log --follow packages/design-system/src/components/Button/Button.tsx` mostra histórico desde Fase 1

## Gotchas

1. **`peerDependencies` no DS + `react` `react-dom` `next` resolvendo localmente.** Como o shell tem essas deps, o npm workspaces resolve para a versão do shell — sem duplicação. Se algum dia algum app esquecer de declarar a peerDep, `npm install` vai emitir warning (não erro). Confirme com `npm ls react -w @bytebank/design-system` — deve mostrar apenas uma cópia.

2. **Tailwind v4 + `@source` em arquivo CSS importado.** O `@source` declarado dentro de `packages/design-system/src/styles/globals.css` continua valendo quando o shell faz `@import '@bytebank/design-system/styles/globals.css'`. Mas o shell adiciona seu próprio `@source` para suas features. Isso é union, não override.

3. **Chromatic projectToken via secret no CI.** O token literal `chpt_330cd685ba026e8` aparece no `chromatic` script para uso local. Em CI, vem de `secrets.CHROMATIC_PROJECT_TOKEN` (já configurado na Fase 1). Confirme que o segredo continua nas Settings → Secrets do repo após esta task.

4. **`staticDirs` do Storybook apontando para fora do package.** Necessário enquanto `public/` (com `piggy-bank.png`) viver no shell. Alternativa cleaner: copiar assets que stories usam para `packages/design-system/static/`. Decisão: manter apontando para shell — duplicar assets binários é pior.

5. **`vitest.config.ts` do shell tem paths quebrados após mover `.storybook/`.** O config atual referencia `path.join(dirname, '.storybook')` e `setupFiles: ['.storybook/vitest.setup.ts']` — ambos quebram após esta task. Ver [Phase J — Reparar vitest no shell](#phase-j--reparar-vitestconfig-do-shell) abaixo; resolvido nesta task, não fica para o futuro.

6. **Imports legados em `components/features/`.** Os features (BalanceCard, TransactionList) importam de `@/components/ui` — o codemod no Phase F4 os pega corretamente porque o `find` cobre `apps/shell/src/` inteiro.

7. **Storybook framework `nextjs-vite` + DS package não-Next.** Funciona porque o Storybook é só ambiente de dev/preview. O framework `nextjs-vite` resolve `next/link` corretamente mesmo o package não sendo Next.js. Custos: o DS Storybook carrega Next runtime — overhead irrelevante em dev.

8. **`apps/shell/src/components/features/`** referencia componentes do DS via barrel `@bytebank/design-system`. Não esqueça features ao rodar o codemod — o `find` da Phase F4 cobre `apps/shell/src/` (que inclui features).

9. **Hot reload entre packages.** Como exportamos TS source (não build), uma edição em `packages/design-system/src/components/Button/Button.tsx` deve refletir em tempo real no shell rodando em `:3000` (graças a `transpilePackages`). Se não recarregar, reinicie o dev server.

10. **Vercel deploy preview da branch.** O `transpilePackages` no `next.config.ts` é o suficiente — Vercel respeita workspaces automaticamente. Não precisa de config extra na dashboard.

## Pull Request

```bash
git push -u origin phase-2/dev3-ds/extract-design-system
gh pr create --base phase-2 --title "feat(design-system): extract UI components to @bytebank/design-system" \
  --body "$(cat <<'EOF'
## Sumário

Extrai os componentes de UI, Storybook, tokens e globals do shell para um package npm workspace `@bytebank/design-system`. Após o merge, o shell consome o DS via workspace dep — comportamento e visual idênticos à Fase 1, mas com fronteira clara entre DS e features.

## O que move (apps/shell → packages/design-system)

- `src/components/ui/*` → `src/components/` (18+ componentes + stories inline)
- `.storybook/*` → `.storybook/` (config + addons)
- `stories/*` → `stories/` (foundations Storybook)
- `src/app/tokens.css` → `src/styles/tokens.css`
- `src/app/globals.css` → `src/styles/globals.css` (com `@source` para components)

## O que muda no shell

- `next.config.ts`: + `transpilePackages: ['@bytebank/design-system']`
- `package.json`: + dep `@bytebank/design-system: "*"`; - storybook/chromatic devDeps/scripts (migraram para DS)
- `src/app/globals.css`: novo arquivo thin que importa do DS + adiciona `@source` para features
- 28 arquivos: `from '@/components/ui'` → `from '@bytebank/design-system'`

## Files novos (packages/design-system)

- `package.json` com `exports`, `peerDependencies` (react/react-dom/next)
- `tsconfig.json` (composite, declaration maps)
- `src/index.ts` (barrel)
- `README.md` (uso e dev)

## CI

`.github/workflows/chromatic.yml` agora roda em `phase-2` (era `phase-1` + `main`) e `workingDir: packages/design-system`.

## Test plan

- [x] `npm install` na raiz resolve workspace
- [x] `npm run dev -w @bytebank/shell` em :3000 — home + transactions idênticas à Fase 1
- [x] CRUD de transação (add/edit/delete) funciona end-to-end
- [x] Animações (modal, drawer, filter panel) funcionam
- [x] `npm run storybook -w @bytebank/design-system` em :6006 lista todos componentes
- [x] `npm run build/lint -w @bytebank/shell` passam
- [x] `npm run lint -w @bytebank/design-system` passa
- [x] `grep -rn "@/components/ui" apps/shell/src/` retorna vazio

## Pós-merge

- Chromatic deve publicar a primeira build da `phase-2` (verifique link no PR run)
- Tasks 4, 5 podem prosseguir
- Task 6 (PoC MF) já pode consumir `@bytebank/design-system` no remote

## Tasks relacionadas

- Anterior: [Tasks 1+2 — Monorepo migration](../sprint-0/02-migrate-shell.md)
- Próxima: Task 4 — Extrair `packages/shared`
- Doc: [docs/phase-2/sprint-0/03-extract-design-system.md](../sprint-0/03-extract-design-system.md)
EOF
)"
```

## Próximo passo

→ **Task 4** — Extrair `packages/shared` (`dev2-backend`, 0.5 dia) — pode rodar em paralelo a:

- **Task 5** — Criar `packages/api-client` + `packages/stores` vazios (`dev2-backend`)
- **Task 6** — PoC Module Federation (`dev4-dashboard` + `dev5-transactions`) — já começou e agora pode importar `@bytebank/design-system` no `hello-mfe`
