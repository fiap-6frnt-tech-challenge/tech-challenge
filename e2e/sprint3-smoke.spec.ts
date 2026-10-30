import { createDecipheriv, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { expect, test } from '@playwright/test';
import { E2E_OTHER_USER, E2E_USER } from './globalSetup';
import { E2E_KEYS } from './keys';
import { login } from './helpers/auth';

declare global {
  interface Window {
    smokeCsp: Array<{ directive: string; disposition: string }>;
  }
}

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const origin = new URL(baseURL).origin;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://bytebank:bytebank@localhost:5432/bytebank',
});
test.afterAll(() => pool.end());

// Inspect persistence independently of the production Cipher adapter.
function decrypt(value: Buffer | string, context: string): Buffer {
  const payload = typeof value === 'string' ? Buffer.from(value, 'base64url') : value;
  const keys = new Map(
    E2E_KEYS.DATA_ENCRYPTION_KEYS.split(',').map((entry) => {
      const [id, key] = entry.split(':');
      return [Number(id), Buffer.from(key, 'base64')] as const;
    })
  );
  const decipher = createDecipheriv('aes-256-gcm', keys.get(payload[1])!, payload.subarray(2, 14), {
    authTagLength: 16,
  });
  decipher.setAuthTag(payload.subarray(14, 30));
  decipher.setAAD(Buffer.from(context));
  return Buffer.concat([decipher.update(payload.subarray(30)), decipher.final()]);
}

