import { signIn } from 'next-auth/react';
import type { LoginFormFields } from '@bytebank/design-system';

type LoginResult = { ok: true } | { ok: false; error: string; code?: string };

export async function loginWithCredentials(
  data: LoginFormFields,
  turnstileToken?: string
): Promise<LoginResult> {
  const result = await signIn('credentials', {
    email: data.email,
    password: data.password,
    ...(turnstileToken ? { turnstileToken } : {}),
    redirect: false,
  });

  if (result?.error) {
    return {
      ok: false,
      error: result.error,
      ...(result.code ? { code: result.code } : {}),
    };
  }

  return { ok: true };
}
