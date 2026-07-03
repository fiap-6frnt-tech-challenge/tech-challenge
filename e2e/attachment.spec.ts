import { expect, test } from '@playwright/test';
import path from 'node:path';
import { login } from './helpers/auth';
import { editTransaction, openTransactionsPage } from './helpers/transactions';

const fixturePath = path.join(process.cwd(), 'e2e', 'fixtures', 'comprovante.pdf');

test('uploads, persists, and removes an attachment from an existing transaction', async ({
  page,
}) => {
  await login(page);
  await openTransactionsPage(page);

  await editTransaction(page, 'E2E Attachment Target');

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /área de upload de arquivos/i }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(fixturePath);

  await expect(page.getByText('comprovante.pdf')).toBeVisible();
  await expect(page.getByRole('button', { name: /atualizar transação/i })).toBeEnabled();
  await page.getByRole('button', { name: /atualizar transação/i }).click();
  await expect(page.getByText('Transação atualizada')).toBeVisible();

  await page.reload();
  await openTransactionsPage(page);
  await editTransaction(page, 'E2E Attachment Target');
  await expect(page.getByText('comprovante.pdf')).toBeVisible();
  await expect(page.getByText(/453 B|0,4 KB|0.4 KB|bytes/i)).toBeVisible();

  await page.getByRole('button', { name: /remover anexo: comprovante.pdf/i }).click();
  await expect(page.getByText('comprovante.pdf')).toBeHidden();
});
