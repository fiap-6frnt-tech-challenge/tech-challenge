import type { Transaction, NewTransaction, UpdateTransaction } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export const TRANSACTIONS_PER_PAGE = 10;

export interface PaginatedResponse {
  data: Transaction[];
  pages: number;
  items: number;
}

export interface GetPaginatedParams {
  page: number;
  perPage?: number;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const TransactionService = {
  async getAll(): Promise<Transaction[]> {
    const res = await fetch(`${API_URL}/transactions`);
    return res.json();
  },

  async getById(id: string): Promise<Transaction> {
    const res = await fetch(`${API_URL}/transactions/${id}`);
    return res.json();
  },

  async create(data: NewTransaction): Promise<Transaction> {
    const res = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async update(id: string, data: UpdateTransaction): Promise<Transaction> {
    const res = await fetch(`${API_URL}/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async remove(id: string): Promise<void> {
    await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
  },

  async getPaginated({
    page,
    perPage = TRANSACTIONS_PER_PAGE,
    type,
    dateFrom,
    dateTo,
    sortBy = 'date',
    sortOrder = 'desc',
  }: GetPaginatedParams): Promise<PaginatedResponse> {
    const query = new URLSearchParams();
    query.set('_page', String(page));
    query.set('_per_page', String(perPage));

    if (type && type !== 'all') query.set('type', type);
    if (dateFrom) query.set('date_gte', dateFrom);
    if (dateTo) query.set('date_lte', dateTo);

    const sortPrefix = sortOrder === 'asc' ? '' : '-';
    query.set('_sort', `${sortPrefix}${sortBy}`);

    const res = await fetch(`${API_URL}/transactions?${query.toString()}`);
    return res.json();
  },
};
