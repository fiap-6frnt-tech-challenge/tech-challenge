import { expect, test, type Request } from '@playwright/test';
import { login } from './helpers/auth';
import { openFilterPanel, openTransactionsPage } from './helpers/transactions';

function searchTerm(request: Request) {
  const url = new URL(request.url());
  return url.pathname === '/api/transactions' ? url.searchParams.get('q') : null;
}

test('debounces rapid search and amount edits while preserving URL state', async ({ page }) => {
  await login(page);
  await openTransactionsPage(page);
  const searchRequests: string[] = [];
  page.on('request', (request) => {
    const term = searchTerm(request);
    if (term) searchRequests.push(term);
  });

  const search = page.getByRole('searchbox', { name: /buscar transações/i });
  await search.pressSequentially('supermercado', { delay: 120 });
  await expect(page).toHaveURL(/q=supermercado/);
  await expect.poll(() => searchRequests).toEqual(['supermercado']);

  await openFilterPanel(page);
  const min = page.getByRole('textbox', { name: 'De, valor mínimo' });
  await min.fill('120');
  await expect(page).toHaveURL(/amount_gte=120/);

  await page.reload();
  await expect(page.getByRole('searchbox', { name: /buscar transações/i })).toHaveValue(
    'supermercado'
  );
  await expect(page.getByRole('textbox', { name: 'De, valor mínimo' })).toHaveValue('120,00');
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page).not.toHaveURL(/q=|amount_gte=/);
  await expect(page.getByRole('searchbox', { name: /buscar transações/i })).toHaveValue('');
});

test('aborts an obsolete search request when the query key changes', async ({ page }, testInfo) => {
  await login(page);
  await openTransactionsPage(page);
  let releaseFirst: () => void = () => undefined;
  const holdFirst = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  await page.route('**/api/transactions?*', async (route) => {
    if (searchTerm(route.request()) === 'uber') {
      await holdFirst;
      try {
        await route.continue();
      } catch {
        // The browser has already aborted the old request.
      }
      return;
    }
    await route.continue();
  });

  const firstStarted = page.waitForRequest((request) => searchTerm(request) === 'uber');
  const firstFailed = page.waitForEvent('requestfailed', {
    predicate: (request) => searchTerm(request) === 'uber',
  });
  const search = page.getByRole('searchbox', { name: /buscar transações/i });
  try {
    await search.fill('uber');
    await firstStarted;
    await search.fill('ubera');
    await expect(page).toHaveURL(/q=ubera/);
    const aborted = await firstFailed;
    const failure = aborted.failure()?.errorText;
    expect(failure).toMatch(/abort|cancel/i);
    await testInfo.attach('obsolete-search-request', {
      body: JSON.stringify({ url: aborted.url(), failure }, null, 2),
      contentType: 'application/json',
    });
  } finally {
    releaseFirst();
  }
});

test('issues at most one request per stable term during slow typing', async ({ page }) => {
  await login(page);
  await openTransactionsPage(page);
  const searchRequests: string[] = [];
  page.on('request', (request) => {
    const term = searchTerm(request);
    if (term) searchRequests.push(term);
  });

  const search = page.getByRole('searchbox', { name: /buscar transações/i });
  await search.pressSequentially('supermercado', { delay: 400 });
  await expect(page).toHaveURL(/q=supermercado/);
  await expect(search).toHaveValue('supermercado');
  expect(searchRequests.length).toBeGreaterThan(0);
  expect(searchRequests.length).toBeLessThanOrEqual(11);
  expect(new Set(searchRequests).size).toBe(searchRequests.length);
  console.log(
    `S2-02 slow typing: ${searchRequests.length} requests for supermercado at 400 ms/key`
  );
});
