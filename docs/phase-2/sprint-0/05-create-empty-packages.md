# Task 5 — Criar `packages/api-client` e `packages/stores` (vazios)

|                      |                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Sprint**           | [Sprint 0 — Foundation](../sprint-0-foundation.md)                                                                     |
| **Owner**            | `dev2-backend`                                                                                                         |
| **Duração estimada** | 0.5 dia                                                                                                                |
| **Branch**           | `phase-2/dev2-backend/empty-packages` (a partir de `phase-2`)                                                          |
| **Depende de**       | [Bundle Tasks 1+2](./02-migrate-shell.md) mergeado em `phase-2` (independente de Tasks 3 e 4 — pode rodar em paralelo) |
| **Desbloqueia**      | Sprint 1 (api-client recebe hooks TanStack Query; stores recebe Zustand stores)                                        |

---

## Contexto

Sprint 1 vai introduzir **Zustand + TanStack Query** como gestão de estado (migrando do Context API atual). Para que o Sprint 1 possa começar **sem fricção de infra**, esta task cria os **skeletons vazios** dos dois packages que receberão essa lógica:

- `@bytebank/api-client` — hooks TanStack Query, fetchers HTTP, tipos de resposta (preenchido em Sprint 1)
- `@bytebank/stores` — Zustand stores (`useAuthStore`, `useUIStore`, preenchido em Sprint 1)

Esta task é **puramente estrutural**: cria `package.json`, `tsconfig.json`, `README.md`, e `src/index.ts` vazio em cada package. Nenhuma dep runtime é adicionada — Sprint 1 instala `zustand`, `@tanstack/react-query` etc. quando for usar.

### Por que criar agora (Sprint 0)?

- **Workspace resolution validado** — confirma que `npm install` resolve esses workspaces antes do Sprint 1 começar
- **Padrão estabelecido** — Sprint 1 só preenche; não desperdiça tempo decidindo nomes, estrutura, exports
- **Documenta intent** — README de cada package deixa claro o que vai morar lá
- **Zero risco** — packages vazios não afetam comportamento do shell

### O que NÃO é objetivo

- Instalar `zustand`, `@tanstack/react-query` ou qualquer runtime dep — fica para Sprint 1
- Implementar nenhum store ou hook — fica para Sprint 1
- Configurar `<QueryClientProvider>` no shell — Sprint 1 faz quando criar o primeiro hook

## Estrutura criada

```
tech-challenge/packages/
├── api-client/                  ← novo
│   ├── src/
│   │   └── index.ts             ← vazio (com TODO comment)
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
└── stores/                      ← novo
    ├── src/
    │   └── index.ts             ← vazio (com TODO comment)
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

## Pré-condições

- [ ] Bundle Tasks 1+2 mergeado em `phase-2`
- [ ] Feature branch criada:
  ```bash
  git checkout phase-2 && git pull origin phase-2
  git checkout -b phase-2/dev2-backend/empty-packages
  ```
- [ ] Working tree limpa

> **Independente de Tasks 3 e 4** — pode rodar em paralelo com `dev2-backend` fazendo Task 3 e `dev3-ds` fazendo Task 4.

## Implementação passo-a-passo

### Phase A — Criar estrutura de diretórios

```bash
cd tech-challenge
mkdir -p packages/api-client/src
mkdir -p packages/stores/src
```

### Phase B — Criar `packages/api-client`

`packages/api-client/package.json`:

```json
{
  "name": "@bytebank/api-client",
  "version": "0.1.0",
  "private": true,
  "description": "Bytebank — TanStack Query hooks + HTTP fetchers para transações, summary, anexos",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": ["src"],
  "scripts": {
    "lint": "eslint src",
    "test": "vitest"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19",
    "eslint": "^9",
    "typescript": "^5",
    "vitest": "^4.0.18"
  }
}
```

> **Notas:**
>
> - **Sem runtime deps** — Sprint 1 adiciona `@tanstack/react-query` e (opcionalmente) `@bytebank/shared` quando criar os primeiros hooks
> - **`react` como peerDep** — hooks usam React (`useQuery`, `useMutation`); consumer fornece
> - **Mesma estrutura `exports` simples** que outros packages — Sprint 1 pode adicionar subpaths se precisar

`packages/api-client/tsconfig.json`:

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
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

`packages/api-client/src/index.ts`:

```ts
// TODO (Sprint 1, dev4-dashboard): TanStack Query hooks + HTTP fetchers
//
// Planned exports:
// - useTransactions(filters)
// - useTransaction(id)
// - useInfiniteTransactions(filters)
// - useCreateTransaction()
// - useUpdateTransaction()
// - useDeleteTransaction()
// - useDashboardSummary({ from, to })
// - QueryClient factory
//
// See: docs/phase-2/sprint-1-auth-state.md task 8

