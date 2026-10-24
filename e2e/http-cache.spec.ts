import { expect, test, type Page, type Response } from '@playwright/test';
import { login } from './helpers/auth';
import { createWithdrawal, openTransactionsPage } from './helpers/transactions';

const overviewPath = '/api/transactions/overview';
const listPath = '/api/transactions?_page=1&_per_page=10&_sort=-date';

// Firefox reports the 304; Chromium reports the cached 200 it revalidated.
async function wasNotModified(response: Response) {
  if (response.status() === 304) return true;
  const sent = await response.request().headerValue('if-none-match');
  return sent !== null && sent === response.headers().etag;
}

function collectApiCacheHeaders(page: Page) {
  const values: string[] = [];
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.startsWith('/api/transactions'))
      values.push(response.headers()['cache-control'] ?? '');
  });
  return values;
}

// With SSR data the remotes no longer fetch on load, so the page fetches through its HTTP cache.
async function fetchFromPage(page: Page, path: string) {
  const url = new URL(path, page.url());
  const response = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === 'GET' &&
      candidate.url() === url.toString() &&
      candidate.request().resourceType() === 'fetch'
  );
  await page.evaluate((target) => fetch(target).then((result) => result.text()), url.toString());
  return response;
}

test('API revalidates with 304 until a mutation changes the data', async ({ page }, testInfo) => {
  const description = `E2E Cache ${testInfo.project.name} ${testInfo.retry}`;
  const cacheHeaders = collectApiCacheHeaders(page);
  await login(page);

  const overview = await fetchFromPage(page, overviewPath);
  expect(overview.status()).toBe(200);
  expect(overview.headers()).toMatchObject({
    'cache-control': 'private, no-cache',
    etag: expect.stringMatching(/^W\/"/),
    vary: expect.stringContaining('Cookie'),
  });
  expect(await wasNotModified(await fetchFromPage(page, overviewPath))).toBe(true);

  const listETag = (await fetchFromPage(page, listPath)).headers().etag;
  expect(await wasNotModified(await fetchFromPage(page, listPath))).toBe(true);

  await createWithdrawal(page, description, '7');
  const refreshed = await fetchFromPage(page, listPath);
  expect(refreshed.status()).toBe(200);
  expect(refreshed.headers().etag).not.toBe(listETag);
  expect(await refreshed.text()).toContain(description);

  await openTransactionsPage(page);
  await expect(page.getByText(description, { exact: true })).toBeVisible();

  expect(cacheHeaders.length).toBeGreaterThan(0);
  for (const value of cacheHeaders) expect(value).not.toMatch(/public|s-maxage/);
});
