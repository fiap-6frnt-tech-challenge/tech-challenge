import { expect, test } from '@playwright/test';
import { login } from './helpers/auth';
import { filterBySearch, openFilterPanel, openTransactionsPage } from './helpers/transactions';

test('filters transactions by search and category, then clears filters', async ({ page }) => {
  await login(page);
  await openTransactionsPage(page);

  await expect(page.getByText('E2E Uber Trip', { exact: true })).toBeVisible();
  await expect(page.getByText('E2E Mercado Central')).toBeVisible();

  await filterBySearch(page, 'Uber');
  await expect(page.getByText('E2E Uber Trip', { exact: true })).toBeVisible();
  await expect(page.getByText('E2E Mercado Central')).toBeHidden();

  await openFilterPanel(page);
  await page.getByRole('combobox', { name: /todas as categorias/i }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('option', { name: 'Transporte' }).click();
  await page.keyboard.press('Escape');

  await expect(page.getByText('E2E Uber Trip', { exact: true })).toBeVisible();
  await expect(page.getByText('E2E Mercado Central')).toBeHidden();

  await page.getByRole('button', { name: /limpar filtros/i }).click();
  await expect(page.getByText('E2E Uber Trip', { exact: true })).toBeVisible();
  await expect(page.getByText('E2E Mercado Central')).toBeVisible();
});
