import { expect, test, type Page } from '@playwright/test';
import { defaultSummaryRange } from '../packages/core/src/domain/dashboard/summaryRange';
import { formatCurrencyExact } from '../packages/shared/src/lib/format';
import { login } from './helpers/auth';
import { openTransactionsPage, submitWithdrawal } from './helpers/transactions';

function cachePolicies(page: Page) {
  return page.evaluate(async () => {
    type Share = { get: () => Promise<() => unknown> };
    const registry = (
      globalThis as typeof globalThis & {
        __FEDERATION__: {
          __SHARE__: Record<string, { default: Record<string, Record<string, Share>> }>;
        };
      }
    ).__FEDERATION__.__SHARE__;
    const descriptor = registry['@bytebank/shell'].default['@bytebank/api-client']['0.1.0'];
    const { queryClient } = (await (
      await descriptor.get()
    )()) as typeof import('@bytebank/api-client');
    return Object.fromEntries(
      queryClient
        .getQueryCache()
        .getAll()
        .map(({ queryKey, options }) => [
          String(queryKey[0]),
          {
            staleTime: options.staleTime,
            gcTime: options.gcTime,
            refetchOnWindowFocus: options.refetchOnWindowFocus,
          },
        ])
    );
  });
}

test('applies the cache policy of each data type in the running app', async ({ page }) => {
  await login(page);
  await page.locator('#main').evaluate((main) => main.scrollTo(0, main.scrollHeight));
  await expect(page.getByText('Receita do mês', { exact: true })).toBeVisible();
  await expect
    .poll(() => cachePolicies(page))
    .toMatchObject({
      overview: { staleTime: 30_000, gcTime: 600_000, refetchOnWindowFocus: true },
      summary: { staleTime: 60_000, gcTime: 600_000, refetchOnWindowFocus: true },
    });

  await openTransactionsPage(page);
  await expect
    .poll(() => cachePolicies(page))
    .toMatchObject({
      transactions: { staleTime: 30_000, gcTime: 300_000, refetchOnWindowFocus: false },
    });
});

test('shows a new transaction before the server answers and rolls it back when the API fails', async ({
  page,
}, testInfo) => {
  const description = `E2E Otimista ${testInfo.project.name}`;
  await login(page);
  const { balance } = await (await page.request.get('/api/transactions/overview')).json();
  const overview = page.getByRole('region', { name: 'Transações recentes' });

  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/transactions', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await hold;
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'E2E API fora' }),
    });
  });

  try {
    await page.getByRole('button', { name: 'Exibir saldo' }).click();
    await expect(overview.getByText(formatCurrencyExact(balance), { exact: true })).toBeVisible();

    const started = page.waitForRequest(
      (request) =>
        request.method() === 'POST' && new URL(request.url()).pathname === '/api/transactions'
    );
    await submitWithdrawal(page, description, '3700', defaultSummaryRange().to);
    await started;

    await expect(overview.getByText(description, { exact: true })).toBeVisible();
    await expect(
      overview.getByText(formatCurrencyExact(balance - 37), { exact: true })
    ).toBeVisible();

    release();

    await expect(page.getByText('Erro ao adicionar transação')).toBeVisible();
    await expect(overview.getByText(description, { exact: true })).toHaveCount(0);
    await expect(overview.getByText(formatCurrencyExact(balance), { exact: true })).toBeVisible();
  } finally {
    release();
  }

  const stored = await page.evaluate(async () => ({
    local: JSON.stringify({ ...localStorage }),
    session: JSON.stringify({ ...sessionStorage }),
    databases: (await indexedDB.databases()).map((database) => database.name),
  }));
  for (const value of [stored.local, stored.session]) {
    expect(value).not.toMatch(/E2E |balance|recent|summary|"amount"/);
  }
  expect(stored.databases).toEqual([]);
});
