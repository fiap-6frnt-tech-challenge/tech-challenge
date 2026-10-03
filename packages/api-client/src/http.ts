import { toSearchParams, type TransactionType } from '@bytebank/core';
import type {
  Attachment,
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
  type?: TransactionType | 'all';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
  q?: string;
  amount_gte?: number;
  amount_lte?: number;
  category?: string[];
}

export interface SummaryRange {
  from?: string;
  to?: string;
}

function transactionWritePayload(data: UpdateTransaction): UpdateTransaction {
  return {
    type: data.type,
    category: data.category,
    amount: data.amount,
    date: data.date,
    description: data.description,
  };
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
      body: JSON.stringify(transactionWritePayload(data)),
    });
    if (!res.ok) throw new Error('Falha ao criar transação');
    return res.json();
  },

  async update(id: string, data: UpdateTransaction): Promise<Transaction> {
    const res = await fetch(`${apiBaseUrl}/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactionWritePayload(data)),
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
    const query = toSearchParams(
      { type, dateFrom, dateTo, sortBy, sortOrder, q, amount_gte, amount_lte, category },
      { page, perPage }
    );

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

export const AttachmentService = {
  async list(transactionId: string): Promise<Attachment[]> {
    const res = await fetch(`${apiBaseUrl}/transactions/${transactionId}/attachments`);
    if (!res.ok) throw new Error('Falha ao buscar anexos');
    return res.json();
  },

  async upload(transactionId: string, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${apiBaseUrl}/transactions/${transactionId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Falha ao enviar anexo');
    return res.json();
  },

  async remove(transactionId: string, attachmentId: string): Promise<void> {
    const res = await fetch(
      `${apiBaseUrl}/transactions/${transactionId}/attachments/${attachmentId}`,
      {
        method: 'DELETE',
      }
    );
    if (!res.ok) throw new Error('Falha ao remover anexo');
  },
};
