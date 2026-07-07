import { expect, test } from '@playwright/test';
import { login } from './helpers/auth';
import { editTransaction, openTransactionsPage } from './helpers/transactions';

const attachment = {
  name: 'comprovante.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from(
    '%PDF-1.4\n% Bytebank E2E fixture\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n'
  ),
};

const attachmentSize = `${attachment.buffer.byteLength} B`;

test('uploads, persists, and removes an attachment from an existing transaction', async ({
  page,
}) => {
  await login(page);
  await openTransactionsPage(page);

  await editTransaction(page, 'E2E Attachment Target');

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /área de upload de arquivos/i }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(attachment);

  await expect(page.getByText('comprovante.pdf')).toBeVisible();
  await expect(page.getByRole('button', { name: /atualizar transação/i })).toBeEnabled();
  await page.getByRole('button', { name: /atualizar transação/i }).click();
  await expect(page.getByText('Transação atualizada')).toBeVisible();

  await page.reload();
  await openTransactionsPage(page);
  await editTransaction(page, 'E2E Attachment Target');
  await expect(page.getByText('comprovante.pdf')).toBeVisible();
  await expect(page.getByText(attachmentSize)).toBeVisible();

  await page.getByRole('button', { name: /remover anexo: comprovante.pdf/i }).click();
  await expect(page.getByText('comprovante.pdf')).toBeHidden();

  const updateButton = page.getByRole('button', { name: /atualizar transação/i });
  await expect(updateButton).toBeEnabled();
  await updateButton.click();
  await expect(page.getByText('Transação atualizada')).toBeVisible();

  await page.reload();
  await openTransactionsPage(page);
  await editTransaction(page, 'E2E Attachment Target');
  await expect(page.getByText('comprovante.pdf')).toBeHidden();
});
