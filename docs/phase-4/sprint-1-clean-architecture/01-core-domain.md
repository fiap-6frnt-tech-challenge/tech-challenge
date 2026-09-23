# Task 01 — `@bytebank/core`: camada de domínio

|                 |                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 1 — Clean Architecture](./README.md)                                                        |
| **Owner**       | Dev 2 (Arquitetura Front & Estado)                                                                  |
| **Duração**     | 2 dias (esqueleto no dia 1-2, regras depois)                                                        |
| **Prioridade**  | P0                                                                                                  |
| **Branch**      | `dev2-arch/core-domain`                                                                             |
| **Depende de**  | S0-05 (ADR-001), S0-03 (schemas de API)                                                             |
| **Desbloqueia** | Tasks 02, 06, 07, 08                                                                                |
| **Requisito**   | Clean Architecture · arquitetura modular                                                            |
| **Embasamento** | Arquiteturas Avançadas — Aula 1 (Clean Architecture para Web) e Aula 2 (Estratégias de Refatoração) |

---

## Contexto

Hoje o domínio está espalhado:

- tipos e regras em `@bytebank/shared`, junto com `cn`/`classes.ts` e máscaras de input (que são apresentação);
- cálculos no `apps/dashboard-mfe/src/Dashboard.tsx` (variação percentual dos KPIs, top 5 + "Outros");
- parsing de filtros em dois lugares: `useTransactionFilters` (cliente) e `api/transactions/route.ts` (servidor) — duas implementações do mesmo contrato.

O `@bytebank/core` vira a fonte única, em TypeScript puro, testável sem framework.

## Estrutura

```
packages/core/
├── package.json         name @bytebank/core · exports ".", "./domain", "./application", "./schemas"
├── tsconfig.json        composite + declaration
├── vitest.config.ts
└── src/
    ├── domain/
    │   ├── transaction/     Transaction.ts (tipo + createTransaction), TransactionType.ts,
    │   │                    rules.ts (calculateBalance, aggregateByMonth, cumulativeBalance,
    │   │                    groupByCategory, getRecent)
    │   ├── money/Money.ts   centavos inteiros
    │   ├── filter/TransactionFilter.ts   normalize + toSearchParams/fromSearchParams (codec único)
    │   ├── dashboard/kpis.ts             computeKpiDeltas, topCategoriesWithOthers
    │   ├── category/        categories.ts, suggestCategory.ts
    │   ├── errors.ts        DomainError, ValidationError, NotFoundError, ConflictError,
    │   │                    RateLimitedError, AuthenticationError
    │   └── events.ts        DomainEvent (união discriminada)
    ├── schemas/             createTransactionSchema, updateTransactionSchema, listQuerySchema, registerSchema
    ├── application/         (preenchido pelo Dev 1 na Task 02)
    └── index.ts
```

## Implementação

**Value object `Money`** — evita erro de ponto flutuante nas somas:

```ts
export class Money {
  private constructor(readonly cents: number) {}
  static fromDecimal(value: number) {
    return new Money(Math.round(value * 100));
  }
  static zero() {
    return new Money(0);
  }
  add(other: Money) {
    return new Money(this.cents + other.cents);
  }
  subtract(other: Money) {
    return new Money(this.cents - other.cents);
  }
  toDecimal() {
    return this.cents / 100;
  }
}
```

**Erros de domínio** — a camada HTTP (Task 04) traduz para status:

```ts
export abstract class DomainError extends Error {}
export class ValidationError extends DomainError {
  constructor(readonly issues: unknown) {
    super('Dados inválidos');
  }
}
export class NotFoundError extends DomainError {
  constructor(readonly resource: string) {
    super(`${resource} não encontrado`);
  }
}
export class RateLimitedError extends DomainError {
  constructor(readonly retryAfterSeconds: number) {
    super('Muitas tentativas');
  }
}
```

**Eventos de domínio** — contrato versionado entre MFEs (usado a partir do S2-01):

```ts
export type DomainEvent =
  | { type: 'transaction.created'; version: 1; transaction: Transaction }
  | { type: 'transaction.updated'; version: 1; transaction: Transaction }
  | { type: 'transaction.deleted'; version: 1; id: string }
  | { type: 'attachment.added'; version: 1; transactionId: string; attachmentId: string }
  | { type: 'attachment.removed'; version: 1; transactionId: string; attachmentId: string };
```

**`TransactionFilter`** — o mesmo codec gera a query string no cliente e valida no servidor:

```ts
export function toSearchParams(filter: TransactionFilter, page: PageRequest): URLSearchParams;
export function fromSearchParams(params: URLSearchParams): {
  filter: TransactionFilter;
  page: PageRequest;
};
```

**Strangler:** `packages/shared/src/index.ts` passa a reexportar do core os símbolos movidos (`export { calculateBalance, suggestCategory, ... } from '@bytebank/core'`). Os testes existentes (`transactions.test.ts`, `suggestCategory.test.ts`, `schemas/transaction.test.ts`) migram junto com o código.

## Checklist de pacote novo

- [ ] `apps/shell/next.config.ts` → `transpilePackages` inclui `@bytebank/core`
- [ ] `apps/shell/src/lib/federation.ts` → `shared['@bytebank/core']` com `lib: () => Core` e `singleton: true`
- [ ] `apps/dashboard-mfe/rsbuild.config.ts` e `apps/transactions-mfe/rsbuild.config.ts` → `'@bytebank/core': { singleton: true, requiredVersion: false }`
- [ ] Dockerfiles (shell + 2 MFEs) → `COPY packages/core/package.json packages/core/`
- [ ] `vitest.config.ts` da raiz → projeto do core incluído
- [ ] `tsconfig` com `composite` + `declaration`; interfaces usadas em tipos públicos exportadas (evita TS4023)

## Validação

- [ ] Testes do core verdes, cobertura de linhas ≥ 90%
- [ ] `@bytebank/shared` reexporta os símbolos movidos; nenhum import externo quebrou
- [ ] Build de todos os workspaces verde; app idêntico ao da Fase 2
- [ ] PR do esqueleto (tipos, erros, schemas) mergeado até o dia 2 do sprint

## Gotchas

1. `Money` não muda o banco: a coluna `amount` continua `doublePrecision`. A conversão acontece na borda (repositório). Migrar o banco para centavos é P2, fora desta task.
2. Zod no domínio é aceito (validação pura, sem IO) — registrado no ADR-001.
3. Não mova `classes.ts` (`cn`), `format.ts` (Intl) nem `input.ts` (máscaras): são apresentação e ficam no `shared` (ou vão para o DS depois).
4. O seed guarda categorias como rótulo em português, não como `CategoryId`. Mantenha o comportamento atual; não "conserte" isso aqui.
