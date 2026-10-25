import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { login } from './helpers/auth';
import {
  confirmTransactionUpdate,
  editTransaction,
  openTransactionsPage,
} from './helpers/transactions';

const marker = `Bytebank E2E fixture ${randomUUID()}`;
const attachment = {
  name: 'comprovante.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from(`%PDF-1.4\n% ${marker}\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n`),
};

const attachmentSize = `${attachment.buffer.byteLength} B`;
const attachmentsUrl = '/api/transactions/e2e-attachment-target/attachments';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPIcPz0HwAFSwKbTadG6wAAAABJRU5ErkJggg==',
  'base64'
);
const uploadsDir = resolve(process.env.LOCAL_UPLOADS_DIR ?? '.uploads');

async function filesAtRest(): Promise<Buffer[]> {
  const entries = await readdir(uploadsDir, { recursive: true, withFileTypes: true });
  return Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => readFile(join(entry.parentPath, entry.name)))
  );
}

async function clearAttachments(api: APIRequestContext) {
  const response = await api.get(attachmentsUrl);
  if (!response.ok()) return;
  for (const { id } of (await response.json()) as Array<{ id: string }>) {
    await api.delete(`${attachmentsUrl}/${id}`);
  }
}

test.afterEach(async ({ page }) => {
  await clearAttachments(page.request);
});

test('uploads, persists, and removes an attachment from an existing transaction', async ({
  page,
  request,
}) => {
  await login(page);
  await clearAttachments(page.request);
  await openTransactionsPage(page);

  await editTransaction(page, 'E2E Attachment Target');

  const uploadResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().endsWith('/attachments')
  );
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /área de upload de arquivos/i }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(attachment);

  const uploaded = await (await uploadResponse).json();
  expect(Object.keys(uploaded).sort()).toEqual(['downloadUrl', 'id', 'mimeType', 'name', 'size']);
  expect(uploaded.downloadUrl).toBe(
    `/api/transactions/e2e-attachment-target/attachments/${uploaded.id}/download`
  );
  const atRest = await filesAtRest();
  expect(atRest.some((bytes) => bytes.includes(marker))).toBe(false);
  expect(atRest.some((bytes) => bytes.byteLength === attachment.buffer.byteLength + 30)).toBe(true);

  await expect(page.getByText('comprovante.pdf')).toBeVisible();
  const uploadedDialog = page.getByRole('dialog', { name: 'Anexo enviado' });
  await expect(uploadedDialog).toBeVisible();
  await uploadedDialog.getByRole('button', { name: 'Fechar', exact: true }).last().click();
  await confirmTransactionUpdate(page);
  await expect(page.getByText('Transação atualizada')).toBeVisible();

  const disguised = await page.request.post(attachmentsUrl, {
    multipart: {
      file: {
        name: 'foto.png',
        mimeType: 'image/png',
        buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]),
      },
    },
  });
  expect(disguised.status()).toBe(400);
  const photoResponse = await page.request.post(attachmentsUrl, {
    multipart: { file: { name: 'foto.png', mimeType: 'application/octet-stream', buffer: png } },
  });
  expect(photoResponse.status()).toBe(201);
  const photo = await photoResponse.json();
  expect(photo.mimeType).toBe('image/png');

  await openTransactionsPage(page);
  await editTransaction(page, 'E2E Attachment Target');
  await expect(page.getByText('comprovante.pdf')).toBeVisible();
  await expect(page.getByText(attachmentSize)).toBeVisible();
  const thumbnail = page.getByRole('listitem').filter({ hasText: 'foto.png' }).locator('img');
  await expect(thumbnail).toHaveAttribute('src', photo.downloadUrl);
  await expect
    .poll(() => thumbnail.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBe(1);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Baixar comprovante.pdf' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('comprovante.pdf');
  expect(await readFile(await download.path())).toEqual(attachment.buffer);

  const downloadResponse = await page.request.get(uploaded.downloadUrl);
  expect(downloadResponse.headers()).toMatchObject({
    'content-type': 'application/pdf',
    'content-disposition': "attachment; filename*=UTF-8''comprovante.pdf",
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
  });
  expect((await request.get(uploaded.downloadUrl)).status()).toBe(401);

  await page.getByRole('button', { name: /remover anexo: comprovante.pdf/i }).click();
  await expect(page.getByText('comprovante.pdf')).toBeHidden();
  const removed = page.getByRole('dialog', { name: 'Anexo removido' });
  await expect(removed).toBeVisible();
  await removed.getByRole('button', { name: 'Fechar', exact: true }).last().click();

  await confirmTransactionUpdate(page);
  await expect(page.getByText('Transação atualizada')).toBeVisible();

  await openTransactionsPage(page);
  await editTransaction(page, 'E2E Attachment Target');
  await expect(page.getByText('comprovante.pdf')).toBeHidden();
});
