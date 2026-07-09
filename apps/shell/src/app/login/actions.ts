'use server';

import { redirect } from 'next/navigation';
import type { LoginFormFields } from '@bytebank/design-system';
import { signIn } from '../../auth';
import { isCredentialsSigninError, isNextRedirectError } from './authErrors';

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

    if (isCredentialsSigninError(error)) {
      redirect('/auth/error?error=CredentialsSignin');
    }

    throw error;
  }
}

export async function loginWithGoogleAction() {
  await signIn('google', { redirectTo: '/' });
}
