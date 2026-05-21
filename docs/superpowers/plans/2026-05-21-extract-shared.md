# Extract Shared Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract shell domain types, pure utilities, and transaction constants into the `@bytebank/shared` workspace package.

**Architecture:** `packages/shared` owns pure TypeScript modules only: no React, no Next.js, no design-system imports. The shell consumes the package through the main barrel export, while Next transpiles it via `transpilePackages`.

**Tech Stack:** npm workspaces, TypeScript, Vitest, Next.js 16, Turborepo.

---

### Task 1: Create Shared Package Skeleton

**Files:**

- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/README.md`
- Remove: `packages/.gitkeep`

- [ ] **Step 1: Create directories**

Run:

```bash
mkdir -p packages/shared/src/{types,lib,constants}
```

- [ ] **Step 2: Add package metadata**

Create `packages/shared/package.json` with workspace name `@bytebank/shared`, source exports, `lint`, `test`, and `build` scripts.

- [ ] **Step 3: Add TypeScript config**

Create `packages/shared/tsconfig.json` with bundler module resolution, strict mode, declarations, and `composite: true`.

- [ ] **Step 4: Add README and barrel**

Create `packages/shared/src/index.ts` exporting types, libs, and constants; document main and subpath import examples in `packages/shared/README.md`.

### Task 2: Move Existing Modules

**Files:**

- Move: `apps/shell/src/types/*` to `packages/shared/src/types/`
- Move: `apps/shell/src/lib/*` to `packages/shared/src/lib/`
- Move: `apps/shell/src/shared/constants/*` to `packages/shared/src/constants/`

- [ ] **Step 1: Move with git history**

Run:

```bash
git mv apps/shell/src/types/* packages/shared/src/types/
git mv apps/shell/src/lib/* packages/shared/src/lib/
git mv apps/shell/src/shared/constants/* packages/shared/src/constants/
```

- [ ] **Step 2: Remove now-empty shell folders**

Run:

```bash
rmdir apps/shell/src/types apps/shell/src/lib apps/shell/src/shared/constants apps/shell/src/shared
```

### Task 3: Preserve Behavior With Tests

**Files:**

- Create: `packages/shared/src/lib/transactions.test.ts`
- Create: `packages/shared/src/lib/format.test.ts`

- [ ] **Step 1: Write failing tests**

Test `calculateBalance`, `getAll`, `getRecent`, `formatCurrency`, `formatCurrencyExact`, and `formatDate` from `@bytebank/shared` source exports.

- [ ] **Step 2: Verify red**

Run:

```bash
npm run test -w @bytebank/shared
```

Expected before package wiring is complete: fails because imports/internal paths still need migration.

### Task 4: Fix Internal Shared Imports

**Files:**

- Modify: `packages/shared/src/constants/transaction.ts`
- Modify: `packages/shared/src/lib/transactions.ts`
- Modify: `packages/shared/src/types/transaction.ts`

- [ ] **Step 1: Remove UI dependency from constants**

Change `SelectOption` to a local structural type and import `TransactionType` from `../types`.

- [ ] **Step 2: Use relative internal imports**

Change `@/types` and `@/shared/constants/transaction` imports to relative package paths.

- [ ] **Step 3: Verify green for shared tests**

Run:

```bash
npm run test -w @bytebank/shared
```

Expected: all shared tests pass.

### Task 5: Update Shell Consumption

**Files:**

- Modify: `apps/shell/package.json`
- Modify: `apps/shell/next.config.ts`
- Modify: all shell/stories files importing `@/types`, `@/lib/*`, or `@/shared/constants/*`

- [ ] **Step 1: Add workspace dependency**

Add `"@bytebank/shared": "*"` to `apps/shell/package.json` dependencies.

- [ ] **Step 2: Transpile workspace package**

Add `transpilePackages: ['@bytebank/shared']` to `apps/shell/next.config.ts`.

- [ ] **Step 3: Replace old imports**

Change all imports from `@/types`, `@/lib/*`, and `@/shared/constants/*` to `@bytebank/shared`.

### Task 6: Validate End State

**Files:**

- Modify: `package-lock.json`

- [ ] **Step 1: Install workspace links**

Run:

```bash
npm install
```

- [ ] **Step 2: Run checks**

Run:

```bash
npm run test -w @bytebank/shared
npm run lint -w @bytebank/shared
npm run build -w @bytebank/shell
npm run lint -w @bytebank/shell
```

- [ ] **Step 3: Confirm no stale imports**

Run:

```bash
rg "@/(types|lib|shared/constants)" apps/shell/src apps/shell/stories
```

Expected: no matches.
