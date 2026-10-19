# S2-09 Lazy Loading Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, then one independent whole-branch review.

**Goal:** Remove charts and Zod from the federation's initial dependency graph and load dashboard charts only when visible, with comparable performance evidence.

**Architecture:** Keep the synchronous singleton barrels small. Charts and forms have explicit Design System entrypoints; validation schemas stay behind explicit schema entrypoints. A framework-free query parser supplies the existing codec and its Zod adapter, preserving one validation contract. Dashboard widgets load through React.lazy, Suspense and a viewport observer.

**Tech Stack:** React 19, Next.js 16/Turbopack, Rsbuild/Module Federation, Vitest, Playwright, Lighthouse 12.

**Spec:** docs/phase-4/sprint-2-state-reactive/09-lazy-loading.md

## Global Constraints

- Base and PR destination: phase-4. Started at 8c6525e; integrated the S2-07 merge at 5b7dd3e as 601be9b on 2026-10-19. Final A/B uses 5b7dd3e for the baseline. S2-08 remains concurrent work.
- Charts use @bytebank/design-system/charts, local to the dashboard. Preserve the singleton synchronous runtime for React, RxJS and the main Bytebank entrypoints.
- Preserve filter defaults, strict unknown-key rejection, dates, categories, pagination and browser URL compatibility.
- Lower chart widgets must not load before scrolling; reserve their layout and retain accessible data tables, empty/error states and refresh actions.
- Measure gzip sizes, network requests and mobile TBT before/after on the same machine, best of three as in S0-04. Do not compare hardware-dependent absolute scores as a gate.
- Use isolated PostgreSQL and ports 3100/3102/3103. Personal AGENTS.md and finalizar-task-pr remain ignored.

## Review Focus

- Splitting the chart export must not leave Recharts reachable indirectly from the main DS or transaction remote.
- Zod must not leak back through shared auth types, forms, domain filters or API client imports.
- Invalid and legacy URL parameters must retain their validation/422 behavior; the server must not trust an unvalidated filter.
- A failed lazy import, missing IntersectionObserver or keyboard navigation must leave useful feedback and accessible chart content.
- Measurements must authenticate successfully, use the same production build settings/data and distinguish loaded assets from unused emitted fallbacks.

### Task 1: Capture baseline and isolate heavy package entrypoints

**Files:** design-system package.json/src/charts.ts/src/forms.ts/barrels; shared schemas entrypoint/barrels; affected form/dashboard imports; core filter parser and schema adapter/tests; scripts/perf measurement helpers.

**Interfaces:** @bytebank/design-system/charts exports chart components/types; @bytebank/design-system/forms exports auth forms; @bytebank/shared/schemas retains client form schemas; @bytebank/core/schemas already exists. parseTransactionQuery(input: unknown) validates and returns canonical typed query data without importing Zod; listTransactionsQuerySchema adapts it to Zod.

- [x] Capture baseline build, route resource lists, gzip totals and three mobile Lighthouse runs per private route.
- [x] Add contract tests for strict query validation/coercion and a regression proving codec works without loading Zod; watch RED then implement GREEN.
- [x] Separate chart/form/schema exports and migrate consumers. Check package contracts and all types/tests; inspect built module graph.
- [x] Commit the isolated entrypoints.

### Task 2: Load chart widgets on visibility

**Files:** dashboard presentation/Dashboard.tsx, components/DeferUntilVisible.tsx and tests, chart widgets; production browser tests.

**Interfaces:** DeferUntilVisible accepts children, fallback, minHeight and label; a named focusable region mounts on keyboard focus or visibility, with rootMargin 0px, disconnecting after activation and loading eagerly if unsupported. Each widget has a stable lazy module and uses the existing DashboardWidget skeleton within Suspense. Chart failures expose retry feedback.

- [x] Add observer tests for no eager mount, first intersection, cleanup and unsupported browsers; watch RED then implement GREEN.
- [x] Extract three lazy chart widgets, preserve data/refresh/empty/error behavior and accessible captions.
- [x] Add production E2E for transaction route without chart downloads, lower mobile widgets absent until scrolling, accessible tables after loading and lazy error feedback.
- [x] Verify focused tests and commit.

### Task 3: Measure, review and deliver

**Files:** performance report, task/sprint evidence, this plan.

- [x] Build with the same settings; analyze chunks and capture route network before/after plus three Lighthouse mobile runs per route.
- [x] Run full tests, type-check, lint, architecture and Chromium/Firefox production E2E; inspect output.
- [x] Independent whole-branch review; fix confirmed important findings with regression tests.
- [ ] Record evidence and limitations, commit, push dev3-perf/lazy-loading and deliver PR link/title/body targeting phase-4.

## Final implementation decisions

- Migrate runtime auth forms to design-system/forms and keep their types on the main barrel, alongside charts/schemas separation. This is required to make the synchronous singleton free of Zod.
- Use a single framework-free query parser for the browser codec and the Zod adapter; strict API422 behavior remains covered by contracts.
- The home creation modal was static in the actual base. Add first-open lazy mounting to remove Zod from the initial home, with a cold browser regression and preserve-after-close behavior.
- Coordinate shell/dashboard/transactions deployment: old remotes can still expect value exports removed from the host barrel.
- S2-08 stays separate. Preserve its navigation/prefetch hooks when resolving Dashboard and AccountOverview integration.

## Final verification — 2026-10-19

- Product commit 1cbb6ee includes the first-open modal gate; baseline 5b7dd3e includes S2-07 on both sides of the comparison.
- Final tests/type-check/lint each passed 13/13 Turbo tasks; architecture 477 modules/1307 dependencies without violations.
- Direct production builds of shell/dashboard/transactions passed. Full integrated Chromium/Firefox E2E 42/42 passed.
- Actual network and official analyzer prove the bundle cut. Sanitized measurements and all samples are in docs/phase-4/perf/s2-09-lazy-loading.md and .json.
- One Important review finding fixed with RED→GREEN and real keyboard traversal; no deferred minors. Additional cold-home Zod regression also RED→GREEN.
- PR destination remains phase-4. Dashboard/AccountOverview overlaps with the separate S2-08 branch are documented for integration.
