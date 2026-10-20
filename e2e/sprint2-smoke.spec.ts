import { createHash, createHmac, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { expect, test, type Page } from '@playwright/test';
import { login } from './helpers/auth';
import { createWithdrawal, editTransaction, openTransactionsPage } from './helpers/transactions';
import { E2E_KEYS } from './keys';

// Opt-in: this smoke requires real HIBP access and the default five-attempt policy.
test.skip(
  process.env.SPRINT2_SMOKE !== '1',
  'Run with SPRINT2_SMOKE=1, HIBP_ENABLED=true and AUTH_MAX_FAILURES=5'
);

async function uploads(page: Page) {
  return page.evaluate(async () => {
    type Share = { get: () => Promise<() => unknown> };
    const registry = (
      globalThis as typeof globalThis & {
        __FEDERATION__: {
          __SHARE__: Record<string, { default: Record<string, Record<string, Share>> }>;
        };
      }
    ).__FEDERATION__.__SHARE__;
    const stores = (await (
      await registry['@bytebank/shell'].default['@bytebank/stores']['0.1.0'].get()
    )()) as typeof import('@bytebank/stores');
    const state = stores.store.getState();
    return { ids: state.uploads.ids, entities: state.uploads.entities };
  });
}

test('real slow-network uploads show progress, keep two slots and cancel one without losing the others', async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== 'chromium', 'CDP network throttling is Chromium-only');
  test.setTimeout(90_000);
  await login(page);
  await openTransactionsPage(page);
  const endpoint = '/api/transactions/e2e-attachment-target/attachments';
  const previous = await page.request.get(endpoint);
  for (const { id } of await previous.json()) await page.request.delete(`${endpoint}/${id}`);
  await editTransaction(page, 'E2E Attachment Target');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 1024 * 1024,
    uploadThroughput: 128 * 1024,
  });
  const failures: string[] = [];
  const started: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/attachments'))
      started.push(request.url());
  });
  page.on('requestfailed', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/attachments'))
      failures.push(request.failure()?.errorText ?? '');
  });
  const samples: Awaited<ReturnType<typeof uploads>>[] = [];
  try {
    const pdf = Buffer.concat([
      Buffer.from('%PDF-1.4\n% S2-10 smoke\n'),
      Buffer.alloc(1024 * 1024, 65),
      Buffer.from('\n%%EOF\n'),
    ]);
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /área de upload de arquivos/i }).click();
    await (
      await chooser
    ).setFiles(
      ['a', 'b', 'c'].map((name) => ({
        name: `s210-${name}.pdf`,
        mimeType: 'application/pdf',
        buffer: pdf,
      }))
    );
    await expect
      .poll(async () => {
        const state = await uploads(page);
        samples.push(state);
        return Object.values(state.entities).filter((item) => item?.status === 'uploading').length;
      })
      .toBe(2);
    const initial = await uploads(page);
    expect(initial.ids).toHaveLength(3);
    expect(Object.values(initial.entities).map((item) => item?.status)).toEqual([
      'uploading',
      'uploading',
      'queued',
    ]);
    expect(started).toHaveLength(2);
    for (const file of ['a', 'b', 'c']) {
      await expect(
        page.getByRole('progressbar', { name: `Enviando s210-${file}.pdf`, exact: true })
      ).toBeVisible();
    }
    await expect
      .poll(async () => {
        const values = await page
          .getByRole('progressbar', { name: /Enviando s210-/ })
          .evaluateAll((bars) => bars.map((bar) => Number(bar.getAttribute('aria-valuenow'))));
        return values.some((value) => value > 0 && value < 100);
      })
      .toBe(true);
    await expect
      .poll(async () => {
        const state = await uploads(page);
        samples.push(state);
        return Object.values(state.entities).some(
          (item) => item && item.loaded > 0 && item.loaded < item.total
        );
      })
      .toBe(true);
    await page.getByRole('button', { name: 'Cancelar envio de s210-a.pdf', exact: true }).click();
    await expect.poll(() => failures.some((message) => /abort|cancel/i.test(message))).toBe(true);
    await expect
      .poll(
        async () => {
          const state = await uploads(page);
          samples.push(state);
          return Object.values(state.entities).filter((item) => item?.status === 'done').length;
        },
        { timeout: 45_000 }
      )
      .toBe(2);
    const final = await uploads(page);
    expect(Object.values(final.entities).map((item) => item?.status)).toEqual([
      'cancelled',
      'done',
      'done',
    ]);
    expect(
      samples.every(
        (state) =>
          Object.values(state.entities).filter((item) => item?.status === 'uploading').length <= 2
      )
    ).toBe(true);
    expect(started).toHaveLength(3);
    expect(failures).toHaveLength(1);
    const persisted = await page.request.get(endpoint);
    expect((await persisted.json()).map((item: { name: string }) => item.name).sort()).toEqual([
      's210-b.pdf',
      's210-c.pdf',
    ]);
    await testInfo.attach('slow-upload-evidence', {
      body: JSON.stringify(
        { initial, final, samples, failures, startedCount: started.length },
        null,
        2
      ),
      contentType: 'application/json',
    });
  } finally {
    await cdp.detach();
    const remaining = await page.request.get(endpoint);
    if (remaining.ok())
      for (const { id } of await remaining.json()) await page.request.delete(`${endpoint}/${id}`);
  }
});

