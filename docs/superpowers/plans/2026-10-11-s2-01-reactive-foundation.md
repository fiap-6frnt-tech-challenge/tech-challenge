# S2-01 Reactive Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide one RxJS event bus shared by the shell and both MFEs, React hooks for Observables, and domain events after successful API mutations.

**Architecture:** `@bytebank/stores` owns a process-local `Subject<DomainEvent>` and hook adapters. Module Federation shares RxJS and stores as singletons, with the shell supplying the synchronous RxJS namespace. `@bytebank/api-client` publishes events only after TanStack mutations succeed; TanStack remains responsible for queries and cache.

**Tech Stack:** RxJS 7.8.2, React 19, TanStack Query 5, Module Federation 2, Vitest, Playwright.

**Spec:** `docs/phase-4/sprint-2-state-reactive/01-reactive-foundation.md`

## Global Constraints

- Shell's RxJS share uses `version: '7.8.2'`, `scope: 'default'`, `lib: () => Rx`, and singleton `requiredVersion: '^7.8.0'`.
- MFEs import RxJS only from `'rxjs'`; ban subpath imports with ESLint.
- Events do not replay; each successful mutation emits one version-1 domain event. Failed mutations emit none.
- Every hook subscription is cleaned up on source change and unmount, including React StrictMode.
- No RxJS data fetching; existing TanStack query behavior remains intact.

## Review Focus

- A failed mutation must not publish an event.
- A late subscriber must not receive earlier events.
- A changed Observable source must release the previous subscription.
- An inline callback changing on render must not leak a subscription or keep a stale callback.
- A successful delete publishes the deleted ID, not an undefined HTTP response value.

---

### Task 1: Dependencies and federation configuration

**Files:** `package.json`, `package-lock.json`, `packages/stores/package.json`, `packages/api-client/package.json`, both MFE `package.json` and `rsbuild.config.ts`, `apps/shell/package.json`, `apps/shell/src/lib/federation.ts`, both MFE `eslint.config.mjs`.

**Interfaces:** All four consumers resolve the same RxJS 7.8.2 package; MFEs share it as singleton and reject `rxjs/*` imports.

- [x] Add direct RxJS dependencies to stores, shell and both MFEs; add stores dependency to api-client; add hook test dependencies where needed, using the package manager to update the lockfile.
- [x] Configure synchronous shell sharing, remote singleton sharing, and the MFE lint guard.
- [x] Run package installation and focused type/lint/build checks; commit this configuration deliverable.

### Task 2: Domain event bus

**Files:** `packages/stores/src/events/domainEvents.ts`, `domainEvents.test.ts`, `packages/stores/src/index.ts`.

**Interfaces:** `domainEvents$: Observable<DomainEvent>`, `publish(event: DomainEvent): void`, `ofType<T extends DomainEvent['type']>(type: T)` as a narrowing RxJS filter operator.

- [ ] Write marble tests for type filtering, ordered synchronous publication, and no replay; run them RED.
- [ ] Implement the bus and export it; run focused tests GREEN.
- [ ] Commit the event bus deliverable.

### Task 3: React Observable hooks

**Files:** `packages/stores/src/reactive/hooks.ts`, `hooks.test.tsx`, `packages/stores/src/index.ts`.

**Interfaces:** `useObservable<T>(source$: Observable<T>, initial: T): T`; `useSubscription<T>(source$: Observable<T>, next: (value: T) => void): void`; `useEventStream<T>(): [emit: (value: T) => void, stream$: Observable<T>]`.

- [ ] Write renderHook tests for values, source replacement, callback replacement, stable stream identity, unmount cleanup, and StrictMode; run RED.
- [ ] Implement the three hooks with React effects and a stable Subject; run focused tests GREEN.
- [ ] Commit the hooks deliverable.

### Task 4: Publish mutation events

**Files:** `packages/api-client/src/queries/hooks.ts`, `hooks.test.ts`.

**Interfaces:** On successful create/update/delete and attachment add/remove, publish the matching `DomainEvent` with `version: 1` and correct IDs or transaction payload.

- [ ] Add real-bus observer tests around all five mutation callbacks and failure cases; run RED.
- [ ] Publish events after success while preserving cache invalidation and rollback; run focused tests GREEN.
- [ ] Commit the mutation integration deliverable.

### Task 5: End-to-end federation verification

**Files:** Task doc/README status, and a verification script only if needed for repeatability.

- [ ] Run full unit tests, type-check, lint, build and architecture checks.
- [ ] In a production build, verify the two remote share descriptors resolve to the shell's RxJS/stores instance; publish via one descriptor and receive through the other. Confirm no RxJS fallback chunk is downloaded.
- [ ] Verify a mutation publishes only on success; update the S2-01 task checklist and record evidence.
