# Task 3 — Extrair `packages/shared`

|                      |                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sprint**           | [Sprint 0 — Foundation](../sprint-0-foundation.md)                                                                                               |
| **Owner**            | `dev2-backend`                                                                                                                                   |
| **Duração estimada** | 0.5 dia                                                                                                                                          |
| **Branch**           | `phase-2/dev2-backend/extract-shared` (a partir de `phase-2`)                                                                                    |
| **Depende de**       | [Bundle Tasks 1+2](./02-migrate-shell.md) mergeado em `phase-2`                                                                                  |
| **Desbloqueia**      | [Task 4 — Extract DS](./04-extract-design-system.md) (DS consome `cn`, `getInputBorderColor`, types e constants de `@bytebank/shared`); Tasks 5+ |

---

## Contexto

A Task 2 deixou os módulos compartilhados em `apps/shell/src/{types,lib,shared}/`. Esta task **extrai esses módulos para um package npm workspace `@bytebank/shared`** — base comum sem dependências de DS, ideal para servir todos os consumers (shell, DS, MFEs futuros).

### Por que extrair primeiro (antes do DS)?

- **DS depende de shared:** componentes do DS importam `cn` (`@/lib/classes`) e `getInputBorderColor` (`@/lib/input`) — sem `@bytebank/shared` antes, DS quebra ao mover
- **Stories mocks dependem de shared:** `stories/mocks/transactions.ts` importa `Transaction` de `@/types`
- **`shared` não tem deps de outros pacotes** — fundação limpa
- **Curta duração** (0.5 dia) — desbloqueia DS rapidamente

### O que NÃO é objetivo

- Tornar `@bytebank/shared` consumível externamente (publicação npm fica fora)
- Adicionar lógica nova (só move o que existe; refactor fica para Sprints 1-3)
- Mover utilitários do DS (`cn`, `getInputBorderColor`) — esses **continuam** em `lib/` e migram para o shared package; a Task 4 (DS) consome via dep

### Decisão de boundary entre shared e DS

| Módulo                                                                | Vai para | Justificativa                                                           |
| --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| `types/transaction.ts` (Transaction, Account)                         | `shared` | Modelos de domínio, agnósticos de UI                                    |
| `lib/classes.ts` (`cn`)                                               | `shared` | Util genérico de string; útil em qualquer lugar                         |
| `lib/input.ts` (`getInputBorderColor`)                                | `shared` | Retorna nomes de classes Tailwind (string puro); não importa nada de DS |
| `lib/format.ts` (`formatCurrency`, `formatDate`)                      | `shared` | Formatadores genéricos pt-BR                                            |
| `lib/transactions.ts` (`calculateBalance`, `getAll`, `getRecent`)     | `shared` | Lógica de domínio, usada por contexto e futuras APIs                    |
| `shared/constants/transaction.ts` (`TRANSACTION_TYPE`, `BADGE_*_MAP`) | `shared` | Constantes de domínio + maps de display                                 |

**Por que `cn` e `getInputBorderColor` ficam em shared (e não em DS)?**

- `cn` é trivial (concat de strings) — desperdício transformar em barreira de package
- `getInputBorderColor` retorna strings de classe Tailwind — independente da implementação React do DS
- Manter o DS **sem deps internas no shared** seria opção, mas: DS já vai ter dep externa (lucide-react, React peer); uma dep em shared não adiciona complexidade real e mantém código duplicado de fora
- Alternativa rejeitada: `cn` e `getInputBorderColor` dentro do DS → exigiria DS exportar utilitários, criar dois lugares para utils (`@bytebank/design-system/utils` vs `@bytebank/shared/lib`), e shared (sem DS dep) acabaria duplicando `cn` se precisasse

## Mapa de migração

### Folders que movem

| Atual                              | Destino                          | Notas                                                    |
| ---------------------------------- | -------------------------------- | -------------------------------------------------------- |
| `apps/shell/src/types/`            | `packages/shared/src/types/`     | `transaction.ts` + barrel `index.ts`                     |
| `apps/shell/src/lib/`              | `packages/shared/src/lib/`       | `classes.ts`, `format.ts`, `input.ts`, `transactions.ts` |
| `apps/shell/src/shared/constants/` | `packages/shared/src/constants/` | `transaction.ts` (constantes + maps)                     |

> Note que `apps/shell/src/shared/` (com subfolder `constants/`) é uma idiosincrasia da Fase 1. No novo layout, `packages/shared/src/constants/` é direto — sem aninhamento estranho.