test('hover alone preloads the transactions remote and first page without downloading them again on click', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.requestIdleCallback = () => 0;
    window.cancelIdleCallback = () => {};
  });
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await login(page);
  await expect(page.getByRole('button', { name: 'Nova transação', exact: true })).toBeEnabled();
  await page.waitForLoadState('networkidle');
  const expose = () =>
    requests.filter((url) => /__federation_expose_TransactionsPage.*\.js/.test(url));
  const firstPage = () =>
    requests.filter((url) => {
      const parsed = new URL(url);
      return parsed.pathname === '/api/transactions' && parsed.searchParams.get('_page') === '1';
    });
  expect(expose()).toHaveLength(0);
  const link = page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Transações', exact: true });
  const remoteReady = page.waitForResponse(
    (response) => /__federation_expose_TransactionsPage.*\.js/.test(response.url()) && response.ok()
  );
  const dataReady = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/transactions' &&
      new URL(response.url()).searchParams.get('_page') === '1' &&
      response.ok()
  );
  await page.mouse.move(0, 0);
  await link.hover();
  await (await remoteReady).finished();
  await (await dataReady).finished();
  expect(expose()).toHaveLength(1);
  expect(firstPage()).toHaveLength(1);
  await link.click();
  await expect(page.locator('#transactions-heading')).toBeVisible();
  await expect(page.getByText('E2E Uber Trip', { exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(expose()).toHaveLength(1);
  expect(firstPage()).toHaveLength(1);
  const timing = await page.evaluate(() =>
    performance
      .getEntriesByType('measure')
      .filter((entry) => /nav:click|mf:loadRemote/.test(entry.name))
      .map(({ name, duration }) => ({ name, duration }))
  );
  expect(timing.some((entry) => entry.name === 'nav:click → transactions:ready')).toBe(true);
  await testInfo.attach('hover-preload-evidence', {
    body: JSON.stringify(
      { remoteRequests: expose().length, firstPageRequests: firstPage().length, timing },
      null,
      2
    ),
    contentType: 'application/json',
  });
});

test('a leaked password is rejected through the live HIBP service and registration UI', async ({
  page,
}, testInfo) => {
  const password = 'password1234';
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
  const range = await page.request.get(`https://api.pwnedpasswords.com/range/${sha1.slice(0, 5)}`, {
    headers: { 'Add-Padding': 'true' },
  });
  expect(range.ok()).toBe(true);
  expect(
    (await range.text()).split('\n').some((line) => {
      const [suffix, count] = line.trim().split(':');
      return suffix === sha1.slice(5) && Number(count) > 0;
    })
  ).toBe(true);
  await page.goto('/register');
  await page.getByLabel('Nome', { exact: true }).fill('Smoke S2-10');
  await page
    .getByLabel('Email', { exact: true })
    .fill(`s210-breached-${randomUUID()}@bytebank.test`);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  const rejected = page.waitForResponse('**/api/auth/register');
  await page.getByRole('button', { name: /criar conta/i }).click();
  const response = await rejected;
  expect(response.status()).toBe(422);
  await expect(
    page.getByText('Esta senha já apareceu em vazamentos de dados. Escolha outra senha.')
  ).toBeVisible();
  await testInfo.attach('hibp-live-evidence', {
    body: JSON.stringify({
      rangeStatus: range.status(),
      registrationStatus: response.status(),
      issues: (await response.json()).issues,
    }),
    contentType: 'application/json',
  });
});

test('five wrong passwords lock the account and a correct password cannot bypass the lock', async ({
  page,
  request,
}, testInfo) => {
  const email = `s210-lock-${randomUUID()}@bytebank.test`;
  const password = `S210-${randomUUID()}!`;
  const created = await request.post('/api/auth/register', {
    data: { name: 'Smoke Lock', email, password },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgres://bytebank:bytebank@localhost:5432/bytebank',
  });
  const emailKey = `login:email:${createHmac('sha256', Buffer.from(E2E_KEYS.BLIND_INDEX_KEY, 'base64')).update(email).digest('base64url')}`;
  try {
    const { csrfToken } = await (await request.get('/api/auth/csrf')).json();
    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await request.post('/api/auth/callback/credentials', {
        headers: { 'X-Auth-Return-Redirect': '1' },
        form: { csrfToken, email, password: 'incorrect-password', callbackUrl: '/' },
      });
      expect((await response.json()).url).toContain('CredentialsSignin');
      const { rows } = await pool.query(
        'select failures, locked_until from auth_attempts where key = $1',
        [emailKey]
      );
      expect(rows[0].failures).toBe(attempt < 5 ? attempt : 0);
      if (attempt < 5) expect(rows[0].locked_until).toBeNull();
      else expect(new Date(rows[0].locked_until).getTime()).toBeGreaterThan(Date.now());
    }
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: /^Entrar$/i }).click();
    await expect(page).toHaveURL(/\/auth\/error\?.*code=rate_limited/);
    await expect(
      page.getByText('Muitas tentativas. Tente novamente em alguns minutos.', { exact: true })
    ).toBeVisible();
    const { rows } = await pool.query(
      'select failures, lock_count, locked_until > now() as locked from auth_attempts where key = $1',
      [emailKey]
    );
    expect(rows[0]).toMatchObject({ failures: 0, lock_count: 1, locked: true });
    await testInfo.attach('five-failures-evidence', {
      body: JSON.stringify(rows[0]),
      contentType: 'application/json',
    });
  } finally {
    await pool.query('delete from users where id = $1', [id]);
    await pool.query('delete from auth_attempts where key = $1', [emailKey]);
    await pool.end();
  }
});

