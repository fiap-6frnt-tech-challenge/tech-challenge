import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { login } from './helpers/auth';
import { dismissAllFeedback, fillWithdrawal, submitNewTransaction } from './helpers/transactions';

const created: string[] = [];

function pdf(name: string) {
  return {
    name,
    mimeType: 'application/pdf',
    buffer: Buffer.from(`%PDF-1.4\n% S3-07 ${name}\n%%EOF\n`),
  };
}

function isCreate(method: string, url: string) {
  return method === 'POST' && new URL(url).pathname === '/api/transactions';
}

function trackCreated(page: Page) {
  return page
    .waitForResponse((response) => isCreate(response.request().method(), response.url()))
    .then(async (response) => {
      const { id } = (await response.json()) as { id: string };
      created.push(id);
      return id;
    });
}

async function attach(page: Page, names: string[]) {
  const chooser = page.waitForEvent('filechooser');
  await page
    .getByRole('dialog', { name: /nova transação/i })
    .getByRole('button', { name: /área de upload de arquivos/i })
    .click();
  await (await chooser).setFiles(names.map(pdf));
}

function flowStatus(page: Page) {
  return page.locator('p[role="status"][aria-live="polite"][aria-atomic="true"]');
}

test.afterEach(async ({ page }) => {
  for (const id of created.splice(0)) await page.request.delete(`/api/transactions/${id}`);
});

test('creates a single transaction when Confirmar is double clicked', async ({ page }) => {
  await login(page);
  const creates: string[] = [];
  page.on('request', (request) => {
    if (isCreate(request.method(), request.url())) creates.push(request.url());
  });

  await fillWithdrawal(page, `S3-07 duplo clique ${randomUUID().slice(0, 8)}`, '1234');
  const dialog = await submitNewTransaction(page);
  const id = trackCreated(page);
  await dialog.getByRole('button', { name: /^Confirmar$/ }).dblclick();
  await id;

  await expect(page.getByRole('dialog', { name: 'Transação adicionada!' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: /nova transação/i })).toHaveCount(0);
  expect(creates).toHaveLength(1);
});

test('keeps the transaction when an attachment fails and retries only the failed file', async ({
  page,
}) => {
  await login(page);
  let rejectInvoice = true;
  const uploaded: string[] = [];
  await page.route('**/api/transactions/*/attachments', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }
    const isInvoice = request.postDataBuffer()?.includes('nota.pdf') ?? false;
    if (isInvoice && rejectInvoice) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'S3-07 arquivo recusado' }),
      });
      return;
    }
    uploaded.push(isInvoice ? 'nota.pdf' : 'recibo.pdf');
    await route.continue();
  });

  await fillWithdrawal(page, `S3-07 falha parcial ${randomUUID().slice(0, 8)}`, '2500');
  await attach(page, ['recibo.pdf', 'nota.pdf']);
  const confirm = await submitNewTransaction(page);
  const id = trackCreated(page);
  await confirm.getByRole('button', { name: /^Confirmar$/ }).click();
  const transactionId = await id;

  const modal = page.getByRole('dialog', { name: /nova transação/i });
  await expect(
    modal.getByText(/A transação foi criada, mas 1 anexo não foi enviado/)
  ).toBeVisible();
  await expect(modal.getByRole('listitem').filter({ hasText: 'nota.pdf' })).toContainText('Falhou');
  await expect(modal.getByRole('listitem').filter({ hasText: 'recibo.pdf' })).toHaveCount(0);
  await expect(flowStatus(page)).toHaveText('Transação criada, mas 1 anexo não foi enviado');
  await dismissAllFeedback(page);

  rejectInvoice = false;
  await modal.getByRole('button', { name: 'Tentar de novo', exact: true }).click();

  await expect(modal).toHaveCount(0);
  await expect(flowStatus(page)).toHaveText('Transação criada');
  expect(uploaded).toEqual(['recibo.pdf', 'nota.pdf']);
  const attachments = (await (
    await page.request.get(`/api/transactions/${transactionId}/attachments`)
  ).json()) as Array<{ name: string }>;
  expect(attachments.map((attachment) => attachment.name).sort()).toEqual([
    'nota.pdf',
    'recibo.pdf',
  ]);
});

test('announces saving, upload progress and success to screen readers', async ({ page }) => {
  await login(page);
  let releaseCreate!: () => void;
  const createHold = new Promise<void>((resolve) => {
    releaseCreate = resolve;
  });
  let releaseUploads!: () => void;
  const uploadHold = new Promise<void>((resolve) => {
    releaseUploads = resolve;
  });
  await page.route('**/api/transactions', async (route) => {
    if (isCreate(route.request().method(), route.request().url())) await createHold;
    await route.continue();
  });
  await page.route('**/api/transactions/*/attachments', async (route) => {
    if (route.request().method() === 'POST') await uploadHold;
    await route.continue();
  });

  try {
    await fillWithdrawal(page, `S3-07 anúncios ${randomUUID().slice(0, 8)}`, '990');
    await attach(page, ['a.pdf', 'b.pdf', 'c.pdf']);
    const confirm = await submitNewTransaction(page);
    const id = trackCreated(page);
    await confirm.getByRole('button', { name: /^Confirmar$/ }).click();

    await expect(flowStatus(page)).toHaveText('Salvando…');
    releaseCreate();
    await id;
    await expect(flowStatus(page)).toHaveText('Enviando anexos 1 de 3');
    await expect(page.getByRole('progressbar', { name: 'Envio dos anexos' })).toHaveAttribute(
      'aria-valuemax',
      '3'
    );
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /nova transação/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar envio', exact: true })).toBeEnabled();
    await expect(flowStatus(page)).toHaveText('Enviando anexos 1 de 3');
    releaseUploads();

    await expect(flowStatus(page)).toHaveText('Transação criada');
    await expect(page.getByRole('dialog', { name: /nova transação/i })).toHaveCount(0);
  } finally {
    releaseCreate();
    releaseUploads();
  }
});
