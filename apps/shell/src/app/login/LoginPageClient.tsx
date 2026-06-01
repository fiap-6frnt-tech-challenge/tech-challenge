'use client';

import type { LoginFormFields } from '@bytebank/design-system';
import { GoogleAuthButton, LoginForm } from '@bytebank/design-system';

interface LoginPageClientProps {
  loginWithCredentialsAction: (data: LoginFormFields) => void | Promise<void>;
  loginWithGoogleAction: () => void | Promise<void>;
}

export function LoginPageClient({
  loginWithCredentialsAction,
  loginWithGoogleAction,
}: LoginPageClientProps) {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-background px-md py-xl">
      <section className="w-full max-w-md rounded-md border border-border bg-surface p-xl shadow-sm">
        <div className="mb-lg text-center">
          <h1 className="text-2xl font-bold text-content-primary">Acesse o ByteBank</h1>
          <p className="mt-xs text-sm text-content-secondary">
            Insira suas credenciais ou continue com sua conta Google
          </p>
        </div>

        <LoginForm onSubmit={loginWithCredentialsAction} />

        <div className="my-lg flex items-center gap-md">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase text-content-secondary">ou</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <GoogleAuthButton onClick={loginWithGoogleAction} />
      </section>
    </main>
  );
}
