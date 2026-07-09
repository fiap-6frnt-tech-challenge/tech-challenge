import { expect, test } from '@playwright/test';
import { login, logout } from './helpers/auth';
import { createWithdrawal, openTransactionsPage } from './helpers/transactions';

test('authenticates, renders dashboard, creates transaction, and protects private routes', async ({
  page,
}, testInfo) => {
  const description = `E2E Uber Trip Created ${testInfo.project.name}`;

  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);

  await login(page);

  await expect(page.getByText(/olá/i)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Transações recentes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Transações recentes' }).last()).toBeVisible();
  await page.mouse.wheel(0, 1200);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await createWithdrawal(page, description, '5000');

  await openTransactionsPage(page);
  await expect(page.getByText(description, { exact: true })).toBeVisible();

  await logout(page);
  await page.goto('/transactions');
  await expect(page).toHaveURL(/\/login/);
});
