# S0-03 Server Validation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate transaction API inputs on the server, reject mass assignment, and remove the client and database fallback user ID.

**Architecture:** Zod schemas in `@bytebank/shared` define the accepted create, patch, and list inputs. The shell routes parse JSON with a 16 KB limit and pass only validated fields to the store, with ownership coming from the session. The API client uses input types without `userId` or `attachments`; the store keeps a separate persisted input type.

**Tech Stack:** TypeScript, Zod 4, Next.js route handlers, Vitest, Drizzle ORM.

**Spec:** `docs/phase-4/sprint-0-foundation/03-server-validation.md`

## Global Constraints

- Keep unpaginated `GET /api/transactions` for the home until S1-05.
- Use `America/Sao_Paulo` for the maximum accepted transaction date.
- Keep `attachments` out of transaction JSON writes; use the existing attachment routes.
- Return 400 for malformed JSON, 413 for bodies over 16 KB, and 422 with flattened Zod issues for invalid inputs.
- Derive `userId` exclusively from the authenticated session.

## Review Focus

- A body over 16 KB with a missing or false `Content-Length` still receives 413.
- Unknown `userId`, `id`, and `attachments` fields in POST/PATCH receive 422.
- A date beyond the current São Paulo calendar day receives 422.
- Invalid pagination and filter values receive 422 even when only one pagination parameter is supplied.
- A valid partial PATCH preserves ownership and updates only the requested fields.
- Text containing NUL receives 422 before PostgreSQL handles the value.
- Search and amount controls enforce the same limits as the server.

---

### Task 1: Shared API contracts

**Files:** `packages/shared/src/schemas/transaction.ts`, `packages/shared/src/schemas/transaction.test.ts`, `packages/shared/src/index.ts`, `packages/shared/src/types/transaction.ts`

**Interfaces:** Export `createTransactionSchema`, `updateTransactionSchema`, `listTransactionsQuerySchema`; keep `Transaction` as the response shape; define `NewTransaction` and `UpdateTransaction` as JSON write inputs without `userId` or `attachments`.

- [x] Add failing schema tests for accepted create/partial patch, forbidden extra keys, numeric/date/description limits, empty patch, and list bounds.
- [x] Run the shared schema test and confirm those cases fail.
- [x] Implement Zod 4 schemas and export them; derive public write types from the schema or equivalent explicit fields.
- [x] Run the shared schema test and type check until green.

### Task 2: Safe request parsing and routes

**Files:** `apps/shell/src/app/api/read-json.ts`, transaction `route.ts`, `[id]/route.ts`, register `route.ts`, and their route tests.

**Interfaces:** `readJson(request: Request): Promise<unknown>` throws a typed error with status 400 or 413; routes map that error to JSON responses, validate with `safeParse`, and call the store with parsed data only.

- [x] Add failing route tests for malformed/oversize JSON, mass assignment, field limits, empty and valid partial PATCH, invalid list queries, and normal pagination.
- [x] Run the targeted shell tests and confirm failure.
- [x] Implement the bounded JSON parser and route validation while preserving the unpaginated response.
- [x] Run the targeted shell tests and shell type check until green.

### Task 3: Client, persistence, and migration

**Files:** `packages/api-client/src/http.ts`, `http.test.ts`, `apps/transactions-mfe/src/components/NewTransactionModal/NewTransactionModal.tsx`, `apps/shell/src/app/api/transactions/store.ts`, `apps/shell/src/db/schema.ts`, generated Drizzle migration files, `apps/shell/src/app/api/auth/register/route.ts`.

**Interfaces:** Client JSON writes contain only transaction fields; the store receives `{ ...parsedFields, userId: session.user.id }`; `transactions.user_id` remains required but has no database default.

- [x] Update the client test to assert the POST body has no `userId` or `attachments`.
- [x] Run the API client test and confirm failure.
- [x] Remove the fallback ID and attachment fields from JSON writes; adapt store types and use `z.flattenError` for register errors.
- [x] Generate the Drizzle migration that drops the `user_id` default.
- [x] Run client tests and type checks for affected packages.

### Task 4: Final verification

- [x] Run relevant package tests and lint/type checks.
- [x] Check E2E prerequisites: no disposable PostgreSQL is available (Docker daemon and local PostgreSQL binaries are absent), so do not run the data resetting E2E setup.
- [x] Inspect the final diff for unexpected files, contract drift, and migration safety.

## Verification

- `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/tech-challenge-playwright CI=1 npx turbo run test --env-mode=loose`: 451 tests passed.
- `npx turbo run type-check`: 11 tasks passed.
- `npm run build`: 7 tasks passed.
- ESLint and Prettier checks on changed source files: passed.
- E2E: not run; its global setup deletes and recreates database records, and no disposable PostgreSQL instance is available.
- Independent review found and prompted fixes for NUL text, the search limit, and the form amount limit; each has a regression test.
