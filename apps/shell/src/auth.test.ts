import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimitedError } from '@bytebank/core';

const mocks = vi.hoisted(() => ({
  nextAuth: vi.fn((config: unknown) => {
    void config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  }),
  authenticate: vi.fn(),
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
  container: { authenticateUser: { execute: mocks.authenticate } },
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
    expect(mocks.authenticate).toHaveBeenCalledWith('ana@example.com', 'secret', '203.0.113.12');
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
});
