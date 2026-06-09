import { signIn } from 'next-auth/react';
import type { RegisterFormFields } from '@bytebank/design-system';

type RegisterFlowResult = { ok: true } | { ok: false; error: string };

type RegisterErrorResponse = {
  error?: string;
};

export async function registerAndSignIn(data: RegisterFormFields): Promise<RegisterFlowResult> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as RegisterErrorResponse;
    return {
      ok: false,
      error: res.status === 409 ? 'E-mail já cadastrado' : (body.error ?? 'Falha no cadastro'),
    };
  }

  const loginResult = await signIn('credentials', {
    email: data.email,
    password: data.password,
    redirect: false,
  });

  if (loginResult?.error) {
    return {
      ok: false,
      error: 'Conta criada, mas não foi possível entrar automaticamente',
    };
  }

  return { ok: true };
}
