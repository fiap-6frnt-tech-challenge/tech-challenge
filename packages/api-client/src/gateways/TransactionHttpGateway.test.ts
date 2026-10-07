import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransactionHttpGateway } from './TransactionHttpGateway';
import { AttachmentHttpGateway } from './AttachmentHttpGateway';

afterEach(() => vi.unstubAllGlobals());

describe('TransactionHttpGateway', () => {
  it('builds list URLs with the core filter codec and passes signal', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [], pages: 1, items: 0 }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;
    await new TransactionHttpGateway().list(
      { type: 'withdrawal', q: 'uber' },
      { page: 2, perPage: 5 },
      { signal }
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/transactions?_page=2&_per_page=5&type=withdrawal&q=uber&_sort=-date',
      { signal }
    );
  });

  it('builds overview and summary URLs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const gateway = new TransactionHttpGateway();
    await gateway.overview();
    await gateway.summary({ from: '2026-01-01', to: '2026-06-30' });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/transactions/overview',
      '/api/transactions/summary?from=2026-01-01&to=2026-06-30',
    ]);
  });
});

describe('AttachmentHttpGateway', () => {
  it('builds attachment URLs and uploads multipart data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const gateway = new AttachmentHttpGateway();
    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' });
    await gateway.list('tx 1');
    await gateway.upload('tx 1', file);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/transactions/tx%201/attachments');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/transactions/tx%201/attachments');
    expect(fetchMock.mock.calls[1][1].body).toBeInstanceOf(FormData);
  });
});
