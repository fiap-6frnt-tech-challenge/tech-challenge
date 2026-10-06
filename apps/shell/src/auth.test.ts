import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  nextAuth: vi.fn((_config: unknown) => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  authenticate: vi.fn(),
}));
vi.mock('next-auth', () => ({ default: mocks.nextAuth }));
vi.mock('next-auth/providers/credentials', () => ({ default: (options: unknown) => options }));
vi.mock('./auth.config', () => ({ authConfig: { providers: [] } }));
vi.mock('@/server/container', () => ({
  container: { authenticateUser: { execute: mocks.authenticate } },
}));

type Authorize = (credentials: Record<string, unknown> | undefined) => Promise<unknown>;
let authorize: Authorize;

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
    const result = await authorize({ email: 'ana@example.com', password: 'secret' });
    expect(mocks.authenticate).toHaveBeenCalledWith('ana@example.com', 'secret');
    expect(result).toMatchObject({ id: 'user-1', name: 'Ana', email: 'ana@example.com' });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects missing credentials without calling the container', async () => {
    expect(await authorize({ email: 'ana@example.com' })).toBeNull();
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it('fails closed when authentication throws', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.authenticate.mockRejectedValue(new Error('database unavailable'));
    expect(await authorize({ email: 'ana@example.com', password: 'secret' })).toBeNull();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
