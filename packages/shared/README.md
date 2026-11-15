# @bytebank/shared

Types, utilities and constants shared across Bytebank packages.

## Usage

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

Subpaths are available when needed:

```ts
import { formatCurrency } from '@bytebank/shared/lib/format';
import type { Transaction } from '@bytebank/shared/types';
```

## Conventions

- No UI dependencies.
- No framework dependencies.
- Pure TypeScript types and utilities only.

## Validation schemas

Runtime schemas are outside the main barrel so its synchronous Module Federation singleton stays free of Zod. New consumers import from the core schema entrypoint:

```ts
import { transactionFormSchema, registerSchema } from '@bytebank/core/schemas';
import type { TransactionFormValues, RegisterInput } from '@bytebank/shared';
```

`@bytebank/shared/schemas` retains the transaction schema exports for compatibility. Authentication types remain type-only on the main entrypoint.
