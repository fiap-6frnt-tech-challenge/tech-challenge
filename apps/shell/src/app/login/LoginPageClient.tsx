'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { LoginFormFields } from '@bytebank/design-system';
import { GoogleAuthButton, LoginForm } from '@bytebank/design-system';
import { loginWithCredentials } from './loginFlow';
import { TurnstileWidget } from './TurnstileWidget';

interface LoginPageClientProps {
  sessionNotice?: string;
  isGoogleAuthEnabled: boolean;
  turnstileSiteKey?: string;
  loginWithGoogleAction: () => void | Promise<void>;
}

export function LoginPageClient({
  sessionNotice,
  isGoogleAuthEnabled,
  turnstileSiteKey,
  loginWithGoogleAction,
}: LoginPageClientProps) {
  const [isCredentialsPending, startCredentialsTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();
  const [isTurnstileRequired, setIsTurnstileRequired] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileWidgetVersion, setTurnstileWidgetVersion] = useState(0);
  const [turnstileMessage, setTurnstileMessage] = useState('');
  const isPending = isCredentialsPending || isGooglePending;

  function handleCredentialsSubmit(data: LoginFormFields) {
    startCredentialsTransition(async () => {
      const result = await loginWithCredentials(data, turnstileToken || undefined);

      if (!result.ok) {
        if (result.code === 'turnstile_required') {
          setIsTurnstileRequired(true);
          setTurnstileToken('');
          setTurnstileWidgetVersion((version) => version + 1);
          setTurnstileMessage('Confirme o desafio de segurança para continuar.');
          return;
        }

        if (isTurnstileRequired) {
          setTurnstileToken('');
          setTurnstileWidgetVersion((version) => version + 1);
          setTurnstileMessage('Credenciais inválidas. Confirme novamente o desafio.');
          if (result.code === 'rate_limited') {
            const params = new URLSearchParams({ error: 'CredentialsSignin', code: result.code });
            window.location.assign(`/auth/error?${params.toString()}`);
          }
          return;
        }

        const params = new URLSearchParams({ error: 'CredentialsSignin' });
        if (result.code === 'rate_limited') params.set('code', result.code);
        window.location.assign(`/auth/error?${params.toString()}`);
        return;
      }

      window.location.assign('/');
    });
  }

  function handleGoogleClick() {
    startGoogleTransition(async () => {
      await loginWithGoogleAction();
    });
  }

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-dvh flex items-center justify-center bg-white px-md py-xl"
    >
      <section className="w-full max-w-[28rem] lg:grid lg:max-w-[72rem] lg:grid-cols-[minmax(0,1fr)_1px_minmax(22rem,1fr)] lg:items-center lg:gap-3xl">
        <div className="mb-lg flex flex-col items-center text-center lg:mb-0">
          <link
            rel="preload"
            as="image"
            href="/login.svg"
            type="image/svg+xml"
            fetchPriority="high"
          />
          <img
            src="/login.svg"
            alt=""
            width={360}
            height={280}
            fetchPriority="high"
            decoding="async"
            className="mb-md h-auto w-full max-w-[22rem] lg:mb-0 lg:max-w-3/4"
          />
          <h1 className="text-2xl font-bold text-content-primary lg:hidden">Login</h1>
        </div>

        <div className="hidden h-full min-h-[28rem] w-px bg-border lg:block" aria-hidden="true" />

        <div className="w-full lg:w-3/4 lg:mx-auto lg:pl-xl">
          <h1 className="mb-lg hidden text-center text-2xl font-bold text-content-primary lg:block">
            Login
          </h1>

          {sessionNotice && (
            <p role="status" className="mb-md text-center text-content-secondary">
              {sessionNotice}
            </p>
          )}
          <LoginForm onSubmit={handleCredentialsSubmit} isLoading={isPending} />

          {isTurnstileRequired && turnstileSiteKey ? (
            <div className="mt-md flex flex-col gap-sm" aria-live="polite">
              <p className="text-center text-sm text-content-secondary">
                {turnstileMessage || 'Confirme o desafio para continuar.'}
              </p>
              <TurnstileWidget
                key={turnstileWidgetVersion}
                siteKey={turnstileSiteKey}
                onToken={setTurnstileToken}
              />
            </div>
          ) : null}

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

          <p className="mt-lg text-center text-sm text-content-secondary">
            Ainda não tem conta?{' '}
            <Link
              href="/register"
              className="font-medium text-brand-primary underline-offset-4 transition-colors hover:text-brand-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
