import { signIn } from 'next-auth/react';
import type { LoginFormFields } from '@bytebank/design-system';

type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginWithCredentials(data: LoginFormFields): Promise<LoginResult> {
  const result = await signIn('credentials', {
    email: data.email,
    password: data.password,
    redirect: false,
  });

  if (result?.error) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}
