import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prefetchQuery: vi.fn(),
  preloadAccountOverview: vi.fn(),
  preloadDashboard: vi.fn(),
  preloadTransactionsPage: vi.fn(),
}));

vi.mock('@bytebank/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@bytebank/api-client')>()),
  queryClient: { prefetchQuery: mocks.prefetchQuery },
}));

vi.mock('@bytebank/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@bytebank/shared')>()),
  whenIdle: (callback: () => void) => {
    callback();
    return () => undefined;
  },
}));

vi.mock('./federation', () => ({
  preloadAccountOverview: mocks.preloadAccountOverview,
  preloadDashboard: mocks.preloadDashboard,
  preloadTransactionsPage: mocks.preloadTransactionsPage,
}));

import { overviewKeys, summaryKeys, transactionKeys } from '@bytebank/api-client';
import {
  preloadCurrentRoute,
  preloadLikelyNextRoute,
  preloadLikelyNextRouteWhenReady,
  preloadRoute,
} from './routePreload';

const prefetchedKeys = () => mocks.prefetchQuery.mock.calls.map(([options]) => options.queryKey);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });
  vi.stubGlobal('navigator', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  performance.clearMarks();
});

describe('preloadRoute', () => {
  it('pré-carrega o remote e a 1ª página de /transactions com a chave da lista', async () => {
    preloadRoute('/transactions');
    await vi.dynamicImportSettled();

    expect(prefetchedKeys()).toEqual([
      transactionKeys.list({ page: 1, perPage: 10, sortBy: 'date', sortOrder: 'desc' }),
    ]);
    expect(mocks.preloadTransactionsPage).toHaveBeenCalledTimes(1);
    expect(mocks.preloadDashboard).not.toHaveBeenCalled();
  });

  it('lê filtros e página do href com o mesmo codec da URL do MFE', () => {
    preloadRoute('/transactions?type=deposit&sortBy=amount&page=2');

    expect(prefetchedKeys()).toEqual([
      transactionKeys.list({
        page: 2,
        perPage: 10,
        sortBy: 'amount',
        sortOrder: 'desc',
        type: 'deposit',
      }),
    ]);
  });

  it('pré-carrega visão geral e resumo da home com os dois remotes', async () => {
    preloadRoute('/');
    await vi.dynamicImportSettled();

    const [overview, summary] = prefetchedKeys();
    expect(overview).toEqual(overviewKeys.all);
    expect(summary.slice(0, 1)).toEqual(summaryKeys.all);
    expect(mocks.preloadAccountOverview).toHaveBeenCalledTimes(1);
    expect(mocks.preloadDashboard).toHaveBeenCalledTimes(1);
  });

  it('ignora rotas sem pré-carregamento', async () => {
    preloadRoute('/register');
    await vi.dynamicImportSettled();

    expect(mocks.prefetchQuery).not.toHaveBeenCalled();
    expect(mocks.preloadTransactionsPage).not.toHaveBeenCalled();
  });

  it('não pré-carrega nada com Economia de dados ou em 2G', async () => {
    vi.stubGlobal('navigator', { connection: { saveData: true } });
    preloadRoute('/transactions');
    vi.stubGlobal('navigator', { connection: { effectiveType: '2g' } });
    preloadRoute('/');
    await vi.dynamicImportSettled();

    expect(mocks.prefetchQuery).not.toHaveBeenCalled();
    expect(mocks.preloadTransactionsPage).not.toHaveBeenCalled();
    expect(mocks.preloadDashboard).not.toHaveBeenCalled();
  });
});

describe('preloadLikelyNextRoute', () => {
  it('na home ociosa, pré-carrega só o remote de transações', async () => {
    preloadLikelyNextRoute('/');
    await vi.dynamicImportSettled();

    expect(mocks.preloadTransactionsPage).toHaveBeenCalledTimes(1);
    expect(mocks.prefetchQuery).not.toHaveBeenCalled();
  });

  it('em /transactions ociosa, pré-carrega os remotes da home', async () => {
    preloadLikelyNextRoute('/transactions');
    await vi.dynamicImportSettled();

    expect(mocks.preloadDashboard).toHaveBeenCalledTimes(1);
    expect(mocks.preloadAccountOverview).toHaveBeenCalledTimes(1);
    expect(mocks.prefetchQuery).not.toHaveBeenCalled();
  });
});

describe('preloadCurrentRoute', () => {
  it('pré-carrega só o remote acima da dobra da rota atual, sem buscar dados', async () => {
    preloadCurrentRoute('/');
    await vi.dynamicImportSettled();
    expect(mocks.preloadAccountOverview).toHaveBeenCalledTimes(1);
    expect(mocks.preloadDashboard).not.toHaveBeenCalled();

    preloadCurrentRoute('/transactions');
    await vi.dynamicImportSettled();
    expect(mocks.preloadTransactionsPage).toHaveBeenCalledTimes(1);
    expect(mocks.prefetchQuery).not.toHaveBeenCalled();
  });
});

describe('preloadLikelyNextRouteWhenReady', () => {
  it('só baixa o remote da próxima rota depois da marca *:ready da rota atual', async () => {
    preloadLikelyNextRouteWhenReady('/transactions');
    performance.mark('overview:ready');
    await new Promise((resolve) => setTimeout(resolve, 20));
    await vi.dynamicImportSettled();
    expect(mocks.preloadAccountOverview).not.toHaveBeenCalled();

    performance.mark('transactions:ready');
    await vi.waitFor(() => expect(mocks.preloadAccountOverview).toHaveBeenCalledTimes(1));
    expect(mocks.preloadDashboard).toHaveBeenCalledTimes(1);
    expect(mocks.preloadTransactionsPage).not.toHaveBeenCalled();
  });

  it('não baixa nada quando a rota sai antes de ficar pronta', async () => {
    const cancel = preloadLikelyNextRouteWhenReady('/');
    cancel();
    performance.mark('overview:ready');
    await new Promise((resolve) => setTimeout(resolve, 20));
    await vi.dynamicImportSettled();

    expect(mocks.preloadTransactionsPage).not.toHaveBeenCalled();
  });
});
