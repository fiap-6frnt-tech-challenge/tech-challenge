'use client';

import Image from 'next/image';
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
      <section className="w-full max-w-[28rem] rounded-md border border-border bg-surface p-2xl shadow-sm">
        <div className="mb-lg flex flex-col items-center text-center">
          <Image
            src="/login.svg"
            alt=""
            width={360}
            height={280}
            priority
            className="mb-md h-auto w-full max-w-[22rem]"
          />
          <h1 className="text-2xl font-bold text-content-primary">Login</h1>
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
