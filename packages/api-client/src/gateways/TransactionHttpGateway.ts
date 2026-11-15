import { toSearchParams } from '@bytebank/core';
import type { NewTransaction, Transaction, UpdateTransaction } from '@bytebank/shared';
import { httpRequest, jsonBody } from '../http/httpClient';
import type { PageRequest, TransactionFilter } from '@bytebank/core';
import type { RequestOptions, SummaryRange, TransactionGateway } from './types';

function writePayload(data: UpdateTransaction): UpdateTransaction {
  return {
    type: data.type,
    category: data.category,
    amount: data.amount,
    date: data.date,
    description: data.description,
  };
}

export class TransactionHttpGateway implements TransactionGateway {
  list(filter: Partial<TransactionFilter>, page: PageRequest, { signal }: RequestOptions = {}) {
    const query = toSearchParams(filter, page);
    return httpRequest<{ data: Transaction[]; pages: number; items: number }>(
      `/transactions?${query}`,
      { signal }
    );
  }
  get(id: string, { signal }: RequestOptions = {}) {
    return httpRequest<Transaction>(`/transactions/${encodeURIComponent(id)}`, { signal });
  }
  create(data: NewTransaction) {
    return httpRequest<Transaction>('/transactions', {
      method: 'POST',
      ...jsonBody(writePayload(data)),
    });
  }
  update(id: string, data: UpdateTransaction) {
    return httpRequest<Transaction>(`/transactions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      ...jsonBody(writePayload(data)),
    });
  }
  remove(id: string) {
    return httpRequest<void>(`/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
  overview({ signal }: RequestOptions = {}) {
    return httpRequest<{ balance: number; recent: Transaction[] }>('/transactions/overview', {
      signal,
    });
  }
  summary(range: SummaryRange = {}, { signal }: RequestOptions = {}) {
    const query = new URLSearchParams();
    if (range.from) query.set('from', range.from);
    if (range.to) query.set('to', range.to);
    const suffix = query.size ? `?${query}` : '';
    return httpRequest<import('@bytebank/core').DashboardSummary>(
      `/transactions/summary${suffix}`,
      { signal }
    );
  }
}
