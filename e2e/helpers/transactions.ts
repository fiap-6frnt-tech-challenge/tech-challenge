import { expect, type Locator, type Page } from '@playwright/test';

export async function selectOptionByLabel(trigger: Locator, optionName: RegExp | string) {
  await trigger.click();
  await trigger.page().getByRole('option', { name: optionName }).click();
}

export async function openTransactionsPage(page: Page) {
  await page.goto('/transactions');
  await expect(page.locator('#transactions-heading')).toBeVisible();
}

export async function fillWithdrawal(
  page: Page,
  description: string,
  amount: string,
  date = '2026-07-02'
) {
  await page.getByRole('button', { name: /nova transação/i }).click();
  await expect(page.getByRole('dialog', { name: /nova transação/i })).toBeVisible();

  await selectOptionByLabel(page.getByRole('button', { name: /^Depósito$/ }), 'Saque');
  await page.getByLabel('Valor').fill(amount);
  await page.getByLabel('Data').fill(date);
  await page.getByLabel('Descrição').fill(description);
  await selectOptionByLabel(page.getByRole('button', { name: /categoria/i }), 'Transporte');
}

export async function submitNewTransaction(page: Page) {
  const submit = page.getByRole('button', { name: /concluir transação/i });
  await expect(submit).toBeEnabled();
  await submit.click();

  const dialog = page.getByRole('dialog', { name: /confirmar transação/i });
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function submitWithdrawal(
  page: Page,
  description: string,
  amount: string,
  date = '2026-07-02'
) {
  await fillWithdrawal(page, description, amount, date);
  const dialog = await submitNewTransaction(page);
  await dialog.getByRole('button', { name: /^Confirmar$/ }).click();
}

export async function createWithdrawal(page: Page, description: string, amount: string) {
  await submitWithdrawal(page, description, amount);
  await expect(page.getByText('Transação adicionada!')).toBeVisible();
}

export async function editTransaction(page: Page, description: string) {
  await page
    .getByRole('button', { name: new RegExp(`Edit transaction: ${description}`, 'i') })
    .click();
  await expect(page.getByRole('dialog', { name: /editar transação/i })).toBeVisible();
}

export async function confirmTransactionUpdate(page: Page) {
  const update = page.getByRole('button', { name: /atualizar transação/i });
  await expect(update).toBeEnabled();
  await update.click();

  const dialog = page.getByRole('dialog', { name: /confirmar alteração/i });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /^Confirmar$/ }).click();
}

export async function dismissAllFeedback(page: Page) {
  const feedback = page.locator('[role="dialog"][aria-labelledby="feedback-modal-title"]');
  await expect(async () => {
    if ((await feedback.count()) > 0)
      await feedback.getByRole('button', { name: 'Fechar', exact: true }).first().click();
    await expect(feedback).toHaveCount(0, { timeout: 500 });
  }).toPass({ timeout: 15_000 });
}

export async function filterBySearch(page: Page, query: string) {
  await page.getByRole('searchbox', { name: /buscar transações/i }).fill(query);
}

export async function openFilterPanel(page: Page) {
  await page.getByRole('button', { name: /adicionar filtros/i }).click();
}
