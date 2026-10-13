# S2-02 Reactive Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Debounce transaction search and amount filters with RxJS, preserve URL state, and cancel obsolete TanStack requests.

**Architecture:** Pure RxJS pipelines in the transactions MFE application layer transform input values. React hooks connect stable event streams to URL filter updates. The existing query hook keeps ownership of server data and forwards AbortSignal through the gateway.

**Tech Stack:** React 19, RxJS 7.8.2, TanStack Query 5, Vitest/TestScheduler, Playwright.

**Spec:** `docs/phase-4/sprint-2-state-reactive/02-reactive-search.md`

## Global Constraints

- Base is `dev2-arch/reactive-foundation` until S2-01 merges into `phase-4`; keep S2-02 commits on `dev3-perf/reactive-search`.
- Search: trim, debounce 300 ms, distinct, emit only empty or at least 2 characters.
- Amount min/max: debounce 400 ms, retain `0` and `undefined`, suppress duplicates.
- MFEs import operators only from `rxjs`, never `rxjs/*`.
- TanStack owns queries and cache; RxJS only transforms user input. Dates and selects remain immediate.
- SearchInput keeps `debounceMs` API and is used with `debounceMs={0}` here.

## Review Focus

- A pending search must not overwrite a newer category, date, or amount URL update.
- Clearing all filters must reset pending search and amount streams and visible drafts, including when the URL was already empty.
- Re-entering the same committed search or amount immediately after clearing must commit it again.
- Restoring `/transactions?q=...&amount_gte=...` on reload must initialize fields without issuing extra stream updates.
- Rapid typing must not lose characters when an older URL search value arrives; an external URL value matching a canceled prefix must still update the field.
- Aborted requests must be observed as cancellations, not mistaken for successful responses.

---

### Task 1: Pure search and amount pipelines

**Files:** Create `apps/transactions-mfe/src/application/reactiveFilterPipelines.ts` and `.test.ts`.

**Interfaces:** `searchPipeline(input$: Observable<string>, scheduler: SchedulerLike = asyncScheduler): Observable<string>` and `amountPipeline(input$: Observable<number | undefined>, scheduler: SchedulerLike = asyncScheduler): Observable<number | undefined>`.

- [x] Write TestScheduler tests for rapid input, trimmed duplicate, one character, empty clear, 400 ms amount debounce, duplicate suppression, and zero/undefined values.
- [x] Run focused tests RED, implement pipelines, run GREEN, and commit.

### Task 2: React stream adapters

**Files:** Create `apps/transactions-mfe/src/application/useSearchStream.ts`, `useAmountStream.ts`, and hook tests; add Testing Library dev dependency if needed.

**Interfaces:** `useSearchStream(onSearch)` and `useAmountStream(onAmount)` return stable `{ emit, reset }` adapters. `reset` synchronously replaces the pipeline subscription, canceling pending debounces and clearing `distinctUntilChanged` history.

- [x] Test debounced delivery, latest callback, and teardown on unmount; run RED.
- [x] Compose `useEventStream`, pure pipelines, and `useSubscription`; run GREEN and commit.

### Task 3: URL and filter UI wiring

**Files:** Modify `useTransactionFilters.ts`, `TransactionsPage.tsx`, `TransactionFilters.tsx`, filter props/stories, and add integration tests.

**Interfaces:** Add `patchFilters(patch: Partial<TransactionFilter>)` that reads storage at emission time; expose search/min/max stream emitters, an explicit stream reset on clear, and a sequence marker for search values actually emitted into the URL.

- [x] Write tests that pending search preserves a newer category update, clear cancels pending values, reload initializes URL values, and amount drafts stay visible before commit; run RED.
- [x] Wire stream handlers to SearchInput (`debounceMs={0}`) and RangeInput; keep other controls immediate. Run GREEN and commit.

### Task 4: Cancellation, production validation, and evidence

**Files:** Add `e2e/reactive-search.spec.ts`; update S2-02 task and Sprint 2 README status/evidence.

- [x] Test rapid `supermercado` typing yields one filtered request, URL and reload restore state, and delayed obsolete requests are aborted when a newer key replaces them.
- [x] Compare request counts with S0-04 baseline (1 fast, 12 slow, 0 canceled), recording conditions and results without claiming one request for slow typing separated by more than 300 ms.
- [x] Run full tests, type-check, lint, architecture check, production build, and Chromium/Firefox E2E; update checkboxes and commit.
