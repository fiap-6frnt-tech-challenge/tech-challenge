import { describe, it, expect, vi, afterEach } from 'vitest';
import { AttachmentService, SummaryService, TransactionService } from './http';

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

describe('SummaryService', () => {
  it('get busca o summary sem range', async () => {
    const summary = {
      balance: 1000,
      incomeMonth: 2000,
      expenseMonth: 1000,
      savingsMonth: 1000,
      deltaIncome: 100,
      deltaExpense: -50,
      byMonth: [],
      balanceOverTime: [],
      byCategory: [],
    };
    const fetchMock = mockFetch(summary);

    await expect(SummaryService.get()).resolves.toEqual(summary);

    expect(fetchMock).toHaveBeenCalledWith('/api/transactions/summary');
  });

  it('get inclui from/to quando o range é informado', async () => {
    const fetchMock = mockFetch({
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

    await SummaryService.get({ from: '2026-01-01', to: '2026-06-30' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/transactions/summary?from=2026-01-01&to=2026-06-30'
    );
  });

  it('lança erro quando o summary não retorna ok', async () => {
    mockFetch({ error: 'boom' }, false);

    await expect(SummaryService.get()).rejects.toThrow('Falha ao buscar resumo financeiro');
  });
});

describe('AttachmentService', () => {
  const attachment = {
    id: 'attachment-1',
    url: 'https://blob.example/attachment-1.pdf',
    name: 'recibo.pdf',
    size: 1024,
    mimeType: 'application/pdf',
  };

  it('list busca anexos da transação', async () => {
    const fetchMock = mockFetch([attachment]);

    await expect(AttachmentService.list('tx-1')).resolves.toEqual([attachment]);
    expect(fetchMock).toHaveBeenCalledWith('/api/transactions/tx-1/attachments');
  });

  it('upload envia multipart/form-data sem forçar Content-Type', async () => {
    const fetchMock = mockFetch(attachment);
    const file = new File(['pdf'], 'recibo.pdf', { type: 'application/pdf' });

    await expect(AttachmentService.upload('tx-1', file)).resolves.toEqual(attachment);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/transactions/tx-1/attachments');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers).toBeUndefined();
  });

  it('remove usa DELETE no anexo informado', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await expect(AttachmentService.remove('tx-1', 'attachment-1')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/transactions/tx-1/attachments/attachment-1', {
      method: 'DELETE',
    });
  });

  it('lança erro quando o upload falha', async () => {
    mockFetch({ error: 'boom' }, false);
    const file = new File(['pdf'], 'recibo.pdf', { type: 'application/pdf' });

    await expect(AttachmentService.upload('tx-1', file)).rejects.toThrow('Falha ao enviar anexo');
  });
});
