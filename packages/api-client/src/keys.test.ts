import { describe, it, expect } from 'vitest';
import { transactionKeys } from './keys';

describe('transactionKeys', () => {
  it('monta chaves hierárquicas consistentes', () => {
    expect(transactionKeys.all).toEqual(['transactions']);
    expect(transactionKeys.lists()).toEqual(['transactions', 'list']);
    expect(transactionKeys.list({ page: 1 })).toEqual(['transactions', 'list', { page: 1 }]);
    expect(transactionKeys.details()).toEqual(['transactions', 'detail']);
    expect(transactionKeys.detail('abc')).toEqual(['transactions', 'detail', 'abc']);
  });

  it('list() é prefixado por lists() (permite invalidação por escopo)', () => {
    const list = transactionKeys.list({ type: 'deposit' });
    const lists = transactionKeys.lists();
    expect(list.slice(0, lists.length)).toEqual([...lists]);
  });
});
