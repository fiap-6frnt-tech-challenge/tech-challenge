import { expect, test } from '@playwright/test';
import { login, logout } from './helpers/auth';
import { createWithdrawal, openTransactionsPage } from './helpers/transactions';

test('authenticates, renders dashboard, creates transaction, and protects private routes', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);

  await login(page);

  await expect(page.getByText(/olá/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Transações recentes' }).last()).toBeVisible();

  await createWithdrawal(page, 'E2E Uber Trip Created', '5000');

  await openTransactionsPage(page);
  await expect(page.getByText('E2E Uber Trip Created')).toBeVisible();

  await logout(page);
  await page.goto('/transactions');
  await expect(page).toHaveURL(/\/login/);
});
