import { createDecipheriv, createHmac, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { decode, encode } from 'next-auth/jwt';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { login, logout } from './helpers/auth';
import { E2E_KEYS } from './keys';

// Enrollment secrets and recovery codes must not appear in screenshots/traces/videos.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(120_000);
const base = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const origin = new URL(base).origin;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://bytebank:bytebank@localhost:5432/bytebank',
});
test.afterAll(async () => {
  await pool.end();
});

function totp(secret: string, step = Math.floor(Date.now() / 30_000)): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of secret.replace(/=/g, '').toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error('Invalid test TOTP secret');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', bytes).update(counter).digest();
  return String(
    (digest.readUInt32BE(digest[digest.length - 1] & 15) & 0x7fffffff) % 1_000_000
  ).padStart(6, '0');
}
async function account(request: APIRequestContext) {
  const password = `S310-${randomUUID()}!`;
  const email = `mfa-${randomUUID()}@bytebank.test`;
  const response = await request.post('/api/auth/register', {
    data: { name: 'Autenticador E2E', email, password },
  });
  expect(response.status()).toBe(201);
  const data = await response.json();
  return { id: data.id as string, name: data.name as string, email, password };
}
async function cleanup(id: string) {
  await pool.query('delete from users where id = $1', [id]);
  await pool.query('delete from auth_attempts where key = $1', [`mfa:${id}`]);
}
async function credentials(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Senha', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: /^Entrar$/i }).click();
}
async function factor(page: Page, code: string) {
  await page.getByLabel('Código de autenticação', { exact: true }).fill(code);
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/api/auth/callback/credentials' &&
      r.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Verificar código', exact: true }).click();
  await (await response).finished();
}
async function settings(page: Page) {
  await page.getByRole('button', { name: 'Abrir menu do usuário' }).click();
  await page.getByRole('menuitem', { name: 'Segurança da conta', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/security$/);
  await expect(
    page.getByRole('heading', { name: 'Segurança da conta', exact: true })
  ).toBeVisible();
}

test('enrolls with a decoded QR, requires TOTP before a session, consumes recovery once and disables securely', async ({
  page,
  request,
}, testInfo) => {
  const user = await account(request);
  try {
    await login(page, user);
    await settings(page);
    await page.getByLabel('Senha atual', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Configurar autenticador', exact: true }).click();
    const manual = page.getByLabel('Chave manual', { exact: true });
    await expect(manual).toBeVisible();
    const secret = (await manual.textContent())!.trim();
    const image = page.getByRole('img', { name: 'QR code para configurar o autenticador' });
    await expect(image).toHaveAttribute('src', /^data:image\/png;base64,/);
    const png = PNG.sync.read(
      Buffer.from((await image.getAttribute('src'))!.split(',')[1], 'base64')
    );
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(Boolean(decoded)).toBe(true);
    if (!decoded) throw new Error('QR code not decodable');
    const uri = new URL(decoded.data);
    expect(uri.protocol).toBe('otpauth:');
    expect(uri.searchParams.get('secret') === secret).toBe(true);
    expect(uri.searchParams.get('period')).toBe('30');
    expect(uri.searchParams.get('digits')).toBe('6');
    const pending = (
      await pool.query('select mfa_enabled, mfa_pending_secret_enc from users where id = $1', [
        user.id,
      ])
    ).rows[0];
    expect(pending.mfa_enabled).toBe(false);
    expect(
      Boolean(pending.mfa_pending_secret_enc) && !pending.mfa_pending_secret_enc.includes(secret)
    ).toBe(true);
    // Retain an Auth.js response created with the old cookie until activation has revoked it.
    let releaseOldPoll!: () => void;
    let oldPollReady!: () => void;
    const released = new Promise<void>((resolve) => {
      releaseOldPoll = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      oldPollReady = resolve;
    });
    let retained = false;
    await page.route('**/api/auth/session', async (route) => {
      if (retained) return route.continue();
      retained = true;
      const response = await route.fetch();
      oldPollReady();
      await released;
      await route.fulfill({ response });
    });
    const oldPoll = page.evaluate(() => fetch('/api/auth/session').then((r) => r.json()));
    await ready;
    await page.getByLabel('Código do autenticador', { exact: true }).fill(totp(secret));
    await page
      .getByRole('button', { name: 'Ativar verificação em duas etapas', exact: true })
      .click();
    const codesPanel = page.getByRole('region', { name: 'Códigos de recuperação', exact: true });
    await expect(codesPanel).toBeVisible();
    releaseOldPoll();
    await oldPoll;
    // Advance only the signed fixture claims past S2-07's five-minute validation cache.
    const cookie = (await page.context().cookies()).find(
      (item) => item.name === 'authjs.session-token'
    )!;
    const jwtSecret =
      process.env.AUTH_SECRET ?? 'bytebank-e2e-auth-secret-bytebank-e2e-auth-secret';
    const token = await decode({ token: cookie.value, secret: jwtSecret, salt: cookie.name });
    const checkedAt = Date.now() - 6 * 60_000;
    const agedCookie = await encode({
      token: { ...token, authTime: checkedAt, svCheckedAt: checkedAt },
      secret: jwtSecret,
      salt: cookie.name,
    });
    await page.context().addCookies([{ ...cookie, value: agedCookie }]);
    // Poll the revoked session while recovery codes are still being delivered.
    const revokedSession = await (await page.request.get('/api/auth/session')).json();
    expect(Boolean(revokedSession?.user)).toBe(false);
    const expiredPoll = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/auth/session'
    );
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await (await expiredPoll).finished();
    await expect(codesPanel).toBeVisible();
    const recovery = await codesPanel.locator('code').allTextContents();
    expect(recovery.length).toBe(10);
    await expect(manual).toHaveCount(0);
    const state = (
      await pool.query(
        'select mfa_enabled, mfa_secret_enc, mfa_pending_secret_enc, session_version from users where id = $1',
        [user.id]
      )
    ).rows[0];
    expect(state.mfa_enabled).toBe(true);
    expect(state.session_version).toBe(1);
    expect(state.mfa_pending_secret_enc).toBeNull();
    const payload = Buffer.from(state.mfa_secret_enc, 'base64url');
    const keyMap = new Map(
      E2E_KEYS.DATA_ENCRYPTION_KEYS.split(',').map((entry) => {
        const [id, key] = entry.split(':');
        return [Number(id), Buffer.from(key, 'base64')];
      })
    );
    const decipher = createDecipheriv(
      'aes-256-gcm',
      keyMap.get(payload[1])!,
      payload.subarray(2, 14)
    );
    decipher.setAuthTag(payload.subarray(14, 30));
    decipher.setAAD(Buffer.from(`user:${user.id}:mfa`));
    expect(
      Buffer.concat([decipher.update(payload.subarray(30)), decipher.final()]).toString() === secret
    ).toBe(true);
    const hashes = (
      await pool.query('select hash from mfa_recovery_codes where user_id = $1', [user.id])
    ).rows;
    expect(hashes.length).toBe(10);
    expect(
      hashes.every((row) => /^\$2[aby]\$12\$/.test(row.hash) && !recovery.includes(row.hash))
    ).toBe(true);
    expect(
      Number(
        (await pool.query('select count(*) from auth_sessions where user_id = $1', [user.id]))
          .rows[0].count
      )
    ).toBe(0);
    await page.getByRole('button', { name: 'Salvei os códigos. Entrar novamente' }).click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await credentials(page, user);
    await expect(page.getByRole('heading', { name: 'Verificação em duas etapas' })).toBeVisible();
    const session = await (await page.request.get('/api/auth/session')).json();
    expect(Boolean(session?.user)).toBe(false);
    await factor(page, totp(secret, Math.floor(Date.now() / 30_000) + 1));
    await expect(page).toHaveURL(/\/$/);
    await logout(page);
    await credentials(page, user);
    await factor(page, recovery[0]);
    await expect(page).toHaveURL(/\/$/);
    await logout(page);
    await credentials(page, user);
    await factor(page, recovery[0]);
    await expect(page.getByRole('alert').filter({ hasText: 'Código inválido' })).toContainText(
      'Código inválido ou já utilizado'
    );
    expect(Boolean((await (await page.request.get('/api/auth/session')).json())?.user)).toBe(false);
    await factor(page, recovery[1]);
    await expect(page).toHaveURL(/\/$/);
    await settings(page);
    await expect(page.getByRole('status')).toContainText('Códigos de recuperação restantes: 8');
    await page.getByLabel('Senha atual', { exact: true }).fill(user.password);
    await page.getByLabel('Código de autenticação', { exact: true }).fill(recovery[2]);
    await page
      .getByRole('button', { name: 'Desativar MFA e encerrar sessões', exact: true })
      .click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await login(page, user);
    const disabled = (
      await pool.query(
        'select mfa_enabled, mfa_secret_enc, session_version from users where id = $1',
        [user.id]
      )
    ).rows[0];
    expect(disabled).toEqual({ mfa_enabled: false, mfa_secret_enc: null, session_version: 2 });
    await testInfo.attach('mfa-validation', {
      body: JSON.stringify({
        decodedQr: true,
        encryptedSecret: true,
        recoveryHashes: 10,
        singleUseRecovery: true,
        noSessionBeforeFactor: true,
        disabledWithProof: true,
      }),
      contentType: 'application/json',
    });
  } finally {
    await cleanup(user.id);
  }
});

test('blocks on the fifth wrong factor and does not accept a correct recovery code while locked', async ({
  page,
  request,
}) => {
  const user = await account(request);
  try {
    await login(page, user);
    const setup = await page.request.post('/api/auth/mfa/setup', {
      headers: { Origin: origin },
      data: { password: user.password },
    });
    expect(setup.status()).toBe(200);
    const { secret } = await setup.json();
    const enabled = await page.request.post('/api/auth/mfa/enable', {
      headers: { Origin: origin },
      data: { code: totp(secret) },
    });
    expect(enabled.status()).toBe(200);
    const { recoveryCodes } = await enabled.json();
    await logout(page);
    await credentials(page, user);
    const step = Math.floor(Date.now() / 30_000);
    const valid = new Set([-1, 0, 1].map((delta) => totp(secret, step + delta)));
    const wrong = Array.from({ length: 10 }, (_, i) => String(i).padStart(6, '0')).find(
      (token) => !valid.has(token)
    )!;
    for (let i = 0; i < 5; i++) {
      await factor(page, wrong);
      if (i < 4) {
        await expect(page.getByRole('alert').filter({ hasText: 'Código inválido' })).toContainText(
          'Código inválido'
        );
        await expect(
          page.getByRole('button', { name: 'Verificar código', exact: true })
        ).toBeEnabled();
      }
    }
    await expect(page).toHaveURL(/\/auth\/error\?.*code=rate_limited/);
    const lock = (
      await pool.query(
        'select lock_count, locked_until > now() as locked from auth_attempts where key = $1',
        [`mfa:${user.id}`]
      )
    ).rows[0];
    expect(lock).toEqual({ lock_count: 0, locked: true });
    const { csrfToken } = await (await request.get('/api/auth/csrf')).json();
    const blocked = await request.post('/api/auth/callback/credentials', {
      headers: { 'X-Auth-Return-Redirect': '1' },
      form: { csrfToken, email: user.email, password: user.password, totp: recoveryCodes[0] },
    });
    expect(String((await blocked.json()).url).includes('rate_limited')).toBe(true);
    expect(
      Number(
        (await pool.query('select count(*) from auth_sessions where user_id = $1', [user.id]))
          .rows[0].count
      )
    ).toBe(0);
  } finally {
    await cleanup(user.id);
  }
});

test('requires authentication, rejects cross-site/spoofed enrollment and does not cache status', async ({
  page,
  request,
}) => {
  expect((await request.get('/api/auth/mfa')).status()).toBe(401);
  await login(page);
  const status = await page.request.get('/api/auth/mfa');
  expect(status.headers()['cache-control']).toContain('no-store');
  expect(Object.keys(await status.json()).sort()).toEqual([
    'canEnroll',
    'enabled',
    'recoveryCodesRemaining',
  ]);
  expect(
    (
      await page.request.post('/api/auth/mfa/setup', {
        headers: { Origin: 'https://evil.test' },
        data: { password: 'not-used' },
      })
    ).status()
  ).toBe(403);
  expect(
    (
      await page.request.post('/api/auth/mfa/setup', {
        headers: { Origin: origin },
        data: { password: 'not-used', userId: 'someone-else' },
      })
    ).status()
  ).toBe(422);
});
