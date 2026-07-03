import { expect, type Locator, type Page } from '@playwright/test';

export async function selectOptionByLabel(trigger: Locator, optionName: RegExp | string) {
  await trigger.click();
  await trigger.page().getByRole('option', { name: optionName }).click();
}

export async function openTransactionsPage(page: Page) {
  await page.goto('/transactions');
  await expect(page.getByRole('heading', { name: 'Transações' })).toBeVisible();
}

export async function createWithdrawal(page: Page, description: string, amount: string) {
  await page.getByRole('button', { name: /nova transação/i }).click();
  await expect(page.getByRole('dialog', { name: /nova transação/i })).toBeVisible();

  await selectOptionByLabel(page.getByRole('button', { name: /^Depósito$/ }), 'Saque');
  await page.getByLabel('Valor').fill(amount);
  await page.getByLabel('Data').fill('2026-07-02');
  await page.getByLabel('Descrição').fill(description);
  await selectOptionByLabel(page.getByRole('button', { name: /categoria/i }), 'Transporte');

  const submit = page.getByRole('button', { name: /concluir transação/i });
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.getByRole('dialog', { name: /confirmar transação/i })).toBeVisible();
  await page.getByRole('button', { name: /^Confirmar$/ }).click();
  await expect(page.getByText('Transação adicionada!')).toBeVisible();
}

export async function editTransaction(page: Page, description: string) {
  await page
    .getByRole('button', { name: new RegExp(`Edit transaction: ${description}`, 'i') })
    .click();
  await expect(page.getByRole('dialog', { name: /editar transação/i })).toBeVisible();
}

export async function filterBySearch(page: Page, query: string) {
  await page.getByRole('searchbox', { name: /buscar transações/i }).fill(query);
  await page.waitForTimeout(400);
}

export async function openFilterPanel(page: Page) {
  await page.getByRole('button', { name: /adicionar filtros/i }).click();
}