test('registration rejects short passwords and returns 429 with Retry-After after ten attempts from one IP', async ({
  request,
  browserName,
}, testInfo) => {
  const ip = browserName === 'chromium' ? '198.51.100.210' : '198.51.100.211';
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgres://bytebank:bytebank@localhost:5432/bytebank',
  });
  try {
    const statuses = [];
    for (let attempt = 1; attempt <= 10; attempt++) {
      const response = await request.post('/api/auth/register', {
        headers: { 'x-forwarded-for': ip },
        data: {
          name: 'Smoke Short',
          email: `s210-${randomUUID()}@bytebank.test`,
          password: 'short',
        },
      });
      statuses.push(response.status());
      expect(response.status()).toBe(422);
    }
    const blocked = await request.post('/api/auth/register', {
      headers: { 'x-forwarded-for': ip },
      data: { name: 'Smoke Short', email: `s210-${randomUUID()}@bytebank.test`, password: 'short' },
    });
    expect(blocked.status()).toBe(429);
    expect(await blocked.json()).toEqual({ error: 'Muitas tentativas' });
    expect(Number(blocked.headers()['retry-after'])).toBeGreaterThan(0);
    await testInfo.attach('registration-limit-evidence', {
      body: JSON.stringify({
        statuses,
        blockedStatus: blocked.status(),
        retryAfter: blocked.headers()['retry-after'],
      }),
      contentType: 'application/json',
    });
  } finally {
    await pool.query('delete from auth_attempts where key = $1', [`register:ip:${ip}`]);
    await pool.end();
  }
});

test('creates, edits and deletes a transaction through the UI and keeps deletion after reload', async ({
  page,
}, testInfo) => {
  await login(page);
  const description = `S210 CRUD ${randomUUID().slice(0, 8)}`;
  const updated = `${description} updated`;
  await createWithdrawal(page, description, '1234');
  await page
    .getByRole('dialog', { name: 'Transação adicionada!' })
    .getByRole('button', { name: 'Fechar', exact: true })
    .last()
    .click();
  await openTransactionsPage(page);
  await editTransaction(page, description);
  await page.getByLabel('Descrição', { exact: true }).fill(updated);
  const edited = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      /\/api\/transactions\/[^/]+$/.test(new URL(response.url()).pathname)
  );
  await page.getByRole('button', { name: /atualizar transação/i }).click();
  expect((await edited).status()).toBe(200);
  await page
    .getByRole('dialog', { name: 'Transação atualizada' })
    .getByRole('button', { name: 'Fechar', exact: true })
    .last()
    .click();
  await expect(page.getByText(updated, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Delete transaction: ${updated}`, exact: true }).click();
  const removed = page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' &&
      /\/api\/transactions\/[^/]+$/.test(new URL(response.url()).pathname)
  );
  await page
    .getByRole('dialog', { name: 'Excluir transação', exact: true })
    .getByRole('button', { name: 'Excluir', exact: true })
    .click();
  expect((await removed).status()).toBe(204);
  await expect(page.getByText(updated, { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#transactions-heading')).toBeVisible();
  await expect(page.getByText('E2E Attachment Target', { exact: true })).toBeVisible();
  await expect(page.getByText(updated, { exact: true })).toHaveCount(0);
  await testInfo.attach('crud-evidence', {
    body: JSON.stringify({ patchStatus: 200, deleteStatus: 204, absentAfterReload: true }),
    contentType: 'application/json',
  });
});
