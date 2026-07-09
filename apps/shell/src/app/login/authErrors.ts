import { AuthError } from '@auth/core/errors';

export function isNextRedirectError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const digest = 'digest' in error && typeof error.digest === 'string' ? error.digest : '';

  return error.message === 'NEXT_REDIRECT' || digest.startsWith('NEXT_REDIRECT');
}

export function isCredentialsSigninError(error: unknown) {
  return error instanceof AuthError && error.type === 'CredentialsSignin';
}
