import { describe, it, expect, vi, afterEach } from 'vitest';
import { TransactionService } from './http';

function mockFetch(body: unknown, ok = true) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('TransactionService', () => {
  it('create faz POST com JSON no corpo', async () => {
    const fetchMock = mockFetch({ id: '1' });
    await TransactionService.create({
      userId: 'joana',
      category: 'default',
      type: 'deposit',
      amount: 10,
      date: '2026-05-30',
      description: 'x',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/transactions');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body).description).toBe('x');
  });

  it('update usa PATCH (não PUT) na rota /:id', async () => {
    const fetchMock = mockFetch({ id: '1' });
    await TransactionService.update('1', { amount: 99 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/transactions/1');
    expect(init.method).toBe('PATCH');
  });

  it('getPaginated monta os params _page/_per_page/_sort e filtros', async () => {
    const fetchMock = mockFetch({ data: [], pages: 1, items: 0 });
    await TransactionService.getPaginated({
      page: 2,
      type: 'withdrawal',
      dateFrom: '2026-01-01',
      sortBy: 'amount',
      sortOrder: 'asc',
    });
    const url: string = fetchMock.mock.calls[0][0];
    expect(url).toContain('_page=2');
    expect(url).toContain('type=withdrawal');
    expect(url).toContain('date_gte=2026-01-01');
    expect(url).toContain('_sort=amount'); // asc → sem prefixo "-"
  });

  it('lança erro quando a resposta não é ok', async () => {
    mockFetch({ error: 'boom' }, false);
    await expect(TransactionService.getById('1')).rejects.toThrow('Falha ao buscar transação');
  });
});
