import { expect, test, type Page, type Request } from '@playwright/test';
import { defaultSummaryRange } from '../packages/core/src/domain/dashboard/summaryRange';
import { E2E_OTHER_USER } from './globalSetup';
import { login } from './helpers/auth';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

function collectDataRequests(page: Page) {
  const urls: URL[] = [];
  page.on('request', (request: Request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname.startsWith('/api/transactions')) urls.push(url);
  });
  return urls;
}

test('home and transactions mount the remotes with SSR data, without fetching it again', async ({
  page,
}) => {
  await login(page);
  await page.mouse.move(0, 0);
  const requests = collectDataRequests(page);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Exibir saldo' })).toBeVisible();
  await expect(page.getByText(/^E2E /).first()).toBeVisible();
  await page.locator('#main').evaluate((main) => main.scrollTo(0, main.scrollHeight));
  await expect(page.getByText('Receita do mês', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Receita vs Despesa' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(requests.map(String)).toEqual([]);

  await page.goto('/transactions?type=withdrawal&q=E2E');
  await expect(page.getByText('E2E Uber Trip', { exact: true })).toBeVisible();
  await expect(page.getByText('E2E Salario Mensal', { exact: true })).toBeHidden();
  await page.waitForLoadState('networkidle');
  expect(requests.filter((url) => url.searchParams.get('_page') === '1').map(String)).toEqual([]);
  expect(requests.filter((url) => url.pathname !== '/api/transactions').map(String)).toEqual([]);
});

test('the server HTML paints the LCP element and preloads the route remote, with no session fetch', async ({
  page,
}) => {
  await login(page);
  const main = (html: string) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const headPreloads = (html: string) =>
    [...html.slice(0, html.indexOf('</head>')).matchAll(/<link [^>]*rel="preload"[^>]*>/g)].map(
      ([tag]) => tag
    );
  const preloadsExpose = (html: string, expose: string) =>
    headPreloads(html).some(
      (tag) =>
        tag.includes(`__federation_expose_${expose}`) &&
        tag.includes('as="script"') &&
        /nonce="[^"]+"/.test(tag)
    );

  const home = await (await page.request.get('/')).text();
  expect(main(home)).toMatch(/<img[^>]+src="\/piggy-bank\.png"/);
  expect(preloadsExpose(home, 'AccountOverview')).toBe(true);
  const transactions = await (await page.request.get('/transactions')).text();
  expect(main(transactions)).toMatch(/<h1[^>]*>Transações/);
  expect(preloadsExpose(transactions, 'TransactionsPage')).toBe(true);

  const sessionRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/auth/session')
      sessionRequests.push(request.url());
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Exibir saldo' })).toBeVisible();
  await page.goto('/transactions');
  await expect(page.locator('#transactions-heading')).toBeVisible();
  await expect(page.locator('main h1')).toHaveCount(1);
  expect(sessionRequests).toEqual([]);
});

test('two accounts never receive each other data, from the SSR or from the server cache', async ({
  browser,
  page,
}) => {
  const range = defaultSummaryRange();
  const summaryPath = `/api/transactions/summary?from=${range.from}&to=${range.to}`;
  const html = async (target: Page, path: string) => (await target.request.get(path)).text();
  const summary = async (target: Page) => (await target.request.get(summaryPath)).json();
  const otherContext = await browser.newContext({ baseURL });

  try {
    await login(page);
    const other = await otherContext.newPage();
    await login(other, E2E_OTHER_USER);

    const homeA = await html(page, '/');
    const homeB = await html(other, '/');
    expect(homeB).toContain('E2E Outra Conta');
    expect(homeB).toContain('777.77');
    expect(homeA).not.toContain('E2E Outra Conta');
    expect(homeA).not.toContain('777.77');
    for (const description of ['E2E Uber Trip', 'E2E Mercado Central', 'E2E Salario Mensal'])
      expect(homeB).not.toContain(description);
    expect(await html(page, '/transactions?q=E2E%20Uber')).toContain('E2E Uber Trip');
    expect(await html(other, '/transactions?q=E2E')).not.toContain('E2E Uber Trip');

    const beforeA = await summary(page);
    const beforeB = await summary(other);
    expect(beforeB.balance).toBe(777.77);
    expect(beforeA.balance).not.toBe(777.77);
    expect(await summary(page)).toEqual(beforeA);

    const created = await page.request.post('/api/transactions', {
      data: {
        type: 'deposit',
        category: 'salary',
        amount: 10,
        date: range.to,
        description: 'E2E Cache Servidor',
      },
    });
    expect(created.status()).toBe(201);
    const { id } = await created.json();
    try {
      expect((await summary(page)).balance).toBeCloseTo(beforeA.balance + 10, 2);
      expect(await summary(other)).toEqual(beforeB);
      expect(await html(page, '/')).toContain('E2E Cache Servidor');
      expect(await html(other, '/')).not.toContain('E2E Cache Servidor');
    } finally {
      expect((await page.request.delete(`/api/transactions/${id}`)).status()).toBe(204);
    }
    expect((await summary(page)).balance).toBeCloseTo(beforeA.balance, 2);
  } finally {
    await otherContext.close();
  }
});
