import { createHmac, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { E2E_OTHER_USER, E2E_USER, type E2EUser } from './globalSetup';
import { E2E_KEYS } from './keys';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const origin = new URL(baseURL).origin;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://bytebank:bytebank@localhost:5432/bytebank',
});
test.afterAll(() => pool.end());

async function authenticate(api: APIRequestContext, user: E2EUser) {
  const { csrfToken } = await (await api.get('/api/auth/csrf')).json();
  const response = await api.post('/api/auth/callback/credentials', {
    headers: { 'X-Auth-Return-Redirect': '1', Origin: origin },
    form: { csrfToken, email: user.email, password: user.password, callbackUrl: '/' },
  });
  expect(response.ok()).toBe(true);
  expect(new URL((await response.json()).url, baseURL).pathname).toBe('/');
  expect((await (await api.get('/api/auth/session')).json()).user.id).toBe(user.id);
}

test('IDOR hides another user transaction on GET, PATCH and DELETE without changing owner data', async ({
  playwright,
}) => {
  const owner = await playwright.request.newContext({ baseURL });
  const other = await playwright.request.newContext({ baseURL });
  let id: string | undefined;
  try {
    await authenticate(owner, E2E_USER);
    await authenticate(other, E2E_OTHER_USER);
    const created = await owner.post('/api/transactions', {
      data: {
        type: 'withdrawal',
        category: 'other',
        amount: 12.34,
        date: '2026-07-02',
        description: `S405 owner ${randomUUID()}`,
      },
    });
    expect(created.status()).toBe(201);
    const original = await created.json();
    id = original.id;
    const path = `/api/transactions/${id}`;
    expect((await owner.get(path)).status()).toBe(200);
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      const denied = await other.fetch(path, {
        method,
        ...(method === 'PATCH' ? { data: { description: 'Foreign mutation' } } : {}),
      });
      expect(denied.status(), method).toBe(404);
      expect(await denied.text()).not.toContain(original.description);
      const unchanged = await owner.get(path);
      expect(unchanged.status()).toBe(200);
      expect(await unchanged.json()).toEqual(original);
    }
  } finally {
    try {
      if (id) expect((await owner.delete(`/api/transactions/${id}`)).status()).toBe(204);
    } finally {
      await owner.dispose();
      await other.dispose();
    }
  }
});

test('mass assignment rejects a supplied userId without persisting the transaction', async ({
  playwright,
}) => {
  const api = await playwright.request.newContext({ baseURL });
  const description = `S405 mass assignment ${randomUUID()}`;
  try {
    await authenticate(api, E2E_USER);
    const rejected = await api.post('/api/transactions', {
      data: {
        userId: E2E_OTHER_USER.id,
        type: 'deposit',
        category: 'salary',
        amount: 99,
        date: '2026-07-02',
        description,
      },
    });
    expect(rejected.status()).toBe(422);
    expect(
      (await pool.query('select id from transactions where description = $1', [description])).rows
    ).toEqual([]);
  } finally {
    await pool.query('delete from transactions where description = $1', [description]);
    await api.dispose();
  }
});

test('wrong passwords lock the account and the correct password cannot create a session', async ({
  page,
  request,
}) => {
  const maxFailures = Number(process.env.AUTH_MAX_FAILURES ?? '3');
  expect(Number.isInteger(maxFailures) && maxFailures > 0).toBe(true);
  const email = `s405-lock-${randomUUID()}@bytebank.test`;
  const password = `S405-${randomUUID()}!`;
  const emailKey = `login:email:${createHmac('sha256', Buffer.from(E2E_KEYS.BLIND_INDEX_KEY, 'base64')).update(email).digest('base64url')}`;
  let id: string | undefined;
  try {
    const created = await request.post('/api/auth/register', {
      data: { name: 'S405 Lock', email, password },
    });
    expect(created.status()).toBe(201);
    id = (await created.json()).id;
    const { csrfToken } = await (await request.get('/api/auth/csrf')).json();
    for (let attempt = 1; attempt <= maxFailures; attempt++) {
      const response = await request.post('/api/auth/callback/credentials', {
        headers: { 'X-Auth-Return-Redirect': '1' },
        form: { csrfToken, email, password: 'incorrect-password', callbackUrl: '/' },
      });
      expect((await response.json()).url).toContain('CredentialsSignin');
      const { rows } = await pool.query(
        'select failures, locked_until from auth_attempts where key = $1',
        [emailKey]
      );
      expect(rows[0].failures).toBe(attempt < maxFailures ? attempt : 0);
      if (attempt < maxFailures) expect(rows[0].locked_until).toBeNull();
      else expect(new Date(rows[0].locked_until).getTime()).toBeGreaterThan(Date.now());
    }
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    const submit = page.getByRole('button', { name: /^Entrar$/i });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page).toHaveURL(/\/auth\/error\?.*code=rate_limited/);
    await expect(
      page.getByText('Muitas tentativas. Tente novamente em alguns minutos.', { exact: true })
    ).toBeVisible();
    expect((await page.request.get('/api/transactions/overview')).status()).toBe(401);
    const { rows } = await pool.query(
      'select lock_count, locked_until > now() as locked from auth_attempts where key = $1',
      [emailKey]
    );
    expect(rows[0]).toMatchObject({ lock_count: 1, locked: true });
  } finally {
    try {
      if (id) await pool.query('delete from users where id = $1', [id]);
    } finally {
      await pool.query('delete from auth_attempts where key = $1', [emailKey]);
    }
  }
});
