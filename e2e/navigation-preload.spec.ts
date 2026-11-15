import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { login } from './helpers/auth';

declare global {
  interface Window {
    phase4NavigationMarker?: string;
  }
}

// Disable only the idle preload so the remote request can be attributed to hover.
test('hover alone preloads the transactions remote and first page without downloading them again on click', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.requestIdleCallback = () => 0;
    window.cancelIdleCallback = () => {};
  });
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await login(page);
  await expect(page.getByRole('button', { name: 'Nova transação', exact: true })).toBeEnabled();
  await page.waitForLoadState('networkidle');
  const expose = () =>
    requests.filter((url) => /__federation_expose_TransactionsPage.*\.js/.test(url));
  const firstPage = () =>
    requests.filter((url) => {
      const parsed = new URL(url);
      return parsed.pathname === '/api/transactions' && parsed.searchParams.get('_page') === '1';
    });
  expect(expose()).toHaveLength(0);
  const link = page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Transações', exact: true });
  const remoteReady = page.waitForResponse(
    (response) => /__federation_expose_TransactionsPage.*\.js/.test(response.url()) && response.ok()
  );
  const dataReady = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/transactions' &&
      new URL(response.url()).searchParams.get('_page') === '1' &&
      response.ok()
  );
  await page.mouse.move(0, 0);
  await link.hover();
  await (await remoteReady).finished();
  await (await dataReady).finished();
  expect(expose()).toHaveLength(1);
  expect(firstPage()).toHaveLength(1);
  await link.click();
  await expect(page.locator('#transactions-heading')).toBeVisible();
  await expect(page.getByText('E2E Uber Trip', { exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(expose()).toHaveLength(1);
  expect(firstPage()).toHaveLength(1);
  const timing = await page.evaluate(() =>
    performance
      .getEntriesByType('measure')
      .filter((entry) => /nav:click|mf:loadRemote/.test(entry.name))
      .map(({ name, duration }) => ({ name, duration }))
  );
  expect(timing.some((entry) => entry.name === 'nav:click → transactions:ready')).toBe(true);
  await testInfo.attach('hover-preload-evidence', {
    body: JSON.stringify(
      { remoteRequests: expose().length, firstPageRequests: firstPage().length, timing },
      null,
      2
    ),
    contentType: 'application/json',
  });
});

test('Todas as transações keeps the document and window state while navigating to the MFE', async ({
  page,
}) => {
  await login(page);
  const link = page.getByRole('link', { name: 'Todas as transações', exact: true });
  await expect(link).toBeVisible();
  const marker = randomUUID();
  await page.evaluate((value) => {
    window.phase4NavigationMarker = value;
  }, marker);
  const documents: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'document') documents.push(request.url());
  });
  await link.click();
  await expect(page).toHaveURL(/\/transactions(?:\?|$)/);
  await expect(page.locator('#transactions-heading')).toBeVisible();
  await expect(page.getByText('E2E Uber Trip', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.phase4NavigationMarker)).toBe(marker);
  expect(documents).toEqual([]);
});
