# S2-07 Session Hardening Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, then one independent whole-branch review.

**Goal:** Bound session lifetime, revoke current/all sessions, handle expired sessions consistently and log out inactive users with an accessible warning.

**Architecture:** Core session use cases consume Clock, IdGenerator and a SessionRepository. Auth.js Node callbacks compose those use cases; the proxy only performs database-free claim checks. The shell owns 401/logout and idle effects; shared HTTP adapters publish session expiry events. Server tokens never enter Redux or localStorage.

**Tech Stack:** Auth.js v5 JWT, Next.js 16, PostgreSQL/Drizzle, Redux Toolkit, RxJS, Vitest and Playwright.

**Spec:** `docs/phase-4/sprint-2-state-reactive/07-session-hardening.md`

## Global Constraints

- Start at `origin/phase-4` (`8c6525e`); PR destination remains `phase-4`.
- Session maxAge 8h, updateAge 15min, absolute limit 12h, server revocation check at most every 5min. Claims use epoch milliseconds.
- Default idle timeout 15min from `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES`; warn 1min before expiration. Playwright uses page.clock, not sleeps.
- Retain S2-04 cleanup: invalidate client generation, cancel uploads, clear TanStack, reset Redux, unmount private content.
- Keep personal AGENTS.md and skill files ignored and outside commits.

## Review Focus

- Missing, legacy, malformed or future-dated claims fail closed; user-controlled update payload cannot reset authTime or session identity.
- Copied cookies fail after current-session revocation or global version change; repeated read-only API checks must not extend absolute lifetime.
- Revoke endpoint acts on authenticated actor only and rejects cross-origin requests; a failed revocation must not claim global logout succeeded.
- Simultaneous 401s and StrictMode mounts cause one logout; stale requests from an old client generation do not log out a later login.
- Continuing before the deadline resets idle state, background/resume after the deadline expires, and timers/subscriptions stop after logout.

### Task 1: Server lifecycle, persistence and Auth.js composition

**Files:** core session ports/use cases and tests; shell DrizzleSessionRepository, schema/migration/integration tests, auth config/callbacks/proxy/tests, revoke route/tests and container.

**Interfaces:** SessionRepository creates a server session and returns user version, reads current version/session activity, revokes a session or all user sessions. SessionLifecycle.start(userId), validate(claims), revokeCurrent(claims); RevokeSessions.execute(actor). Claims contain userId, sid, authTime, sv, svCheckedAt. Node callbacks return null on invalidity. Edge callback checks identity and absolute age without DB.

- [ ] Add FakeClock tests for 12h expiry, 5min checks, copied-cookie revocation, missing user/session and malformed claims; run RED then implement GREEN.
- [ ] Add migration users.session_version and auth_sessions, repository and integration tests including atomic version increments and password-hash rotation revocation.
- [ ] Compose Node JWT/signOut callbacks, preserve verified Google sign-in identity, harden proxy's user-id check and expose authenticated same-origin revoke endpoint. Run callback/route/proxy regressions and commit.

### Task 2: Expiration events and client logout

**Files:** core event union, api-client httpRequest/upload adapter/tests, stores auth thunk, shell event bridges/session effects/login notice/tests.

**Interfaces:** `session.expired` v1 event; HTTP 401 publishes only for the same client session generation. Session effects deduplicate expiry and dispatch logout with a safe reason. Login renders the expiry notice after redirect. SessionProvider refreshes session status; unauthenticated transitions clear and redirect private screens.

- [ ] Test HTTP and XHR 401s, late-generation suppression and one logout for concurrent events; run RED then GREEN.
- [ ] Preserve existing success bridge and local cleanup; add a safe expiry reason to logout and login feedback; run focused checks and commit.

### Task 3: Idle warning and user-menu revocation

**Files:** stores reactive idle stream/marble tests, shell idle controller and accessible alertdialog, AppHeader, design-system UserMenu props/stories, .env.example.

**Interfaces:** idle stream consumes activity Observable plus idle/warn durations and emits active/warn/expire; shell subscribes only while authenticated. Continue refreshes the session and resets idle timing. Revoke-all calls the authenticated endpoint before local logout.

- [ ] Add scheduler tests for warning/expiry/reset/background deadlines and cleanup; run RED then GREEN.
- [ ] Integrate document activity, explicit continue action, focused alertdialog and revoke-all menu action with visible failure handling. Verify keyboard behavior and commit.

### Task 4: End-to-end validation, review and PR handoff

**Files:** session E2E, ADR-006, task/sprint evidence, this plan.

- [ ] E2E: accelerated inactivity/continue/logout/back navigation, HTTP401, two independent sessions/global revocation, copied-cookie rejection and production cookie flags.
- [ ] Full tests, types, lint, architecture, DB integration and production Chromium/Firefox E2E; inspect outputs.
- [ ] Independent review and regressions for confirmed findings; update evidence and commit.
- [ ] Push feature branch; use finalizar-task-pr for link targeting phase-4, title and copyable description.

## Implementation decisions

- Add a server session ID to support current-session revocation without logging out every device. It stays inside the encrypted HttpOnly JWT; PostgreSQL stores session identifiers and expiry, not bearer cookies.
- Password-hash replacement increments session_version atomically, including a transparent bcrypt rehash; the new login reads the updated version. Existing devices may need to log in again after that upgrade.
- Auth.js updateAge applies to database sessions, not JWT rotation; keep the specified setting and document the JWT behavior explicitly. Absolute expiry remains independent of rotation.
