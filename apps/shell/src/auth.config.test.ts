import { describe, expect, it } from 'vitest';
import { isGoogleAuthConfigured } from './auth.config';

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
