'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { RegisterForm, type RegisterFormFields } from '@bytebank/design-system';
import { registerAndSignIn } from './registerFlow';

export function RegisterPageClient() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRegister(data: RegisterFormFields) {
    startTransition(async () => {
      setError(null);

      const result = await registerAndSignIn(data);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      window.location.assign('/');
    });
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-white px-md py-xl">
      <section className="w-full max-w-[28rem] lg:grid lg:max-w-[72rem] lg:grid-cols-[minmax(0,1fr)_1px_minmax(22rem,1fr)] lg:items-center lg:gap-3xl">
        <div className="mb-lg flex flex-col items-center text-center lg:mb-0">
          <Image
            src="/login.svg"
            alt=""
            width={360}
            height={280}
            priority
            className="mb-md h-auto w-full max-w-[22rem] lg:mb-0 lg:max-w-3/4"
          />
          <h1 className="text-2xl font-bold text-content-primary lg:hidden">Criar conta</h1>
        </div>

        <div className="hidden h-full min-h-[28rem] w-px bg-border lg:block" aria-hidden="true" />

        <div className="w-full lg:w-3/4 lg:mx-auto lg:pl-xl">
          <h1 className="mb-lg hidden text-center text-2xl font-bold text-content-primary lg:block">
            Criar conta
          </h1>

          <RegisterForm
            onSubmit={handleRegister}
            isLoading={isPending}
            errorMessage={error}
            loginHref="/login"
          />
        </div>
      </section>
    </main>
  );
}