### Imports que precisam mudar (no shell + DS components que ainda vivem no shell)

Ver ["Phase F — Codemod"](#phase-f--codemod-de-imports) abaixo. Resumo:

| Padrão atual                            | Padrão novo               |
| --------------------------------------- | ------------------------- |
| `from '@/types'`                        | `from '@bytebank/shared'` |
| `from '@/types/...'`                    | `from '@bytebank/shared'` |
| `from '@/lib/classes'`                  | `from '@bytebank/shared'` |
| `from '@/lib/format'`                   | `from '@bytebank/shared'` |
| `from '@/lib/input'`                    | `from '@bytebank/shared'` |
| `from '@/lib/transactions'`             | `from '@bytebank/shared'` |
| `from '@/shared/constants/transaction'` | `from '@bytebank/shared'` |

Após esta task: ~40 arquivos do shell terão imports atualizados (inclui ~16 componentes em `components/ui/` ainda no shell, que serão movidos para DS na Task 4).

### Sutileza: `SelectOption` em `constants/transaction.ts`

Hoje `shared/constants/transaction.ts` faz:

```ts
import { SelectOption } from '@/components/ui/Select';
```

Isso criaria uma dep circular: `shared` precisaria de `@bytebank/design-system`. **Solução:** inline o tipo estruturalmente — não há custo real porque o TypeScript checa compatibilidade estrutural ao passar `TRANSACTION_TYPE_OPTIONS` para o prop `options` do `Select`:

```ts
// packages/shared/src/constants/transaction.ts (depois)
import { TransactionType } from '../types';

type SelectOption = { label: string; value: string };  // structural local type

export const TRANSACTION_TYPE = { ... };
export const TRANSACTION_TYPE_OPTIONS: SelectOption[] = [ ... ];
```

`shared` fica zero-dep em outros packages do monorepo. ✓

## Pré-condições

- [ ] Bundle Tasks 1+2 mergeado em `phase-2` (`apps/shell/` operacional)
- [ ] `npm run dev -w @bytebank/shell` sobe `:3000` antes de começar (baseline)
- [ ] Feature branch criada:
  ```bash
  git checkout phase-2 && git pull origin phase-2
  git checkout -b phase-2/dev2-backend/extract-shared
  ```
- [ ] Working tree limpa

## Implementação passo-a-passo

> Todos os comandos rodam a partir de `tech-challenge/`. Use `git mv` para preservar histórico.

### Phase A — Criar skeleton do package

```bash
mkdir -p packages/shared/src/{types,lib,constants}
```

### Phase B — Mover folders

```bash
# Types
git mv apps/shell/src/types/* packages/shared/src/types/
rmdir apps/shell/src/types 2>/dev/null || true

# Lib (classes, format, input, transactions)
git mv apps/shell/src/lib/* packages/shared/src/lib/
rmdir apps/shell/src/lib 2>/dev/null || true

# Constants (note: vem de shared/constants/ — não confundir com o NOVO packages/shared/)
git mv apps/shell/src/shared/constants/* packages/shared/src/constants/
rmdir apps/shell/src/shared/constants 2>/dev/null || true
rmdir apps/shell/src/shared 2>/dev/null || true
```

Confirme:

```bash
ls packages/shared/src/types/      # transaction.ts  index.ts
ls packages/shared/src/lib/        # classes.ts  format.ts  input.ts  transactions.ts
ls packages/shared/src/constants/  # transaction.ts
```

### Phase C — Resolver dep circular em `constants/transaction.ts`

Edite `packages/shared/src/constants/transaction.ts`:

```diff
-import { SelectOption } from '@/components/ui/Select';
-import { TransactionType } from '@/types';
+import { TransactionType } from '../types';
+
+type SelectOption = { label: string; value: string };
```

> O `TransactionType` agora vem do package interno (caminho relativo `../types`). O `SelectOption` é inline — sem dep no DS.

### Phase D — Ajustar paths internos em `lib/transactions.ts`

`lib/transactions.ts` importa `@/types` e `@/shared/constants/transaction`. Como agora está dentro do package shared, paths viram relativos:

Edite `packages/shared/src/lib/transactions.ts`:

```diff
-import type { Transaction } from '@/types';
-import { TRANSACTION_TYPE } from '@/shared/constants/transaction';
+import type { Transaction } from '../types';
+import { TRANSACTION_TYPE } from '../constants/transaction';
```

> Não há outros imports internos no `lib/`. `format.ts`, `classes.ts`, `input.ts` não importam de `@/`.

E em `packages/shared/src/types/transaction.ts`:

```diff
-import { TRANSACTION_TYPE } from '@/shared/constants/transaction';
+import { TRANSACTION_TYPE } from '../constants/transaction';
```

### Phase E — Configurar package shared

Crie `packages/shared/package.json`:

```json
{
  "name": "@bytebank/shared",
  "version": "0.1.0",
  "private": true,
  "description": "Bytebank — types, utilitários e constantes compartilhadas",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./lib/*": "./src/lib/*.ts",
    "./constants/*": "./src/constants/*.ts"
  },
  "files": ["src"],
  "scripts": {
    "lint": "eslint src",
    "test": "vitest"
  },
  "devDependencies": {
    "@types/node": "^20",
    "eslint": "^9",
    "typescript": "^5",
    "vitest": "^4.0.18"
  }
}
```

**Decisões:**

- **Sem runtime deps** — `shared` é apenas TS source com tipos e utilities puras
- **Sem peerDependencies** — código não toca React/Next, só TS puro
- **`exports` granulares disponíveis (opt-in)** — todos os consumers atuais (codemod desta task) usam entry principal `import { cn, formatCurrency } from '@bytebank/shared'`. Subpaths como `@bytebank/shared/lib/format` ficam **disponíveis** mas não usados; tree-shaking efetivo vem do bundler analisar exports do barrel `index.ts` (Next.js Turbopack faz isso bem). Decisão: simplicidade > granularidade até medirmos bundle size impact
- **Sem `react` em devDeps** — não precisa

Crie `packages/shared/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
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
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

> Mesma estratégia do DS (Task 4): composite + declarationMap para Project References + `outDir` só para `.d.ts`. Sem JS build — consumers transpilam.

Crie `packages/shared/src/index.ts` (barrel):

```ts
// Types
export * from './types';

// Lib utilities
export * from './lib/classes';
export * from './lib/format';
export * from './lib/input';
export * from './lib/transactions';

// Constants
export * from './constants/transaction';
```

Crie `packages/shared/README.md` mínimo:

````markdown
# @bytebank/shared

Types, utilitários e constantes compartilhadas entre todos os packages do Bytebank.

## Uso

```ts
import {
  type Transaction,
  cn,
  formatCurrency,
  getInputBorderColor,
  calculateBalance,
  TRANSACTION_TYPE,
} from '@bytebank/shared';
```
````

Subpaths disponíveis (opt-in, raramente necessário com Turbopack):

```ts
import { formatCurrency } from '@bytebank/shared/lib/format';
import type { Transaction } from '@bytebank/shared/types';
```

> **Padrão recomendado:** usar entry principal (`@bytebank/shared`). Subpaths só se medirmos overhead específico no bundle.

## Convenções

- Sem deps de UI (React, DOM)
- Sem deps de framework (Next.js)
- Apenas TS puro + tipos

````

### Phase F — Codemod de imports

#### F1 — Adicionar dep no shell

Edite `apps/shell/package.json`:

```diff
   "dependencies": {
+    "@bytebank/shared": "*",
     "@hookform/resolvers": "^5.2.2",
     "lucide-react": "^0.577.0",
     ...
   }
````

#### F2 — Codemod nos imports do shell + DS components

```bash
cd apps/shell/src

# @/types e variantes
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec \
  sed -i.bak -E "s|from '@/types(/[^']*)?'|from '@bytebank/shared'|g" {} +

# @/lib/* (todos os módulos)
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec \
  sed -i.bak -E "s|from '@/lib/[^']+'|from '@bytebank/shared'|g" {} +

# @/shared/constants/*
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec \
  sed -i.bak -E "s|from '@/shared/constants/[^']+'|from '@bytebank/shared'|g" {} +

# Limpar backups
find . -name "*.bak" -delete

cd ../..
```

Confirme que zerou:

```bash
grep -rn "from '@/types\|from '@/lib\|from '@/shared/constants" apps/shell/src/ || echo "OK - zero imports antigos"
```

### Phase G — Instalar, validar e commit

```bash
npm install   # resolve novo workspace

# Validações
npm run dev -w @bytebank/shell &
SHELL_PID=$!
sleep 5
curl -s http://localhost:3000 | grep -c "Bytebank" || echo "Home não renderizou"
kill $SHELL_PID

npm run build -w @bytebank/shell
npm run lint -w @bytebank/shell
npm run lint -w @bytebank/shared
```

Sanity checks manuais:

- [ ] `http://localhost:3000/` — home renderiza igual à Fase 1, badge de transação correto, valores formatados
- [ ] `http://localhost:3000/transactions` — listagem com filtros, paginação, modais funcionais
- [ ] CRUD de transação (add/edit/delete) end-to-end funciona — valores em BRL, datas pt-BR
- [ ] DevTools console: sem erros de "Cannot find module"

Commit:

```bash
git add .
git status

git commit -m "feat(shared): extract types, lib utils and constants to @bytebank/shared

- Move src/types/, src/lib/, src/shared/constants/ from apps/shell to packages/shared
- Fix internal imports: relative paths instead of @/ alias (intra-package)
- Inline SelectOption type in constants/transaction.ts (remove DS dependency)
- Create packages/shared/{package.json, tsconfig.json, README.md, src/index.ts}
- Add @bytebank/shared workspace dep to apps/shell
- Codemod 40+ files: @/types, @/lib/*, @/shared/constants/* → @bytebank/shared

Validated:
- npm install resolves workspace
- npm run dev -w @bytebank/shell renders identical to baseline
- npm run build/lint passes for both shell and shared

Refs: docs/phase-2/sprint-0/03-extract-shared.md"
```

## Estado final esperado

```
tech-challenge/
├── apps/
│   └── shell/
│       ├── src/
│       │   ├── app/                    ← (sem mudança)
│       │   ├── components/
│       │   │   ├── ui/                 ← AINDA aqui (Task 4 move para packages/design-system)
│       │   │   │   └── (imports já apontam para @bytebank/shared)
│       │   │   └── features/
│       │   ├── context/, hooks/, services/    ← (sem mudança, imports atualizados)
│       │   └── (types/, lib/, shared/ removidos!)
│       └── package.json                ← +@bytebank/shared
├── packages/
│   ├── shared/                         ← NOVO PACKAGE
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── transaction.ts
│   │   │   │   └── index.ts
│   │   │   ├── lib/
│   │   │   │   ├── classes.ts
│   │   │   │   ├── format.ts
│   │   │   │   ├── input.ts
│   │   │   │   └── transactions.ts
│   │   │   ├── constants/
│   │   │   │   └── transaction.ts      ← SelectOption inline
│   │   │   └── index.ts                ← barrel
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   └── .gitkeep                        ← removido se ainda existir
└── ...
```

## Validação

- [ ] `npm install` na raiz resolve `@bytebank/shared` como workspace
- [ ] `npm run dev -w @bytebank/shell` em `:3000` — home + transactions idênticas à Fase 1
- [ ] CRUD de transação (add/edit/delete) funciona end-to-end
- [ ] Valores monetários em BRL (`formatCurrency`), datas em pt-BR (`formatDate`)
- [ ] Badge de tipo de transação correto (depende de `BADGE_VARIANT_MAP` do shared)
- [ ] `npm run build -w @bytebank/shell` produz `.next/` válido
- [ ] `npm run lint -w @bytebank/shell` passa
- [ ] `npm run lint -w @bytebank/shared` passa
- [ ] `grep -rn "from '@/types\\|from '@/lib\\|from '@/shared/constants" apps/shell/src/` retorna vazio
- [ ] `git log --follow packages/shared/src/lib/format.ts` mostra histórico desde Fase 1

## Gotchas

1. **`SelectOption` inline em vez de import.** A primeira tentação é importar `SelectOption` de `@bytebank/design-system` quando a Task 4 mergear. Resista — isso criaria ciclo `shared → DS → shared`. O tipo é trivial (`{label, value}`) e a checagem estrutural do TS garante compat com Select.

2. **`shared/constants/` (Fase 1) vs `packages/shared/` (Fase 2).** O nome "shared" colidia — Fase 1 tinha `apps/shell/src/shared/constants/`, Fase 2 tem `packages/shared/`. Esta task achata isso: `packages/shared/src/constants/` (sem aninhamento extra). A folder `apps/shell/src/shared/` deve sumir após o `rmdir`.

3. **DS components ainda em apps/shell/ após esta task.** Confuso mas correto. A Task 4 move eles para `packages/design-system/`. Aqui só atualizamos os imports DELES (que agora apontam para `@bytebank/shared`) — facilita a Task 4 que vira praticamente um `git mv` simples.

4. **Subpath exports + Next.js bundler.** O `exports` field permite `@bytebank/shared/lib/format`. Funciona com Next.js 16 + Turbopack. Se for usar TypeScript moduleResolution=node (legado), precisa de `"moduleResolution": "Bundler"` ou `"NodeNext"` — já configurado no tsconfig do shell.

5. **Codemod regex em macOS sed.** `sed -i.bak` no macOS exige sufixo. Os comandos do Phase F2 já usam `-i.bak` e limpam backups depois. Em Linux funcionaria `sed -i` sem sufixo — mas como time é macOS-pesado, mantém compat.

6. **`composite: true` + Project References.** Habilita TS Project References para builds incrementais. Próximos packages (DS, api-client, stores) terão a mesma flag. Não há `references` array agora — adicionar quando outros packages existirem.

7. **`transpilePackages` no shell já cobre.** O `next.config.ts` do shell precisa transpilar packages de workspace. Atualmente (após Task 2) está vazio. **Adicione `@bytebank/shared` ao array** em `next.config.ts`:

   ```ts
   transpilePackages: ['@bytebank/shared'],
   ```

   A Task 4 adiciona `@bytebank/design-system` também.

8. **Hot reload entre packages.** Edição em `packages/shared/src/lib/format.ts` reflete em runtime no shell rodando em `:3000`, graças a `transpilePackages`.

## Pull Request

```bash
git push -u origin phase-2/dev2-backend/extract-shared
gh pr create --base phase-2 --title "feat(shared): extract types, lib utils and constants to @bytebank/shared" \
  --body "$(cat <<'EOF'
## Sumário

Extrai os módulos compartilhados (types, lib, constants) do shell para um package npm workspace `@bytebank/shared`. Sem deps de UI ou framework — base limpa para todos os consumers do monorepo (shell, DS na Task 4, MFEs futuros).

## O que move (apps/shell/src → packages/shared/src)

- `types/*` → `types/` (Transaction, Account)
- `lib/*` → `lib/` (classes/cn, format, input, transactions)
- `shared/constants/*` → `constants/` (TRANSACTION_TYPE, BADGE_*_MAP)

## Ajustes

- `constants/transaction.ts`: remove import de `@/components/ui/Select`; inline `SelectOption` estrutural
- `lib/transactions.ts` e `types/transaction.ts`: imports `@/*` → caminhos relativos
- Codemod 40+ arquivos em `apps/shell/src/`: `@/types`, `@/lib/*`, `@/shared/constants/*` → `@bytebank/shared`
- `apps/shell/package.json`: + dep `@bytebank/shared: "*"`
- `apps/shell/next.config.ts`: + `transpilePackages: ['@bytebank/shared']`

## Files novos (packages/shared)

- `package.json` com `exports` (entry principal + subpaths)
- `tsconfig.json` (composite, declarationMap)
- `src/index.ts` (barrel)
- `README.md`

## Test plan

- [x] `npm install` na raiz resolve workspace
- [x] `npm run dev -w @bytebank/shell` — home + transactions idênticas à Fase 1
- [x] CRUD de transação funciona; valores BRL e datas pt-BR corretos
- [x] Badges de tipo (Depósito/Saque/Transferência) corretos
- [x] `npm run build/lint -w @bytebank/shell` passam
- [x] `npm run lint -w @bytebank/shared` passa
- [x] `grep` por imports antigos retorna vazio

## Pós-merge

- Task 4 (`dev3-ds`) pode iniciar — DS já vai importar do shared
- Task 5 (`dev2-backend`) pode iniciar — packages vazios

## Tasks relacionadas

- Anterior: [Tasks 1+2 — Monorepo migration](../sprint-0/02-migrate-shell.md)
- Próxima: [Task 4 — Extract design-system](../sprint-0/04-extract-design-system.md)
- Doc: [docs/phase-2/sprint-0/03-extract-shared.md](../sprint-0/03-extract-shared.md)
EOF
)"
```

## Próximo passo

→ **Task 4** — Extrair `packages/design-system` (`dev3-ds`, 1 dia) — pode iniciar **após esta PR mergear em `phase-2`**, em paralelo com:

- **Task 5** — Criar `packages/api-client` e `packages/stores` vazios (`dev2-backend`)
- **Task 6** — PoC Module Federation (`dev4-dashboard` + `dev5-transactions`) — também pode consumir `@bytebank/shared` no remote
