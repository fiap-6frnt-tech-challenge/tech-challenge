# S2-04 Redux Patterns Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement the tasks inline, with one independent branch review at the end.

**Goal:** Normalize notifications and upload metadata, centralize client effects, and clear client state and transfers at logout.

**Architecture:** `@bytebank/stores` owns serializable entity slices, memoized selectors, the reset action, and listener middleware. The shell composes domain-event notifications and logout effects with TanStack Query. The MFE keeps Files and RxJS subscriptions outside Redux and forwards queue metadata to the shared store.

**Tech Stack:** Redux Toolkit 2, React 19, RxJS 7.8.2, TanStack Query 5, Vitest, Playwright.

**Spec:** `docs/phase-4/sprint-2-state-reactive/04-redux-patterns.md`

## Global Constraints

- Branch `dev2-arch/redux-patterns` starts at `origin/upload-stream` (`41bf718`), which includes `phase-4` (`46f5102`). Rebase after S2-03 merges.
- Server transactions remain in TanStack Query; Redux holds notifications and upload metadata only. No Files, Errors, subscriptions, or cancellation callbacks in Redux.
- Preserve public `showFeedback`, `hideFeedback`, and `selectFeedback` compatibility; display the oldest notification first.
- Register application listeners in the shell. The stores package must not import api-client or the MFE.
- DevTools is enabled only when `process.env.NODE_ENV !== 'production'`.

## Review Focus

- Dismissing one notification must reveal the next, including equal timestamps.
- Queued uploads count as pending; weighted progress excludes terminal entries and handles zero totals.
- Logout must cancel active and queued transfers before resetting Redux, without late reconciliation or feedback repopulating caches/state.
- StrictMode mount/cleanup must not duplicate event subscriptions, listeners, or unload warnings.
- One domain event produces one success notification; component success dispatches must not duplicate it.

### Task 1: Normalized client state

**Files:** `packages/stores/src/{notificationsSlice,uploadsSlice,store,uiSlice,index}.ts` and slice/store tests.

**Interfaces:** Notification actions `notificationAdded(input)` and `notificationDismissed(id?)`; upload actions for queued/started/progress/completed/failed/cancelled/removed metadata. `selectActiveUploads`, `selectHasPendingUploads`, and `selectOverallUploadProgress` consume `{ uploads }`. `createAppStore()` returns `{ store, startListening }`; `resetClientState()` restores all initial slices.

- [x] Write tests for FIFO notifications/aliases, upload transitions, weighted progress, selector reference stability, and root reset; run RED.
- [x] Implement adapters, selectors, resettable root reducer, listener middleware and production DevTools guard; run focused tests GREEN and commit.

### Task 2: Shell composition and notification host

**Files:** `apps/shell/src/app/{eventBridges,clientListeners,ClientEffects,FeedbackHost,providers}.ts(x)` and tests; transaction UI success dispatches.

**Interfaces:** `registerEventBridges(store, events$?)` returns cleanup and checks the current authenticated state before notifying; `registerClientListeners({ startListening, queryClient, cancelUploads })` returns cleanup. `ClientEffects` registers these at mount and guards beforeunload while uploads are queued/uploading. The external cancellation registry is introduced here so the shell composition is complete before queue integration.

- [x] Test domain-event notification mapping and teardown; logout clears a real QueryClient and Redux; upload failure adds one error; mount cleanup prevents duplicates. Run RED.
- [x] Implement composition and FIFO host; remove duplicate success feedback from consumers; run focused tests GREEN and commit.

### Task 3: Upload metadata and logout cancellation

**Files:** upload cancellation channel in stores; `apps/transactions-mfe/src/application/{useUploadQueue,useAttachments,use-cases/saveTransactionWithAttachments}.ts`, upload hook tests, and modal cancellation handling.

**Interfaces:** `registerUploadCancellation(callback)` returns cleanup; `cancelPendingUploads()` invokes registered queues. Session cancellation rejects pending batch work with a recognizable application error; normal per-file cancellation preserves retry behavior.

- [x] Test metadata through real queue events, globally unique IDs across hook instances, retry/failure/cancel status, beforeunload state, and logout with active work plus stale reconciliation; run RED.
- [x] Dispatch serializable metadata and wire cancellation/cleanup; prevent session-ended async completions from restoring notifications or queries. Run tests GREEN and commit.

### Task 4: Production validation and evidence

**Files:** `e2e/redux-patterns.spec.ts`, task/sprint status, stores README, this plan.

- [x] Add E2E for a single success notification per creation, FIFO dismissal, and production DevTools inactivity. Existing auth/upload flows must pass.
- [x] Run full tests, types, lint, architecture check, production build and Chromium/Firefox E2E.
- [x] Review the full branch independently, fix confirmed blockers with regressions, document evidence and commit. Preserve the worktree for PR review.

## Final verification — 2026-10-15

- Full tests, type-check and lint: each completed 13/13 Turbo tasks. Lint retains existing legacy-import warnings, with no errors.
- Architecture: no violations across 442 modules and 1181 dependencies.
- Production build: 8/8 tasks; full Playwright suite: 20/20 across Chromium and Firefox, backed by disposable PostgreSQL 16.
- Independent review: no remaining blockers after follow-up review of confirmed fixes.
- Evidence and implementation status: `docs/phase-4/sprint-2-state-reactive/04-redux-patterns.md`.

### Adjustments supported by review and production failures

- Added a client-session generation guard to suppress stale mutation events, optimistic deletion rollback and UI feedback. Regression tests cover late success/failure and attachment removal.
- Unmounted private shell content when auth resets: otherwise a mounted account overview observer refetched private data after QueryClient.clear(). The production E2E failed before this fix and passed after it.
- Applied the DevTools policy to Recharts' internal Redux stores and marked chartRuntime.ts as a side effect. The initial production E2E observed three extension connections; the final suite observes zero.

The branch remains stacked on S2-03 (`upload-stream`); integrate that dependency before targeting the final S2-04 diff at `phase-4`.
