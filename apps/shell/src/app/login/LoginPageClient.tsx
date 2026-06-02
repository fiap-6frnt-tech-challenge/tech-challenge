'use client';

import { useTransition } from 'react';
import type { LoginFormFields } from '@bytebank/design-system';
import { GoogleAuthButton, LoginForm } from '@bytebank/design-system';

interface LoginPageClientProps {
  isGoogleAuthEnabled: boolean;
  loginWithCredentialsAction: (data: LoginFormFields) => void | Promise<void>;
  loginWithGoogleAction: () => void | Promise<void>;
}

export function LoginPageClient({
  isGoogleAuthEnabled,
  loginWithCredentialsAction,
  loginWithGoogleAction,
}: LoginPageClientProps) {
  const [isCredentialsPending, startCredentialsTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();
  const isPending = isCredentialsPending || isGooglePending;

  function handleCredentialsSubmit(data: LoginFormFields) {
    startCredentialsTransition(async () => {
      await loginWithCredentialsAction(data);
    });
  }

  function handleGoogleClick() {
    startGoogleTransition(async () => {
      await loginWithGoogleAction();
    });
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-background px-md py-xl">
      <section className="w-full max-w-[28rem] rounded-md border border-border bg-surface p-xl shadow-sm">
        <div className="mb-lg text-center">
          <h1 className="text-2xl font-bold text-content-primary">Acesse o ByteBank</h1>
          <p className="mt-xs text-sm text-content-secondary">
            Insira suas credenciais ou continue com sua conta Google
          </p>
        </div>

        <LoginForm onSubmit={handleCredentialsSubmit} isLoading={isPending} />

        {isGoogleAuthEnabled ? (
          <>
            <div className="my-lg flex items-center gap-md">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase text-content-secondary">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <GoogleAuthButton
              onClick={handleGoogleClick}
              isLoading={isGooglePending}
              disabled={isPending}
            />
          </>
        ) : null}
      </section>
    </main>
  );
}