export {};
```

`packages/api-client/README.md`:

```markdown
# @bytebank/api-client

Hooks TanStack Query e fetchers HTTP para consumo da API do shell (`/api/*`).

## Uso (após Sprint 1)

\`\`\`ts
import { useTransactions, useCreateTransaction } from '@bytebank/api-client';

const { data, isLoading } = useTransactions({ type: 'deposit' });
const { mutate } = useCreateTransaction();
\`\`\`

## Status atual

🚧 **Stub vazio** — implementação planejada para Sprint 1 ([sprint-1-auth-state.md](../../docs/phase-2/sprint-1-auth-state.md) task 8).
```

### Phase C — Criar `packages/stores`

`packages/stores/package.json`:

```json
{
  "name": "@bytebank/stores",
  "version": "0.1.0",
  "private": true,
  "description": "Bytebank — Zustand stores compartilhadas (auth, UI)",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": ["src"],
  "scripts": {
    "lint": "eslint src",
    "test": "vitest"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19",
    "eslint": "^9",
    "typescript": "^5",
    "vitest": "^4.0.18"
  }
}
```

`packages/stores/tsconfig.json`:

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
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

`packages/stores/src/index.ts`:

```ts
// TODO (Sprint 1, dev4-dashboard): Zustand stores compartilhadas
//
// Planned exports:
// - useAuthStore — sessão NextAuth, user, logout()
// - useUIStore — filter panel open, modais, feedback toast state
//
// See: docs/phase-2/sprint-1-auth-state.md task 7

export {};
```

`packages/stores/README.md`:

```markdown
# @bytebank/stores

Zustand stores globais compartilhadas entre todos os apps do monorepo.

## Uso (após Sprint 1)

\`\`\`ts
import { useAuthStore, useUIStore } from '@bytebank/stores';

const user = useAuthStore((state) => state.user);
const showFilters = useUIStore((state) => state.filterPanelOpen);
\`\`\`

## Status atual

🚧 **Stub vazio** — implementação planejada para Sprint 1 ([sprint-1-auth-state.md](../../docs/phase-2/sprint-1-auth-state.md) task 7).
```

### Phase D — Registrar workspace deps no shell

Edite `apps/shell/package.json` adicionando as duas deps (ordem alfabética):

```diff
   "dependencies": {
     "@bytebank/design-system": "*",
+    "@bytebank/api-client": "*",
+    "@bytebank/stores": "*",
     "@bytebank/shared": "*",
     "@hookform/resolvers": "^5.2.2",
     ...
   }
```

> **Por quê agora?** Validar que `npm install` resolve os 4 workspaces (`shared`, `design-system`, `api-client`, `stores`) e que não há conflito de paths/exports. Quando Sprint 1 começar, basta `import { ... }` — sem precisar editar `package.json` antes.
>
> **Convenção de ordem:** packages do `@bytebank/*` em bloco no topo das deps, em ordem alfabética. Facilita revisão.

### Phase E — Instalar e validar

```bash
cd tech-challenge
npm install
```

Sanity checks:

```bash
# Workspaces todos registrados?
npm ls --workspaces --depth=0
# Esperado (4 workspaces):
# @bytebank/api-client@0.1.0       -> packages/api-client
# @bytebank/design-system@0.1.0    -> packages/design-system  (se Task 4 já mergeou)
# @bytebank/shared@0.1.0           -> packages/shared          (se Task 3 já mergeou)
# @bytebank/shell@0.1.0            -> apps/shell
# @bytebank/stores@0.1.0           -> packages/stores

# Shell consegue resolver os imports vazios?
cat > /tmp/test-import.ts <<'EOF'
import * as apiClient from '@bytebank/api-client';
import * as stores from '@bytebank/stores';
console.log(Object.keys(apiClient), Object.keys(stores));
EOF
npx --workspace=@bytebank/shell tsc --noEmit /tmp/test-import.ts
rm /tmp/test-import.ts
# Esperado: sem erros (módulos resolvem, mesmo vazios)

# Shell continua subindo?
npm run dev -w @bytebank/shell
# http://localhost:3000 funciona igual a antes
```

> O teste do `tsc --noEmit` é opcional — só serve para confirmar resolução de módulo antes do Sprint 1.

### Phase F — Commit

```bash
git add packages/api-client packages/stores apps/shell/package.json package-lock.json
git status

git commit -m "feat(monorepo): scaffold @bytebank/api-client and @bytebank/stores (empty stubs)

- Create packages/api-client/ skeleton (package.json, tsconfig, src/index.ts, README)
- Create packages/stores/ skeleton (package.json, tsconfig, src/index.ts, README)
- Both stubs export {} with TODO comments pointing to Sprint 1
- Add @bytebank/api-client and @bytebank/stores as workspace deps in apps/shell
- React listed as peerDep in both packages (hooks/stores use React)

Sprint 1 will fill these in (TanStack Query hooks, Zustand stores).

Refs: docs/phase-2/sprint-0/05-create-empty-packages.md"
```

