import { expect, test, type Page, type Response } from '@playwright/test';
import { login } from './helpers/auth';
import { createWithdrawal, openTransactionsPage } from './helpers/transactions';

const apiGet = (pathname: string) => (response: Response) =>
  response.request().method() === 'GET' && new URL(response.url()).pathname === pathname;
const isList = apiGet('/api/transactions');
const isOverview = apiGet('/api/transactions/overview');

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

test('API revalidates with 304 until a mutation changes the data', async ({ page }, testInfo) => {
  const description = `E2E Cache ${testInfo.project.name} ${testInfo.retry}`;
  const cacheHeaders = collectApiCacheHeaders(page);

  const firstOverview = page.waitForResponse(isOverview);
  await login(page);
  const overview = await firstOverview;
  expect(overview.status()).toBe(200);
  expect(overview.headers()).toMatchObject({
    'cache-control': 'private, no-cache',
    etag: expect.stringMatching(/^W\/"/),
    vary: expect.stringContaining('Cookie'),
  });

  const revalidatedOverview = page.waitForResponse(isOverview);
  await page.reload();
  expect(await wasNotModified(await revalidatedOverview)).toBe(true);

  const firstList = page.waitForResponse(isList);
  await openTransactionsPage(page);
  const listETag = (await firstList).headers().etag;

  const revalidatedList = page.waitForResponse(isList);
  await page.reload();
  expect(await wasNotModified(await revalidatedList)).toBe(true);
  await expect(page.getByText('E2E Uber Trip', { exact: true })).toBeVisible();

  await page.goto('/');
  await createWithdrawal(page, description, '7');
  const refreshedList = page.waitForResponse(isList);
  await openTransactionsPage(page);
  const refreshed = await refreshedList;
  expect(refreshed.status()).toBe(200);
  expect(refreshed.headers().etag).not.toBe(listETag);
  await expect(page.getByText(description, { exact: true })).toBeVisible();

  expect(cacheHeaders.length).toBeGreaterThan(0);
  for (const value of cacheHeaders) expect(value).not.toMatch(/public|s-maxage/);
});
