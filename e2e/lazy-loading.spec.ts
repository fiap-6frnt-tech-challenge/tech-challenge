import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { login } from './helpers/auth';

function chartAsset(caption: string): string {
  const root = resolve('apps/dashboard-mfe/dist');
  const path = readdirSync(root, { recursive: true }).find(
    (entry) =>
      typeof entry === 'string' &&
      entry.endsWith('.js') &&
      readFileSync(resolve(root, entry), 'utf8').includes(caption)
  );
  if (!path)
    throw new Error(`Build the dashboard before testing: missing chart asset for ${caption}`);
  return String(path).replaceAll('\\', '/');
}
const categoryCaption = 'Distribuição de despesas por categoria de consumo';
const balanceCaption = 'Gráfico de evolução histórica do saldo total acumulado';
const incomeCaption = 'Resumo de receitas e despesas agrupados por mês';

async function revealFirstWidget(page: Page) {
  await page.getByText('Nova transação', { exact: true }).scrollIntoViewIfNeeded();
  const heading = page.getByRole('heading', { name: 'Receita vs Despesa', exact: true });
  await expect(heading).toBeAttached();
  // Put only this widget's heading in view; lower widgets remain below the viewport.
  await heading.evaluate((element) => element.scrollIntoView({ block: 'end' }));
}

test.use({ viewport: { width: 412, height: 823 } });

test('transactions loads neither Recharts nor Zod scripts', async ({ page }) => {
  await login(page);
  const scripts: Promise<string>[] = [];
  page.on('response', (response) => {
    if (response.ok() && response.request().resourceType() === 'script')
      scripts.push(response.text());
  });
  await page.goto('/transactions');
  await expect(page.locator('#transactions-heading')).toBeVisible();
  await expect(page.getByText('E2E Uber Trip', { exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  const sources = await Promise.all(scripts);
  expect(sources.length).toBeGreaterThan(0);
  for (const source of sources) {
    expect(source).not.toContain('recharts-wrapper');
    expect(source).not.toMatch(/ZodError|\$ZodError/);
  }
});

test('mobile chart widgets and their accessible tables load only when scrolled into view', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await login(page);
  await revealFirstWidget(page);
  await expect(page.getByRole('table', { name: incomeCaption })).toBeAttached();
  expect(requests.some((url) => url.endsWith(chartAsset(categoryCaption)))).toBe(false);
  expect(requests.some((url) => url.endsWith(chartAsset(balanceCaption)))).toBe(false);
  await expect(page.getByRole('table', { name: categoryCaption })).toHaveCount(0);
  await expect(page.getByRole('table', { name: balanceCaption })).toHaveCount(0);

  await page
    .getByRole('heading', { name: 'Despesas por Categoria', exact: true })
    .evaluate((element) => element.scrollIntoView({ block: 'end' }));
  await expect(page.getByRole('table', { name: categoryCaption })).toBeAttached();
  expect(requests.some((url) => url.endsWith(chartAsset(categoryCaption)))).toBe(true);
  expect(requests.some((url) => url.endsWith(chartAsset(balanceCaption)))).toBe(false);

  await page
    .getByRole('heading', { name: 'Evolução do Saldo', exact: true })
    .evaluate((element) => element.scrollIntoView({ block: 'end' }));
  await expect(page.getByRole('table', { name: balanceCaption })).toBeAttached();
  expect(requests.some((url) => url.endsWith(chartAsset(balanceCaption)))).toBe(true);
});

test('a failed chart download offers a working retry without losing the dashboard', async ({
  page,
}) => {
  const asset = chartAsset(incomeCaption);
  await page.route(`**/${asset}`, (route) => route.abort('failed'));
  await login(page);
  await revealFirstWidget(page);
  await expect(
    page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o gráfico' })
  ).toBeVisible();
  await page.unroute(`**/${asset}`);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('table', { name: incomeCaption })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeAttached();
});

test('keyboard traversal reaches deferred widgets and exposes their chart data', async ({
  page,
}) => {
  await login(page);
  await revealFirstWidget(page);
  const income = page.getByRole('region', { name: 'Receita vs Despesa', exact: true });
  const category = page.getByRole('region', { name: 'Despesas por Categoria', exact: true });
  const balance = page.getByRole('region', { name: 'Evolução do Saldo', exact: true });
  await expect(page.getByRole('table', { name: categoryCaption })).toHaveCount(0);
  await income.focus();
  await expect(page.getByRole('table', { name: incomeCaption })).toBeAttached();
  await page.keyboard.press('Tab');
  await expect(income.getByRole('button', { name: 'Atualizar', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(category).toBeFocused();
  await expect(page.getByRole('table', { name: categoryCaption })).toBeAttached();
  await page.keyboard.press('Tab');
  await expect(category.getByRole('button', { name: 'Atualizar', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(balance).toBeFocused();
  await expect(page.getByRole('table', { name: balanceCaption })).toBeAttached();
});
