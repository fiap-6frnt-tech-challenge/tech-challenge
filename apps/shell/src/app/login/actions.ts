'use server';

import { redirect } from 'next/navigation';
import type { LoginFormFields } from '@bytebank/design-system';
import { signIn } from '../../auth';
import { isCredentialsSigninError, isNextRedirectError } from './authErrors';

type CredentialsWithTurnstile = LoginFormFields & { turnstileToken?: string };

export async function loginWithCredentialsAction({
  email,
  password,
  turnstileToken,
}: CredentialsWithTurnstile) {
  try {
    await signIn('credentials', {
      email,
      password,
      ...(turnstileToken ? { turnstileToken } : {}),
      redirectTo: '/',
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    if (isCredentialsSigninError(error)) {
      const code =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'string'
          ? error.code
          : undefined;
      redirect(
        code === 'rate_limited' || code === 'turnstile_required'
          ? `/auth/error?error=CredentialsSignin&code=${code}`
          : '/auth/error?error=CredentialsSignin'
      );
    }

    throw error;
  }
}

export async function loginWithGoogleAction() {
  await signIn('google', { redirectTo: '/' });
}
