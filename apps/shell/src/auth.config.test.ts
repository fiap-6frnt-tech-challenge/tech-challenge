import { describe, expect, it } from 'vitest';
import { authConfig, isGoogleAuthConfigured } from './auth.config';

it('limits rolling sessions to 8h and rejects absolute-expired claims at the proxy', async () => {
  expect(authConfig.session.maxAge).toBe(8 * 60 * 60);
  expect(authConfig.session.updateAge).toBe(15 * 60);
  const token = {
    userId: 'u',
    sid: 's',
    authTime: Date.now() - 12 * 60 * 60 * 1000,
    sv: 0,
    svCheckedAt: Date.now(),
  };
  const callback = authConfig.callbacks.jwt;
  expect(await callback({ token } as unknown as Parameters<typeof callback>[0])).toBeNull();
  expect(
    await callback({ token: { userId: 'legacy' } } as unknown as Parameters<typeof callback>[0])
  ).toBeNull();
});

describe('isGoogleAuthConfigured', () => {
  it('requires both Google OAuth env vars', () => {
    expect(
      isGoogleAuthConfigured({ AUTH_GOOGLE_ID: 'client-id', AUTH_GOOGLE_SECRET: 'secret' })
    ).toBe(true);
    expect(isGoogleAuthConfigured({ AUTH_GOOGLE_ID: 'client-id' })).toBe(false);
    expect(isGoogleAuthConfigured({ AUTH_GOOGLE_SECRET: 'secret' })).toBe(false);
    expect(isGoogleAuthConfigured({})).toBe(false);
  });
});
