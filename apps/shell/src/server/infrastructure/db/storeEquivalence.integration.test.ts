import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  aggregateByMonth,
  calculateBalance,
  cumulativeBalance,
  getRecent,
  groupByCategory,
  normalizeTransactionFilter,
  type Attachment,
  type PageRequest,
  type Transaction,
  type TransactionFilter,
} from '@bytebank/core';
import * as store from '@/server/testing/legacyTransactionStore';
import { db } from '@/db';
import { attachments, transactions } from '@/db/schema';
import { integrationScope } from '@/server/testing/integrationScope';
import seed from '../../../../data/transactions.json';
import { DrizzleAttachmentRepository } from './DrizzleAttachmentRepository';
import { DrizzleTransactionRepository } from './DrizzleTransactionRepository';

const scope = integrationScope();
const userId = scope.id('joana');
const stranger = scope.id('outra-pessoa');
const transactionRepository = new DrizzleTransactionRepository(db);
const attachmentRepository = new DrizzleAttachmentRepository(db);
const all = normalizeTransactionFilter({});

const withReceipt = scope.id('txn-102');
const withPhoto = scope.id('txn-104');
const receiptId = scope.id('att-receipt');

const byId = (items: Transaction[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));
const toDto = ({ id, url, name, size, mimeType }: Attachment): Attachment => ({
  id,
  url,
  name,
  size,
  mimeType,
});

function legacyList(filter: TransactionFilter, page: PageRequest) {
  return store.listTransactions({
    userId,
    page: page.page,
    perPage: page.perPage,
    type: filter.type === 'all' ? undefined : filter.type,
    dateFrom: filter.dateFrom || undefined,
    dateTo: filter.dateTo || undefined,
    q: filter.q || undefined,
    category: filter.category,
    amount_gte: filter.amount_gte,
    amount_lte: filter.amount_lte,
    sortBy: filter.sortBy,
    sortOrder: filter.sortOrder,
  });
}

beforeAll(async () => {
  await db.insert(transactions).values(
    seed.transactions.map((transaction) => ({
      id: scope.id(transaction.id),
      userId: scope.id(transaction.userId),
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      date: transaction.date,
      description: transaction.description,
    }))
  );
  await db.insert(attachments).values([
    {
      id: receiptId,
      transactionId: withReceipt,
      url: 'https://example.test/recibo.pdf',
      name: 'recibo.pdf',
      size: 2048,
      mimeType: 'application/pdf',
    },
    {
      id: scope.id('att-photo'),
      transactionId: withPhoto,
      url: 'https://example.test/foto.png',
      name: 'foto.png',
      size: 4096,
      mimeType: 'image/png',
    },
  ]);
});

afterAll(() => scope.cleanup());

describe('equivalência com o store legado (seed)', () => {
  it('carrega o seed inteiro para o usuário', async () => {
    const page = await transactionRepository.list(userId, all, { page: 1, perPage: 100 });
    expect(page.total).toBe(seed.transactions.length);
  });

  it('lista completa (GET sem _page) = primeira página ampla do repositório', async () => {
    const [legacy, current] = await Promise.all([
      store.getAllByUser(userId),
      transactionRepository.list(userId, all, { page: 1, perPage: 100 }),
    ]);
    expect(current.items).toEqual(legacy);
  });

  const scenarios: Array<[string, Partial<TransactionFilter>, PageRequest]> = [
    ['padrão', {}, { page: 1, perPage: 10 }],
    ['segunda página', {}, { page: 2, perPage: 10 }],
    ['última página parcial', {}, { page: 6, perPage: 10 }],
    ['além da última página', {}, { page: 99, perPage: 10 }],
    ['data crescente', { sortOrder: 'asc' }, { page: 2, perPage: 7 }],
    ['só saques', { type: 'withdrawal' }, { page: 1, perPage: 10 }],
    ['período', { dateFrom: '2026-02-01', dateTo: '2026-03-31' }, { page: 1, perPage: 100 }],
    ['busca sem diferenciar maiúsculas', { q: 'SALARY' }, { page: 1, perPage: 100 }],
    ['categorias do seed', { category: ['Alimentação', 'Transporte'] }, { page: 1, perPage: 100 }],
    ['faixa de valor', { amount_gte: 100, amount_lte: 500 }, { page: 1, perPage: 100 }],
    ['valor crescente', { sortBy: 'amount', sortOrder: 'asc' }, { page: 1, perPage: 100 }],
    ['valor decrescente', { sortBy: 'amount', sortOrder: 'desc' }, { page: 1, perPage: 100 }],
    ['sem resultados', { q: 'inexistente' }, { page: 1, perPage: 10 }],
  ];

  it.each(scenarios)('listagem paginada: %s', async (_name, overrides, page) => {
    const filter = { ...all, ...overrides };
    const [legacy, current] = await Promise.all([
      legacyList(filter, page),
      transactionRepository.list(userId, filter, page),
    ]);

    expect({ total: current.total, totalPages: current.totalPages }).toEqual({
      total: legacy.items,
      totalPages: legacy.pages,
    });
    if (filter.sortBy === 'amount') {
      expect(current.items.map((item) => item.amount)).toEqual(
        legacy.data.map((item) => item.amount)
      );
      expect(byId(current.items)).toEqual(byId(legacy.data));
    } else {
      expect(current.items).toEqual(legacy.data);
    }
  });

  it('busca por id = getById, com anexos e isolada por dono', async () => {
    for (const id of [withReceipt, withPhoto, scope.id('txn-101')]) {
      expect(await transactionRepository.findById(id, userId)).toEqual(
        await store.getById(id, userId)
      );
    }
    expect(await transactionRepository.findById(withReceipt, stranger)).toBeNull();
    expect(await store.getById(withReceipt, stranger)).toBeNull();
  });

  it('overview = saldo e recentes que a home calculava sobre a lista completa', async () => {
    const [legacy, current] = await Promise.all([
      store.getAllByUser(userId),
      transactionRepository.overview(userId, 5),
    ]);
    expect(current).toEqual({ balance: calculateBalance(legacy), recent: getRecent(legacy, 5) });
  });

  it.each([
    ['todo o período', { from: '2025-12-01', to: '2026-06-30' }],
    ['recorte de meses', { from: '2026-02-01', to: '2026-04-30' }],
    ['período vazio', { from: '2030-01-01', to: '2030-12-31' }],
  ])('agregados do resumo (%s) = cálculo da rota summary', async (_name, range) => {
    const legacy = await store.getAllByUser(userId, range);
    const [byMonth, byCategory, balanceOverTime] = await Promise.all([
      transactionRepository.monthlyTotals(userId, range),
      transactionRepository.categoryTotals(userId, range),
      transactionRepository.balanceSeries(userId, range),
    ]);

    expect(byMonth).toEqual(aggregateByMonth(legacy));
    expect(byCategory).toEqual(groupByCategory(legacy));
    expect(balanceOverTime).toEqual(cumulativeBalance(legacy));
  });

  it('anexos: list/findById = listAttachments/getAttachment (campos do DTO)', async () => {
    const listed = await attachmentRepository.list(withReceipt, userId);
    expect(listed?.map(toDto)).toEqual(await store.listAttachments(withReceipt, userId));

    const found = await attachmentRepository.findById(receiptId, userId);
    expect(found && toDto(found)).toEqual(await store.getAttachment(receiptId, userId));
    expect(await attachmentRepository.findById(receiptId, stranger)).toBeNull();
    expect(await store.getAttachment(receiptId, stranger)).toBeNull();
  });
});
