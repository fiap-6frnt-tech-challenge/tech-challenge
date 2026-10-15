import { expect, test, type Page } from '@playwright/test';
import { login } from './helpers/auth';
import {
  createWithdrawal,
  submitWithdrawal,
  editTransaction,
  openTransactionsPage,
} from './helpers/transactions';

async function clientState(page: Page, action: 'read' | 'enqueue' | 'logout' = 'read') {
  return page.evaluate(async (action) => {
    type Share = { get: () => Promise<() => unknown> };
    const registry = (
      globalThis as typeof globalThis & {
        __FEDERATION__: {
          __SHARE__: Record<string, { default: Record<string, Record<string, Share>> }>;
        };
      }
    ).__FEDERATION__.__SHARE__;
    async function resolve(name: string) {
      const descriptor = registry['@bytebank/shell'].default[name]['0.1.0'];
      return (await descriptor.get())();
    }
    const stores = (await resolve('@bytebank/stores')) as typeof import('@bytebank/stores');
    const { queryClient } = (await resolve(
      '@bytebank/api-client'
    )) as typeof import('@bytebank/api-client');
    if (action === 'enqueue') {
      stores.store.dispatch(stores.showFeedback({ type: 'info', title: 'Primeiro aviso' }));
      stores.store.dispatch(stores.showFeedback({ type: 'info', title: 'Segundo aviso' }));
    }
    if (action === 'logout') {
      queryClient.setQueryData(['s204-private-probe'], { private: true });
      stores.store.dispatch(stores.logout.pending('s204-e2e'));
    }
    const state = stores.store.getState();
    return {
      authenticated: state.auth.isAuthenticated,
      notifications: stores.selectAllNotifications(state),
      notificationIds: state.notifications.ids,
      uploads: stores.selectAllUploads(state),
      uploadIds: state.uploads.ids,
      queryCount: queryClient.getQueryCache().getAll().length,
      mutationCount: queryClient.getMutationCache().getAll().length,
    };
  }, action);
}

test('does not restore feedback or cache when a pending transaction fails after logout', async ({
  page,
}) => {
  await login(page);
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/transactions', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await hold;
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'S2-04 delayed rejection' }),
    });
  });
  try {
    const started = page.waitForRequest(
      (request) =>
        request.method() === 'POST' && new URL(request.url()).pathname === '/api/transactions'
    );
    await submitWithdrawal(page, 'S2-04 delayed mutation', '100');
    await started;
    const cleared = await clientState(page, 'logout');
    expect(cleared.queryCount).toBe(0);
    await expect(page.getByRole('dialog', { name: /nova transação/i })).toHaveCount(0);
    const response = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/transactions'
    );
    release();
    await (await response).finished();
    const after = await clientState(page);
    expect(after.notifications).toEqual([]);
    expect(after.queryCount).toBe(0);
    expect(after.mutationCount).toBe(0);
  } finally {
    release();
  }
});

test('shows one success per domain event, dismisses FIFO notifications and disables production DevTools', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const target = window as typeof window & {
      reduxDevtoolsConnections: number;
      __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: unknown;
      __REDUX_DEVTOOLS_EXTENSION__?: unknown;
    };
    target.reduxDevtoolsConnections = 0;
    const compose = () => {
      target.reduxDevtoolsConnections++;
      return (...enhancers: Array<(value: unknown) => unknown>) =>
        (createStore: unknown) =>
          enhancers.reduceRight((next, enhance) => enhance(next), createStore);
    };
    target.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = compose;
    target.__REDUX_DEVTOOLS_EXTENSION__ = compose;
  });
  await login(page);
  await createWithdrawal(page, `S2-04 notification ${testInfo.project.name}`, '100');
  const snapshot = await clientState(page);
  expect(snapshot.notifications).toHaveLength(1);
  expect(snapshot.notificationIds).toHaveLength(1);
  expect(snapshot.notifications[0].type).toBe('success');
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { reduxDevtoolsConnections: number }).reduxDevtoolsConnections
    )
  ).toBe(0);
  await page
    .getByRole('dialog', { name: 'Transação adicionada!' })
    .getByRole('button', { name: 'Fechar', exact: true })
    .last()
    .click();
  await expect.poll(async () => (await clientState(page)).notifications.length).toBe(0);

  await clientState(page, 'enqueue');
  await expect(page.getByRole('dialog', { name: 'Primeiro aviso' })).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Primeiro aviso' })
    .getByRole('button', { name: 'OK', exact: true })
    .click();
  await expect(page.getByRole('dialog', { name: 'Segundo aviso' })).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Segundo aviso' })
    .getByRole('button', { name: 'OK', exact: true })
    .click();
  await expect.poll(async () => (await clientState(page)).notifications.length).toBe(0);
});

test('logout cancels active uploads, drops queued work and clears both client stores', async ({
  page,
}, testInfo) => {
  await login(page);
  await openTransactionsPage(page);
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started: string[] = [];
  const failures: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/attachments'))
      started.push(request.url());
  });
  page.on('requestfailed', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/attachments'))
      failures.push(request.failure()?.errorText ?? '');
  });
  await page.route('**/api/transactions/*/attachments', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await hold;
    try {
      await route.continue();
    } catch {
      /* Already aborted by logout. */
    }
  });
  try {
    await editTransaction(page, 'E2E Attachment Target');
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /área de upload de arquivos/i }).click();
    await (
      await chooser
    ).setFiles(
      ['a', 'b', 'c'].map((name) => ({
        name: `${name}.pdf`,
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n% S2-04 cancellation fixture\n%%EOF\n'),
      }))
    );
    await expect.poll(() => started.length).toBe(2);
    const before = await clientState(page);
    expect(before.uploads.map((item) => item.status)).toEqual(['uploading', 'uploading', 'queued']);
    const after = await clientState(page, 'logout');
    expect(after.authenticated).toBe(false);
    expect(after.uploadIds).toEqual([]);
    expect(after.notificationIds).toEqual([]);
    expect(after.queryCount).toBe(0);
    expect(after.mutationCount).toBe(0);
    await expect.poll(() => failures.length).toBe(2);
    expect(failures.every((message) => /abort|cancel/i.test(message))).toBe(true);
    release();
    await expect.poll(async () => (await clientState(page)).queryCount).toBe(0);
    expect((await clientState(page)).notifications).toEqual([]);
    expect(started).toHaveLength(2);
    await testInfo.attach('normalized-upload-logout', {
      body: JSON.stringify({ before, after, failures }, null, 2),
      contentType: 'application/json',
    });
  } finally {
    release();
  }
});
