import { describe, expect, it } from 'vitest';

import { createTransaction } from './Transaction';

describe('createTransaction', () => {
  it('joins validated transaction fields with generated identity and owner', () => {
    const result = createTransaction(
      {
        type: 'deposit',
        category: 'salary',
        amount: 100.25,
        date: '2026-01-01',
        description: 'Salário',
      },
      'tx-1',
      'user-1'
    );
    expect(result).toEqual({
      id: 'tx-1',
      userId: 'user-1',
      type: 'deposit',
      category: 'salary',
      amount: 100.25,
      date: '2026-01-01',
      description: 'Salário',
    });
  });
});
