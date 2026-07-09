import { CredentialsSignin, MissingSecret } from '@auth/core/errors';
import { describe, expect, it } from 'vitest';
import { isCredentialsSigninError, isNextRedirectError } from './authErrors';

describe('auth error helpers', () => {
  it('only classifies credentials sign-in failures as credential errors', () => {
    expect(isCredentialsSigninError(new CredentialsSignin())).toBe(true);
    expect(isCredentialsSigninError(new MissingSecret())).toBe(false);
    expect(isCredentialsSigninError(new Error('CredentialsSignin'))).toBe(false);
  });

  it('recognizes Next redirect control-flow errors', () => {
    expect(isNextRedirectError(new Error('NEXT_REDIRECT'))).toBe(true);
    expect(
      isNextRedirectError(
        Object.assign(new Error('ignored'), { digest: 'NEXT_REDIRECT;replace;/' })
      )
    ).toBe(true);
    expect(isNextRedirectError(new Error('boom'))).toBe(false);
  });
});
