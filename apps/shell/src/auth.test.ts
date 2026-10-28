import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimitedError, TurnstileRequiredError } from '@bytebank/core';
import { MfaRequiredError, MfaInvalidCodeError } from '@bytebank/core/application';

const mocks = vi.hoisted(() => ({
  nextAuth: vi.fn((config: unknown) => {
    void config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  }),
  authenticate: vi.fn(),
  verifyMfa: vi.fn(),
}));
vi.mock('next-auth', () => ({
  default: mocks.nextAuth,
  CredentialsSignin: class CredentialsSignin extends Error {
    type = 'CredentialsSignin';
    code = 'credentials';
  },
}));
vi.mock('next-auth/providers/credentials', () => ({ default: (options: unknown) => options }));
vi.mock('./auth.config', () => ({ authConfig: { providers: [] } }));
vi.mock('@/server/container', () => ({
  container: {
    authenticateUser: { execute: mocks.authenticate },
    mfa: { verifyLogin: mocks.verifyMfa },
  },
}));

type Authorize = (
  credentials: Record<string, unknown> | undefined,
  request: Request
) => Promise<unknown>;
let authorize: Authorize;
const request = new Request('http://localhost/api/auth/callback/credentials', {
  headers: { 'x-forwarded-for': '203.0.113.12, 10.0.0.1' },
});

beforeAll(async () => {
  await import('./auth');
  const config = mocks.nextAuth.mock.calls[0][0] as { providers: Array<{ authorize: Authorize }> };
  authorize = config.providers[0].authorize;
});
beforeEach(() => {
  mocks.authenticate.mockReset();
  mocks.verifyMfa.mockReset().mockResolvedValue(0);
});

describe('credentials authorize', () => {
  it('authenticates via the application container and omits the password hash', async () => {
    mocks.authenticate.mockResolvedValue({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'private-hash',
    });
    const result = await authorize({ email: 'ana@example.com', password: 'secret' }, request);
    expect(mocks.authenticate).toHaveBeenCalledWith(
      'ana@example.com',
      'secret',
      '203.0.113.12',
      undefined
    );
    expect(result).toMatchObject({ id: 'user-1', name: 'Ana', email: 'ana@example.com' });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('keeps the saved avatar in the credentials session', async () => {
    mocks.authenticate.mockResolvedValue({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'private-hash',
      image: 'https://example.com/avatar.png',
    });
    await expect(
      authorize({ email: 'ana@example.com', password: 'secret' }, request)
    ).resolves.toMatchObject({
      image: 'https://example.com/avatar.png',
    });
  });

  it('rejects missing credentials without calling the container', async () => {
    expect(await authorize({ email: 'ana@example.com' }, request)).toBeNull();
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it('fails closed when authentication throws', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.authenticate.mockRejectedValue(new Error('database unavailable'));
    expect(await authorize({ email: 'ana@example.com', password: 'secret' }, request)).toBeNull();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('translates a rate limit into the safe CredentialsSignin code', async () => {
    mocks.authenticate.mockRejectedValue(new RateLimitedError(60));

    await expect(
      authorize({ email: 'ana@example.com', password: 'secret' }, request)
    ).rejects.toMatchObject({ type: 'CredentialsSignin', code: 'rate_limited' });
  });

  it('translates a Turnstile challenge into the safe CredentialsSignin code', async () => {
    mocks.authenticate.mockRejectedValue(new TurnstileRequiredError());

    await expect(
      authorize({ email: 'ana@example.com', password: 'secret' }, request)
    ).rejects.toMatchObject({ type: 'CredentialsSignin', code: 'turnstile_required' });
  });
});

describe('MFA gate before creating a session', () => {
  it.each([
    [new MfaRequiredError(), 'mfa_required'],
    [new MfaInvalidCodeError(), 'mfa_invalid'],
    [new RateLimitedError(900), 'rate_limited'],
  ])('rejects the credentials result when the second factor is incomplete', async (error, code) => {
    mocks.authenticate.mockResolvedValue({ id: 'user-1', passwordHash: 'hash' });
    mocks.verifyMfa.mockRejectedValue(error);
    await expect(
      authorize({ email: 'ana@example.com', password: 'password', totp: '123456' }, request)
    ).rejects.toMatchObject({ code });
  });
  it('binds a successful factor to the session version and omits secrets', async () => {
    mocks.authenticate.mockResolvedValue({
      id: 'user-1',
      passwordHash: 'hash',
      email: 'ana@example.com',
    });
    mocks.verifyMfa.mockResolvedValue(4);
    const user = await authorize(
      { email: 'ana@example.com', password: 'password', totp: '123456' },
      request
    );
    expect(mocks.verifyMfa).toHaveBeenCalledWith('user-1', '123456', 'hash');
    expect(user).toMatchObject({ id: 'user-1', mfaVersion: 4 });
    expect(user).not.toHaveProperty('totp');
    expect(user).not.toHaveProperty('passwordHash');
  });
  it('does not check a second factor before the password is verified', async () => {
    mocks.authenticate.mockResolvedValue(null);
    expect(
      await authorize({ email: 'ana@example.com', password: 'bad', totp: '123456' }, request)
    ).toBeNull();
    expect(mocks.verifyMfa).not.toHaveBeenCalled();
  });
});