## Validação

- [ ] `npm install` resolve todos os workspaces sem erros
- [ ] `npm ls --workspaces --depth=0` mostra `@bytebank/api-client` e `@bytebank/stores`
- [ ] `npm run dev -w @bytebank/shell` em `:3000` continua funcionando idêntico
- [ ] `npm run build -w @bytebank/shell` passa
- [ ] `npm run lint -w @bytebank/api-client` passa (sem código pra lint)
- [ ] `npm run lint -w @bytebank/stores` passa
- [ ] `apps/shell/package.json` lista `@bytebank/api-client` e `@bytebank/stores` nas deps

## Gotchas

1. **Export vazio `{}` é necessário.** `index.ts` sem nenhum `export` faz TypeScript tratar o arquivo como CommonJS script (não módulo) e quebra `import * as ... from`. O `export {};` é idiomático para marcar arquivo como ES module mesmo sem exports reais.

2. **`peerDependencies.react` em packages vazios.** Está "preventivo" — Sprint 1 vai usar React hooks. Declarar agora documenta intent e evita surpresa quando Sprint 1 começar.

3. **Sem `@bytebank/shared` como dep ainda.** Adicionar quando Sprint 1 importar tipos (`Transaction`, etc.). Manter limpo agora.

4. **Não adicionar `zustand`, `@tanstack/react-query` agora.** Tentação grande de "já adianta install", mas:
   - Atrasa a install em CI por nada (deps grandes)
   - Sprint 1 pode reconsiderar versões/alternativas
   - Esta task é estrutural; runtime fica para quem implementa

5. **`composite: true` no tsconfig.** Mesmo padrão de `shared` e `design-system` — habilita Project References. Não há `references` array no tsconfig do shell ainda (Sprint 1 pode adicionar para builds incrementais).

6. **PR muito pequeno (uns 8 arquivos).** Resista à tentação de incluir mais. PRs pequenos são fáceis de revisar e mergear.

## Pull Request

```bash
git push -u origin phase-2/dev2-backend/empty-packages
gh pr create --base phase-2 --title "feat(monorepo): scaffold @bytebank/api-client and @bytebank/stores" \
  --body "$(cat <<'EOF'
## Sumário

Cria skeletons vazios de dois novos workspace packages que serão preenchidos em Sprint 1:

- **`@bytebank/api-client`** — TanStack Query hooks + HTTP fetchers
- **`@bytebank/stores`** — Zustand stores (auth, UI)

Esta task é **puramente estrutural** — nenhuma lógica de runtime, nenhuma dep nova (além de TypeScript/Vitest dev). Sprint 1 (dev4-dashboard) implementa hooks e stores.

## O que cria

- `packages/api-client/{package.json, tsconfig.json, src/index.ts, README.md}`
- `packages/stores/{package.json, tsconfig.json, src/index.ts, README.md}`
- `apps/shell/package.json`: adiciona deps `@bytebank/api-client: "*"` e `@bytebank/stores: "*"` (registra workspace links)

## Por que agora (Sprint 0)?

- Valida workspace resolution antes do Sprint 1 começar
- Estabelece padrão (mesma estrutura de `@bytebank/shared`)
- Documenta intent via READMEs apontando para tasks do Sprint 1

## Test plan

- [x] `npm install` resolve todos os workspaces
- [x] `npm ls --workspaces --depth=0` lista `@bytebank/api-client` e `@bytebank/stores`
- [x] `npm run dev -w @bytebank/shell` continua funcionando idêntico
- [x] `npm run build/lint -w @bytebank/shell` passam
- [x] Ambos novos packages têm lint passando (sem código pra lintar)

## Tasks relacionadas

- Anterior: Tasks 3/4 (extract shared/DS) — independente, pode rodar em paralelo
- Próxima: Task 6 (PoC MF)
- Implementação no Sprint 1: tasks 7 (stores) e 8 (api-client) em [sprint-1-auth-state.md](../sprint-1-auth-state.md)
- Doc: [docs/phase-2/sprint-0/05-create-empty-packages.md](../sprint-0/05-create-empty-packages.md)
EOF
)"
```

## Próximo passo

→ **Task 6** — PoC Module Federation (`dev4-dashboard` + `dev5-transactions`, 3 dias) — independente desta task; pode estar rodando em paralelo desde o dia 1 do Sprint 0.

Após Task 5 + Task 3 + Task 4 mergearem:

- 4 workspace packages funcionais (`shared`, `design-system`, `api-client`, `stores`)
- Shell consome todos via workspace deps
- Sprint 1 pode começar sem fricção de infra
