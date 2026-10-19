import { expect, test, type BrowserContext } from '@playwright/test';
import { decode, encode } from 'next-auth/jwt';
import { login, logout } from './helpers/auth';

// Re-sign only the test user's cookie with the known local E2E secret. This exercises
// the real server's five-minute boundary without a server clock override or sleeps.
async function checkedFiveMinutesAgo(context: BrowserContext) {
  const cookie = (await context.cookies()).find((entry) =>
    /^(?:__Secure-)?authjs\.session-token$/.test(entry.name)
  );
  expect(cookie).toBeDefined();
  const secret = process.env.AUTH_SECRET ?? 'bytebank-e2e-auth-secret-bytebank-e2e-auth-secret';
  const token = await decode({ token: cookie!.value, secret, salt: cookie!.name });
  expect(token).not.toBeNull();
  const past = Date.now() - 300_001;
  const value = await encode({
    token: { ...token!, authTime: past, svCheckedAt: past },
    secret,
    salt: cookie!.name,
    maxAge: 8 * 60 * 60,
  });
  return { ...cookie!, value };
}

test('warns before idle expiry, focuses continue, renews activity and logs out with no private back navigation', async ({
  page,
}) => {
  await page.clock.install();
  await login(page);
  await expect(page.getByRole('button', { name: 'Nova transação', exact: true })).toBeVisible();
  await page.clock.fastForward(14 * 60_000 + 1000);
  const warning = page.getByRole('alertdialog', { name: 'Sua sessão será encerrada' });
  await expect(warning).toBeVisible();
  const keep = warning.getByRole('button', { name: 'Continuar conectado' });
  await expect(keep).toBeFocused();
  await keep.click();
  await expect(warning).toHaveCount(0);
  await page.clock.fastForward(14 * 60_000 + 1000);
  await expect(warning).toBeVisible();
  await page.clock.fastForward(60_000);
  await expect(page).toHaveURL(/\/login\?reason=inactive/);
  await expect(page.getByRole('status')).toHaveText('Sua sessão foi encerrada por inatividade.');
  await page.goBack();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toHaveCount(0);
});

test('clears the session and shows the expiry notice when a private API returns 401', async ({
  page,
}) => {
  await login(page);
  await page.route('**/api/transactions/overview', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Não autenticado' }),
    })
  );
  await page.reload();
  await expect(page).toHaveURL(/\/login\?reason=session-expired/);
  await expect(page.getByRole('status')).toHaveText('Sua sessão expirou. Entre novamente.');
});

test('revokes every device and rejects another independent session at its next server check', async ({
  browser,
  page,
}) => {
  const other = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
  });
  try {
    await login(page);
    const second = await other.newPage();
    await login(second);
    const agedCookie = await checkedFiveMinutesAgo(other);
    await page.getByRole('button', { name: 'Abrir menu do usuário' }).click();
    await page.getByRole('menuitem', { name: 'Sair de todos os dispositivos' }).click();
    await expect(page).toHaveURL(/\/login/);
    expect(
      (
        await other.request.get('/api/transactions/overview', {
          headers: { Cookie: `${agedCookie.name}=${agedCookie.value}` },
        })
      ).status()
    ).toBe(401);
    await other.addCookies([agedCookie]);
    await second.reload();
    await expect(second).toHaveURL(/\/login/);
    await expect(second.getByRole('heading', { name: 'Dashboard', exact: true })).toHaveCount(0);
  } finally {
    await other.close();
  }
});

test('normal logout invalidates a copied cookie after the revocation check interval', async ({
  page,
  context,
}) => {
  await login(page);
  const copied = await checkedFiveMinutesAgo(context);
  await logout(page);
  const response = await context.request.get('/api/transactions/overview', {
    headers: { Cookie: `${copied.name}=${copied.value}` },
  });
  expect(response.status()).toBe(401);
});

test('does not report successful global revocation when the endpoint fails', async ({ page }) => {
  await login(page);
  await page.route('**/api/auth/sessions/revoke', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Indisponível' }),
    })
  );
  await page.getByRole('button', { name: 'Abrir menu do usuário' }).click();
  await page.getByRole('menuitem', { name: 'Sair de todos os dispositivos' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Não foi possível encerrar as outras sessões' })
  ).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);
});

test('keeps private content cleared and offers retry when individual revocation fails', async ({
  page,
}) => {
  await login(page);
  let attempts = 0;
  await page.route('**/api/auth/sessions/current/revoke', async (route) => {
    if (++attempts === 1)
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unavailable' }),
      });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Abrir menu do usuário' }).click();
  await page.getByRole('menuitem', { name: 'Sair', exact: true }).click();
  const error = page.getByRole('alertdialog', { name: 'Não foi possível encerrar sua sessão' });
  await expect(error).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nova transação', exact: true })).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/login/);
  await error.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(attempts).toBe(2);
});
