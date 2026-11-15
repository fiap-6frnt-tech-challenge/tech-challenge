import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextAuthConfig } from 'next-auth';
import { Auth } from '@auth/core';
import { encode } from 'next-auth/jwt';

const mocks = vi.hoisted(() => ({
  config: null as unknown,
  start: vi.fn(),
  validate: vi.fn(),
  revoke: vi.fn(),
  oauth: vi.fn(),
  authenticate: vi.fn(),
  verifyMfa: vi.fn(),
}));
vi.mock('next-auth', () => ({
  default: (config: unknown) => {
    mocks.config = config;
    return {};
  },
  CredentialsSignin: class extends Error {},
}));
vi.mock('@/server/container', () => ({
  container: {
    sessionLifecycle: { start: mocks.start, validate: mocks.validate, revokeCurrent: mocks.revoke },
    resolveOAuthUser: { execute: mocks.oauth },
    authenticateUser: { execute: mocks.authenticate },
    mfa: { verifyLogin: mocks.verifyMfa },
  },
}));
beforeAll(async () => {
  await import('./auth');
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyMfa.mockResolvedValue(0);
});
const claims = { userId: 'u', sid: 's', authTime: 1, sv: 0, svCheckedAt: 1 };
const config = () => mocks.config as NextAuthConfig;
describe('Node authentication session callbacks', () => {
  it('revokes the identity in a real signed cookie and propagates database failure', async () => {
    const secret = 's207-current-revoke-test-secret';
    vi.stubEnv('AUTH_SECRET', secret);
    vi.stubEnv('AUTH_URL', 'http://localhost');
    try {
      const value = await encode({
        token: claims,
        secret,
        salt: 'authjs.session-token',
        maxAge: 3600,
      });
      const { revokeCurrentRequestSession } = await import('./auth');
      const req = new Request('http://localhost/api/auth/sessions/current/revoke', {
        headers: { Cookie: `authjs.session-token=${value}` },
      });
      await revokeCurrentRequestSession(req);
      expect(mocks.revoke).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u', sid: 's' }));
      mocks.revoke.mockRejectedValueOnce(new Error('storage down'));
      await expect(revokeCurrentRequestSession(req)).rejects.toThrow('storage down');
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('issues the real HTTPS session cookie with Secure, HttpOnly and SameSite=Lax', async () => {
    mocks.authenticate.mockResolvedValue({ id: 'u', name: 'Ana', email: 'ana@example.com' });
    mocks.start.mockResolvedValue(claims);
    const options = {
      ...config(),
      trustHost: true,
      basePath: '/api/auth',
      secret: 's207-cookie-test-secret-only-for-tests',
    };
    const csrf = await Auth(new Request('https://bytebank.test/api/auth/csrf'), options);
    const { csrfToken } = await csrf.json();
    const cookies = csrf.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    const response = await Auth(
      new Request('https://bytebank.test/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies },
        body: new URLSearchParams({
          csrfToken,
          email: 'ana@example.com',
          password: 'test-only-password',
          callbackUrl: 'https://bytebank.test/',
        }),
      }),
      options
    );
    const cookie = response.headers
      .getSetCookie()
      .find((value) => value.startsWith('__Secure-authjs.session-token='));
    expect(cookie).toBeDefined();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
  });
  it('mints a server session on login and preserves private claims only in the JWT', async () => {
    mocks.start.mockResolvedValue(claims);
    const callback = config().callbacks!.jwt!;
    const token = await callback({
      token: { name: 'Ana' },
      user: { id: 'u' },
      trigger: 'signIn',
    } as Parameters<typeof callback>[0]);
    expect(token).toMatchObject({ ...claims, name: 'Ana' });
    const sessionCallback = config().callbacks!.session!;
    const session = await sessionCallback({
      session: { user: { name: 'Ana' } },
      token,
    } as Parameters<typeof sessionCallback>[0]);
    expect(session.user?.id).toBe('u');
    expect(session).not.toHaveProperty('sid');
    expect(session).not.toHaveProperty('sv');
  });
  it('validates the signed token and ignores client supplied session updates', async () => {
    mocks.validate.mockResolvedValue(null);
    const callback = config().callbacks!.jwt!;
    expect(
      await callback({
        token: claims,
        trigger: 'update',
        session: { authTime: Date.now(), sv: 99 },
      } as unknown as Parameters<typeof callback>[0])
    ).toBeNull();
    expect(mocks.validate).toHaveBeenCalledWith(claims);
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it('revokes the current server session at sign-out', async () => {
    await config().events!.signOut!({ token: claims });
    expect(mocks.revoke).toHaveBeenCalledWith(claims);
  });
  it('binds Google login to the local user only after verified email', async () => {
    const callback = config().callbacks!.signIn!;
    const user = { id: 'google-id', email: 'ana@example.com', name: 'Ana' };
    mocks.oauth.mockResolvedValue({ ...user, id: 'local-id' });
    expect(
      await callback({
        user,
        account: { provider: 'google' },
        profile: { email_verified: true },
      } as Parameters<typeof callback>[0])
    ).toBe(true);
    expect(user.id).toBe('local-id');
    expect(
      await callback({
        user,
        account: { provider: 'google' },
        profile: { email_verified: false },
      } as Parameters<typeof callback>[0])
    ).toBe(false);
  });
});
