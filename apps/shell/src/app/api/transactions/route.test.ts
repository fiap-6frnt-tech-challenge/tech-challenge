import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  create: vi.fn(),
  getAllByUser: vi.fn(),
  listTransactions: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('./store', () => ({
  create: mocks.create,
  getAllByUser: mocks.getAllByUser,
  listTransactions: mocks.listTransactions,
}));

import { GET, POST } from './route';
import { TRANSACTION_TYPE, type Transaction } from '@bytebank/shared';

const USER_ID = 'user-123';
const payload = {
  category: 'food',
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

function rawPostRequest(body: string, headers: Record<string, string> = {}): NextRequest {
  return new Request('http://localhost/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
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

  it('usa o id da sessão após validar os campos públicos', async () => {
    const res = await POST(postRequest(payload));

    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({ ...payload, userId: USER_ID });
  });

  it.each(['userId', 'id', 'attachments'])('rejeita mass assignment do campo %s', async (field) => {
    const res = await POST(postRequest({ ...payload, [field]: 'injetado' }));

    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toMatchObject({ error: 'Dados inválidos' });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([0, -1, '42', 1_000_000_001])('rejeita amount inválido %s', async (amount) => {
    const res = await POST(postRequest({ ...payload, amount }));
    expect(res.status).toBe(422);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([{ date: '2099-01-01' }, { description: 'x'.repeat(141) }])(
    'rejeita campos fora dos limites %j',
    async (overrides) => {
      const res = await POST(postRequest({ ...payload, ...overrides }));
      expect(res.status).toBe(422);
      expect(mocks.create).not.toHaveBeenCalled();
    }
  );

  it('retorna 400 para JSON malformado', async () => {
    const res = await POST(rawPostRequest('{'));
    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('retorna 422 para descrição com byte NUL antes de gravar no banco', async () => {
    const res = await POST(postRequest({ ...payload, description: 'Compra\u0000extra' }));
    expect(res.status).toBe(422);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('retorna 413 para corpo maior que 16 KB mesmo com content-length falso', async () => {
    const res = await POST(
      rawPostRequest(JSON.stringify({ ...payload, description: 'x'.repeat(17_000) }), {
        'content-length': '1',
      })
    );
    expect(res.status).toBe(413);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/transactions (paginação + filtros)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: USER_ID } });
    mocks.getAllByUser.mockResolvedValue([makeTx('a'), makeTx('b')]);
    mocks.listTransactions.mockResolvedValue({ data: [], pages: 1, items: 0 });
  });

  it('retorna 401 e não consulta o store sem sessão', async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await GET(getRequest());

    expect(res.status).toBe(401);
    expect(mocks.getAllByUser).not.toHaveBeenCalled();
    expect(mocks.listTransactions).not.toHaveBeenCalled();
  });

  it('sem _page/_per_page retorna a lista do usuário da sessão via getAllByUser', async () => {
    const list = [makeTx('a'), makeTx('b')];
    mocks.getAllByUser.mockResolvedValue(list);

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(list);
    expect(mocks.getAllByUser).toHaveBeenCalledWith(USER_ID);
    expect(mocks.listTransactions).not.toHaveBeenCalled();
  });

  it('?_page=1&_per_page=3 retorna 3 itens + { pages, items } corretos', async () => {
    const page1 = [makeTx('1'), makeTx('2'), makeTx('3')];
    mocks.listTransactions.mockResolvedValue({ data: page1, pages: 9, items: 25 });

    const res = await GET(getRequest('?_page=1&_per_page=3'));

    expect(mocks.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        page: 1,
        perPage: 3,
        sortBy: 'date',
        sortOrder: 'desc',
      })
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

  it.each(['?_page=1&_per_page=100000', '?_per_page=100000', '?_page=0', '?_sort=userId'])(
    'retorna 422 para query inválida %s',
    async (query) => {
      const res = await GET(getRequest(query));
      expect(res.status).toBe(422);
      await expect(res.json()).resolves.toMatchObject({ error: 'Dados inválidos' });
      expect(mocks.listTransactions).not.toHaveBeenCalled();
      expect(mocks.getAllByUser).not.toHaveBeenCalled();
    }
  );

  it('retorna 422 para busca com byte NUL antes de consultar o banco', async () => {
    const res = await GET(getRequest('?_page=1&q=Compra%00extra'));
    expect(res.status).toBe(422);
    expect(mocks.listTransactions).not.toHaveBeenCalled();
  });
});
