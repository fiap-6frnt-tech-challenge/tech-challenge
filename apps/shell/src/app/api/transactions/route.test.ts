import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  create: vi.fn(),
  getAll: vi.fn(),
  listTransactions: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('./store', () => ({
  create: mocks.create,
  getAll: mocks.getAll,
  listTransactions: mocks.listTransactions,
}));

import { GET, POST } from './route';
import { TRANSACTION_TYPE, type Transaction } from '@bytebank/shared';

const USER_ID = 'user-123';
const payload = {
  userId: 'joana',
  category: 'Alimentação',
  type: 'withdrawal',
  amount: 42,
  date: '2026-06-23',
  description: 'Mercado',
};

function postRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function getRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/transactions${query}`);
}

function makeTx(id: string, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id,
    userId: USER_ID,
    category: 'food',
    type: TRANSACTION_TYPE.WITHDRAWAL,
    amount: 100,
    date: '2026-06-20',
    description: `tx ${id}`,
    ...overrides,
  };
}

describe('POST /api/transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: USER_ID } });
    mocks.create.mockResolvedValue({ id: 'tx-1', ...payload, userId: USER_ID });
  });

  it('retorna 401 e não cria transação sem sessão', async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await POST(postRequest(payload));

    expect(res.status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('usa o id da sessão em vez do userId informado pelo cliente', async () => {
    const res = await POST(postRequest(payload));

    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({ ...payload, userId: USER_ID });
  });
});

describe('GET /api/transactions (paginação + filtros)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAll.mockResolvedValue([makeTx('a'), makeTx('b')]);
    mocks.listTransactions.mockResolvedValue({ data: [], pages: 1, items: 0 });
  });

  it('sem _page/_per_page retorna a lista completa via getAll (sem paginar)', async () => {
    const list = [makeTx('a'), makeTx('b')];
    mocks.getAll.mockResolvedValue(list);

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(list);
    expect(mocks.getAll).toHaveBeenCalledOnce();
    expect(mocks.listTransactions).not.toHaveBeenCalled();
  });

  it('?_page=1&_per_page=3 retorna 3 itens + { pages, items } corretos', async () => {
    const page1 = [makeTx('1'), makeTx('2'), makeTx('3')];
    mocks.listTransactions.mockResolvedValue({ data: page1, pages: 9, items: 25 });

    const res = await GET(getRequest('?_page=1&_per_page=3'));

    expect(mocks.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, perPage: 3, sortBy: 'date', sortOrder: 'desc' })
    );
    const body = await res.json();
    expect(body.data).toHaveLength(3);
    expect(body).toEqual({ data: page1, pages: 9, items: 25 });
  });

  it('?_page=2 repassa a página seguinte (offset correto, sem repetir itens)', async () => {
    const page2 = [makeTx('4'), makeTx('5'), makeTx('6')];
    mocks.listTransactions.mockResolvedValue({ data: page2, pages: 9, items: 25 });

    const res = await GET(getRequest('?_page=2&_per_page=3'));

    expect(mocks.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, perPage: 3 })
    );
    const body = await res.json();
    expect(body.data.map((t: Transaction) => t.id)).toEqual(['4', '5', '6']);
  });

  it('?q=uber filtra por description', async () => {
    await GET(getRequest('?_page=1&_per_page=10&q=uber'));

    expect(mocks.listTransactions).toHaveBeenCalledWith(expect.objectContaining({ q: 'uber' }));
  });

  it('?amount_gte=100&amount_lte=500 filtra por faixa de valor (números)', async () => {
    await GET(getRequest('?_page=1&_per_page=10&amount_gte=100&amount_lte=500'));

    expect(mocks.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ amount_gte: 100, amount_lte: 500 })
    );
  });

  it('?category=food&category=transport filtra multi-categoria', async () => {
    await GET(getRequest('?_page=1&_per_page=10&category=food&category=transport'));

    expect(mocks.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ category: ['food', 'transport'] })
    );
  });

  it('repassa type e o range de datas (date_gte/date_lte)', async () => {
    await GET(
      getRequest('?_page=1&_per_page=10&type=withdrawal&date_gte=2026-01-01&date_lte=2026-06-30')
    );

    expect(mocks.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'withdrawal',
        dateFrom: '2026-01-01',
        dateTo: '2026-06-30',
      })
    );
  });

  it('interpreta _sort=amount como ordenação ascendente por valor', async () => {
    await GET(getRequest('?_page=1&_per_page=10&_sort=amount'));

    expect(mocks.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'amount', sortOrder: 'asc' })
    );
  });

  it('interpreta o prefixo "-" como ordenação descendente', async () => {
    await GET(getRequest('?_page=1&_per_page=10&_sort=-amount'));

    expect(mocks.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'amount', sortOrder: 'desc' })
    );
  });

  it('usa -date como ordenação padrão quando _sort não é informado', async () => {
    await GET(getRequest('?_page=1&_per_page=10'));

    expect(mocks.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'date', sortOrder: 'desc' })
    );
  });
});
