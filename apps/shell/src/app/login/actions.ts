'use server';

import { redirect } from 'next/navigation';
import type { LoginFormFields } from '@bytebank/design-system';
import { signIn } from '../../auth';

function isNextRedirectError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const digest = 'digest' in error && typeof error.digest === 'string' ? error.digest : '';

  return error.message === 'NEXT_REDIRECT' || digest.startsWith('NEXT_REDIRECT');
}

export async function loginWithCredentialsAction({ email, password }: LoginFormFields) {
  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/',
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    redirect('/auth/error?error=CredentialsSignin');
  }
}

export async function loginWithGoogleAction() {
  await signIn('google', { redirectTo: '/' });
}
