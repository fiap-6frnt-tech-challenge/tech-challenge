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