test('proves encrypted user and attachment persistence, authenticated download and owner isolation', async ({
  page,
  browser,
  request,
}, testInfo) => {
  await login(page);
  const user = (
    await pool.query('select email_enc, name_enc from users where id = $1', [E2E_USER.id])
  ).rows[0];
  expect(Boolean(user.email_enc) && !user.email_enc.includes(E2E_USER.email)).toBe(true);
  expect(Boolean(user.name_enc) && !user.name_enc.includes(E2E_USER.name)).toBe(true);
  expect(decrypt(user.email_enc, `user:${E2E_USER.id}:email`).toString() === E2E_USER.email).toBe(
    true
  );
  expect(decrypt(user.name_enc, `user:${E2E_USER.id}:name`).toString() === E2E_USER.name).toBe(
    true
  );

  const created = await page.request.post('/api/transactions', {
    headers: { Origin: origin },
    data: {
      type: 'withdrawal',
      category: 'other',
      amount: 1,
      date: '2026-07-02',
      description: 'E2E S3 encrypted attachment',
    },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const path = `/api/transactions/${id}/attachments`;
  const other = await browser.newContext({ baseURL });
  let attachmentId: string | undefined;
  try {
    const marker = `S3 smoke ${randomUUID()}`;
    const plain = Buffer.from(`%PDF-1.4\n% ${marker}\n1 0 obj\n<<>>\nendobj\n%%EOF\n`);
    const uploaded = await page.request.post(path, {
      headers: { Origin: origin },
      multipart: { file: { name: 'smoke-recibo.pdf', mimeType: 'application/pdf', buffer: plain } },
    });
    expect(uploaded.status()).toBe(201);
    const dto = await uploaded.json();
    attachmentId = dto.id;
    expect(Object.keys(dto).sort()).toEqual(['downloadUrl', 'id', 'mimeType', 'name', 'size']);
    const stored = (
      await pool.query('select url, name, enc_version from attachments where id = $1', [dto.id])
    ).rows[0];
    expect(stored.enc_version).toBe(1);
    expect(!stored.name.includes('smoke-recibo.pdf')).toBe(true);
    const ref = decrypt(stored.url, `attachment:${dto.id}:ref`).toString();
    expect(stored.url !== ref).toBe(true);
    const raw = await readFile(resolve(process.env.LOCAL_UPLOADS_DIR ?? '.uploads', ref));
    expect(raw.includes(marker) || raw.subarray(0, 5).equals(Buffer.from('%PDF-'))).toBe(false);
    expect(raw.byteLength).toBe(plain.byteLength + 30);
    expect(decrypt(raw, `attachment:${dto.id}`).equals(plain)).toBe(true);
    const download = await page.request.get(dto.downloadUrl);
    expect(download.status()).toBe(200);
    expect(download.headers()['cache-control']).toBe('private, no-store');
    expect((await download.body()).equals(plain)).toBe(true);
    expect((await request.get(dto.downloadUrl)).status()).toBe(401);
    await login(await other.newPage(), E2E_OTHER_USER);
    expect((await other.request.get(dto.downloadUrl)).status()).toBe(404);
    const disguised = await page.request.post(path, {
      headers: { Origin: origin },
      multipart: {
        file: {
          name: 'foto.png',
          mimeType: 'image/png',
          buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
        },
      },
    });
    expect(disguised.status()).toBe(400);
    await testInfo.attach('encrypted-persistence', {
      body: JSON.stringify({
        encryptedPii: true,
        encryptedMetadata: true,
        encryptedFile: true,
        authenticatedRoundTrip: true,
        anonymous: 401,
        foreignOwner: 404,
        disguisedExecutable: 400,
      }),
      contentType: 'application/json',
    });
  } finally {
    try {
      await other.close();
      if (attachmentId)
        expect((await page.request.delete(`${path}/${attachmentId}`)).status()).toBe(204);
    } finally {
      expect((await page.request.delete(`/api/transactions/${id}`)).status()).toBe(204);
    }
  }
});

test('enforces security headers and CSP while navigating across MFEs without document reload', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.smokeCsp = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.smokeCsp.push({
        directive: event.effectiveDirective,
        disposition: event.disposition,
      });
    });
  });
  const reports: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/csp-report') reports.push(request.method());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  const headers = response!.headers();
  expect(headers).toMatchObject({
    'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'cross-origin-opener-policy': 'same-origin',
  });
  expect(headers['content-security-policy']).toContain("'strict-dynamic'");
  expect(headers['content-security-policy']).toMatch(/'nonce-[^']+'/);
  expect(headers['content-security-policy']).not.toContain("'unsafe-eval'");
  expect(headers['content-security-policy-report-only']).toBeUndefined();
  await expect(page.getByRole('link', { name: 'Todas as transações', exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  const before = await page.evaluate(() => performance.timeOrigin);
  const documents: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'document') documents.push(new URL(request.url()).pathname);
  });
  await page.getByRole('link', { name: 'Todas as transações', exact: true }).click();
  await expect(page.locator('#transactions-heading')).toBeVisible();
  await expect(page.getByText('E2E Uber Trip', { exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(before);
  expect(documents).toEqual([]);
  expect(await page.evaluate(() => window.smokeCsp)).toEqual([]);
  expect(reports).toEqual([]);
  expect(errors).toEqual([]);
  await testInfo.attach('boundary-and-navigation', {
    body: JSON.stringify({
      enforcedCsp: true,
      violations: 0,
      reports: 0,
      documentReloads: 0,
      securityHeaders: true,
    }),
    contentType: 'application/json',
  });
});

test('rejects cross-site writes without changing a transaction and returns a real conditional 304', async ({
  page,
}, testInfo) => {
  await login(page);
  const path = '/api/transactions/e2e-uber-trip';
  const before = (
    await pool.query('select description from transactions where id = $1', ['e2e-uber-trip'])
  ).rows[0].description;
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    const response = await page.request.fetch(method === 'POST' ? '/api/transactions' : path, {
      method,
      headers: { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' },
      ...(method !== 'DELETE' ? { data: { description: 'forged write' } } : {}),
    });
    expect(response.status()).toBe(403);
  }
  expect(
    (await pool.query('select description from transactions where id = $1', ['e2e-uber-trip']))
      .rows[0].description
  ).toBe(before);
  const initial = await page.request.get('/api/transactions/overview');
  expect(initial.status()).toBe(200);
  expect(initial.headers()['cache-control']).toBe('private, no-cache');
  const conditional = await page.request.get('/api/transactions/overview', {
    headers: { 'If-None-Match': initial.headers().etag },
  });
  expect(conditional.status()).toBe(304);
  expect((await conditional.body()).byteLength).toBe(0);
  await testInfo.attach('csrf-and-conditional-cache', {
    body: JSON.stringify({
      rejectedWrites: 3,
      unchangedData: true,
      conditionalStatus: 304,
      bodyBytes: 0,
    }),
    contentType: 'application/json',
  });
});
