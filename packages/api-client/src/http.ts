import type {
  DashboardSummary,
  NewTransaction,
  Transaction,
  UpdateTransaction,
} from '@bytebank/shared';

let apiBaseUrl = '/api';

export function configureApiBaseUrl(baseUrl: string): void {
  apiBaseUrl = (baseUrl || '/api').replace(/\/+$/, '');
}

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
  q?: string;
  amount_gte?: number;
  amount_lte?: number;
  category?: string[];
}

export interface SummaryRange {
  from?: string;
  to?: string;
}

export const TransactionService = {
  async getAll(): Promise<Transaction[]> {
    const res = await fetch(`${apiBaseUrl}/transactions`);
    if (!res.ok) throw new Error('Falha ao buscar transações');
    return res.json();
  },

  async getById(id: string): Promise<Transaction> {
    const res = await fetch(`${apiBaseUrl}/transactions/${id}`);
    if (!res.ok) throw new Error('Falha ao buscar transação');
    return res.json();
  },

  async create(data: NewTransaction): Promise<Transaction> {
    const res = await fetch(`${apiBaseUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao criar transação');
    return res.json();
  },

  async update(id: string, data: UpdateTransaction): Promise<Transaction> {
    const res = await fetch(`${apiBaseUrl}/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao atualizar transação');
    return res.json();
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`${apiBaseUrl}/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao deletar transação');
  },

  async getPaginated({
    page,
    perPage = TRANSACTIONS_PER_PAGE,
    type,
    dateFrom,
    dateTo,
    sortBy = 'date',
    sortOrder = 'desc',
    q,
    amount_gte,
    amount_lte,
    category,
  }: GetPaginatedParams): Promise<PaginatedResponse> {
    const query = new URLSearchParams();
    query.set('_page', String(page));
    query.set('_per_page', String(perPage));

    if (type && type !== 'all') query.set('type', type);
    if (dateFrom) query.set('date_gte', dateFrom);
    if (dateTo) query.set('date_lte', dateTo);
    if (q) query.set('q', q);
    if (amount_gte !== undefined) query.set('amount_gte', String(amount_gte));
    if (amount_lte !== undefined) query.set('amount_lte', String(amount_lte));
    category?.forEach((c) => query.append('category', c));

    const sortPrefix = sortOrder === 'asc' ? '' : '-';
    query.set('_sort', `${sortPrefix}${sortBy}`);

    const res = await fetch(`${apiBaseUrl}/transactions?${query.toString()}`);
    if (!res.ok) throw new Error('Falha ao buscar transações');
    return res.json();
  },
};

export const SummaryService = {
  async get({ from, to }: SummaryRange = {}): Promise<DashboardSummary> {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);

    const qs = query.toString();
    const res = await fetch(`${apiBaseUrl}/transactions/summary${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error('Falha ao buscar resumo financeiro');
    return res.json();
  },
};
