import { describe, it, expect } from 'vitest';
import { attachmentKeys, summaryKeys, transactionKeys } from './keys';

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

describe('summaryKeys', () => {
  it('monta chaves de summary por range', () => {
    const range = { from: '2026-01-01', to: '2026-06-30' };

    expect(summaryKeys.all).toEqual(['summary']);
    expect(summaryKeys.range(range)).toEqual(['summary', { from: '2026-01-01', to: '2026-06-30' }]);
  });

  it('range() é prefixado por all (permite invalidação por escopo)', () => {
    const key = summaryKeys.range({ from: '2026-01-01' });

    expect(key.slice(0, summaryKeys.all.length)).toEqual([...summaryKeys.all]);
  });
});

describe('attachmentKeys', () => {
  it('monta chave de anexos sob o detalhe da transação', () => {
    expect(attachmentKeys.list('tx-1')).toEqual(['transactions', 'detail', 'tx-1', 'attachments']);

    expect(attachmentKeys.list('tx-1').slice(0, transactionKeys.detail('tx-1').length)).toEqual(
      transactionKeys.detail('tx-1')
    );
  });
});
