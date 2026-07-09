import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getAllByUser: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('../store', () => ({ getAllByUser: mocks.getAllByUser }));

import { GET } from './route';
import { TRANSACTION_TYPE, type Transaction } from '@bytebank/shared';

const USER_ID = 'user-123';

const transactions: Transaction[] = [
  {
    id: '1',
    userId: USER_ID,
    type: TRANSACTION_TYPE.DEPOSIT,
    category: 'Salário',
    amount: 5000,
    date: '2026-01-05',
    description: 'Salário de janeiro',
  },
  {
    id: '2',
    userId: USER_ID,
    type: TRANSACTION_TYPE.WITHDRAWAL,
    category: 'Alimentação',
    amount: 200,
    date: '2026-01-10',
    description: 'Mercado',
  },
  {
    id: '3',
    userId: USER_ID,
    type: TRANSACTION_TYPE.WITHDRAWAL,
    category: 'Transporte',
    amount: 50,
    date: '2026-01-15',
    description: 'Combustível',
  },
  {
    id: '4',
    userId: USER_ID,
    type: TRANSACTION_TYPE.DEPOSIT,
    category: 'Salário',
    amount: 3000,
    date: '2026-02-05',
    description: 'Salário de fevereiro',
  },
  {
    id: '5',
    userId: USER_ID,
    type: TRANSACTION_TYPE.WITHDRAWAL,
    category: 'Alimentação',
    amount: 100,
    date: '2026-02-10',
    description: 'Restaurante',
  },
  {
    id: '6',
    userId: USER_ID,
    type: TRANSACTION_TYPE.TRANSFER,
    category: 'Moradia',
    amount: 800,
    date: '2026-02-12',
    description: 'Transferência entre contas',
  },
];

function getRequest(query = '') {
  return new Request(`http://localhost/api/transactions/summary${query}`);
}

describe('GET /api/transactions/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: USER_ID } });
    mocks.getAllByUser.mockResolvedValue(transactions);
  });

  it('retorna 401 e não consulta o banco quando não há sessão', async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await GET(getRequest());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Não autenticado' });
    expect(mocks.getAllByUser).not.toHaveBeenCalled();
  });

  it('retorna 401 quando a sessão existe mas não tem user.id', async () => {
    mocks.auth.mockResolvedValue({ user: {} });

    const res = await GET(getRequest());

    expect(res.status).toBe(401);
    expect(mocks.getAllByUser).not.toHaveBeenCalled();
  });

  it('filtra as transações pelo userId da sessão e repassa o range from/to', async () => {
    await GET(getRequest('?from=2026-01-01&to=2026-02-28'));

    expect(mocks.getAllByUser).toHaveBeenCalledWith(USER_ID, {
      from: '2026-01-01',
      to: '2026-02-28',
    });
  });

  it('usa range vazio (undefined) quando não há query params', async () => {
    await GET(getRequest());

    expect(mocks.getAllByUser).toHaveBeenCalledWith(USER_ID, {
      from: undefined,
      to: undefined,
    });
  });

  it('retorna o shape completo do summary com transfers neutros', async () => {
    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      balance: 7650,
      incomeMonth: 3000,
      expenseMonth: 100,
      savingsMonth: 2900,
      deltaIncome: -2000,
      deltaExpense: -150,
      byMonth: [
        { month: '2026-01', income: 5000, expense: 250 },
        { month: '2026-02', income: 3000, expense: 100 },
      ],
      balanceOverTime: [
        { date: '2026-01-05', balance: 5000 },
        { date: '2026-01-10', balance: 4800 },
        { date: '2026-01-15', balance: 4750 },
        { date: '2026-02-05', balance: 7750 },
        { date: '2026-02-10', balance: 7650 },
        { date: '2026-02-12', balance: 7650 },
      ],
      byCategory: [
        { category: 'Alimentação', total: 300 },
        { category: 'Transporte', total: 50 },
      ],
    });
  });

  it('zera os agregados e mantém o shape quando não há transações', async () => {
    mocks.getAllByUser.mockResolvedValue([]);

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      balance: 0,
      incomeMonth: 0,
      expenseMonth: 0,
      savingsMonth: 0,
      deltaIncome: 0,
      deltaExpense: 0,
      byMonth: [],
      balanceOverTime: [],
      byCategory: [],
    });
  });
});
